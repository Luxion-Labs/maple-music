//! Cloud artwork hosting for Discord Rich Presence.
//!
//! Local music tracks have artwork on disk that Discord can't fetch. This module uploads those
//! images to Neon Object Storage and caches the resulting public HTTPS URLs, so Discord Rich
//! Presence can display actual album covers instead of the app icon.
//!
//! **Architecture:**
//! 1. Read existing local artwork path from `SongItem.thumbnail`
//! 2. Compute SHA-256 hash (deterministic, deduplicates identical artwork)
//! 3. Check persistent cache for existing URL
//! 4. If miss: upload to Neon Function, which stores to S3-compatible object storage
//! 5. Cache the returned public URL permanently
//! 6. Return URL for Discord
//!
//! **Failure handling:**
//! Artwork upload is best-effort. Network failures, missing images, or invalid tokens must never
//! block playback or crash the app. Return `None` and log the failure; Discord shows text-only
//! presence as fallback.
//!
//! **Concurrency:**
//! Upload happens on a background task. Never block `emit_now_playing()` or the Discord IPC thread.

use std::path::Path;
use std::time::Duration;

use sha2::{Digest, Sha256};

use crate::db::Db;

/// Maximum image size accepted for upload (10 MB, matching server limit)
const MAX_IMAGE_SIZE: usize = 10 * 1024 * 1024;

/// Upload request timeout
const UPLOAD_TIMEOUT: Duration = Duration::from_secs(30);

/// JPEG magic bytes: FF D8 FF
const JPEG_MAGIC: &[u8] = &[0xFF, 0xD8, 0xFF];
/// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC: &[u8] = &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
/// WebP magic bytes (RIFF): 52 49 46 46
const WEBP_RIFF_MAGIC: &[u8] = &[0x52, 0x49, 0x46, 0x46];
/// WebP signature at offset 8: WEBP
const WEBP_SIG: &[u8] = &[0x57, 0x45, 0x42, 0x50];

#[derive(Debug)]
pub enum ArtworkError {
    /// Image file not found or unreadable
    FileError(std::io::Error),
    /// Image too large
    TooLarge { size: usize, max: usize },
    /// Unsupported or unrecognized image format
    UnsupportedFormat,
    /// Network or upload failure
    UploadFailed(String),
    /// Configuration missing or invalid
    NotConfigured,
}

impl std::fmt::Display for ArtworkError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::FileError(e) => write!(f, "file error: {e}"),
            Self::TooLarge { size, max } => write!(f, "image too large: {size} bytes (max {max})"),
            Self::UnsupportedFormat => write!(f, "unsupported image format"),
            Self::UploadFailed(msg) => write!(f, "upload failed: {msg}"),
            Self::NotConfigured => write!(f, "artwork upload not configured"),
        }
    }
}

impl std::error::Error for ArtworkError {}

/// Detected image format with MIME type
#[derive(Debug, Clone, Copy)]
enum ImageFormat {
    Jpeg,
    Png,
    Webp,
}

impl ImageFormat {
    fn mime_type(&self) -> &'static str {
        match self {
            Self::Jpeg => "image/jpeg",
            Self::Png => "image/png",
            Self::Webp => "image/webp",
        }
    }

    fn extension(&self) -> &'static str {
        match self {
            Self::Jpeg => "jpg",
            Self::Png => "png",
            Self::Webp => "webp",
        }
    }
}

/// Configuration for artwork upload
#[derive(Clone)]
pub struct ArtworkConfig {
    /// Neon Function base URL (e.g., "https://project.neon.tech/functions/artwork-upload")
    pub function_url: String,
    /// Bearer token for authentication
    pub upload_token: String,
}

impl ArtworkConfig {
    /// Load configuration with fallback to built-in defaults
    pub fn from_db(db: &Db) -> Option<Self> {
        // Try database first (allows user override)
        if let Some(function_url) = db.get_setting("neon_artwork_url").filter(|u| !u.is_empty()) {
            if let Some(upload_token) =
                db.get_setting("neon_artwork_token").filter(|t| !t.is_empty())
            {
                return Some(Self { function_url, upload_token });
            }
        }

        // Fallback to built-in credentials (set at compile time)
        Self::default_config()
    }

    /// Default configuration compiled into the binary
    /// Set via environment variables during build: NEON_ARTWORK_URL and NEON_ARTWORK_TOKEN
    fn default_config() -> Option<Self> {
        let function_url =
            option_env!("NEON_ARTWORK_URL").map(|s| s.to_string()).filter(|s| !s.is_empty())?;
        let upload_token =
            option_env!("NEON_ARTWORK_TOKEN").map(|s| s.to_string()).filter(|s| !s.is_empty())?;

        Some(Self { function_url, upload_token })
    }

    /// Validate configuration
    pub fn is_valid(&self) -> bool {
        !self.function_url.is_empty()
            && !self.upload_token.is_empty()
            && self.function_url.starts_with("http")
    }
}

/// Read image file and return bytes with detected format
fn read_and_validate_image(path: &str) -> Result<(Vec<u8>, ImageFormat), ArtworkError> {
    // Read file
    let bytes = std::fs::read(path).map_err(ArtworkError::FileError)?;

    // Size check
    if bytes.len() > MAX_IMAGE_SIZE {
        return Err(ArtworkError::TooLarge { size: bytes.len(), max: MAX_IMAGE_SIZE });
    }

    // Detect format by magic bytes
    let format = if bytes.starts_with(JPEG_MAGIC) {
        ImageFormat::Jpeg
    } else if bytes.starts_with(PNG_MAGIC) {
        ImageFormat::Png
    } else if bytes.len() >= 12 && bytes.starts_with(WEBP_RIFF_MAGIC) && &bytes[8..12] == WEBP_SIG {
        ImageFormat::Webp
    } else {
        return Err(ArtworkError::UnsupportedFormat);
    };

    Ok((bytes, format))
}

/// Compute SHA-256 hash of bytes
fn compute_hash(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

/// Check cache for existing URL
pub fn get_cached_url(hash: &str, db: &Db) -> Option<String> {
    db.get_artwork_url(hash)
}

/// Store URL in cache
fn cache_url(hash: &str, url: &str, db: &Db) {
    if let Err(e) = db.set_artwork_url(hash, url) {
        tracing::warn!(hash, url, error = %e, "failed to cache artwork url");
    }
}

/// Upload image to Neon Function
async fn upload_image(
    bytes: &[u8],
    hash: &str,
    format: ImageFormat,
    config: &ArtworkConfig,
) -> Result<String, ArtworkError> {
    let base64_image = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes);

    let payload = serde_json::json!({
        "image": base64_image,
        "sha256": hash,
        "mime": format.mime_type()
    });

    let client = reqwest::Client::builder()
        .timeout(UPLOAD_TIMEOUT)
        .build()
        .map_err(|e| ArtworkError::UploadFailed(format!("client build failed: {e}")))?;

    let endpoint = format!("{}/api/artwork/upload", config.function_url.trim_end_matches('/'));

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", config.upload_token))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| ArtworkError::UploadFailed(format!("request failed: {e}")))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_else(|_| String::from("(no response body)"));

    if !status.is_success() {
        return Err(ArtworkError::UploadFailed(format!("server returned {status}: {body}")));
    }

    // Parse response
    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| ArtworkError::UploadFailed(format!("invalid response json: {e}")))?;

    let url = json
        .get("url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ArtworkError::UploadFailed("response missing 'url' field".into()))?;

    // Validate URL format
    if !url.starts_with("https://") {
        return Err(ArtworkError::UploadFailed(format!("invalid url (not https): {url}")));
    }

    // Discord has a 256-byte URL limit (enforced in discord.rs too)
    if url.len() > 256 {
        return Err(ArtworkError::UploadFailed(format!(
            "url too long for discord: {} bytes",
            url.len()
        )));
    }

    Ok(url.to_string())
}

/// Upload artwork and return public HTTPS URL, with caching.
///
/// **This is a blocking function.** Call it from a background task, never from `emit_now_playing()`
/// or the Discord IPC thread.
///
/// Returns `None` on any failure (missing file, network error, invalid config). Logs errors but
/// never panics — artwork upload is best-effort and must not block playback.
pub async fn upload_artwork(local_path: &str, config: &ArtworkConfig, db: &Db) -> Option<String> {
    // Validate configuration
    if !config.is_valid() {
        tracing::debug!("artwork upload skipped: not configured");
        return None;
    }

    // Read and validate image
    let (bytes, format) = match read_and_validate_image(local_path) {
        Ok(result) => result,
        Err(e) => {
            tracing::warn!(path = local_path, error = %e, "failed to read artwork");
            return None;
        }
    };

    // Compute hash
    let hash = compute_hash(&bytes);

    // Check cache
    if let Some(url) = get_cached_url(&hash, db) {
        tracing::debug!(hash, url, "artwork url cached");
        return Some(url);
    }

    // Upload
    match upload_image(&bytes, &hash, format, config).await {
        Ok(url) => {
            tracing::info!(
                path = local_path,
                hash,
                url,
                size = bytes.len(),
                format = format.extension(),
                "artwork uploaded"
            );
            cache_url(&hash, &url, db);
            Some(url)
        }
        Err(e) => {
            tracing::warn!(path = local_path, hash, error = %e, "artwork upload failed");
            None
        }
    }
}

/// Convenience: check if artwork should be uploaded for this track.
///
/// Returns the local path to upload if all conditions are met:
/// - Track is local (not YouTube)
/// - Track has thumbnail path
/// - Path exists on disk
pub fn should_upload_artwork(video_id: &str, thumbnail: Option<&str>) -> Option<String> {
    if !crate::local::is_local_song(video_id) {
        return None;
    }

    let path = thumbnail?;

    // Ignore URLs (YouTube tracks can have thumbnails too)
    if path.contains("://") {
        return None;
    }

    // Verify file exists
    if !Path::new(path).is_file() {
        return None;
    }

    Some(path.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jpeg_validation() {
        let jpeg = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]; // minimal JPEG
        let (_, format) = read_and_validate_image_from_bytes(&jpeg).unwrap();
        assert!(matches!(format, ImageFormat::Jpeg));
        assert_eq!(format.mime_type(), "image/jpeg");
        assert_eq!(format.extension(), "jpg");
    }

    #[test]
    fn png_validation() {
        let png = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]; // PNG header
        let (_, format) = read_and_validate_image_from_bytes(&png).unwrap();
        assert!(matches!(format, ImageFormat::Png));
        assert_eq!(format.mime_type(), "image/png");
    }

    #[test]
    fn webp_validation() {
        let webp = vec![
            0x52, 0x49, 0x46, 0x46, // RIFF
            0x00, 0x00, 0x00, 0x00, // size placeholder
            0x57, 0x45, 0x42, 0x50, // WEBP
        ];
        let (_, format) = read_and_validate_image_from_bytes(&webp).unwrap();
        assert!(matches!(format, ImageFormat::Webp));
        assert_eq!(format.mime_type(), "image/webp");
    }

    #[test]
    fn invalid_format_rejected() {
        let invalid = vec![0x00, 0x00, 0x00, 0x00];
        let result = read_and_validate_image_from_bytes(&invalid);
        assert!(matches!(result, Err(ArtworkError::UnsupportedFormat)));
    }

    #[test]
    fn oversized_image_rejected() {
        let huge = vec![0xFF; MAX_IMAGE_SIZE + 1];
        let result = read_and_validate_image_from_bytes(&huge);
        assert!(matches!(result, Err(ArtworkError::TooLarge { .. })));
    }

    #[test]
    fn hash_is_deterministic() {
        let data = b"test image bytes";
        let hash1 = compute_hash(data);
        let hash2 = compute_hash(data);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA-256 hex is 64 chars
    }

    #[test]
    fn different_data_different_hash() {
        let hash1 = compute_hash(b"data1");
        let hash2 = compute_hash(b"data2");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn config_validation() {
        let valid = ArtworkConfig {
            function_url: "https://example.com/upload".into(),
            upload_token: "secret123".into(),
        };
        assert!(valid.is_valid());

        let empty_url =
            ArtworkConfig { function_url: String::new(), upload_token: "secret".into() };
        assert!(!empty_url.is_valid());

        let empty_token = ArtworkConfig {
            function_url: "https://example.com".into(),
            upload_token: String::new(),
        };
        assert!(!empty_token.is_valid());

        let bad_url = ArtworkConfig {
            function_url: "ftp://example.com".into(),
            upload_token: "secret".into(),
        };
        assert!(!bad_url.is_valid());
    }

    #[test]
    fn should_upload_filters_correctly() {
        // Local track with valid thumbnail
        assert!(should_upload_artwork("LOCAL:/path/to/song.mp3", Some("/tmp/cover.jpg")).is_none());

        // YouTube track
        assert!(
            should_upload_artwork("dQw4w9WgXcQ", Some("https://i.ytimg.com/cover.jpg")).is_none()
        );

        // No thumbnail
        assert!(should_upload_artwork("LOCAL:/path/to/song.mp3", None).is_none());

        // Thumbnail is URL
        assert!(should_upload_artwork(
            "LOCAL:/path/to/song.mp3",
            Some("https://example.com/art.jpg")
        )
        .is_none());
    }

    // Test helper: validate from bytes directly
    fn read_and_validate_image_from_bytes(
        bytes: &[u8],
    ) -> Result<(Vec<u8>, ImageFormat), ArtworkError> {
        if bytes.len() > MAX_IMAGE_SIZE {
            return Err(ArtworkError::TooLarge { size: bytes.len(), max: MAX_IMAGE_SIZE });
        }

        let format = if bytes.starts_with(JPEG_MAGIC) {
            ImageFormat::Jpeg
        } else if bytes.starts_with(PNG_MAGIC) {
            ImageFormat::Png
        } else if bytes.len() >= 12
            && bytes.starts_with(WEBP_RIFF_MAGIC)
            && &bytes[8..12] == WEBP_SIG
        {
            ImageFormat::Webp
        } else {
            return Err(ArtworkError::UnsupportedFormat);
        };

        Ok((bytes.to_vec(), format))
    }
}

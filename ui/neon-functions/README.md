# Neon Artwork Upload Function

This function uploads album artwork to Neon Object Storage for Discord Rich Presence.

## Setup (for maintainers)

1. Install Neon CLI: `npm install -g neon@latest`
2. Navigate to ui directory: `cd ui`
3. Initialize: `neon init -y --project-id YOUR_PROJECT_ID --branch production --services postgres,functions`
4. Deploy: `neon deploy --env .env.local`

## Building the App

From the root directory, use the build script to embed credentials:

```powershell
.\build-release.ps1
```

This creates a distributable `.exe` with zero user configuration needed.

## Function Details

- **Endpoint**: `/` (POST)
- **Authentication**: Bearer token
- **Max size**: 10 MB
- **Formats**: JPEG, PNG, WebP
- **Storage**: Neon Object Storage (`uploads` bucket)
- **Deduplication**: Content-addressed by SHA-256

/**
 * Maple Music Artwork Upload Function
 * 
 * Authenticated endpoint for uploading album artwork to Neon Object Storage.
 * Used by Maple Music desktop app to host local artwork for Discord Rich Presence.
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET_NAME = 'uploads';

// MIME type magic bytes for validation
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

function createS3Client() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION || 'us-east-1';
  
  if (!endpoint) {
    throw new Error('AWS_ENDPOINT_URL_S3 not configured');
  }
  
  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
    forcePathStyle: true
  });
}

function authenticate(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const expectedToken = process.env.MAPLE_UPLOAD_TOKEN;
  
  if (!expectedToken) {
    throw new Error('MAPLE_UPLOAD_TOKEN not configured');
  }
  
  // Constant-time comparison
  if (token.length !== expectedToken.length) {
    return false;
  }
  
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  
  return mismatch === 0;
}

function validateImageSignature(buffer: Buffer, declaredMime: string): boolean {
  if (!ALLOWED_MIMES.includes(declaredMime)) {
    return false;
  }
  
  const magic = MAGIC_BYTES[declaredMime];
  if (!magic) {
    return false;
  }
  
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) {
      return false;
    }
  }
  
  // WebP needs additional validation
  if (declaredMime === 'image/webp') {
    const webp = [0x57, 0x45, 0x42, 0x50];
    for (let i = 0; i < webp.length; i++) {
      if (buffer[8 + i] !== webp[i]) {
        return false;
      }
    }
  }
  
  return true;
}

function computeHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  return map[mime] || 'bin';
}

function buildPublicUrl(key: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

async function objectExists(s3Client: S3Client, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

export default async function artworkupload(request: Request): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  if (request.method !== 'POST') {
    return Response.json({ error: 'method not allowed' }, { status: 405 });
  }
  
  try {
    // Authenticate
    if (!authenticate(request)) {
      console.warn('Authentication failed');
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    // Parse body
    const body = await request.json();
    const { image, sha256, mime } = body;
    
    if (!image || !sha256 || !mime) {
      return Response.json(
        { error: 'missing required fields: image, sha256, mime' },
        { status: 400 }
      );
    }
    
    if (!ALLOWED_MIMES.includes(mime)) {
      return Response.json(
        { error: `unsupported mime type: ${mime}`, allowed: ALLOWED_MIMES },
        { status: 400 }
      );
    }
    
    // Decode base64
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(image, 'base64');
    } catch (error) {
      return Response.json({ error: 'invalid base64 encoding' }, { status: 400 });
    }
    
    // Size check
    if (imageBuffer.length > MAX_SIZE_BYTES) {
      return Response.json(
        {
          error: 'image too large',
          maxSize: MAX_SIZE_BYTES,
          receivedSize: imageBuffer.length
        },
        { status: 413 }
      );
    }
    
    // Validate signature
    if (!validateImageSignature(imageBuffer, mime)) {
      return Response.json(
        { error: 'file signature does not match declared mime type', declaredMime: mime },
        { status: 400 }
      );
    }
    
    // Verify hash
    const actualHash = computeHash(imageBuffer);
    if (actualHash !== sha256.toLowerCase()) {
      return Response.json(
        { error: 'sha256 hash mismatch', expected: sha256, actual: actualHash },
        { status: 400 }
      );
    }
    
    // Build object key
    const extension = getExtension(mime);
    const key = `covers/${sha256}.${extension}`;
    
    // Initialize S3
    const s3Client = createS3Client();
    
    // Check if exists
    const exists = await objectExists(s3Client, key);
    if (exists) {
      console.log(`Object already exists: ${key}`);
      return Response.json({
        success: true,
        hash: sha256,
        key,
        url: buildPublicUrl(key),
        existed: true
      });
    }
    
    // Upload
    console.log(`Uploading: ${key} (${imageBuffer.length} bytes)`);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        'uploaded-by': 'maple-music',
        'sha256': sha256
      }
    }));
    
    const publicUrl = buildPublicUrl(key);
    console.log(`Upload successful: ${publicUrl}`);
    
    return Response.json({
      success: true,
      hash: sha256,
      key,
      url: publicUrl,
      existed: false
    });
    
  } catch (error: any) {
    console.error('Upload failed:', error);
    return Response.json(
      { 
        error: 'upload failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

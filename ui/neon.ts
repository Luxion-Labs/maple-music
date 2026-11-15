import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  functions: {
    artworkupload: { 
      name: "Artwork Upload", 
      source: "./neon-functions/artwork-upload.ts",
      env: {
        MAPLE_UPLOAD_TOKEN: process.env.MAPLE_UPLOAD_TOKEN!,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
        AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3!,
        AWS_REGION: process.env.AWS_REGION || "us-east-1",
      }
    },
  },
  buckets: {
    // Using existing 'uploads' bucket for artwork
    uploads: { access: "public_read" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});

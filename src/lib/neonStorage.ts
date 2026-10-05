if (typeof window !== "undefined") {
  throw new Error("Security Error: @/lib/neonStorage cannot be imported on the client side.");
}

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = "media";

export const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // required: Neon uses path-style addressing
});

/**
 * Upload a file to Neon Object Storage
 */
export async function uploadToStorage(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body as any,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: getPublicStorageUrl(key),
  };
}

/**
 * Get public read URL for media bucket
 */
export function getPublicStorageUrl(key: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, "");
  return `${endpoint}/${BUCKET}/${key}`;
}

/**
 * Get a presigned download URL
 */
export async function getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from Neon Object Storage
 */
export async function deleteFromStorage(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

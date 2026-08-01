import { v2 as cloudinary } from "cloudinary";
import { config } from "../../config";
import { logger } from "./logger";
import { UploadFolder } from "../middlewares/upload.middleware";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

type ResourceType = "raw" | "image";

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: UploadFolder,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `prohire/${folder}`,
        // "image" (not "raw") for all folders, including resumes: Cloudinary
        // treats PDFs as an image-family asset and resolves the correct
        // content-type/extension for them. "raw" always forces
        // Content-Disposition: attachment, which breaks inline viewing.
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    const { publicId, resourceType } = extractPublicId(url);
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (err) {
    // Non-fatal — log and continue. A failed delete should not block the new upload.
    logger.warn({ err, url }, "Failed to delete old file from Cloudinary");
  }
}

// https://res.cloudinary.com/demo/raw/upload/v1712345678/resumes/john-doe.pdf

function extractPublicId(url: string): {
  publicId: string;
  resourceType: ResourceType;
} {
  const rawMatch = url.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/);
  if (rawMatch) return { publicId: rawMatch[1]!, resourceType: "raw" };

  const imageMatch = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  if (imageMatch) return { publicId: imageMatch[1]!, resourceType: "image" };

  throw new Error(`Cannot parse Cloudinary URL: ${url}`);
}

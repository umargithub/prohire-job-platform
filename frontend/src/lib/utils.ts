import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cloudinary serves files inline by default. Inserting `fl_attachment` into
 * the delivery URL makes Cloudinary respond with `Content-Disposition:
 * attachment` so the browser downloads the file instead of navigating to it
 * — this must happen server-side (via the URL), since the `download`
 * attribute on an <a> tag is ignored for cross-origin links.
 */
export function toCloudinaryDownloadUrl(url: string): string {
  return url.replace("/upload/", "/upload/fl_attachment/");
}

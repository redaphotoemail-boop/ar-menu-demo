"use client";

/* Upload from the browser. With Vercel Blob connected, files go straight to
   storage. In demo mode, photos are kept as small data URLs and videos stay
   on the device for the session. */
export async function uploadFile(file: Blob, name: string, blobEnabled: boolean, onProgress?: (pct: number) => void): Promise<string> {
  if (blobEnabled) {
    const { upload } = await import("@vercel/blob/client");
    const res = await upload(name, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
    });
    return res.url;
  }
  onProgress?.(100);
  if (file.type.startsWith("image/")) return downscale(file, 1400);
  return URL.createObjectURL(file);
}

export async function downscale(file: Blob, max: number, quality = 0.86): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

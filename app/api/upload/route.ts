import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getUser } from "@/lib/auth";
import { env } from "@/lib/env";

/* Browser → Vercel Blob direct uploads (photos, videos, 360 frames, 3D files).
   Files never pass through our server, so 4K phone videos are fine. */
export async function POST(request: Request) {
  if (!env.blobToken) return Response.json({ error: "Storage not connected" }, { status: 503 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      token: env.blobToken,
      onBeforeGenerateToken: async () => {
        const user = await getUser();
        if (!user) throw new Error("Sign in first");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime", "video/webm", "model/gltf-binary", "model/vnd.usdz+zip", "application/octet-stream"],
          maximumSizeInBytes: 300 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}

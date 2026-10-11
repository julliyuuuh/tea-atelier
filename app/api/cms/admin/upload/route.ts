import { NextResponse } from "next/server";
import type { UploadApiResponse } from "cloudinary";
import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Choose a JPG, PNG or WebP image up to 5 MB." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";
    if (!jpeg && !png && !webp) {
      return NextResponse.json(
        { error: "Choose a JPG, PNG or WebP image." },
        { status: 400 },
      );
    }
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "tea-atelier/cms",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            transformation: [{ width: 2400, height: 2400, crop: "limit" }],
          },
          (error, result) => {
            if (error || !result) reject(error || new Error("Upload failed."));
            else resolve(result);
          },
        )
        .end(bytes);
    });
    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json(
      { error: "Unable to upload image. Please try again." },
      { status: 500 },
    );
  }
}

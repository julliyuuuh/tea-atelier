import { NextResponse } from "next/server";
import type { UploadApiResponse } from "cloudinary";
import cloudinary from "@/lib/cloudinary";
import { campaignAdmin, marketingResponseError } from "@/lib/marketing-api";
import { MarketingError } from "@/lib/marketing";
export async function POST(req: Request) {
  try {
    const auth = await campaignAdmin(req);
    if (auth.error) return auth.error;
    const file = (await req.formData()).get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    )
      throw new MarketingError("Choose a JPG, PNG or WebP image up to 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";
    if (!jpeg && !png && !webp)
      throw new MarketingError("Choose a JPG, PNG or WebP image.");
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "tea-atelier/campaigns",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            transformation: [{ width: 1200, height: 1200, crop: "limit" }],
          },
          (error, result) => {
            if (error || !result) reject(error || new Error("Upload failed."));
            else resolve(result);
          },
        )
        .end(bytes);
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    return marketingResponseError(error);
  }
}

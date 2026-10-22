import sharp from "sharp";
import { createHash } from "node:crypto";
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
export async function sanitizeImage(input: Buffer, mime: string) {
  if (input.length < 12 || input.length > MAX_MEDIA_BYTES)
    throw new Error("Use an image no larger than 2 MiB.");
  const format =
    input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff
      ? "jpeg"
      : input
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : input.toString("ascii", 0, 4) === "RIFF" &&
            input.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
  if (!format || mime !== `image/${format}`)
    throw new Error(
      "Use a JPEG, PNG or WebP image. Convert HEIC files before uploading.",
    );
  const image = sharp(input, {
    limitInputPixels: 20000000,
    animated: false,
    failOn: "warning",
  }).timeout({ seconds: 5 });
  const metadata = await image.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > 20000000 ||
    (metadata.pages ?? 1) !== 1
  )
    throw new Error("Use a still image of at most 20 megapixels.");
  // rotate applies EXIF orientation. Sharp strips metadata unless explicitly asked to retain it.
  const { data, info } = await image
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  if (data.length > MAX_MEDIA_BYTES)
    throw new Error("The processed image is too large. Use a smaller image.");
  return {
    data,
    width: info.width,
    height: info.height,
    digest: createHash("sha256").update(data).digest("hex"),
  };
}

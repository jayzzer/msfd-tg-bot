import * as fs from "fs/promises";
import sharp from "sharp";
import { MaskOption } from "./masks";
import type { OutputFormat } from "./types";

export async function processImage(
  inputPath: string,
  mask: MaskOption,
  format: OutputFormat,
  outputPath: string
): Promise<void> {
  let inputSharp: sharp.Sharp | null = null;
  let maskSharp: sharp.Sharp | null = null;

  try {
    // Создаём один инстанс sharp для входного изображения
    inputSharp = sharp(inputPath);
    const imageMetadata = await inputSharp.metadata();

    const originalWidth = imageMetadata.width || 800;
    const originalHeight = imageMetadata.height || 800;

    console.log(`Original image: ${originalWidth}x${originalHeight}`);
    console.log(`Target format: ${format.width}x${format.height}`);

    // Проверяем наличие маски
    try {
      await fs.access(mask.path);
    } catch {
      throw new Error(`Mask file not found: ${mask.path}`);
    }

    // Вычисляем кроп
    const targetAspectRatio = format.width / format.height;
    const originalAspectRatio = originalWidth / originalHeight;

    let cropWidth: number;
    let cropHeight: number;
    let cropLeft = 0;
    let cropTop = 0;

    if (originalAspectRatio > targetAspectRatio) {
      cropHeight = originalHeight;
      cropWidth = Math.floor(originalHeight * targetAspectRatio);
      cropLeft = Math.floor((originalWidth - cropWidth) / 2);
    } else {
      cropWidth = originalWidth;
      cropHeight = Math.floor(originalWidth / targetAspectRatio);
      cropTop = Math.floor((originalHeight - cropHeight) / 2);
    }

    // Масштабируем маску
    maskSharp = sharp(mask.path);
    const originalMaskMetadata = await maskSharp.metadata();
    const originalMaskWidth = originalMaskMetadata.width || 200;
    const originalMaskHeight = originalMaskMetadata.height || 200;
    const maskAspectRatio = originalMaskHeight / originalMaskWidth;

    const scale = mask.scale ?? 0.8;
    const maskWidth = Math.floor(format.width * scale);
    const maskHeight = Math.floor(maskWidth * maskAspectRatio);

    const resizedMaskBuffer = await maskSharp
      .resize(maskWidth, maskHeight, { fit: "fill" })
      .png()
      .toBuffer();

    const maskLeft = Math.floor((format.width - maskWidth) / 2);
    const maskTop = Math.max(0, format.height - maskHeight);

    console.log(
      `Mask positioned at: ${maskLeft}, ${maskTop} (${maskWidth}x${maskHeight})`
    );

    // Формируем итоговое изображение без промежуточных toBuffer()
    await inputSharp
      .clone()
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .resize(format.width, format.height, { fit: "fill" })
      .composite([{ input: resizedMaskBuffer, top: maskTop, left: maskLeft }])
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    console.log(`Successfully created image: ${format.width}x${format.height}`);
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  } finally {
    // Явно уничтожаем пайплайны, чтобы освободить память libvips
    inputSharp?.destroy();
    maskSharp?.destroy();
  }
}

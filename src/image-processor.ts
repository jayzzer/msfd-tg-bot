import * as fs from "fs/promises";
import * as path from "path";
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
  const tmpMaskPath = path.join(
    path.dirname(outputPath),
    `.__mask_${Date.now()}.png`
  );

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

    // Масштабируем маску и сохраняем во временный файл
    maskSharp = sharp(mask.path);
    const originalMaskMetadata = await maskSharp.metadata();
    const originalMaskWidth = originalMaskMetadata.width || 200;
    const originalMaskHeight = originalMaskMetadata.height || 200;
    const maskAspectRatio = originalMaskHeight / originalMaskWidth;

    const scale = mask.scale ?? 0.8;
    const maskWidth = Math.floor(format.width * scale);
    const maskHeight = Math.floor(maskWidth * maskAspectRatio);

    await maskSharp
      .resize(maskWidth, maskHeight, { fit: "fill" })
      .png()
      .toFile(tmpMaskPath);

    const maskLeft = Math.floor((format.width - maskWidth) / 2);
    const maskTop = Math.max(0, format.height - maskHeight);

    console.log(
      `Mask positioned at: ${maskLeft}, ${maskTop} (${maskWidth}x${maskHeight})`
    );

    // Формируем итоговое изображение
    await inputSharp
      .clone()
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .resize(format.width, format.height, { fit: "fill" })
      .composite([{ input: tmpMaskPath, top: maskTop, left: maskLeft }])
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    console.log(`Successfully created image: ${format.width}x${format.height}`);
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  } finally {
    // Удаляем временный файл маски
    try {
      await fs.unlink(tmpMaskPath);
    } catch {}
    // Явно уничтожаем пайплайны
    inputSharp?.destroy();
    maskSharp?.destroy();
  }
}

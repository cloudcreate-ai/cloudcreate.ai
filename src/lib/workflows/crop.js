/**
 * 图片裁剪工作流 - 纯逻辑，无 UI/框架依赖
 * 接收裁剪后的 canvas，输出 blob
 * Cropper.js 的 canvas 由视图层传入
 */
import {
  encodeImage,
  encodePngQuantized,
  getFormatFromFile,
} from '../imageProcessor.js';

/**
 * 从裁剪后的 canvas 生成输出文件
 * @param {HTMLCanvasElement} canvas - Cropper.getCroppedCanvas() 返回值
 * @param {File} file - 原文件（用于推断格式和输出名）
 * @param {{ quality?: number, targetFormat?: string }} options - targetFormat 为空时使用原图格式
 * @returns {Promise<{ blob: Blob, outputName: string, width: number, height: number }>}
 */
export async function cropToBlob(canvas, file, { quality = 75, targetFormat } = {}) {
  const format = (targetFormat || getFormatFromFile(file) || 'png').toLowerCase().replace('jpg', 'jpeg');
  const q = Math.min(100, Math.max(0, Number(quality) || 75));

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let result;
  if (format === 'png') {
    result = encodePngQuantized(imageData, q);
  } else {
    result = await encodeImage(imageData, format, q);
  }
  const { buffer, mime, ext } = result;
  const blob = new Blob([buffer], { type: mime });

  const outputName = file.name.replace(/\.[^.]+$/, '') + '-cropped.' + ext;
  return {
    blob,
    outputName,
    width: canvas.width,
    height: canvas.height,
  };
}

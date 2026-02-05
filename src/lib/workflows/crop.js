/**
 * 图片裁剪工作流 - 纯逻辑，无 UI/框架依赖
 * 接收裁剪后的 canvas，输出 blob
 * Cropper.js 的 canvas 由视图层传入
 */
import { getFormatFromFile } from '../imageProcessor.js';

/**
 * 从裁剪后的 canvas 生成输出文件
 * @param {HTMLCanvasElement} canvas - Cropper.getCroppedCanvas() 返回值
 * @param {File} file - 原文件（用于推断格式和输出名）
 * @param {{ quality?: number }} options
 * @returns {Promise<{ blob: Blob, outputName: string, width: number, height: number }>}
 */
export async function cropToBlob(canvas, file, { quality = 0.92 } = {}) {
  const format = getFormatFromFile(file);
  const mime = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  const q = ['jpeg', 'jpg', 'webp'].includes(format) ? quality : undefined;

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, mime, q);
  });
  if (!blob) throw new Error('Failed to generate output');

  const ext = format === 'jpeg' ? 'jpg' : format;
  const outputName = file.name.replace(/\.[^.]+$/, '') + '-cropped.' + ext;
  return {
    blob,
    outputName,
    width: canvas.width,
    height: canvas.height,
  };
}

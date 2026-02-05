/**
 * 图片格式转换工作流 - 纯逻辑，无 UI/框架依赖
 * 可被 Convert 工具、组合工作流等复用
 */
import { fileToImageData, encodeImage, getFormatFromFile } from '../imageProcessor.js';

/**
 * 转换单张图片格式
 * @param {File} file - 源图片
 * @param {{ targetFormat: string, quality: number }} options
 * @returns {Promise<{ blob: Blob, outputName: string, newSize: number, ratio: number }>}
 */
export async function convertImage(file, { targetFormat = 'jpeg', quality = 75 } = {}) {
  const imageData = await fileToImageData(file);
  const { buffer, mime, ext } = await encodeImage(imageData, targetFormat, quality);
  const blob = new Blob([buffer], { type: mime });
  const newSize = blob.size;
  const ratio = file.size > 0 ? (1 - newSize / file.size) * 100 : 0;
  const outputName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  return { blob, outputName, newSize, ratio };
}

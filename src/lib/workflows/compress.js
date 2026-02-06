/**
 * 图片压缩工作流 - 纯逻辑，无 UI/框架依赖
 * 可被 Compress 工具、组合工作流等复用
 */
import {
  fileToImageData,
  encodeImage,
  encodePngQuantized,
  getFormatFromFile,
} from '../imageProcessor.js';

/**
 * 压缩单张图片
 * @param {File} file - 源图片
 * @param {{ quality: number, targetFormat?: string }} options - targetFormat 为空时使用原图格式
 * @returns {Promise<{ blob: Blob, outputName: string, newSize: number, ratio: number }>}
 */
export async function compressImage(file, { quality = 75, targetFormat } = {}) {
  const imageData = await fileToImageData(file);
  const format = (targetFormat || getFormatFromFile(file) || 'png').toLowerCase().replace('jpg', 'jpeg');
  const q = Math.min(100, Math.max(0, Number(quality) || 75));
  let result;
  if (format === 'png') {
    result = encodePngQuantized(imageData, q);
  } else {
    result = await encodeImage(imageData, format, q);
  }
  const { buffer, mime, ext } = result;
  const blob = new Blob([buffer], { type: mime });
  const newSize = blob.size;
  const ratio = file.size > 0 ? (1 - newSize / file.size) * 100 : 0;
  const outputName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  return { blob, outputName, newSize, ratio };
}

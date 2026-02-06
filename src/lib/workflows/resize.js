/**
 * 图片缩放工作流 - 纯逻辑
 * 支持按比例缩放、按最大边缩放
 */
import {
  fileToImageData,
  encodeImage,
  encodePngQuantized,
  getFormatFromFile,
} from '../imageProcessor.js';

/**
 * 将 ImageData 缩放到新尺寸（使用 canvas 双线性插值）
 * @param {ImageData} imageData
 * @param {number} newWidth
 * @param {number} newHeight
 * @returns {ImageData}
 */
function scaleImageData(imageData, newWidth, newHeight) {
  const w = imageData.width;
  const h = imageData.height;
  if (newWidth === w && newHeight === h) return imageData;

  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  src.getContext('2d').putImageData(imageData, 0, 0);

  const dst = document.createElement('canvas');
  dst.width = newWidth;
  dst.height = newHeight;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h, 0, 0, newWidth, newHeight);
  return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * 计算缩放后的尺寸
 * @param {number} w 原宽
 * @param {number} h 原高
 * @param {'percent'|'max'|'width'|'height'|'long'} mode
 * @param {number} percent 1-200
 * @param {number} maxW
 * @param {number} maxH
 * @param {number} targetW 按宽时目标宽度
 * @param {number} targetH 按高时目标高度
 * @param {number} targetLong 按长边时目标像素
 */
function computeSize(w, h, mode, percent, maxW, maxH, targetW, targetH, targetLong) {
  if (mode === 'percent') {
    const p = Math.min(200, Math.max(1, percent)) / 100;
    return { width: Math.max(1, Math.round(w * p)), height: Math.max(1, Math.round(h * p)) };
  }
  if (mode === 'width') {
    const tw = Math.max(1, targetW || w);
    const r = tw / w;
    return { width: tw, height: Math.max(1, Math.round(h * r)) };
  }
  if (mode === 'height') {
    const th = Math.max(1, targetH || h);
    const r = th / h;
    return { width: Math.max(1, Math.round(w * r)), height: th };
  }
  if (mode === 'long') {
    const tl = Math.max(1, targetLong || Math.max(w, h));
    const long = Math.max(w, h);
    if (long <= tl) return { width: w, height: h };
    const r = tl / long;
    return { width: Math.max(1, Math.round(w * r)), height: Math.max(1, Math.round(h * r)) };
  }
  // max: fit within maxW x maxH, keep aspect
  const mw = Math.max(1, maxW || w);
  const mh = Math.max(1, maxH || h);
  if (w <= mw && h <= mh) return { width: w, height: h };
  const r = Math.min(mw / w, mh / h);
  return { width: Math.max(1, Math.round(w * r)), height: Math.max(1, Math.round(h * r)) };
}

/**
 * 缩放单张图片
 * @param {File} file
 * @param {{ scaleMode, scalePercent, maxWidth, maxHeight, targetWidth, targetHeight, targetLong, quality }} options
 */
export async function resizeImage(file, options = {}) {
  const {
    scaleMode = 'percent',
    scalePercent = 50,
    maxWidth = 1920,
    maxHeight = 1080,
    targetWidth = 1920,
    targetHeight = 1080,
    targetLong = 1920,
    quality = 75,
  } = options;
  const imageData = await fileToImageData(file);
  const { width: w, height: h } = imageData;
  const { width: newW, height: newH } = computeSize(
    w,
    h,
    scaleMode,
    scalePercent,
    maxWidth,
    maxHeight,
    targetWidth,
    targetHeight,
    targetLong
  );

  const scaled = scaleImageData(imageData, newW, newH);
  const format = (options.targetFormat || getFormatFromFile(file) || 'png').toLowerCase().replace('jpg', 'jpeg');
  const q = Math.min(100, Math.max(0, Number(quality) || 75));

  let result;
  if (format === 'png') {
    result = encodePngQuantized(scaled, q);
  } else {
    result = await encodeImage(scaled, format, q);
  }
  const { buffer, mime, ext } = result;
  const blob = new Blob([buffer], { type: mime });
  const newSize = blob.size;
  const ratio = file.size > 0 ? (1 - newSize / file.size) * 100 : 0;
  const outputName = file.name.replace(/\.[^.]+$/, '') + '-resized.' + ext;

  return {
    blob,
    outputName,
    newSize,
    ratio,
    width: newW,
    height: newH,
  };
}

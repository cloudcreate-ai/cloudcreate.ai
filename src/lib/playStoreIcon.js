/**
 * Play 商店图标生成 - 512×512 PNG（Google Play 要求）
 * 规范：32-bit PNG, sRGB, 最大 1024KB, 完整正方形
 */
import { fileToImageData } from './imageProcessor.js';
import { encodeImage } from './imageProcessor.js';

const PLAY_STORE_SIZE = 512;

/** 从 ImageData 裁剪中心正方形 */
function cropCenterSquare(imageData) {
  const w = imageData.width;
  const h = imageData.height;
  const s = Math.min(w, h);
  const x0 = Math.floor((w - s) / 2);
  const y0 = Math.floor((h - s) / 2);
  const dst = new ImageData(s, s);
  const srcData = imageData.data;
  const dstData = dst.data;
  for (let dy = 0; dy < s; dy++) {
    const srcRow = (y0 + dy) * w * 4;
    const dstRow = dy * s * 4;
    for (let dx = 0; dx < s * 4; dx++) {
      dstData[dstRow + dx] = srcData[srcRow + x0 * 4 + dx];
    }
  }
  return dst;
}

/** 缩放 ImageData */
function scaleImageData(imageData, newSize) {
  const w = imageData.width;
  const h = imageData.height;
  if (w === newSize && h === newSize) return imageData;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  src.getContext('2d').putImageData(imageData, 0, 0);
  const dst = document.createElement('canvas');
  dst.width = newSize;
  dst.height = newSize;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h, 0, 0, newSize, newSize);
  return ctx.getImageData(0, 0, newSize, newSize);
}

/**
 * 生成 Play 商店图标（512×512 PNG）
 * @param {File} file - 输入图片
 * @returns {Promise<{ blob: Blob, name: string }>}
 */
export async function generatePlayStoreIcon(file) {
  const imageData = await fileToImageData(file);
  const square = cropCenterSquare(imageData);
  const scaled = scaleImageData(square, PLAY_STORE_SIZE);
  const { buffer, mime } = await encodeImage(scaled, 'png');
  const blob = new Blob([buffer], { type: mime });
  const base = file.name.replace(/\.[^.]+$/, '') || 'icon';
  const name = `${base}-512.png`;
  return { blob, name };
}

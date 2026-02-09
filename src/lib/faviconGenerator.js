/**
 * Favicon 图标生成 - 将图片裁剪为正方形并缩放到指定尺寸
 * 输出 PNG / ICO 格式
 */
import { fileToImageData } from './imageProcessor.js';
import { encodeImage } from './imageProcessor.js';

/** 将 PNG ArrayBuffer 打包为 ICO（PNG 嵌入格式，Windows Vista+，仅 16×16） */
function packPngsToIco(pngBuffers) {
  const entries = [];
  let offset = 6 + 16 * pngBuffers.length;
  for (const { buffer, size } of pngBuffers) {
    const w = size === 256 ? 0 : size;
    const h = size === 256 ? 0 : size;
    const arr = new Uint8Array(buffer);
    entries.push({ w, h, size: arr.length, data: arr, offset });
    offset += arr.length;
  }
  const out = new Uint8Array(offset);
  const dv = new DataView(out.buffer);
  let pos = 0;
  dv.setUint16(pos, 0, true);
  pos += 2;
  dv.setUint16(pos, 1, true);
  pos += 2;
  dv.setUint16(pos, pngBuffers.length, true);
  pos += 2;
  for (const e of entries) {
    out[pos++] = e.w;
    out[pos++] = e.h;
    out[pos++] = 0;
    out[pos++] = 0;
    dv.setUint16(pos, 1, true);
    pos += 2;
    dv.setUint16(pos, 32, true);
    pos += 2;
    dv.setUint32(pos, e.size, true);
    pos += 4;
    dv.setUint32(pos, e.offset, true);
    pos += 4;
  }
  for (const e of entries) {
    out.set(e.data, e.offset);
  }
  return out.buffer;
}

/** 常用 favicon 尺寸及用途 */
export const FAVICON_SIZES = [
  { size: 16, name: 'favicon-16x16', desc: 'Browser tab' },
  { size: 32, name: 'favicon-32x32', desc: 'Browser tab (high DPI)' },
  { size: 48, name: 'favicon-48x48', desc: 'Windows site icon' },
  { size: 180, name: 'apple-touch-icon', desc: 'Apple Touch Icon' },
  { size: 192, name: 'android-chrome-192x192', desc: 'Android Chrome' },
  { size: 512, name: 'android-chrome-512x512', desc: 'PWA' },
];

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
 * 生成 favicon 图标
 * @param {File} file - 输入图片
 * @param {number[]} sizes - 目标尺寸列表，如 [16, 32, 48, 180]
 * @param {object} options - { includeIco: boolean } 是否同时生成 favicon.ico
 * @returns {Promise<Array<{ size?: number, name: string, blob: Blob, format: 'png'|'ico' }>>}
 */
export async function generateFavicons(file, sizes, options = {}) {
  const { includeIco = false } = options;
  const imageData = await fileToImageData(file);
  const square = cropCenterSquare(imageData);
  const results = [];
  let icoPng = null;

  for (const targetSize of sizes) {
    const scaled = scaleImageData(square, targetSize);
    const { buffer, mime } = await encodeImage(scaled, 'png');
    const blob = new Blob([buffer], { type: mime });
    const def = FAVICON_SIZES.find((d) => d.size === targetSize);
    const name = def ? `${def.name}.png` : `favicon-${targetSize}x${targetSize}.png`;
    results.push({ size: targetSize, name, blob, format: 'png' });
    if (includeIco && targetSize === 16) {
      icoPng = { buffer, size: 16 };
    }
  }

  if (includeIco && !icoPng) {
    const scaled = scaleImageData(square, 16);
    const { buffer } = await encodeImage(scaled, 'png');
    icoPng = { buffer, size: 16 };
  }

  if (includeIco && icoPng) {
    const icoBuffer = packPngsToIco([icoPng]);
    const icoBlob = new Blob([icoBuffer], { type: 'image/x-icon' });
    results.push({ name: 'favicon.ico', blob: icoBlob, format: 'ico' });
  }

  return results;
}

/**
 * 图片处理工具 - 基于 jSquash 实现解码/编码
 * 支持格式: JPEG, PNG, WebP, AVIF
 * PNG 压缩使用 UPNG.js 输出 8 位索引 PNG (cnum > 0)
 */
import { decode as jpegDecode, encode as jpegEncode } from '@jsquash/jpeg';
import { decode as pngDecode, encode as pngEncode } from '@jsquash/png';
import { decode as webpDecode, encode as webpEncode } from '@jsquash/webp';
import { decode as avifDecode, encode as avifEncode } from '@jsquash/avif';
import UPNG from 'upng-js';

const CODECS = {
  jpeg: { decode: jpegDecode, encode: jpegEncode, mime: 'image/jpeg', ext: 'jpg' },
  jpg: { decode: jpegDecode, encode: jpegEncode, mime: 'image/jpeg', ext: 'jpg' },
  png: { decode: pngDecode, encode: pngEncode, mime: 'image/png', ext: 'png' },
  webp: { decode: webpDecode, encode: webpEncode, mime: 'image/webp', ext: 'webp' },
  avif: { decode: avifDecode, encode: avifEncode, mime: 'image/avif', ext: 'avif' },
};

/** 根据 MIME 或扩展名获取 codec */
function getCodec(format) {
  const key = format?.toLowerCase().replace('image/', '').replace(/^\./, '');
  return CODECS[key] || null;
}

/** 从 ArrayBuffer 解码为 ImageData */
export async function decodeImage(buffer, mimeType) {
  const codec = getCodec(mimeType);
  if (!codec) throw new Error(`Unsupported format: ${mimeType}`);
  return codec.decode(buffer);
}

/** 将 ImageData 编码为目标格式，quality 仅对有损格式有效 (0-100) */
export async function encodeImage(imageData, targetFormat, quality = 75) {
  const codec = getCodec(targetFormat);
  if (!codec) throw new Error(`Unsupported format: ${targetFormat}`);

  const opts = {};
  if (['jpeg', 'jpg', 'webp', 'avif'].includes(targetFormat.toLowerCase().replace('image/', ''))) {
    opts.quality = Math.min(100, Math.max(0, quality));
  }
  if (targetFormat.toLowerCase().includes('avif')) {
    opts.lossless = opts.quality >= 100;
  }

  const buffer = await codec.encode(imageData, opts);
  return { buffer, mime: codec.mime, ext: codec.ext };
}

/** 从 File 推断格式 */
export function getFormatFromFile(file) {
  const mime = (file.type || '').toLowerCase();
  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  if (mime.includes('jpeg') || mime.includes('jpg') || ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (mime.includes('png') || ext === 'png') return 'png';
  if (mime.includes('webp') || ext === 'webp') return 'webp';
  if (mime.includes('avif') || ext === 'avif') return 'avif';
  return 'png';
}

/** 从 File 获取图片宽高 */
export async function getImageDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  bitmap.close();
  return { width: w, height: h };
}

/** 格式化文件大小显示 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * PNG 有损压缩 - 使用 UPNG 输出 8 位索引 PNG (类似 TinyPNG)
 * @param {ImageData} imageData
 * @param {number} quality 1-100，越低颜色越少压缩率越高
 * @returns {{ buffer: ArrayBuffer, mime: string, ext: string }}
 */
export function encodePngQuantized(imageData, quality = 75) {
  const colors = Math.max(32, Math.min(256, Math.round(32 + (quality / 100) * 224)));
  const d = imageData.data;
  // 恢复重构前实现：slice 保证精确长度，与 b8a23bc 一致
  const buf = d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength);
  const png = UPNG.encode([buf], imageData.width, imageData.height, colors);
  return { buffer: png, mime: 'image/png', ext: 'png' };
}

/** 从 File 解码为 ImageData */
export async function fileToImageData(file) {
  const buffer = await file.arrayBuffer();
  const mime = file.type || 'image/png';
  return decodeImage(buffer, mime);
}

/** 支持的解码格式列表 */
export const DECODE_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
/** 支持的编码格式列表 */
export const ENCODE_FORMATS = ['jpeg', 'png', 'webp', 'avif'];

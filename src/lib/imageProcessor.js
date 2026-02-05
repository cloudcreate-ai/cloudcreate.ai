/**
 * 图片处理工具 - 基于 jSquash 实现解码/编码
 * 支持格式: JPEG, PNG, WebP, AVIF
 */
import { decode as jpegDecode, encode as jpegEncode } from '@jsquash/jpeg';
import { decode as pngDecode, encode as pngEncode } from '@jsquash/png';
import { decode as webpDecode, encode as webpEncode } from '@jsquash/webp';
import { decode as avifDecode, encode as avifEncode } from '@jsquash/avif';

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

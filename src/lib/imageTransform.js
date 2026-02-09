/**
 * 图片旋转与镜像变换
 */
import { fileToImageData } from './imageProcessor.js';
import { encodeImage, getFormatFromFile } from './imageProcessor.js';

/** 旋转角度：0, 90, 180, 270 (顺时针度数) */
/** 镜像：horizontal 水平翻转, vertical 垂直翻转 */

/**
 * 对 ImageData 进行旋转和镜像变换
 * @param {ImageData} imageData
 * @param {number} rotate - 0, 90, 180, 270 (顺时针)
 * @param {boolean} flipH - 水平镜像
 * @param {boolean} flipV - 垂直镜像
 * @returns {ImageData}
 */
function transformImageData(imageData, rotate = 0, flipH = false, flipV = false) {
  const w = imageData.width;
  const h = imageData.height;
  const is90or270 = rotate === 90 || rotate === 270;
  const outW = is90or270 ? h : w;
  const outH = is90or270 ? w : h;

  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  src.getContext('2d').putImageData(imageData, 0, 0);

  let canvas = src;
  let cw = w;
  let ch = h;

  if (rotate !== 0) {
    const r = document.createElement('canvas');
    r.width = outW;
    r.height = outH;
    const rctx = r.getContext('2d');
    rctx.imageSmoothingEnabled = true;
    rctx.imageSmoothingQuality = 'high';
    rctx.translate(outW / 2, outH / 2);
    if (rotate === 90) rctx.rotate(Math.PI / 2);
    else if (rotate === 180) rctx.rotate(Math.PI);
    else if (rotate === 270) rctx.rotate(-Math.PI / 2);
    rctx.translate(-w / 2, -h / 2);
    rctx.drawImage(canvas, 0, 0);
    canvas = r;
    cw = outW;
    ch = outH;
  }

  if (!flipH && !flipV) {
    return canvas.getContext('2d').getImageData(0, 0, cw, ch);
  }

  const dst = document.createElement('canvas');
  dst.width = cw;
  dst.height = ch;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(flipH ? cw : 0, flipV ? ch : 0);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(canvas, 0, 0);
  return ctx.getImageData(0, 0, cw, ch);
}

/**
 * 单张图片旋转/镜像处理
 * @param {File} file
 * @param {object} options - { rotate: 0|90|180|270, flipH: bool, flipV: bool, targetFormat: string, quality: number }
 * @returns {Promise<{ blob: Blob, outputName: string, width: number, height: number, error?: string }>}
 */
export async function transformImage(file, options = {}) {
  const { rotate = 0, flipH = false, flipV = false, targetFormat = '', quality = 75 } = options;
  try {
    const imageData = await fileToImageData(file);
    const transformed = transformImageData(imageData, rotate, flipH, flipV);
    const format = targetFormat || getFormatFromFile(file) || 'png';
    const { buffer, mime, ext } = await encodeImage(transformed, format, quality);
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    const outputName = `${base}.${ext}`;
    const blob = new Blob([buffer], { type: mime });
    return {
      blob,
      outputName,
      width: transformed.width,
      height: transformed.height,
    };
  } catch (e) {
    return { error: e.message || 'Transform failed' };
  }
}

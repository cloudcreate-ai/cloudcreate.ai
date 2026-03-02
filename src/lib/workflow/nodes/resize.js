/**
 * Resize 节点 - ImageData -> ImageData
 * 复用 resize 工作流的 scaleImageData + computeSize
 */
import { DATA_TYPES } from '../types.js';

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

function computeSize(w, h, mode, percent, maxW, maxH, targetW, targetH, targetLong) {
  if (mode === 'exact') {
    return {
      width: Math.max(1, Math.round(targetW || w)),
      height: Math.max(1, Math.round(targetH || h)),
    };
  }
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
  const mw = Math.max(1, maxW || w);
  const mh = Math.max(1, maxH || h);
  if (w <= mw && h <= mh) return { width: w, height: h };
  const r = Math.min(mw / w, mh / h);
  return { width: Math.max(1, Math.round(w * r)), height: Math.max(1, Math.round(h * r)) };
}

export const resizeNode = {
  type: 'resize',
  label: 'Resize',
  inputs: [{ name: 'imageData', type: DATA_TYPES.IMAGE_DATA }],
  outputs: [{ name: 'imageData', type: DATA_TYPES.IMAGE_DATA }],
  params: {
    scaleMode: { type: 'string', default: 'percent' },
    scalePercent: { type: 'number', default: 50 },
    maxWidth: { type: 'number', default: 1920 },
    maxHeight: { type: 'number', default: 1080 },
    targetWidth: { type: 'number', default: 1920 },
    targetHeight: { type: 'number', default: 1080 },
    targetLong: { type: 'number', default: 1920 },
  },
  async execute(inputs, params, context) {
    const imageData = inputs.imageData;
    if (!imageData) throw new Error('Resize: missing imageData input');
    const { width: w, height: h } = imageData;
    const { width: newW, height: newH } = computeSize(
      w,
      h,
      params.scaleMode || 'percent',
      params.scalePercent ?? 50,
      params.maxWidth ?? 1920,
      params.maxHeight ?? 1080,
      params.targetWidth ?? 1920,
      params.targetHeight ?? 1080,
      params.targetLong ?? 1920
    );
    const scaled = scaleImageData(imageData, newW, newH);
    return { imageData: scaled };
  },
};

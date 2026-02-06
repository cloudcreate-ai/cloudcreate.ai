/**
 * Crop 节点 - ImageData -> ImageData
 * 占位实现：若 params 无有效区域则使用全图；Phase3 接入 requestCropRegion
 */
import { DATA_TYPES } from '../types.js';

/** 从 ImageData 按区域裁剪 */
function cropImageData(imageData, region) {
  const { x, y, width, height } = region;
  const src = imageData;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const w = Math.min(src.width - x0, Math.max(1, Math.floor(width)));
  const h = Math.min(src.height - y0, Math.max(1, Math.floor(height)));
  const dst = new ImageData(w, h);
  const srcData = src.data;
  const dstData = dst.data;
  for (let dy = 0; dy < h; dy++) {
    const srcRow = (y0 + dy) * src.width * 4;
    const dstRow = dy * w * 4;
    for (let dx = 0; dx < w * 4; dx++) {
      dstData[dstRow + dx] = srcData[srcRow + x0 * 4 + dx];
    }
  }
  return dst;
}

export const cropNode = {
  type: 'crop',
  label: 'Crop',
  inputs: [{ name: 'imageData', type: DATA_TYPES.IMAGE_DATA }],
  outputs: [{ name: 'imageData', type: DATA_TYPES.IMAGE_DATA }],
  params: {
    x: { type: 'number', default: 0 },
    y: { type: 'number', default: 0 },
    width: { type: 'number', default: 0 },
    height: { type: 'number', default: 0 },
    aspectRatio: { type: 'number', default: 0 },
  },
  async execute(inputs, params, context) {
    const imageData = inputs.imageData;
    if (!imageData) throw new Error('Crop: missing imageData input');
    let region = {
      x: params.x ?? 0,
      y: params.y ?? 0,
      width: params.width ?? 0,
      height: params.height ?? 0,
    };
    if (!region.width || !region.height) {
      if (context.requestCropRegion) {
        region = await context.requestCropRegion(imageData, params);
      } else {
        region = { x: 0, y: 0, width: imageData.width, height: imageData.height };
      }
    }
    const cropped = cropImageData(imageData, region);
    return { imageData: cropped };
  },
};

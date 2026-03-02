/**
 * Encode 节点 - ImageData -> Blob
 */
import { DATA_TYPES } from '../types.js';
import {
  encodeImage,
  encodePngQuantized,
  getFormatFromFile,
} from '../../imageProcessor.js';

export const encodeNode = {
  type: 'encode',
  label: 'Encode',
  inputs: [{ name: 'imageData', type: DATA_TYPES.IMAGE_DATA }],
  outputs: [
    { name: 'blob', type: DATA_TYPES.BLOB },
    { name: 'width', type: DATA_TYPES.NUMBER },
    { name: 'height', type: DATA_TYPES.NUMBER },
  ],
  params: {
    targetFormat: { type: 'string', default: '' },
    quality: { type: 'number', default: 75 },
  },
  async execute(inputs, params, context) {
    const imageData = inputs.imageData;
    if (!imageData) throw new Error('Encode: missing imageData input');
    const file = context.file;
    const format = (params.targetFormat || (file && getFormatFromFile(file)) || 'png')
      .toLowerCase()
      .replace('jpg', 'jpeg');
    const q = Math.min(100, Math.max(0, Number(params.quality) || 75));
    let result;
    if (format === 'png') {
      result = encodePngQuantized(imageData, q);
    } else {
      result = await encodeImage(imageData, format, q);
    }
    const { buffer, mime } = result;
    const blob = new Blob([buffer], { type: mime });
    return {
      blob,
      width: imageData.width,
      height: imageData.height,
    };
  },
};

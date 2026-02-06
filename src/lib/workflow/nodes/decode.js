/**
 * Decode 节点 - File -> ImageData
 */
import { DATA_TYPES } from '../types.js';
import { fileToImageData } from '../../imageProcessor.js';

export const decodeNode = {
  type: 'decode',
  label: 'Decode',
  inputs: [{ name: 'file', type: DATA_TYPES.FILE }],
  outputs: [{ name: 'imageData', type: DATA_TYPES.IMAGE_DATA }],
  params: {},
  async execute(inputs, params, context) {
    const file = inputs.file;
    if (!file) throw new Error('Decode: missing file input');
    const imageData = await fileToImageData(file);
    return { imageData };
  },
};

/**
 * Output 节点 - Blob 输入，透传尺寸信息给 runner
 */
import { DATA_TYPES } from '../types.js';

export const outputNode = {
  type: 'output',
  label: 'Output',
  inputs: [
    { name: 'blob', type: DATA_TYPES.BLOB },
    { name: 'width', type: DATA_TYPES.NUMBER },
    { name: 'height', type: DATA_TYPES.NUMBER },
  ],
  outputs: [],
  params: {},
  async execute(inputs, params, context) {
    const blob = inputs.blob;
    if (!blob) throw new Error('Output: missing blob input');
    if (context.onOutput) {
      context.onOutput(blob, context);
    }
    return {
      blob,
      width: inputs.width,
      height: inputs.height,
    };
  },
};

/**
 * Output 节点 - Blob 输入，触发下载（无输出到下游）
 */
import { DATA_TYPES } from '../types.js';

export const outputNode = {
  type: 'output',
  label: 'Output',
  inputs: [{ name: 'blob', type: DATA_TYPES.BLOB }],
  outputs: [],
  params: {},
  async execute(inputs, params, context) {
    const blob = inputs.blob;
    if (!blob) throw new Error('Output: missing blob input');
    if (context.onOutput) {
      context.onOutput(blob, context);
    }
    return {};
  },
};

/**
 * Input 节点 - 无输入，输出 File（由 Runner 注入）
 */
import { DATA_TYPES } from '../types.js';

export const inputNode = {
  type: 'input',
  label: 'Input',
  inputs: [],
  outputs: [{ name: 'file', type: DATA_TYPES.FILE }],
  params: {},
  async execute(inputs, params, context) {
    // File 由 Runner 在执行时注入
    return { file: context.file };
  },
};

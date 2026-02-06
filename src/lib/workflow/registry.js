/**
 * 节点注册表 - 按 type 获取节点定义
 */
import { inputNode } from './nodes/input.js';
import { decodeNode } from './nodes/decode.js';
import { cropNode } from './nodes/crop.js';
import { resizeNode } from './nodes/resize.js';
import { encodeNode } from './nodes/encode.js';
import { outputNode } from './nodes/output.js';

const registry = new Map();
[inputNode, decodeNode, cropNode, resizeNode, encodeNode, outputNode].forEach((def) => {
  registry.set(def.type, def);
});

export function getNodeDef(type) {
  return registry.get(type);
}

export function listNodeTypes() {
  return Array.from(registry.keys());
}

export function getAllNodeDefs() {
  return Array.from(registry.values());
}

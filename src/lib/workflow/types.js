/**
 * 工作流数据类型与节点 schema 定义
 * 数据类型: File | ImageData | Blob | CropRegion
 */

/** 数据类型常量 */
export const DATA_TYPES = {
  FILE: 'file',
  IMAGE_DATA: 'imageData',
  BLOB: 'blob',
  CROP_REGION: 'cropRegion',
};

/** 端口类型兼容性：源类型 -> 可连接的目标类型 */
export const TYPE_COMPATIBLE = {
  [DATA_TYPES.FILE]: [DATA_TYPES.FILE],
  [DATA_TYPES.IMAGE_DATA]: [DATA_TYPES.IMAGE_DATA],
  [DATA_TYPES.BLOB]: [DATA_TYPES.BLOB],
};

/** 校验两个端口类型是否可连接 */
export function canConnect(sourceType, targetType) {
  const allowed = TYPE_COMPATIBLE[sourceType];
  return allowed && allowed.includes(targetType);
}

/** 节点参数 schema: { name: { type, default, min?, max?, options? } } */
export const PARAM_SCHEMAS = {
  targetFormat: {
    type: 'string',
    default: '',
    options: ['', 'jpeg', 'png', 'webp', 'avif'],
  },
  quality: {
    type: 'number',
    default: 75,
    min: 1,
    max: 100,
  },
  scaleMode: {
    type: 'string',
    default: 'percent',
    options: ['percent', 'max', 'width', 'height', 'long'],
  },
  scalePercent: {
    type: 'number',
    default: 50,
    min: 1,
    max: 200,
  },
  maxWidth: {
    type: 'number',
    default: 1920,
    min: 1,
  },
  maxHeight: {
    type: 'number',
    default: 1080,
    min: 1,
  },
  targetWidth: {
    type: 'number',
    default: 1920,
    min: 1,
  },
  targetHeight: {
    type: 'number',
    default: 1080,
    min: 1,
  },
  targetLong: {
    type: 'number',
    default: 1920,
    min: 1,
  },
  aspectRatio: {
    type: 'number',
    default: 0,
    description: '0=自由',
  },
  x: { type: 'number', default: 0, min: 0 },
  y: { type: 'number', default: 0, min: 0 },
  width: { type: 'number', default: 0, min: 0 },
  height: { type: 'number', default: 0, min: 0 },
};

/** 节点定义接口
 * @typedef {Object} NodeDef
 * @property {string} type - 唯一标识
 * @property {string} label - 显示名
 * @property {{ name: string, type: string }[]} inputs
 * @property {{ name: string, type: string }[]} outputs
 * @property {Record<string, object>} [params] - 参数 schema
 * @property {(inputs: object, params: object, context: object) => Promise<object>} execute
 */

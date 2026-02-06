/**
 * 预设工作流 - 对应原有压缩、缩放、裁剪工具
 */

const baseNodes = (presetId) => [
  { id: `${presetId}-input`, type: 'input', position: { x: 0, y: 100 } },
  { id: `${presetId}-decode`, type: 'decode', position: { x: 200, y: 100 } },
  { id: `${presetId}-encode`, type: 'encode', position: { x: 400, y: 100 }, params: { targetFormat: 'webp', quality: 75 } },
  { id: `${presetId}-output`, type: 'output', position: { x: 600, y: 100 } },
];

const baseEdges = (presetId) => [
  { id: `e1-${presetId}`, source: `${presetId}-input`, target: `${presetId}-decode`, sourceHandle: 'file', targetHandle: 'file' },
  { id: `e2-${presetId}`, source: `${presetId}-decode`, target: `${presetId}-encode`, sourceHandle: 'imageData', targetHandle: 'imageData' },
  { id: `e3-${presetId}`, source: `${presetId}-encode`, target: `${presetId}-output`, sourceHandle: 'blob', targetHandle: 'blob' },
];

/** 压缩：Input -> Decode -> Encode -> Output */
export const compressPreset = {
  id: 'compress',
  name: 'Compress',
  nodes: baseNodes('compress'),
  edges: baseEdges('compress'),
};

/** 缩放：Input -> Decode -> Resize -> Encode -> Output */
export const resizePreset = {
  id: 'resize',
  name: 'Resize',
  nodes: [
    { id: 'resize-input', type: 'input', position: { x: 0, y: 100 } },
    { id: 'resize-decode', type: 'decode', position: { x: 200, y: 100 } },
    {
      id: 'resize-resize',
      type: 'resize',
      position: { x: 400, y: 100 },
      params: { scaleMode: 'percent', scalePercent: 50 },
    },
    { id: 'resize-encode', type: 'encode', position: { x: 600, y: 100 }, params: { targetFormat: '', quality: 75 } },
    { id: 'resize-output', type: 'output', position: { x: 800, y: 100 } },
  ],
  edges: [
    { id: 'e1-resize', source: 'resize-input', target: 'resize-decode', sourceHandle: 'file', targetHandle: 'file' },
    { id: 'e2-resize', source: 'resize-decode', target: 'resize-resize', sourceHandle: 'imageData', targetHandle: 'imageData' },
    { id: 'e3-resize', source: 'resize-resize', target: 'resize-encode', sourceHandle: 'imageData', targetHandle: 'imageData' },
    { id: 'e4-resize', source: 'resize-encode', target: 'resize-output', sourceHandle: 'blob', targetHandle: 'blob' },
  ],
};

/** 裁剪：Input -> Decode -> Crop -> Encode -> Output */
export const cropPreset = {
  id: 'crop',
  name: 'Crop',
  nodes: [
    { id: 'crop-input', type: 'input', position: { x: 0, y: 100 } },
    { id: 'crop-decode', type: 'decode', position: { x: 200, y: 100 } },
    { id: 'crop-crop', type: 'crop', position: { x: 400, y: 100 }, params: { aspectRatio: 0 } },
    { id: 'crop-encode', type: 'encode', position: { x: 600, y: 100 }, params: { targetFormat: '', quality: 75 } },
    { id: 'crop-output', type: 'output', position: { x: 800, y: 100 } },
  ],
  edges: [
    { id: 'e1-crop', source: 'crop-input', target: 'crop-decode', sourceHandle: 'file', targetHandle: 'file' },
    { id: 'e2-crop', source: 'crop-decode', target: 'crop-crop', sourceHandle: 'imageData', targetHandle: 'imageData' },
    { id: 'e3-crop', source: 'crop-crop', target: 'crop-encode', sourceHandle: 'imageData', targetHandle: 'imageData' },
    { id: 'e4-crop', source: 'crop-encode', target: 'crop-output', sourceHandle: 'blob', targetHandle: 'blob' },
  ],
};

export const PRESETS = [compressPreset, resizePreset, cropPreset];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id);
}

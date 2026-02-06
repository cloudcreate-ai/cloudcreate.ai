/**
 * 从简易步骤数组构建 Runner 所需的完整图
 * input -> decode -> [resize|crop]* -> encode -> output
 */

export function buildGraphFromSteps(steps) {
  if (!steps?.length) return { nodes: [], edges: [] };
  const nodes = [];
  const edges = [];
  let nodeId = 0;
  const genId = (type) => `step-${nodeId++}-${type}`;

  const inputId = genId('input');
  const decodeId = genId('decode');
  const encodeId = genId('encode');
  const outputStep = steps.find((s) => s.type === 'output');
  const outputId = genId('output');

  nodes.push({ id: inputId, type: 'input', params: {} });
  nodes.push({ id: decodeId, type: 'decode', params: {} });

  edges.push({
    id: `e-${inputId}-${decodeId}`,
    source: inputId,
    target: decodeId,
    sourceHandle: 'file',
    targetHandle: 'file',
  });

  const middleSteps = steps.filter((s) => s.type === 'resize' || s.type === 'crop');
  let prevId = decodeId;
  const prevHandle = 'imageData';

  for (const step of middleSteps) {
    const midId = genId(step.type);
    const params = { ...step.params } || {};
    nodes.push({ id: midId, type: step.type, params });
    edges.push({
      id: `e-${prevId}-${midId}`,
      source: prevId,
      target: midId,
      sourceHandle: prevHandle,
      targetHandle: 'imageData',
    });
    prevId = midId;
  }

  const outputParams = outputStep?.params ?? { targetFormat: '', quality: 75 };
  nodes.push({ id: encodeId, type: 'encode', params: outputParams });
  nodes.push({ id: outputId, type: 'output', params: {} });

  edges.push({
    id: `e-${prevId}-${encodeId}`,
    source: prevId,
    target: encodeId,
    sourceHandle: prevHandle,
    targetHandle: 'imageData',
  });
  edges.push({
    id: `e-${encodeId}-${outputId}`,
    source: encodeId,
    target: outputId,
    sourceHandle: 'blob',
    targetHandle: 'blob',
  });

  return { nodes, edges };
}

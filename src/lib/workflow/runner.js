/**
 * 工作流执行引擎 - 拓扑排序、顺序执行、DAG 校验
 */
import { getNodeDef } from './registry.js';

/**
 * 拓扑排序（Kahn），返回节点 id 执行顺序
 * @param {string[]} nodeIds
 * @param {{ source: string, target: string, sourceHandle?: string, targetHandle?: string }[]} edges
 * @returns {string[]} 执行顺序
 * @throws 若存在环
 */
function topologicalSort(nodeIds, edges) {
  const inDegree = new Map(nodeIds.map((id) => [id, 0]));
  const outEdges = new Map(nodeIds.map((id) => [id, []]));
  for (const e of edges) {
    if (nodeIds.includes(e.source) && nodeIds.includes(e.target) && e.source !== e.target) {
      outEdges.get(e.source).push(e.target);
      inDegree.set(e.target, inDegree.get(e.target) + 1);
    }
  }
  const queue = nodeIds.filter((id) => inDegree.get(id) === 0);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const t of outEdges.get(id)) {
      const d = inDegree.get(t) - 1;
      inDegree.set(t, d);
      if (d === 0) queue.push(t);
    }
  }
  if (order.length !== nodeIds.length) {
    throw new Error('Workflow contains a cycle');
  }
  return order;
}

/**
 * 构建节点输入映射：nodeId -> { handle -> { sourceId, sourceHandle } }
 */
function buildInputMap(edges) {
  const map = new Map();
  for (const e of edges) {
    if (!map.has(e.target)) map.set(e.target, {});
    const handle = e.targetHandle || 'default';
    map.get(e.target)[handle] = { sourceId: e.source, sourceHandle: e.sourceHandle || 'default' };
  }
  return map;
}

/**
 * 执行单个文件的工作流
 * @param {object} graph - { nodes: Array<{id, type, params?}>, edges: Array<{source, target, sourceHandle?, targetHandle?>} }
 * @param {File} file
 * @param {object} context - { file, requestCropRegion?, onOutput? }
 * @returns {Promise<{ blob?, outputName?, error? }>}
 */
async function runForFile(graph, file, context) {
  const { nodes, edges } = graph;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const order = topologicalSort(nodes.map((n) => n.id), edges);
  const inputMap = buildInputMap(edges);
  const outputs = new Map();

  const getInput = (nodeId, handle) => {
    const conn = inputMap.get(nodeId)?.[handle];
    if (!conn) return undefined;
    const upstream = outputs.get(conn.sourceId);
    if (!upstream) return undefined;
    const handleKey = conn.sourceHandle;
    return upstream[handleKey] ?? upstream.default ?? Object.values(upstream)[0];
  };

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const def = getNodeDef(node.type);
    if (!def) throw new Error(`Unknown node type: ${node.type}`);
    const inputs = {};
    for (const inp of def.inputs) {
      const val = getInput(nodeId, inp.name);
      if (val !== undefined) inputs[inp.name] = val;
    }
    const ctx = { ...context, file };
    const params = { ...def.params, ...node.params };
    const defaults = {};
    for (const [k, v] of Object.entries(def.params || {})) {
      if (v.default !== undefined) defaults[k] = v.default;
    }
    const mergedParams = { ...defaults, ...(node.params || {}) };
    const result = await def.execute(inputs, mergedParams, ctx);
    outputs.set(nodeId, result);
  }

  const outputNodes = order.filter((id) => nodeMap.get(id)?.type === 'output');
  const lastOutput = outputNodes[outputNodes.length - 1];
  const out = outputs.get(lastOutput);
  return out;
}

/**
 * 批量执行工作流
 * @param {object} graph
 * @param {File[]} files
 * @param {object} options - { requestCropRegion?, onProgress?(index, total, file)?, onOutput? }
 * @returns {Promise<Array<{ file, blob?, outputName?, error?, width?, height? }>>}
 */
export async function runWorkflow(graph, files, options = {}) {
  const results = [];
  const { requestCropRegion, onProgress } = options;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file);
    let fileResult = { file };
    const context = {
      file,
      requestCropRegion,
      onOutput(blob, ctx) {
        const f = ctx.file || file;
        const mime = blob.type || '';
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('avif') ? 'avif' : 'jpg';
        const base = f.name.replace(/\.[^.]+$/, '');
        const outputName = `${base}.${ext}`;
        fileResult = { ...fileResult, blob, outputName };
      },
    };
    try {
      const out = await runForFile(graph, file, context);
      if (out?.blob) {
        const mime = out.blob.type || '';
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('avif') ? 'avif' : 'jpg';
        const base = file.name.replace(/\.[^.]+$/, '');
        fileResult = { ...fileResult, blob: out.blob, outputName: `${base}.${ext}`, width: out.width, height: out.height };
      }
      results.push(fileResult);
    } catch (e) {
      results.push({ ...fileResult, error: e.message });
    }
  }
  return results;
}

/**
 * 校验工作流图是否为有效 DAG，且包含必要节点
 */
export function validateWorkflow(graph) {
  const { nodes, edges } = graph;
  if (!nodes?.length) return { valid: false, error: 'No nodes' };
  const nodeIds = nodes.map((n) => n.id);
  try {
    topologicalSort(nodeIds, edges || []);
  } catch (e) {
    return { valid: false, error: e.message };
  }
  const hasInput = nodes.some((n) => n.type === 'input');
  const hasOutput = nodes.some((n) => n.type === 'output');
  if (!hasInput) return { valid: false, error: 'Missing Input node' };
  if (!hasOutput) return { valid: false, error: 'Missing Output node' };
  for (const n of nodes) {
    if (!getNodeDef(n.type)) return { valid: false, error: `Unknown node type: ${n.type}` };
  }
  return { valid: true };
}

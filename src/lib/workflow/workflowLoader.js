/**
 * 工作流加载与预设执行 - 支持 JSON 文件或对象，直接执行无需编辑器
 */
import { buildGraphFromSteps } from './buildGraph.js';
import { runWorkflow, validateWorkflow } from './runner.js';

/**
 * 加载工作流
 * @param {string|object} pathOrObj - JSON 文件路径（如 /workflows/compress.json）或已解析对象
 * @returns {Promise<{ workflow: { version, name, description?, steps }, graph: { nodes, edges } }>}
 */
export async function loadWorkflow(pathOrObj) {
  let raw;
  if (typeof pathOrObj === 'string') {
    const res = await fetch(pathOrObj);
    if (!res.ok) throw new Error(`Failed to load workflow: ${res.status}`);
    raw = await res.json();
  } else if (pathOrObj && typeof pathOrObj === 'object') {
    raw = pathOrObj;
  } else {
    throw new Error('Invalid workflow: path or object required');
  }

  const steps = raw.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('Invalid workflow: steps array required');
  }

  const graph = buildGraphFromSteps(steps);
  const validation = validateWorkflow(graph);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    workflow: {
      version: raw.version ?? 1,
      name: raw.name ?? '',
      description: raw.description ?? '',
      steps,
    },
    graph,
  };
}

/**
 * 合并用户参数到步骤（深度合并 output/crop/resize 的 params）
 * @param {object[]} steps
 * @param {object} paramsOverrides - { output: {...}, resize: {...}, crop: {...} }
 */
function mergeParamsIntoSteps(steps, paramsOverrides) {
  if (!paramsOverrides) return steps;
  return steps.map((s) => {
    const key = s.type;
    const overrides = paramsOverrides[key];
    if (!overrides) return s;
    return {
      ...s,
      params: { ...s.params, ...overrides },
    };
  });
}

/**
 * 从预设执行工作流
 * @param {string|object} presetPathOrObj - 预设路径或对象
 * @param {File[]} files - 输入文件
 * @param {object} options - { paramsOverrides?, requestCropRegion?, onProgress? }
 * @returns {Promise<Array<{ file, blob?, outputName?, error?, width?, height? }>>}
 */
export async function runWorkflowFromPreset(presetPathOrObj, files, options = {}) {
  const { workflow } = await loadWorkflow(presetPathOrObj);
  const steps = mergeParamsIntoSteps(workflow.steps, options.paramsOverrides);
  const graph = buildGraphFromSteps(steps);

  return runWorkflow(graph, files, {
    requestCropRegion: options.requestCropRegion,
    onProgress: options.onProgress,
  });
}

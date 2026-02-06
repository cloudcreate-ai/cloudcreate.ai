/**
 * 工作流持久化 - localStorage 保存/加载，导出/导入 JSON
 */
const PREFIX = 'freetools:workflow:';
const LIST_KEY = PREFIX + 'list';
const CURRENT_KEY = PREFIX + 'current';

export function listWorkflows() {
  try {
    const s = localStorage.getItem(LIST_KEY);
    if (s) {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr : [];
    }
  } catch (_) {}
  return [];
}

export function saveWorkflow(id, graph, name = '') {
  const list = listWorkflows();
  const entry = { id, name: name || id, nodes: graph.nodes, edges: graph.edges };
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
    localStorage.setItem(PREFIX + id, JSON.stringify(graph));
  } catch (e) {
    return false;
  }
  return true;
}

export function loadWorkflow(id) {
  try {
    const s = localStorage.getItem(PREFIX + id);
    if (s) return JSON.parse(s);
  } catch (_) {}
  return null;
}

export function deleteWorkflow(id) {
  const list = listWorkflows().filter((x) => x.id !== id);
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
    localStorage.removeItem(PREFIX + id);
  } catch (_) {
    return false;
  }
  return true;
}

export function getCurrentWorkflowId() {
  try {
    return localStorage.getItem(CURRENT_KEY) || null;
  } catch (_) {}
  return null;
}

export function setCurrentWorkflowId(id) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id);
    else localStorage.removeItem(CURRENT_KEY);
  } catch (_) {}
}

export function exportWorkflow(graph) {
  return JSON.stringify(graph, null, 2);
}

export function importWorkflow(jsonStr) {
  try {
    const g = JSON.parse(jsonStr);
    if (g && Array.isArray(g.nodes) && Array.isArray(g.edges)) return g;
  } catch (_) {}
  return null;
}

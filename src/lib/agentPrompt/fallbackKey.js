import { resolveCategoryId } from '$lib/navRegistry.js';

/**
 * 未显式注册时，根据逻辑路径与顶栏分类选择通用提示词 i18n 键名（不含命名空间前缀的后续部分在 i18n 中定义为 agentPrompt.xxx）
 * @param {string} logicalPath
 * @param {string} pathname 原始 pathname，供 resolveCategoryId
 * @returns {'genericWorkspace' | 'genericTools' | 'genericCreative' | 'genericMisc'}
 */
export function resolveAgentPromptFallbackTemplateKey(logicalPath, pathname) {
  if (logicalPath === '/' || logicalPath === '') {
    return 'genericWorkspace';
  }
  if (logicalPath === '/tools' || logicalPath.startsWith('/tools/')) {
    return 'genericTools';
  }
  const cat = resolveCategoryId(pathname);
  if (cat === 'creative') {
    return 'genericCreative';
  }
  if (cat === 'workspace') {
    return 'genericWorkspace';
  }
  return 'genericMisc';
}

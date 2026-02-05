/**
 * 工具配置持久化 - 使用 localStorage 保存/恢复用户上次的设置
 */
const PREFIX = 'freetools:';

export function loadToolConfig(key, defaults = {}) {
  try {
    const s = localStorage.getItem(PREFIX + key);
    if (s) {
      const parsed = JSON.parse(s);
      return { ...defaults, ...parsed };
    }
  } catch (_) {}
  return { ...defaults };
}

export function saveToolConfig(key, config) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(config));
  } catch (_) {}
}

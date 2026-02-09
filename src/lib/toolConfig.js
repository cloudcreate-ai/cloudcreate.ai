/**
 * 工具配置持久化 - 使用 localStorage 保存/恢复用户上次的设置
 * SSG 构建时无 localStorage，返回默认值 / 不写入
 */
import { browser } from '$app/environment';

const PREFIX = 'freetools:';

export function loadToolConfig(key, defaults = {}) {
  if (!browser) return { ...defaults };
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
  if (!browser) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(config));
  } catch (_) {}
}

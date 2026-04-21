/**
 * 侧栏导航项是否处于激活态（与工具 hash、前缀注册路径规则一致）。
 */
import { ALL_REGISTERED_HREFS } from '$lib/toolList.js';
import { getLogicalPath } from '$lib/localePath.js';

/**
 * @param {string} pathname
 * @param {string} urlHash
 * @param {{ href: string, hash?: string }} item
 */
export function isSidebarItemActive(pathname, urlHash, item) {
  const logical = getLogicalPath(pathname);
  const href = item.href;
  const norm = href === '/' ? '/' : href;
  if (logical === norm) {
    if (item.hash) {
      const h = urlHash || '';
      if (item.hash === '#table-preview') return h === '' || h === '#table-preview';
      return h === item.hash;
    }
    return true;
  }
  if (norm === '/' || !logical.startsWith(norm + '/')) return false;
  for (const x of ALL_REGISTERED_HREFS) {
    if (x.length <= norm.length) continue;
    if (!x.startsWith(norm + '/')) continue;
    if (logical === x || logical.startsWith(x + '/')) return false;
  }
  return true;
}

/**
 * 侧栏「指向某分类根」的条目（如工作区快捷入口）：该分类下所有子路径均视为选中。
 * @param {string} pathname
 * @param {string} rootHref 逻辑路径，如 `/tools`、`/creative`
 */
export function isPathPrefixNavActive(pathname, rootHref) {
  const logical = getLogicalPath(pathname);
  if (rootHref === '/' || !rootHref.startsWith('/')) return false;
  return logical === rootHref || logical.startsWith(rootHref + '/');
}


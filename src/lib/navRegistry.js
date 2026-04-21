/**
 * 顶栏与左侧栏的导航分类单一数据源。
 *
 * 约定：
 * - `id === 'workspace'`：仅逻辑路径 `/`（工作区总览）。
 * - `id === 'tools'`：工具概览 `/tools` 及所有工具子路径（/image、/pdf 等）；兜底分类。
 * - `pathPrefix` 非 null 的项按**前缀长度降序**匹配（如 `/creative`）。
 */
import { getLogicalPath } from '$lib/localePath.js';
import { getSidebarGroupsForCategory } from '$lib/sidebarConfig.js';

/** @type {Array<{ id: string, pathPrefix: string | null, labelKey: string, navHomeLogicalPath: string }>} */
export const NAV_CATEGORIES = [
  {
    id: 'workspace',
    pathPrefix: null,
    labelKey: 'layout.categoryWorkspace',
    navHomeLogicalPath: '/',
  },
  {
    id: 'tools',
    pathPrefix: null,
    labelKey: 'layout.categoryTools',
    navHomeLogicalPath: '/tools',
  },
  {
    id: 'creative',
    pathPrefix: '/creative',
    labelKey: 'layout.categoryCreative',
    navHomeLogicalPath: '/creative',
  },
];

const PREFIX_CATEGORIES = NAV_CATEGORIES.filter((c) => c.pathPrefix != null);

/**
 * 根据当前 URL 解析所属顶栏/侧栏分类 id。
 * @param {string} pathname
 */
export function resolveCategoryId(pathname) {
  const logical = getLogicalPath(pathname);
  if (logical === '/' || logical === '') return 'workspace';
  if (logical === '/tools' || logical.startsWith('/tools/')) return 'tools';
  const sorted = [...PREFIX_CATEGORIES].sort(
    (a, b) => (b.pathPrefix?.length ?? 0) - (a.pathPrefix?.length ?? 0),
  );
  for (const c of sorted) {
    const p = c.pathPrefix;
    if (!p) continue;
    if (logical === p || logical.startsWith(p + '/')) return c.id;
  }
  return 'tools';
}

/**
 * 当前路径对应的侧栏分组列表（与 resolveCategoryId 一致）。
 * @param {string} pathname
 */
export function getSidebarGroupsForPath(pathname) {
  const id = resolveCategoryId(pathname);
  return getSidebarGroupsForCategory(id);
}

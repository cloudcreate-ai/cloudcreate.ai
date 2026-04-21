/**
 * 顶栏与左侧栏的导航分类单一数据源。
 *
 * 约定：
 * - `pathPrefix === null` 且 `id === 'tools'` 为兜底分类（/image、/pdf 等工具路径）。
 * - 新增分类时：在 `NAV_CATEGORIES` 中 `pathPrefix` 非 null 的项会按**前缀长度降序**匹配（最长优先），避免与更短前缀冲突。
 */
import { getLogicalPath } from '$lib/localePath.js';
import { TOOL_GROUPS, CREATIVE_SIDEBAR_ITEMS } from '$lib/toolList.js';

/** 创意侧栏：概览 + CREATIVE_GROUPS 内条目（单分组展示） */
const CREATIVE_SIDEBAR_GROUPS = [
  {
    id: 'creative',
    labelKey: 'sidebar.creative',
    items: CREATIVE_SIDEBAR_ITEMS,
  },
];

/** @type {Array<{ id: string, pathPrefix: string | null, labelKey: string, navHomeLogicalPath: string, groups: unknown[] }>} */
export const NAV_CATEGORIES = [
  {
    id: 'tools',
    pathPrefix: null,
    labelKey: 'layout.categoryTools',
    navHomeLogicalPath: '/',
    groups: TOOL_GROUPS,
  },
  {
    id: 'creative',
    pathPrefix: '/creative',
    labelKey: 'layout.categoryCreative',
    navHomeLogicalPath: '/creative',
    groups: CREATIVE_SIDEBAR_GROUPS,
  },
];

const PREFIX_CATEGORIES = NAV_CATEGORIES.filter((c) => c.pathPrefix != null);

/**
 * 根据当前 URL 解析所属顶栏/侧栏分类 id。
 * @param {string} pathname
 * @returns {'tools' | 'creative' | string}
 */
export function resolveCategoryId(pathname) {
  const logical = getLogicalPath(pathname);
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
  const cat = NAV_CATEGORIES.find((c) => c.id === id);
  return cat?.groups ?? TOOL_GROUPS;
}

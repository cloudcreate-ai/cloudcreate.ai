/**
 * 顶栏与左侧栏的导航分类单一数据源。
 *
 * 约定：
 * - `id === 'workspace'`：仅逻辑路径 `/`（工作区总览）。
 * - `id === 'tools'`：工具概览 `/tools` 及所有工具子路径（/image、/pdf 等）；兜底分类。
 * - `pathPrefix` 非 null 的项按**前缀长度降序**匹配（如 `/creative`）。
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

/** 工作区侧栏：快捷进入工具概览、创意概览 */
const WORKSPACE_SIDEBAR_GROUPS = [
  {
    id: 'shortcuts',
    labelKey: 'sidebar.workspaceShortcuts',
    items: [
      { id: 'toolsOverview', titleKey: 'layout.toolsOverview', href: '/tools', icon: '🔧' },
      { id: 'creativeOverview', titleKey: 'layout.creativeOverview', href: '/creative', icon: '✨' },
    ],
  },
];

/** @type {Array<{ id: string, pathPrefix: string | null, labelKey: string, navHomeLogicalPath: string, groups: unknown[] }>} */
export const NAV_CATEGORIES = [
  {
    id: 'workspace',
    pathPrefix: null,
    labelKey: 'layout.categoryWorkspace',
    navHomeLogicalPath: '/',
    groups: WORKSPACE_SIDEBAR_GROUPS,
  },
  {
    id: 'tools',
    pathPrefix: null,
    labelKey: 'layout.categoryTools',
    navHomeLogicalPath: '/tools',
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
  const cat = NAV_CATEGORIES.find((c) => c.id === id);
  return cat?.groups ?? TOOL_GROUPS;
}

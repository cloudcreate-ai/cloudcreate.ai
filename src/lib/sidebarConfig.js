import { TOOL_GROUPS, CREATIVE_GROUPS } from '$lib/toolList.js';

/**
 * 侧栏分组与条目集中配置（顶栏分类仍见 navRegistry）。
 *
 * @typedef {{ id: string, labelKey: string, items: SidebarItem[], flat?: boolean }} SidebarGroup
 * @typedef {{ id: string, titleKey: string, href: string, icon: string, hash?: string, role?: 'categoryRootShortcut' }} SidebarItem
 */

/** 工作区：工作区首页 + 快捷进入各分类根路径 */
export const WORKSPACE_SIDEBAR_GROUPS = [
  {
    id: 'workspace',
    flat: true,
    labelKey: 'sidebar.workspaceSection',
    items: [
      { id: 'workspaceHome', titleKey: 'sidebar.workspaceHome', href: '/', icon: '🏠' },
      { id: 'toolSpec', titleKey: 'sidebar.toolSpec', href: '/ai-spec', icon: '📘' },
      { id: 'cliIntro', titleKey: 'sidebar.cliIntro', href: '/intro/cli', icon: '⌨️' },
      { id: 'coreLibIntro', titleKey: 'sidebar.coreLibIntro', href: '/intro/core-lib', icon: '🧩' },
    ],
  },
  {
    id: 'shortcuts',
    labelKey: 'sidebar.workspaceShortcuts',
    items: [
      {
        id: 'toolsOverview',
        titleKey: 'layout.categoryTools',
        href: '/tools',
        icon: '🔧',
        role: 'categoryRootShortcut',
      },
      {
        id: 'creativeOverview',
        titleKey: 'layout.categoryCreative',
        href: '/creative',
        icon: '✨',
        role: 'categoryRootShortcut',
      },
    ],
  },
];

/** 仅工作区（首页）侧栏底部追加：法律与条款（见 navRegistry.getSidebarGroupsForPath） */
/** @type {SidebarGroup} */
export const LEGAL_SIDEBAR_GROUP = {
  id: 'legal',
  flat: true,
  labelKey: 'sidebar.legalSection',
  items: [
    { id: 'legalPrivacy', titleKey: 'legal.privacyTitle', href: '/privacy', icon: '🔒' },
    { id: 'legalTerms', titleKey: 'legal.termsTitle', href: '/terms', icon: '📄' },
  ],
};

/**
 * 非 workspace 分类侧栏首组：指向该分类分页首页（navHomeLogicalPath）。
 * @param {string} navHomeLogicalPath
 * @returns {SidebarGroup}
 */
export function createOverviewGroup(navHomeLogicalPath) {
  return {
    id: 'category-overview',
    flat: true,
    labelKey: 'sidebar.categoryOverviewSection',
    items: [
      {
        id: 'categoryOverview',
        titleKey: 'sidebar.categoryOverview',
        href: navHomeLogicalPath,
        icon: '📋',
      },
    ],
  };
}

/** 创意分组中去掉与注入「概览」重复的 overview 条目 */
function getCreativeGroupsDedupedOverview() {
  return CREATIVE_GROUPS.map((g, i) => {
    if (i !== 0) return g;
    return {
      ...g,
      items: g.items.filter((item) => item.id !== 'overview'),
    };
  });
}

/**
 * @param {string} categoryId workspace | tools | creative
 * @returns {SidebarGroup[]}
 */
export function getSidebarGroupsForCategory(categoryId) {
  switch (categoryId) {
    case 'workspace':
      return WORKSPACE_SIDEBAR_GROUPS;
    case 'tools':
      return [createOverviewGroup('/tools'), ...TOOL_GROUPS];
    case 'creative':
      return [createOverviewGroup('/creative'), ...getCreativeGroupsDedupedOverview()];
    default:
      return [createOverviewGroup('/tools'), ...TOOL_GROUPS];
  }
}

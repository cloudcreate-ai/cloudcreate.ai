import { getLogicalPath } from '$lib/localePath.js';

/**
 * 工具分组列表 - 供侧边栏与首页共用
 */
export const TOOL_GROUPS = [
  {
    id: 'image',
    labelKey: 'sidebar.image',
    items: [
      { id: 'preview', titleKey: 'home.imagePreviewTitle', href: '/image/preview', icon: '🖥️' },
      { id: 'gif', titleKey: 'home.gifToolTitle', href: '/image/gif', icon: '🎞️' },
      { id: 'compress', titleKey: 'home.compressTitle', href: '/image/compress', icon: '🗜️' },
      { id: 'convert', titleKey: 'home.convertTitle', href: '/image/convert', icon: '📄' },
      { id: 'crop', titleKey: 'home.cropTitle', href: '/image/crop', icon: '✂️' },
      { id: 'resize', titleKey: 'home.resizeTitle', href: '/image/resize', icon: '📐' },
      { id: 'batch', titleKey: 'home.batchTitle', href: '/image/batch', icon: '📋' },
      { id: 'rotate', titleKey: 'home.rotateTitle', href: '/image/rotate', icon: '🔄' },
      { id: 'favicon', titleKey: 'home.faviconTitle', href: '/image/favicon', icon: '🖼️' },
      { id: 'playstore', titleKey: 'home.playstoreTitle', href: '/image/playstore', icon: '📱' },
      { id: 'appstore', titleKey: 'home.appstoreTitle', href: '/image/appstore', icon: '🍎' },
    ],
  },
  {
    id: 'watermark',
    labelKey: 'sidebar.watermark',
    items: [
      {
        id: 'watermarkGemini',
        titleKey: 'home.watermarkGeminiTitle',
        href: '/remove-watermark/gemini',
        icon: '✨',
      },
    ],
  },
  {
    id: 'pdf',
    labelKey: 'sidebar.pdf',
    items: [
      { id: 'pdfViewer', titleKey: 'home.pdfViewerTitle', href: '/pdf', icon: '📄' },
      { id: 'pdfMerge', titleKey: 'home.pdfMergeTitle', href: '/pdf/merge', icon: '📚' },
      { id: 'pdfExtract', titleKey: 'home.pdfExtractTitle', href: '/pdf/extract', icon: '🧾' },
      { id: 'pdfCompress', titleKey: 'home.pdfCompressTitle', href: '/pdf/compress', icon: '🗜️' },
    ],
  },
  {
    id: 'table',
    labelKey: 'sidebar.table',
    items: [
      { id: 'tablePreview', titleKey: 'home.tablePreviewTitle', href: '/table', hash: '#table-preview', icon: '📊' },
      { id: 'tableConvert', titleKey: 'home.tableConvertTitle', href: '/table', hash: '#table-convert', icon: '🔄' },
    ],
  },
  {
    id: 'other',
    labelKey: 'sidebar.other',
    items: [
      { id: 'cssMinify', titleKey: 'home.cssMinifyTitle', href: '/css/minify', icon: '🗜️' },
      { id: 'cssBeautify', titleKey: 'home.cssBeautifyTitle', href: '/css/beautify', icon: '📐' },
      { id: 'archiveDecompress', titleKey: 'home.archiveDecompressTitle', href: '/archive/decompress', icon: '📂' },
      { id: 'archiveCompress', titleKey: 'home.archiveCompressTitle', href: '/archive/compress', icon: '📦' },
      { id: 'styleGuide', titleKey: 'home.styleGuideTitle', href: '/styleguide', icon: '🎨' },
      { id: 'markdownPreview', titleKey: 'home.markdownPreviewTitle', href: '/markdown', icon: '📝' },
    ],
  },
];

/** 创意类页面分组（供 findToolByHref / 收藏等使用） */
export const CREATIVE_GROUPS = [
  {
    id: 'creative',
    labelKey: 'sidebar.creative',
    items: [
      { id: 'overview', titleKey: 'creative.sidebarOverview', href: '/creative', icon: '📋' },
      {
        id: 'borderBeam',
        titleKey: 'creative.borderBeamTitle',
        href: '/creative/border-beam',
        icon: '✨',
      },
      {
        id: 'aiti',
        titleKey: 'creative.aitiListLabel',
        href: '/creative/aiti',
        icon: '🃏',
      },
    ],
  },
];

/** 创意区左侧栏扁平列表（与 CREATIVE_GROUPS[0].items 一致） */
export const CREATIVE_SIDEBAR_ITEMS = CREATIVE_GROUPS[0].items;

/** 概览页「常用」网格：仅具体演示页，不含分类概览（不入侧栏注入之重复逻辑） */
export const CREATIVE_CARD_ITEMS = CREATIVE_SIDEBAR_ITEMS.filter((i) => i.id !== 'overview');

/** 侧边栏分组顺序：工具 → 创意（用于解析收藏、href 等） */
export const ALL_SIDEBAR_GROUPS = [...TOOL_GROUPS, ...CREATIVE_GROUPS];

/** 所有工具的 href 集合（用于判断是否为工具页） */
export const TOOL_HREFS = new Set(TOOL_GROUPS.flatMap((g) => g.items.map((i) => i.href)));

/** 创意类入口 href */
export const CREATIVE_HREFS = new Set(CREATIVE_GROUPS.flatMap((g) => g.items.map((i) => i.href)));

/** 已登记的工具 + 创意路径（用于侧边栏激活时的前缀排除） */
export const ALL_REGISTERED_HREFS = new Set([...TOOL_HREFS, ...CREATIVE_HREFS]);

/** 工作区首页与分类概览页：不参与收藏/最近使用键 */
export function isLandingNoPrefsPath(logicalPath) {
  if (logicalPath == null) return false;
  let p = String(logicalPath).split('?')[0];
  if (!p.startsWith('/')) p = p ? `/${p}` : '';
  return p === '' || p === '/' || p === '/tools' || p === '/creative';
}

/** 按 href（可含 #hash）查找工具；同一路径多项时按 hash 区分 */
export function findToolByHref(href) {
  if (!href) return null;
  const hashIdx = href.indexOf('#');
  const pathOnly = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';

  const candidates = [];
  for (const g of ALL_SIDEBAR_GROUPS) {
    for (const item of g.items) {
      if (item.href === pathOnly) candidates.push(item);
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  for (const item of candidates) {
    if (!item.hash) return item;
    if (item.hash === '#table-preview' && (hash === '' || hash === '#table-preview')) return item;
    if (item.hash === hash) return item;
  }
  return candidates[0];
}

/**
 * 当前 URL 对应的收藏键（与首页星标相同：`href`，必要时带 `#hash`）。
 * 工作区首页或非工具页返回 null；子路径按已登记工具 href 最长前缀归属。
 */
export function getFavoriteKeyForCurrentPage(pathname, urlHash = '') {
  const logical = getLogicalPath(pathname);
  let base = logical.split('?')[0];
  if (!base.startsWith('/')) base = '/' + base;
  if (isLandingNoPrefsPath(base)) return null;
  const hash = urlHash || '';

  const t0 = findToolByHref(hash ? `${base}${hash}` : base);
  if (t0) return t0.href + (t0.hash ?? '');

  let best = null;
  let bestLen = -1;
  for (const h of ALL_REGISTERED_HREFS) {
    if (!base.startsWith(`${h}/`)) continue;
    if (h.length > bestLen) {
      bestLen = h.length;
      best = h;
    }
  }
  if (!best) return null;
  const t1 = findToolByHref(best);
  return t1 ? t1.href + (t1.hash ?? '') : null;
}

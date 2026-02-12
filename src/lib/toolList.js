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
      { id: 'rotate', titleKey: 'home.rotateTitle', href: '/image/rotate', icon: '🔄' },
      { id: 'favicon', titleKey: 'home.faviconTitle', href: '/image/favicon', icon: '🖼️' },
      { id: 'playstore', titleKey: 'home.playstoreTitle', href: '/image/playstore', icon: '📱' },
      { id: 'appstore', titleKey: 'home.appstoreTitle', href: '/image/appstore', icon: '🍎' },
    ],
  },
  {
    id: 'css',
    labelKey: 'sidebar.css',
    items: [
      { id: 'cssMinify', titleKey: 'home.cssMinifyTitle', href: '/css/minify', icon: '🗜️' },
      { id: 'cssBeautify', titleKey: 'home.cssBeautifyTitle', href: '/css/beautify', icon: '📐' },
    ],
  },
  {
    id: 'archive',
    labelKey: 'sidebar.archive',
    items: [
      { id: 'archiveDecompress', titleKey: 'home.archiveDecompressTitle', href: '/archive/decompress', icon: '📂' },
      { id: 'archiveCompress', titleKey: 'home.archiveCompressTitle', href: '/archive/compress', icon: '📦' },
    ],
  },
  {
    id: 'other',
    labelKey: 'sidebar.other',
    items: [
      { id: 'styleGuide', titleKey: 'home.styleGuideTitle', href: '/styleguide', icon: '🎨' },
      { id: 'markdownPreview', titleKey: 'home.markdownPreviewTitle', href: '/markdown', icon: '📝' },
      { id: 'pdfViewer', titleKey: 'home.pdfViewerTitle', href: '/pdf', icon: '📄' },
      { id: 'tableTools', titleKey: 'home.tableToolsTitle', href: '/table', icon: '📊' },
      { id: 'workflow', titleKey: 'home.workflowTitle', href: '/workflow', icon: '🔀' },
    ],
  },
];

/** 所有工具的 href 集合（用于判断是否为工具页） */
export const TOOL_HREFS = new Set(TOOL_GROUPS.flatMap((g) => g.items.map((i) => i.href)));

/** 按 href 查找工具 */
export function findToolByHref(href) {
  for (const g of TOOL_GROUPS) {
    const t = g.items.find((x) => x.href === href);
    if (t) return t;
  }
  return null;
}

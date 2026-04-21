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
      { id: 'workflow', titleKey: 'home.workflowTitle', href: '/workflow', icon: '🔀' },
    ],
  },
];

/** 所有工具的 href 集合（用于判断是否为工具页） */
export const TOOL_HREFS = new Set(TOOL_GROUPS.flatMap((g) => g.items.map((i) => i.href)));

/** 按 href（可含 #hash）查找工具；同一路径多项时按 hash 区分 */
export function findToolByHref(href) {
  if (!href) return null;
  const hashIdx = href.indexOf('#');
  const pathOnly = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';

  const candidates = [];
  for (const g of TOOL_GROUPS) {
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

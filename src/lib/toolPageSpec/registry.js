/**
 * 各工具页元数据：逻辑路径、展示标题、与 agentPrompt 模板子键 id 一一对应。
 * 长文案（用途说明、URL/插值块）在 i18n 的 `agentPrompt.toolSpecDetail.<id>.*`。
 */

/**
 * @typedef {Object} ToolPageSpec
 * @property {string} id 与 `agentPrompt.<id>` / `registerAgentPrompt({ templateKey: 'agentPrompt.'+id })` 一致
 * @property {string | null} path 逻辑路径（getLogicalPath），无单一路径的入口为 null
 * @property {string} titleKey i18n 键，用于说明页 H2 与“本页”链接文案
 * @property {string[]} [pathAliases] 与 path 等价的其他逻辑路径
 */

/** @type {ToolPageSpec[]} 顺序 = 全站说明页展示顺序 */
export const TOOL_PAGE_SPECS = [
  { id: 'genericWorkspace', path: '/' },
  { id: 'genericTools', path: '/tools' },
  { id: 'genericCreative', path: '/creative' },
  { id: 'genericMisc', path: null, titleKey: 'agentPrompt.aiSpecPage.headingGenericMisc' },
  { id: 'imageCompress', path: '/image/compress', titleKey: 'home.compressTitle' },
  { id: 'imageConvert', path: '/image/convert', titleKey: 'home.convertTitle' },
  { id: 'imageResize', path: '/image/resize', titleKey: 'home.resizeTitle' },
  { id: 'imageCrop', path: '/image/crop', titleKey: 'home.cropTitle' },
  { id: 'imageRotate', path: '/image/rotate', titleKey: 'home.rotateTitle' },
  { id: 'imageFavicon', path: '/image/favicon', titleKey: 'home.faviconTitle' },
  { id: 'imagePlaystore', path: '/image/playstore', titleKey: 'home.playstoreTitle' },
  { id: 'imageAppstore', path: '/image/appstore', titleKey: 'home.appstoreTitle' },
  { id: 'imagePreview', path: '/image/preview', titleKey: 'home.imagePreviewTitle' },
  { id: 'imageBatch', path: '/image/batch', titleKey: 'home.batchTitle' },
  { id: 'imageGif', path: '/image/gif', titleKey: 'home.gifToolTitle' },
  { id: 'markdown', path: '/markdown', titleKey: 'home.markdownPreviewTitle' },
  { id: 'table', path: '/table', titleKey: 'home.tableToolsTitle' },
  { id: 'pdf', path: '/pdf', titleKey: 'home.pdfViewerTitle' },
  { id: 'pdfMerge', path: '/pdf/merge', titleKey: 'home.pdfMergeTitle' },
  { id: 'pdfExtract', path: '/pdf/extract', titleKey: 'home.pdfExtractTitle' },
  { id: 'pdfCompress', path: '/pdf/compress', titleKey: 'home.pdfCompressTitle' },
  { id: 'workflow', path: '/workflow', titleKey: 'home.workflowTitle' },
  { id: 'workflowAdvanced', path: '/workflow/advanced', titleKey: 'agentPrompt.aiSpecPage.headingWorkflowAdvanced' },
  { id: 'cssIndex', path: '/css', titleKey: 'cssIndex.title' },
  { id: 'cssMinify', path: '/css/minify', titleKey: 'home.cssMinifyTitle' },
  { id: 'cssBeautify', path: '/css/beautify', titleKey: 'home.cssBeautifyTitle' },
  { id: 'archiveIndex', path: '/archive', titleKey: 'archiveIndex.title' },
  { id: 'archiveCompress', path: '/archive/compress', titleKey: 'home.archiveCompressTitle' },
  { id: 'archiveDecompress', path: '/archive/decompress', titleKey: 'home.archiveDecompressTitle' },
  { id: 'watermarkGemini', path: '/remove-watermark/gemini', titleKey: 'home.watermarkGeminiTitle' },
  { id: 'creativeBorderBeam', path: '/creative/border-beam', titleKey: 'creative.borderBeamTitle' },
  { id: 'creativeAiti', path: '/creative/aiti', titleKey: 'creative.aitiTitle' },
  { id: 'cliIntro', path: '/intro/cli', titleKey: 'sidebar.cliIntro' },
  { id: 'coreLibIntro', path: '/intro/core-lib', titleKey: 'sidebar.coreLibIntro' },
  { id: 'framework', path: '/framework', titleKey: 'home.frameworkTitle' },
  { id: 'styleGuide', path: '/styleguide', titleKey: 'home.styleGuideTitle' },
  { id: 'aiSpecPageDoc', path: '/ai-spec', titleKey: 'agentPrompt.aiSpecPage.pageTitle' },
];

// 为未写 titleKey 的项补全（与 path 顺序写入时已带 titleKey 的项一致）
const DEFAULT_TITLE = /** @type {const} */ ({
  genericWorkspace: 'layout.categoryWorkspace',
  genericTools: 'layout.toolsOverview',
  genericCreative: 'layout.creativeOverview',
});

for (const row of TOOL_PAGE_SPECS) {
  if (!('titleKey' in row) || row.titleKey == null) {
    const t = /** @type {any} */ (row);
    t.titleKey = DEFAULT_TITLE[/** @type {keyof typeof DEFAULT_TITLE} */ (row.id)] ?? 'agentPrompt.aiSpecPage.headingGenericMisc';
  }
}

/**
 * 将子键转为说明页 HTML id（kebab，如 imageResize -> image-resize）
 * @param {string} specId
 */
export function specIdToAnchor(specId) {
  return specId
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * @param {string} templateKey 如 agentPrompt.imageResize
 * @returns {string} 子键，如 imageResize
 */
export function templateKeyToSpecId(templateKey) {
  return templateKey.replace(/^agentPrompt\./, '');
}

/**
 * @param {string} templateKey
 * @returns {ToolPageSpec | null}
 */
export function getToolPageSpecByTemplateKey(templateKey) {
  const id = templateKeyToSpecId(templateKey);
  return TOOL_PAGE_SPECS.find((s) => s.id === id) ?? null;
}

/**
 * @param {string} logicalPath getLogicalPath 结果
 * @returns {ToolPageSpec | null}
 */
export function getToolPageSpecByPath(logicalPath) {
  const n = (logicalPath.replace(/\/$/, '') || '/').replace(/\/$/, '') || '/';
  for (const spec of TOOL_PAGE_SPECS) {
    if (spec.path === n) return spec;
  }
  for (const spec of TOOL_PAGE_SPECS) {
    const aliases = spec.pathAliases;
    if (aliases?.includes(n)) return spec;
  }
  return null;
}

/**
 * 用于侧栏/回退子键时解析「当前条」
 * @param {string | undefined} regTemplateKey registerAgentPrompt 的 templateKey
 * @param {string} logicalPath
 * @param {string} pathname
 * @param {typeof import('../agentPrompt/fallbackKey.js').resolveAgentPromptFallbackTemplateKey} resolveFallback
 */
/**
 * @param {string | undefined} regTemplateKey
 * @param {string} logicalPath
 * @param {string} pathname
 * @param {(logical: string, pathname: string) => string} resolveFallback
 */
export function getActiveToolPageSpecId(regTemplateKey, logicalPath, pathname, resolveFallback) {
  if (regTemplateKey) {
    return templateKeyToSpecId(regTemplateKey);
  }
  return resolveFallback(logicalPath, pathname);
}

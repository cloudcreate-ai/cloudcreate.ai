/**
 * agentPrompt.toolSpecDetail：供全站 /ai-spec 说明页与插值文档用（en / zh）
 * 与 src/lib/toolPageSpec/registry.js 的 id 一致。
 */

/** @type {Record<string, { interpolate: string, urlQuery: string }>} */
export const AGENT_PROMPT_TOOL_SPEC_DETAIL_EN = {
  genericWorkspace: {
    interpolate: 'currentUrl: full URL of the home overview.',
    urlQuery: 'No per-tool query on the home page itself.',
  },
  genericTools: {
    interpolate: 'currentUrl: full URL of the tools hub.',
    urlQuery: 'No extra query on the tools listing page.',
  },
  genericCreative: {
    interpolate: 'currentUrl: full URL of the creative demos hub.',
    urlQuery: 'No extra query on the creative overview.',
  },
  genericMisc: {
    interpolate: 'currentUrl: full URL of the current page.',
    urlQuery: 'Varies by route; no single fixed schema.',
  },
  imageCompress: {
    interpolate:
      'currentUrl; targetFormat; quality; fileCount — snapshot of queue and encode options.',
    urlQuery:
      'q or quality (1–100); f or format (jpeg|png|webp|avif; omit to keep source format per rules on the page).',
  },
  imageConvert: {
    interpolate: 'currentUrl; targetFormat; quality; fileCount.',
    urlQuery: 'Same as image compress: q|quality, f|format.',
  },
  imageResize: {
    interpolate:
      'currentUrl; mode (scale mode); paramsSummary (compact state); fileCount.',
    urlQuery:
      'mode|m; p|pct; maw|maxW; mah|maxH; tw|th|tl; q|quality; f|format — see resizeQuery.js.',
  },
  imageCrop: {
    interpolate: 'currentUrl; aspectMode; sizeLabel; outputFormat; fileCount.',
    urlQuery: 'preset|p; cw+ch or customW/customH; q|quality; f|format.',
  },
  imageRotate: {
    interpolate: 'currentUrl; transformSummary; outputFormat; fileCount.',
    urlQuery: 'r|rotate; fh|flipH; fv|flipV; q|quality; f|format.',
  },
  imageFavicon: {
    interpolate: 'currentUrl; optionsSummary; fileCount.',
    urlQuery: 'sizes (comma-separated pixel sizes); ico (0|1).',
  },
  imagePlaystore: {
    interpolate: 'currentUrl; optionsSummary; fileCount.',
    urlQuery: 'No option sync — path only.',
  },
  imageAppstore: {
    interpolate: 'currentUrl; optionsSummary; fileCount.',
    urlQuery: 'No option sync — path only.',
  },
  imagePreview: {
    interpolate: 'currentUrl; fileCount.',
    urlQuery: 'z|zoom (up to 16); i|sel (selected index).',
  },
  imageBatch: {
    interpolate: 'currentUrl; rowCount; fileCount.',
    urlQuery: 'profile|prof; prefix|px; hide|hux; ich|chf (0|1).',
  },
  imageGif: {
    interpolate: 'currentUrl; summary (compression/options digest).',
    urlQuery: 'fps|tfps; scale|sc; pal|palette; dith|d; obg|merge; acc|accurate.',
  },
  markdown: {
    interpolate: 'currentUrl.',
    urlQuery: 'No useful prefill — path only.',
  },
  table: {
    interpolate: 'currentUrl; section; outputFormat; fileName; rows; cols.',
    urlQuery: 'fmt|format|out = csv|tsv|xlsx|json.',
  },
  pdf: {
    interpolate: 'currentUrl; fileName.',
    urlQuery: 'pg|page; z|scale (~0.5–2).',
  },
  pdfCompress: {
    interpolate: 'currentUrl; fileName; settingsSummary.',
    urlQuery: 'rs|rscale; jq|jpegQ; pf|imgfmt (jpeg|png).',
  },
  workflow: {
    interpolate: 'currentUrl; stepCount.',
    urlQuery: 'n|name; d|desc (URL-encode long text).',
  },
  workflowAdvanced: {
    interpolate: 'currentUrl; nodeCount.',
    urlQuery: 'preset on first load only: compress|resize|crop; custom graphs not in URL.',
  },
  cssIndex: {
    interpolate: 'currentUrl.',
    urlQuery: 'None on the index — follow links to subpages.',
  },
  cssMinify: {
    interpolate: 'currentUrl; aggressive (yes/no UI mode).',
    urlQuery: 'level|l = basic|b or aggressive|a.',
  },
  cssBeautify: {
    interpolate: 'currentUrl.',
    urlQuery: 'No query prefill.',
  },
  archiveIndex: {
    interpolate: 'currentUrl.',
    urlQuery: 'None on the index.',
  },
  archiveCompress: {
    interpolate: 'currentUrl; format; fileCount.',
    urlQuery: 'fmt|f = zip|gzip|targz|brotli.',
  },
  archiveDecompress: {
    interpolate: 'currentUrl; fileName.',
    urlQuery: 'No prefill query.',
  },
  watermarkGemini: {
    interpolate: 'currentUrl; fileName.',
    urlQuery: 'No prefill query.',
  },
  creativeBorderBeam: {
    interpolate: 'currentUrl; size; variant; theme; strength.',
    urlQuery: 'size=sm|md|line; var|v; theme|t; str=0–100.',
  },
  framework: {
    interpolate: 'currentUrl (developer shell / layout test).',
    urlQuery: 'None.',
  },
  styleGuide: {
    interpolate: 'currentUrl (internal style guide).',
    urlQuery: 'None.',
  },
  aiSpecPageDoc: {
    interpolate: 'currentUrl (this documentation page).',
    urlQuery: 'None — you are already on the reference page.',
  },
};

/** @type {Record<string, { interpolate: string, urlQuery: string }>} */
export const AGENT_PROMPT_TOOL_SPEC_DETAIL_ZH = {
  genericWorkspace: {
    interpolate: 'currentUrl：首页总览的完整地址。',
    urlQuery: '首页本身无单工具 query。',
  },
  genericTools: {
    interpolate: 'currentUrl：工具区列表页地址。',
    urlQuery: '工具区列表页无额外 query。',
  },
  genericCreative: {
    interpolate: 'currentUrl：创意样例区入口地址。',
    urlQuery: '创意入口无额外 query。',
  },
  genericMisc: {
    interpolate: 'currentUrl：当前页面的完整地址。',
    urlQuery: '随路由变化，无统一表。',
  },
  imageCompress: {
    interpolate: 'currentUrl、targetFormat、quality、fileCount：队列与编码选项快照。',
    urlQuery: 'q 或 quality（1–100）；f 或 format（jpeg|png|webp|avif；省略则按页内「保持原格式」规则）。',
  },
  imageConvert: {
    interpolate: 'currentUrl、targetFormat、quality、fileCount。',
    urlQuery: '与压缩页相同：q/quality，f/format。',
  },
  imageResize: {
    interpolate: 'currentUrl、mode（缩放模式）、paramsSummary（状态摘要）、fileCount。',
    urlQuery: 'mode|m；p|pct；maw|maxW；mah|maxH；tw|th|tl；q|quality；f|format（见 resizeQuery.js）。',
  },
  imageCrop: {
    interpolate: 'currentUrl、aspectMode、sizeLabel、outputFormat、fileCount。',
    urlQuery: 'preset|p；cw+ch 或 customW/customH；q|quality；f|format。',
  },
  imageRotate: {
    interpolate: 'currentUrl、transformSummary、outputFormat、fileCount。',
    urlQuery: 'r|rotate；fh|flipH；fv|flipV；q|quality；f|format。',
  },
  imageFavicon: {
    interpolate: 'currentUrl、optionsSummary、fileCount。',
    urlQuery: 'sizes（逗号像素列表）；ico（0|1）。',
  },
  imagePlaystore: {
    interpolate: 'currentUrl、optionsSummary、fileCount。',
    urlQuery: '无 URL 同步项，仅路径。',
  },
  imageAppstore: {
    interpolate: 'currentUrl、optionsSummary、fileCount。',
    urlQuery: '无 URL 同步项，仅路径。',
  },
  imagePreview: {
    interpolate: 'currentUrl、fileCount。',
    urlQuery: 'z|zoom（最大 16）；i|sel 选中下标。',
  },
  imageBatch: {
    interpolate: 'currentUrl、rowCount、fileCount。',
    urlQuery: 'profile|prof；prefix|px；hide|hux；ich|chf（0|1）。',
  },
  imageGif: {
    interpolate: 'currentUrl、summary（压缩/选项摘要）。',
    urlQuery: 'fps|tfps；scale|sc；pal|palette；dith|d；obg|merge；acc|accurate。',
  },
  markdown: {
    interpolate: 'currentUrl。',
    urlQuery: '无有效预填，仅路径。',
  },
  table: {
    interpolate: 'currentUrl、section、outputFormat、fileName、rows、cols。',
    urlQuery: 'fmt|format|out = csv|tsv|xlsx|json。',
  },
  pdf: {
    interpolate: 'currentUrl、fileName。',
    urlQuery: 'pg|page；z|scale（约 0.5–2）。',
  },
  pdfCompress: {
    interpolate: 'currentUrl、fileName、settingsSummary。',
    urlQuery: 'rs|rscale；jq|jpegQ；pf|imgfmt（jpeg|png）。',
  },
  workflow: {
    interpolate: 'currentUrl、stepCount。',
    urlQuery: 'n|name；d|desc（长文本需 URL 编码）。',
  },
  workflowAdvanced: {
    interpolate: 'currentUrl、nodeCount。',
    urlQuery: '仅首次可带 preset：compress|resize|crop；自定义图不进链接。',
  },
  cssIndex: {
    interpolate: 'currentUrl。',
    urlQuery: '索引页无 query，需进子页。',
  },
  cssMinify: {
    interpolate: 'currentUrl、aggressive（是否激进，yes/no）。',
    urlQuery: 'level|l = basic|b 或 aggressive|a。',
  },
  cssBeautify: {
    interpolate: 'currentUrl。',
    urlQuery: '无 URL 预填。',
  },
  archiveIndex: {
    interpolate: 'currentUrl。',
    urlQuery: '索引页无 query。',
  },
  archiveCompress: {
    interpolate: 'currentUrl、format、fileCount。',
    urlQuery: 'fmt|f = zip|gzip|targz|brotli。',
  },
  archiveDecompress: {
    interpolate: 'currentUrl、fileName。',
    urlQuery: '无预填 query。',
  },
  watermarkGemini: {
    interpolate: 'currentUrl、fileName。',
    urlQuery: '无预填 query。',
  },
  creativeBorderBeam: {
    interpolate: 'currentUrl、size、variant、theme、strength。',
    urlQuery: 'size=sm|md|line；var|v；theme|t；str=0–100。',
  },
  framework: {
    interpolate: 'currentUrl（开发者壳层/布局测试）。',
    urlQuery: '无。',
  },
  styleGuide: {
    interpolate: 'currentUrl（内部样式指南）。',
    urlQuery: '无。',
  },
  aiSpecPageDoc: {
    interpolate: 'currentUrl（本说明页自身）。',
    urlQuery: '无 — 当前即全站参数说明页。',
  },
};

/**
 * 静态站预渲染与站点地图共用的 pathname 列表（单一数据源）。
 * - svelte.config.js → kit.prerender.entries
 * - scripts/generate-sitemap.mjs → sitemap.xml
 * 新增/下线公开页面时只改此文件。
 */
const LOCALES = ['en', 'zh'];

/** 语言段之后的路径（均以 / 开头） */
const PATHS_AFTER_LOCALE = [
  '/tools',
  '/creative',
  '/creative/border-beam',
  '/framework',
  '/styleguide',
  '/markdown',
  '/table',
  '/pdf',
  '/pdf/compress',
  '/remove-watermark/gemini',
  '/image/compress',
  '/image/crop',
  '/image/resize',
  '/image/favicon',
  '/image/rotate',
  '/image/playstore',
  '/image/appstore',
  '/image/preview',
  '/image/gif',
  '/image/convert',
  '/image/batch',
  '/css',
  '/css/minify',
  '/css/beautify',
  '/archive',
  '/archive/decompress',
  '/archive/compress',
  '/workflow',
  '/workflow/advanced',
  '/ai-spec',
  '/ai-spec/llm',
  '/ai-spec/llm.txt',
];

/** @type {readonly string[]} */
export const PRERENDER_PATHS = Object.freeze(
  (() => {
    const out = ['/'];
    for (const locale of LOCALES) {
      out.push(`/${locale}`);
      for (const p of PATHS_AFTER_LOCALE) {
        out.push(`/${locale}${p}`);
      }
    }
    return out;
  })(),
);


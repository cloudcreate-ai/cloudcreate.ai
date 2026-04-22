/**
 * 按逻辑路径解析 SEO 文案键；供预渲染与各语言下 <svelte:head> 使用。
 */
import { ALL_SIDEBAR_GROUPS } from '$lib/toolList.js';

/** @typedef {{ template: 'home' } | { template: 'brand', titleKey: string, descKey: string } | { template: 'verbatim', titleKey: string, descKey: string }} SeoSpec */

/** @param {string} titleKey */
function titleKeyToDescKey(titleKey) {
  if (titleKey.endsWith('Title')) return titleKey.slice(0, -'Title'.length) + 'Desc';
  return `${titleKey}Desc`;
}

/** @param {string} logicalPath */
function normalizeLogicalPath(logicalPath) {
  if (logicalPath == null || logicalPath === '') return '/';
  const t = String(logicalPath).replace(/\/$/, '');
  return t === '' ? '/' : t;
}

/** @type {Record<string, SeoSpec>} */
const SEO_EXACT = {
  '/': { template: 'home' },
  '/tools': { template: 'brand', titleKey: 'layout.toolsOverview', descKey: 'home.toolsOverviewIntro' },
  '/css': { template: 'brand', titleKey: 'cssIndex.title', descKey: 'cssIndex.desc' },
  '/archive': { template: 'brand', titleKey: 'archiveIndex.title', descKey: 'archiveIndex.desc' },
  '/framework': { template: 'brand', titleKey: 'home.frameworkTitle', descKey: 'home.frameworkDesc' },
  /** 入口已从导航隐藏，直链仍可访问 */
  '/workflow': { template: 'brand', titleKey: 'home.workflowTitle', descKey: 'home.workflowDesc' },
  '/workflow/advanced': {
    template: 'brand',
    titleKey: 'seo.workflowAdvancedTitle',
    descKey: 'seo.workflowAdvancedDesc',
  },
  '/creative': { template: 'brand', titleKey: 'creative.landingTitle', descKey: 'creative.landingDesc' },
};

function buildHrefSeoMap() {
  /** @type {Record<string, SeoSpec>} */
  const map = {};
  for (const g of ALL_SIDEBAR_GROUPS) {
    for (const item of g.items) {
      if (item.hash) continue;
      const { href, titleKey } = item;
      if (map[href]) continue;
      map[href] = { template: 'brand', titleKey, descKey: titleKeyToDescKey(titleKey) };
    }
  }
  map['/table'] = { template: 'brand', titleKey: 'home.tableToolsTitle', descKey: 'home.tableToolsDesc' };
  return map;
}

const HREF_SEO = buildHrefSeoMap();

const FALLBACK_SEO = /** @type {const} */ ({
  template: 'verbatim',
  titleKey: 'pageTitle',
  descKey: 'seo.defaultDescription',
});

/**
 * @param {string} logicalPath
 * @returns {SeoSpec}
 */
export function resolveSeo(logicalPath) {
  const p = normalizeLogicalPath(logicalPath);
  const exact = SEO_EXACT[p];
  if (exact) return exact;

  const direct = HREF_SEO[p];
  if (direct) return direct;

  let best = /** @type {string | null} */ (null);
  let bestLen = 0;
  for (const h of Object.keys(HREF_SEO)) {
    if (p === h || p.startsWith(`${h}/`)) {
      if (h.length > bestLen) {
        bestLen = h.length;
        best = h;
      }
    }
  }
  if (best) return HREF_SEO[best];

  return FALLBACK_SEO;
}

/**
 * @param {SeoSpec} spec
 * @param {(key: string) => string} t
 */
export function buildSeoTexts(spec, t) {
  if (spec.template === 'home') {
    const title = `${t('home.title')} – ${t('home.subtitle')}`;
    return { title, description: t('home.subtitle') };
  }
  if (spec.template === 'verbatim') {
    return { title: t(spec.titleKey), description: t(spec.descKey) };
  }
  return {
    title: `${t(spec.titleKey)} · ${t('seo.siteBrand')}`,
    description: t(spec.descKey),
  };
}

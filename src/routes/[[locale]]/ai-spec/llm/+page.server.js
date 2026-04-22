import { tLang } from '$lib/i18n.js';
import { buildFullPagePlainText } from '$lib/toolPageSpec/markdown.js';

export const prerender = true;

export function load({ params }) {
  const loc = /** @type {string} */ (params.locale);
  const lang = loc === 'zh' ? 'zh' : 'en';
  const t = (/** @type {string} */ k) => tLang(lang, k);
  return { body: buildFullPagePlainText(t) };
}

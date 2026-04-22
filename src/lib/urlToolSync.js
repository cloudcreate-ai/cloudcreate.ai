/**
 * 工具页 URL 查询参数同步：写回地址栏时复用，与 i18n 无关。
 * 约定：replaceState、保留 path 与 hash，不触发全量 invalidate。
 */
import { get } from 'svelte/store';

/** 与现有各页内联的 debounce 一致 */
export const URL_SYNC_DEBOUNCE_MS = 120;

/**
 * @param {import('svelte/store').Readable<import('@sveltejs/kit').Page>} pageStore
 * @param {typeof import('$app/navigation').goto} goto
 * @param {URLSearchParams | string} next 若为空字符串则清空 search
 */
export function replaceUrlSearchIfChanged(pageStore, goto, next) {
  const s = typeof next === 'string' ? next : next.toString();
  const cur = get(pageStore).url.searchParams.toString();
  if (cur === s) return;
  const p = get(pageStore).url;
  const u = new URL(p);
  u.search = s ? `?${s}` : '';
  goto(u.pathname + u.search + u.hash, {
    replaceState: true,
    noScroll: true,
    keepFocus: true,
    invalidateAll: false,
  });
}

/**
 * @param {string | null | undefined} search 如 location.search 或 $page.url.search
 * @returns {boolean}
 */
export function hasUrlSearchParams(search) {
  return search != null && search.length > 1;
}

/**
 * @param {string} search
 * @returns {URLSearchParams}
 */
export function searchStringToParams(search) {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

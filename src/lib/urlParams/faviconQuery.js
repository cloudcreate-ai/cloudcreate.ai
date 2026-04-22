import { FAVICON_SIZES } from '$lib/faviconGenerator.js';

/**
 * sizes=16,32,... ico=1|0
 */
export function parseFaviconQuery(sp) {
  const out = /** @type {{ sizes?: number[], includeIco?: boolean }} */ ({});
  const raw = sp.get('sizes') ?? sp.get('sz');
  if (raw != null && raw !== '') {
    const arr = raw
      .split(/[, ]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n) && FAVICON_SIZES.some((d) => d.size === n));
    if (arr.length) out.sizes = arr;
  }
  const ico = sp.get('ico');
  if (ico === '1' || ico === 'true' || ico === 'on') out.includeIco = true;
  if (ico === '0' || ico === 'false' || ico === 'off') out.includeIco = false;
  return out;
}

/**
 * @param {Set<number>} selectedSizes
 * @param {boolean} includeIco
 */
export function buildFaviconQuery(selectedSizes, includeIco) {
  const p = new URLSearchParams();
  const sorted = Array.from(selectedSizes)
    .filter((n) => FAVICON_SIZES.some((d) => d.size === n))
    .sort((a, b) => a - b);
  if (sorted.length) p.set('sizes', sorted.join(','));
  p.set('ico', includeIco ? '1' : '0');
  return p;
}

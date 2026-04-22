const MIN = 0.5;
const MAX = 2;

export function parsePdfViewerQuery(sp) {
  const out = /** @type {{ page?: number, scale?: number }} */ ({});
  const pg = sp.get('pg') ?? sp.get('page');
  if (pg != null && pg !== '') {
    const n = Math.floor(Number(pg));
    if (!Number.isNaN(n) && n >= 1) out.page = n;
  }
  const z = sp.get('z') ?? sp.get('scale');
  if (z != null && z !== '') {
    const s = Number(z);
    if (!Number.isNaN(s)) out.scale = Math.min(MAX, Math.max(MIN, Math.round(s * 10) / 10));
  }
  return out;
}

export function buildPdfViewerQuery(currentPage, totalPages, scale) {
  const p = new URLSearchParams();
  if (totalPages > 0) {
    p.set('pg', String(Math.min(Math.max(1, currentPage), totalPages)));
  } else {
    p.set('pg', String(Math.max(1, currentPage)));
  }
  p.set('z', String(scale));
  return p;
}

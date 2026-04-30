export function parsePdfExtractQuery(sp) {
  const out = /** @type {{ pages?: string }} */ ({});
  const pages = sp.get('pages') ?? sp.get('p');
  if (pages != null && pages.trim() !== '') {
    out.pages = pages.trim();
  }
  return out;
}

export function buildPdfExtractQuery(pages) {
  const p = new URLSearchParams();
  const text = String(pages || '').trim();
  if (text) p.set('pages', text);
  return p;
}

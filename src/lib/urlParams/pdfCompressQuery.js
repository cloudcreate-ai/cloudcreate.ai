export function parsePdfCompressQuery(sp) {
  const out = /** @type {{ renderScale?: number, jpegQualityPercent?: number, pageImageFormat?: 'jpeg' | 'png' }} */ ({});
  const rs = sp.get('rs') ?? sp.get('rscale');
  if (rs != null && rs !== '') {
    const n = Number(rs);
    if (!Number.isNaN(n) && n > 0 && n <= 5) out.renderScale = n;
  }
  const jq = sp.get('jq') ?? sp.get('jpegQ');
  if (jq != null && jq !== '') {
    const n = Math.round(Number(jq));
    if (!Number.isNaN(n) && n >= 1 && n <= 100) out.jpegQualityPercent = n;
  }
  const pf = (sp.get('pf') ?? sp.get('imgfmt') ?? '').toLowerCase();
  if (pf === 'jpeg' || pf === 'jpg') out.pageImageFormat = 'jpeg';
  if (pf === 'png') out.pageImageFormat = 'png';
  return out;
}

export function buildPdfCompressQuery(renderScale, jpegQualityPercent, pageImageFormat) {
  const p = new URLSearchParams();
  p.set('rs', String(renderScale));
  p.set('jq', String(jpegQualityPercent));
  p.set('pf', pageImageFormat);
  return p;
}

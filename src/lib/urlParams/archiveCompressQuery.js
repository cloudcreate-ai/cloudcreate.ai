const FMTS = ['zip', 'gzip', 'targz', 'brotli'];

export function parseArchiveCompressQuery(sp) {
  const out = /** @type {{ format?: string }} */ ({});
  const f = (sp.get('fmt') ?? sp.get('f') ?? '').toLowerCase();
  if (f && FMTS.includes(f)) out.format = f;
  return out;
}

export function buildArchiveCompressQuery(format) {
  const p = new URLSearchParams();
  p.set('fmt', format);
  return p;
}

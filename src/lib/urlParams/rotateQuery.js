import { ENCODE_FORMATS } from '$lib/imageProcessor.js';

const ROTS = [0, 90, 180, 270];

/**
 * @param {URLSearchParams} sp
 */
export function parseRotateQuery(sp) {
  const out = /** @type {Record<string, unknown>} */ ({});
  const r = sp.get('r') ?? sp.get('rotate');
  if (r != null && r !== '') {
    const n = Number(r);
    if (ROTS.includes(n)) out.rotate = n;
  }
  const fh = sp.get('fh') ?? sp.get('flipH');
  if (fh != null && fh !== '') {
    if (fh === '1' || fh === 'true' || fh === 'on') out.flipH = true;
    else if (fh === '0' || fh === 'false' || fh === 'off') out.flipH = false;
  }
  const fv = sp.get('fv') ?? sp.get('flipV');
  if (fv != null && fv !== '') {
    if (fv === '1' || fv === 'true' || fv === 'on') out.flipV = true;
    else if (fv === '0' || fv === 'false' || fv === 'off') out.flipV = false;
  }
  const qRaw = sp.get('q') ?? sp.get('quality');
  if (qRaw != null && qRaw !== '') {
    const q = Number(qRaw);
    if (!Number.isNaN(q)) out.quality = Math.min(100, Math.max(1, Math.round(q)));
  }
  const f = sp.get('f') ?? sp.get('format');
  if (f != null) {
    if (f === '' || f === 'orig') out.targetFormat = '';
    else {
      const fl = f.toLowerCase();
      if (ENCODE_FORMATS.includes(fl)) out.targetFormat = fl;
    }
  }
  return out;
}

export function buildRotateQuery(rotate, flipH, flipV, targetFormat, quality) {
  const p = new URLSearchParams();
  p.set('r', String(rotate));
  p.set('fh', flipH ? '1' : '0');
  p.set('fv', flipV ? '1' : '0');
  p.set('q', String(quality));
  if (targetFormat) p.set('f', targetFormat);
  return p;
}

/**
 * 缩放：mode= percent|max|width|height|long|exact，p, maw, mah, tw, th, tl, q, f
 */
import { ENCODE_FORMATS } from '$lib/imageProcessor.js';

const MODES = ['percent', 'max', 'width', 'height', 'long', 'exact'];

/**
 * @param {URLSearchParams} sp
 */
export function parseResizeQuery(sp) {
  const out = /** @type {Record<string, unknown>} */ ({});
  const m = (sp.get('mode') ?? sp.get('m') ?? '').toLowerCase();
  if (m && MODES.includes(m)) out.scaleMode = m;
  const n = (k, alt) => {
    const v = sp.get(k) ?? (alt ? sp.get(alt) : null);
    if (v == null || v === '') return;
    const x = Number(v);
    if (!Number.isNaN(x) && x >= 1) return Math.round(x);
  };
  const pct = n('p', 'pct') ?? n('scale', null);
  if (pct != null) out.scalePercent = Math.min(200, Math.max(1, pct));
  const maw = n('maw', 'maxW');
  if (maw != null) out.maxWidth = maw;
  const mah = n('mah', 'maxH');
  if (mah != null) out.maxHeight = mah;
  const tw = n('tw', 'targetW');
  if (tw != null) out.targetWidth = tw;
  const th = n('th', 'targetH');
  if (th != null) out.targetHeight = th;
  const tl = n('tl', 'long');
  if (tl != null) out.targetLong = tl;
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

export function buildResizeQuery(
  scaleMode,
  scalePercent,
  maxWidth,
  maxHeight,
  targetWidth,
  targetHeight,
  targetLong,
  targetFormat,
  quality
) {
  const p = new URLSearchParams();
  p.set('mode', scaleMode);
  p.set('p', String(scalePercent));
  p.set('maw', String(maxWidth));
  p.set('mah', String(maxHeight));
  p.set('tw', String(targetWidth));
  p.set('th', String(targetHeight));
  p.set('tl', String(targetLong));
  p.set('q', String(quality));
  if (targetFormat) p.set('f', targetFormat);
  return p;
}

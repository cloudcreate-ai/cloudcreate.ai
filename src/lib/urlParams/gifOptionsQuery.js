/**
 * GIF 压缩：与 gifEditorStore.options 可序列化字段同步（加载文件后亦生效，handleFiles 末尾可再次 apply）
 */
export function parseGifOptionsQuery(sp) {
  const out = /** @type {Record<string, unknown>} */ ({});
  const fps = sp.get('fps') ?? sp.get('tfps');
  if (fps != null && fps !== '') {
    const n = Math.round(Number(fps));
    if (!Number.isNaN(n) && n >= 1 && n <= 60) out.targetFps = n;
  }
  const spct = sp.get('scale') ?? sp.get('sc');
  if (spct != null && spct !== '') {
    const n = Math.round(Number(spct));
    if (!Number.isNaN(n) && n >= 10 && n <= 200) out.scalePercent = n;
  }
  const pal = sp.get('pal') ?? sp.get('palette');
  if (pal != null && pal !== '') {
    const n = Math.round(Number(pal));
    if (!Number.isNaN(n) && n >= 2 && n <= 256) out.paletteSize = n;
  }
  const d = sp.get('dith') ?? sp.get('d');
  if (d === '1' || d === 'true' || d === 'on') out.dither = true;
  if (d === '0' || d === 'false' || d === 'off') out.dither = false;
  const obg = sp.get('obg') ?? sp.get('merge');
  if (obg === '1' || obg === 'true' || obg === 'on') out.optimizeBackground = true;
  if (obg === '0' || obg === 'false' || obg === 'off') out.optimizeBackground = false;
  const acc = sp.get('acc') ?? sp.get('accurate');
  if (acc === '1' || acc === 'true' || acc === 'on') out.accuratePreview = true;
  if (acc === '0' || acc === 'false' || acc === 'off') out.accuratePreview = false;
  return out;
}

/** @param {Record<string, unknown>} opts 与 gifEditorStore 的 options 形状一致 */
export function buildGifOptionsQuery(opts) {
  const p = new URLSearchParams();
  p.set('fps', String(Math.round(opts.targetFps || 0)));
  p.set('scale', String(Math.round(opts.scalePercent ?? 100)));
  p.set('pal', String(Math.round(opts.paletteSize ?? 128)));
  p.set('dith', opts.dither ? '1' : '0');
  p.set('obg', opts.optimizeBackground !== false ? '1' : '0');
  p.set('acc', opts.accuratePreview !== false ? '1' : '0');
  return p;
}

/** 图片预览：z=缩放倍率，i=选中下标 */
export function parsePreviewQuery(sp) {
  const out = /** @type {{ zoom?: number, selectedIndex?: number }} */ ({});
  const z = sp.get('z') ?? sp.get('zoom');
  if (z != null && z !== '') {
    const n = Number(z);
    if (!Number.isNaN(n) && n > 0 && n <= 16) out.zoom = n;
  }
  const i = sp.get('i') ?? sp.get('sel');
  if (i != null && i !== '') {
    const n = Math.floor(Number(i));
    if (!Number.isNaN(n) && n >= 0) out.selectedIndex = n;
  }
  return out;
}

export function buildPreviewQuery(zoom, selectedIndex) {
  const p = new URLSearchParams();
  p.set('z', String(zoom));
  p.set('i', String(selectedIndex));
  return p;
}

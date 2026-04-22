export function parseCssMinifyQuery(sp) {
  const out = /** @type {{ minifyLevel?: 'basic' | 'aggressive' }} */ ({});
  const lv = (sp.get('level') ?? sp.get('l') ?? '').toLowerCase();
  if (lv === 'aggressive' || lv === 'a') out.minifyLevel = 'aggressive';
  if (lv === 'basic' || lv === 'b') out.minifyLevel = 'basic';
  return out;
}

export function buildCssMinifyQuery(minifyLevel) {
  const p = new URLSearchParams();
  p.set('level', minifyLevel);
  return p;
}

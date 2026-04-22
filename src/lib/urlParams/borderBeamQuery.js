const SIZES = ['sm', 'md', 'line'];
const VARS = ['colorful', 'mono', 'ocean', 'sunset'];
const THEMES = ['dark', 'light', 'auto'];

export function parseBorderBeamQuery(sp) {
  const out = /** @type {{ beamSize?: string, colorVariant?: string, beamTheme?: string, strength?: number }} */ ({});
  const sz = (sp.get('size') ?? '').toLowerCase();
  if (sz && SIZES.includes(sz)) out.beamSize = sz;
  const v = (sp.get('var') ?? sp.get('v') ?? '').toLowerCase();
  if (v && VARS.includes(v)) out.colorVariant = v;
  const th = (sp.get('theme') ?? sp.get('t') ?? '').toLowerCase();
  if (th && THEMES.includes(th)) out.beamTheme = th;
  const st = sp.get('str') ?? sp.get('strength');
  if (st != null && st !== '') {
    const n = Math.round(Number(st));
    if (!Number.isNaN(n) && n >= 0 && n <= 100) {
      out.strength = n / 100; // 组件内 0~1
    }
  }
  return out;
}

/**
 * @param {number} strength 0-1
 */
export function buildBorderBeamQuery(beamSize, colorVariant, beamTheme, strength) {
  const p = new URLSearchParams();
  p.set('size', beamSize);
  p.set('var', colorVariant);
  p.set('theme', beamTheme);
  p.set('str', String(Math.round((strength ?? 0) * 100)));
  return p;
}

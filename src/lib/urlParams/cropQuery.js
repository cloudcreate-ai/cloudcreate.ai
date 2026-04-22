/**
 * 裁剪页 URL：preset= free|1:1|4:3|3:4|16:9|9:16|3:2|2:3|custom + cw ch + q f
 */
import { ENCODE_FORMATS } from '$lib/imageProcessor.js';

const PRESET_TO_AR = {
  free: 0,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '3:2': 3 / 2,
  '2:3': 2 / 3,
  custom: 'custom',
};

function arToPreset(aspectRatio) {
  if (aspectRatio === 'custom') return 'custom';
  if (aspectRatio === 0) return 'free';
  for (const [k, v] of Object.entries(PRESET_TO_AR)) {
    if (k === 'custom' || k === 'free') continue;
    if (typeof v === 'number' && typeof aspectRatio === 'number' && Math.abs(v - aspectRatio) < 1e-4) {
      return k;
    }
  }
  return 'free';
}

/**
 * @param {URLSearchParams} sp
 * @returns {{ aspectRatio?: number | 'custom', customWidth?: number, customHeight?: number, quality?: number, targetFormat?: string }}
 */
export function parseCropQuery(sp) {
  const out = /** @type {{ aspectRatio?: number | 'custom', customWidth?: number, customHeight?: number, quality?: number, targetFormat?: string }} */ ({});
  const preset = (sp.get('preset') ?? sp.get('p') ?? '').toLowerCase();
  if (preset && preset in PRESET_TO_AR) {
    out.aspectRatio = PRESET_TO_AR[preset];
  }
  const cw = sp.get('cw') ?? sp.get('customW');
  const ch = sp.get('ch') ?? sp.get('customH');
  if (cw != null && cw !== '' && ch != null && ch !== '') {
    const w = Math.max(1, Math.round(Number(cw)) || 1);
    const h = Math.max(1, Math.round(Number(ch)) || 1);
    out.customWidth = w;
    out.customHeight = h;
    if (!preset || preset === 'custom') out.aspectRatio = 'custom';
  }
  const qRaw = sp.get('q') ?? sp.get('quality');
  if (qRaw != null && qRaw !== '') {
    const n = Number(qRaw);
    if (!Number.isNaN(n)) out.quality = Math.min(100, Math.max(1, Math.round(n)));
  }
  const fRaw = sp.get('f') ?? sp.get('format');
  if (fRaw === null) {
    // skip
  } else if (fRaw === '' || fRaw === 'orig' || fRaw === 'original' || fRaw === '-') {
    out.targetFormat = '';
  } else {
    const fl = fRaw.toLowerCase();
    if (ENCODE_FORMATS.includes(fl)) out.targetFormat = fl;
  }
  return out;
}

/**
 * @param {number | 'custom'} aspectRatio
 * @param {number} customWidth
 * @param {number} customHeight
 * @param {string} targetFormat
 * @param {number} quality
 */
export function buildCropQuery(aspectRatio, customWidth, customHeight, targetFormat, quality) {
  const p = new URLSearchParams();
  p.set('preset', arToPreset(aspectRatio));
  if (aspectRatio === 'custom') {
    p.set('cw', String(Math.max(1, customWidth)));
    p.set('ch', String(Math.max(1, customHeight)));
  }
  p.set('q', String(quality));
  if (targetFormat) p.set('f', targetFormat);
  return p;
}

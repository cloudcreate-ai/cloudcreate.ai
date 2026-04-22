import { FORMATS } from '$lib/tableTools.js';

/**
 * 与 /table 页一致：fmt / format / out
 */
export function parseTableFormatQuery(sp) {
  const fmt = (sp.get('fmt') ?? sp.get('format') ?? sp.get('out') ?? '').toLowerCase();
  if (fmt && FORMATS.includes(fmt)) return fmt;
  return null;
}

export function buildTableFormatQuery(outputFormat) {
  const p = new URLSearchParams();
  p.set('fmt', outputFormat);
  return p;
}

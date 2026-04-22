/**
 * 图片压缩/转换工具：与 URL 查询参数互相同步，便于分享带配置的链接。
 * 约定：q=质量(1-100)；f=输出格式(小写)。省略 f 表示不覆盖格式（保持本地记忆或同原图逻辑）。
 * 也接受 quality / format 长参数名。
 */
import { ENCODE_FORMATS } from '$lib/imageProcessor.js';

/**
 * @param {URLSearchParams} searchParams
 * @param {{ showSameAsOriginal: boolean, defaultTargetFormat: string }} ctx
 * @returns {{ quality?: number, targetFormat?: string }}
 */
export function parseImageEncodeQuery(searchParams, { showSameAsOriginal, defaultTargetFormat }) {
  const out = /** @type {{ quality?: number, targetFormat?: string }} */ ({});
  const qRaw = searchParams.get('q') ?? searchParams.get('quality');
  if (qRaw != null && qRaw !== '') {
    const n = Number(qRaw);
    if (!Number.isNaN(n)) {
      out.quality = Math.min(100, Math.max(1, Math.round(n)));
    }
  }
  const fRaw = searchParams.get('f') ?? searchParams.get('format');
  if (fRaw === null) {
    // 未提供 f：不覆盖 targetFormat
  } else if (fRaw === '') {
    out.targetFormat = showSameAsOriginal ? '' : defaultTargetFormat || 'webp';
  } else {
    const fl = fRaw.toLowerCase();
    if (fl === 'orig' || fl === 'original' || fl === '-') {
      out.targetFormat = showSameAsOriginal ? '' : defaultTargetFormat || 'webp';
    } else if (ENCODE_FORMATS.includes(fl)) {
      out.targetFormat = fl;
    }
  }
  return out;
}

/**
 * @param {number} quality
 * @param {string} targetFormat
 * @returns {URLSearchParams}
 */
export function buildImageEncodeQuery(quality, targetFormat) {
  const p = new URLSearchParams();
  p.set('q', String(quality));
  if (targetFormat) p.set('f', targetFormat);
  return p;
}

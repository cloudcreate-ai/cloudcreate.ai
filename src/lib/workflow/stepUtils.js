/**
 * 简易工作流步骤工具：brief 生成、默认参数等
 */
import { t } from '../i18n.js';

/** 序号符号 ① ② ③ ... */
const ORDINALS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export function getStepOrdinal(index) {
  return ORDINALS[index] ?? String(index + 1);
}

/** 生成步骤卡片简要信息 */
export function formatStepBrief(type, params = {}) {
  if (type === 'input') return '';
  if (type === 'output') {
    const fmt = params.targetFormat || '';
    const q = params.quality ?? 75;
    return fmt ? `${fmt.toUpperCase()} Q${q}` : t('common.sameAsOriginal');
  }
  if (type === 'resize') {
    const mode = params.scaleMode ?? 'percent';
    if (mode === 'percent') return `${params.scalePercent ?? 50}%`;
    if (mode === 'max') return `${params.maxWidth ?? 1920}×${params.maxHeight ?? 1080}`;
    if (mode === 'width') return `W${params.targetWidth ?? 1920}`;
    if (mode === 'height') return `H${params.targetHeight ?? 1080}`;
    if (mode === 'long') return `L${params.targetLong ?? 1920}`;
    return `${params.scalePercent ?? 50}%`;
  }
  if (type === 'crop') {
    const r = params.aspectRatio ?? 0;
    if (!r || r === 0) return t('crop.free');
    const map = { 1: '1:1', 1.333: '4:3', 0.75: '3:4', 1.778: '16:9', 0.5625: '9:16' };
    return map[r] ?? String(r);
  }
  return '';
}

export const DEFAULT_STEP_PARAMS = {
  resize: { scaleMode: 'percent', scalePercent: 50, maxWidth: 1920, maxHeight: 1080 },
  crop: { aspectRatio: 0 },
  output: { targetFormat: '', quality: 75 },
};

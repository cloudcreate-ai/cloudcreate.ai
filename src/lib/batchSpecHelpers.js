/**
 * 批处理规格表：加载、按比例分组、为每组分配最接近比例的输入图
 */

const BATCH_SPECS_URL = '/tempfiles/batch-specs.json';

/**
 * 规格行结构：name, width, height, format, quality?, maxSizeKb?
 * @typedef {{ name: string, width: number, height: number, format: string, quality?: number, maxSizeKb?: number }} BatchSpecRow
 */

/**
 * 加载规格表 JSON
 * @param {string} [url]
 * @returns {Promise<BatchSpecRow[]>}
 */
export async function loadBatchSpecs(url = BATCH_SPECS_URL) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load batch specs');
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    name: String(row.name ?? ''),
    width: Math.max(1, Number(row.width) || 1),
    height: Math.max(1, Number(row.height) || 1),
    format: String(row.format ?? 'webp').toLowerCase().replace('jpg', 'jpeg'),
    quality: Math.min(100, Math.max(0, Number(row.quality) ?? 75)),
    maxSizeKb: row.maxSizeKb != null ? Math.max(0, Number(row.maxSizeKb)) : undefined,
  }));
}

/**
 * 宽高比分组键（保留 2 位小数，便于合并接近比例）
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
export function getAspectRatioKey(w, h) {
  if (!h) return 0;
  const r = w / h;
  return Math.round(r * 100) / 100;
}

/**
 * 按宽高比分组规格
 * @param {BatchSpecRow[]} specs
 * @returns {Map<number, BatchSpecRow[]>}
 */
export function groupSpecsByRatio(specs) {
  const map = new Map();
  for (const s of specs) {
    const key = getAspectRatioKey(s.width, s.height);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return map;
}

/**
 * 从文件项中选出与目标比例最接近的一个（文件项需含 width、height）
 * @param {{ width?: number, height?: number, file: File }[]} fileItems
 * @param {number} targetRatio
 * @returns {{ width?: number, height?: number, file: File } | null}
 */
export function pickBestFileForRatio(fileItems, targetRatio) {
  if (!fileItems?.length) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const item of fileItems) {
    const w = item.width ?? 0;
    const h = item.height ?? 0;
    const r = h ? w / h : 0;
    const diff = Math.abs(r - targetRatio);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = item;
    }
  }
  return best;
}

/**
 * 为每条规格分配输入文件：同比例规格共用同一张图，选比例最接近的文件
 * @param {BatchSpecRow[]} specs
 * @param {{ width?: number, height?: number, file: File }[]} fileItems
 * @returns {Array<{ spec: BatchSpecRow, assignedFile: File | null }>}
 */
export function assignInputsToSpecs(specs, fileItems) {
  if (!specs.length) return [];
  const groups = groupSpecsByRatio(specs);
  const result = [];
  for (const spec of specs) {
    const key = getAspectRatioKey(spec.width, spec.height);
    const group = groups.get(key) ?? [spec];
    const chosen = pickBestFileForRatio(fileItems, key);
    result.push({
      spec,
      assignedFile: chosen ? chosen.file : null,
    });
  }
  return result;
}

/**
 * 将规格行转为 resize 工作流的 paramsOverrides
 * @param {BatchSpecRow} spec
 * @returns {{ resize: object, output: object }}
 */
export function specToParamsOverrides(spec) {
  return {
    resize: {
      scaleMode: 'exact',
      targetWidth: spec.width,
      targetHeight: spec.height,
    },
    output: {
      targetFormat: spec.format || undefined,
      quality: spec.quality ?? 75,
    },
  };
}

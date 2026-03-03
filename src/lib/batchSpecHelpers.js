/**
 * 批处理规格表：加载、按比例分组、为每组分配最接近比例的输入图
 */

const BATCH_SPECS_URL = '/specs/batch-specs.json';

/**
 * 规格行结构：name, width, height, format, quality?, maxSizeKb?, quantity?
 * @typedef {{ name: string, width: number, height: number, format: string, quality?: number, maxSizeKb?: number, quantity?: number }} BatchSpecRow
 */

/**
 * 单条规格标准化（用于加载与导入）
 * @param {unknown} row
 * @returns {BatchSpecRow}
 */
export function normalizeBatchSpecRow(row) {
  const r = /** @type {Record<string, unknown>} */ (row || {});
  return {
    name: String(r.name ?? ''),
    width: Math.max(1, Number(r.width) || 1),
    height: Math.max(1, Number(r.height) || 1),
    format: String(r.format ?? 'webp').toLowerCase().replace('jpg', 'jpeg'),
    quality: Math.min(100, Math.max(0, Number(r.quality) ?? 75)),
    maxSizeKb: r.maxSizeKb != null ? Math.max(0, Number(r.maxSizeKb)) : undefined,
    quantity: Math.max(1, parseInt(r.quantity, 10) || 1),
  };
}

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
  return raw.map(normalizeBatchSpecRow);
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
    const chosen = pickBestFileForRatio(fileItems, key);
    result.push({
      spec,
      assignedFile: chosen ? chosen.file : null,
    });
  }
  return result;
}

/**
 * 按与目标比例接近程度排序文件项（越靠前越适合）
 * @param {{ width?: number, height?: number, file: File }[]} fileItems
 * @param {number} targetRatio
 * @returns {{ width?: number, height?: number, file: File }[]}
 */
export function sortFileItemsByRatio(fileItems, targetRatio) {
  if (!fileItems?.length) return [];
  return [...fileItems].sort((a, b) => {
    const ra = (a.height && a.width) ? a.width / a.height : 0;
    const rb = (b.height && b.width) ? b.width / b.height : 0;
    return Math.abs(ra - targetRatio) - Math.abs(rb - targetRatio);
  });
}

/**
 * 按尺寸 (宽x高) 分组，同比例同尺寸为一组
 * @param {{ width?: number, height?: number, file: File }[]} fileItems
 * @returns {Map<string, { width?: number, height?: number, file: File }[]>}
 */
function groupFileItemsBySize(fileItems) {
  const map = new Map();
  for (const item of fileItems) {
    const w = item.width ?? 0;
    const h = item.height ?? 0;
    const key = `${w}x${h}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

/**
 * 展开规格为多行（按 quantity）；多图规格使用「同比例、同尺寸」的一组图，组内数量不足则后续行无输入
 * @param {BatchSpecRow[]} specs
 * @param {{ width?: number, height?: number, file: File }[]} fileItems
 * @returns {Array<{ spec: BatchSpecRow, quantityIndex: number, quantity: number, assignedFile: File | null, isReused: boolean }>}
 */
export function expandSpecsAndAssignInputs(specs, fileItems) {
  if (!specs.length) return [];
  const bySize = groupFileItemsBySize(fileItems);
  const result = [];
  for (let specIndex = 0; specIndex < specs.length; specIndex++) {
    const spec = specs[specIndex];
    const qty = Math.max(1, spec.quantity ?? 1);
    const targetRatio = spec.height ? spec.width / spec.height : 0;
    // 找比例最接近且同尺寸的一组
    let bestGroup = [];
    let bestDiff = Infinity;
    for (const [, group] of bySize) {
      if (!group.length) continue;
      const w = group[0].width ?? 0;
      const h = group[0].height ?? 0;
      const r = h ? w / h : 0;
      const diff = Math.abs(r - targetRatio);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestGroup = group;
      }
    }
    for (let q = 0; q < qty; q++) {
      const pick = q < bestGroup.length ? bestGroup[q] : null;
      const assignedFile = pick ? pick.file : null;
      result.push({
        spec,
        specIndex,
        quantityIndex: q,
        quantity: qty,
        assignedFile,
        isReused: false,
      });
    }
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

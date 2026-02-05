/**
 * 批量工具共享逻辑 - 文件项构建、下载、统计等
 * 供 Compress、Convert 等批量工具复用
 */
import { getFormatFromFile, getImageDimensions } from './imageProcessor.js';

export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * 从 File 构建文件项（含预览 URL、尺寸等）
 * @param {File} file
 * @param {number} id
 * @returns {Promise<{ id, file, previewUrl, name, format, size, width, height, status }>}
 */
export async function buildFileItem(file, id) {
  const previewUrl = URL.createObjectURL(file);
  let width = 0;
  let height = 0;
  try {
    const dim = await getImageDimensions(file);
    width = dim.width;
    height = dim.height;
  } catch (_) {}
  return {
    id,
    file,
    previewUrl,
    name: file.name,
    format: getFormatFromFile(file).toUpperCase(),
    size: file.size,
    width,
    height,
    status: 'pending',
  };
}

/**
 * 触发 Blob 下载
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * 计算已完成项的总计统计
 * @param {Array} items - 含 status, size, newSize
 * @returns {{ totalOriginal: number, totalNew: number, ratio: number } | null}
 */
export function computeTotalStats(items) {
  const done = items.filter((x) => x.status === 'done');
  if (done.length === 0) return null;
  const totalOriginal = done.reduce((s, x) => s + x.size, 0);
  const totalNew = done.reduce((s, x) => s + (x.newSize ?? 0), 0);
  const ratio = totalOriginal > 0 ? (1 - totalNew / totalOriginal) * 100 : 0;
  return { totalOriginal, totalNew, ratio };
}

/**
 * 过滤出图片类型的文件
 * @param {FileList|File[]} fileList
 * @returns {File[]}
 */
export function filterImageFiles(fileList) {
  return Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'));
}

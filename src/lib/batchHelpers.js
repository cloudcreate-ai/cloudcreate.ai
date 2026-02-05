/**
 * 批量工具共享逻辑 - 文件项构建、下载、统计等
 * 供 Compress、Convert 等批量工具复用
 */
import JSZip from 'jszip';
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

/** 生成人工可读时间戳，如 2025-02-05_23-50-32 */
function readableTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/**
 * 将多个文件打包为 zip 并下载，文件名自动加时间戳后缀
 * @param {Array<{ blob: Blob, outputName?: string, name?: string }>} items
 * @param {string} [zipName='images.zip']
 */
export async function downloadAsZip(items, zipName = 'images.zip') {
  const list = items.filter((x) => x.blob);
  if (list.length === 0) return;
  if (list.length === 1) {
    downloadBlob(list[0].blob, list[0].outputName || list[0].name || 'image');
    return;
  }
  const zip = new JSZip();
  const used = new Set();
  for (const item of list) {
    let name = item.outputName || item.name || 'image';
    if (used.has(name)) {
      const [base, ext] = name.includes('.') ? [name.replace(/\.[^.]+$/, ''), name.match(/\.[^.]+$/)?.[0] || ''] : [name, ''];
      let n = 1;
      while (used.has(`${base}_${n}${ext}`)) n++;
      name = `${base}_${n}${ext}`;
    }
    used.add(name);
    zip.file(name, item.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const base = zipName.replace(/\.zip$/i, '');
  downloadBlob(blob, `${base}-${readableTimestamp()}.zip`);
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

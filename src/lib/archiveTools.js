/**
 * 压缩包工具 - ZIP, GZIP, TAR.GZ, BROTLI
 * 支持解压与压缩
 */
import { unzipSync, zipSync, gzipSync, gunzipSync } from 'fflate';
import brotliWasm from 'brotli-wasm';

let brotliModule = null;
async function getBrotli() {
  if (brotliModule) return brotliModule;
  brotliModule = await brotliWasm;
  return brotliModule;
}

/** 解析 tar 格式，返回 { name, size, data }[] */
function parseTar(buf) {
  const arr = new Uint8Array(buf);
  const files = [];
  let pos = 0;

  function readStr(block, offset, len) {
    const slice = block.subarray(offset, offset + len);
    const nullIdx = slice.indexOf(0);
    const cut = nullIdx >= 0 ? slice.subarray(0, nullIdx) : slice;
    return new TextDecoder('utf-8').decode(cut).replace(/\0/g, '').trim();
  }

  function readOctal(block, offset, len) {
    const s = readStr(block, offset, len);
    return s ? parseInt(s, 8) || 0 : 0;
  }

  while (pos + 512 <= arr.length) {
    const block = arr.subarray(pos, pos + 512);
    if (block.every((b) => b === 0)) break;

    const prefix = readStr(block, 345, 155);
    const namePart = readStr(block, 0, 100);
    const name = prefix ? `${prefix}/${namePart}` : namePart;
    const size = readOctal(block, 124, 12);
    const typeflag = block[156];

    if (typeflag === 0 || typeflag === 0x30) {
      const data = arr.slice(pos + 512, pos + 512 + size);
      if (name && !name.endsWith('/')) {
        files.push({ name: name.replace(/\/$/, ''), size, data });
      }
    }

    pos += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/** 创建 tar 格式 */
function createTar(files) {
  const chunks = [];

  function writeStr(s, len) {
    const enc = new TextEncoder().encode(s.slice(0, len));
    const buf = new Uint8Array(len);
    buf.set(enc);
    return buf;
  }

  function writeOctal(n, len) {
    return writeStr(n.toString(8), len);
  }

  for (const f of files) {
    const name = f.name.slice(0, 100);
    const header = new Uint8Array(512);
    header.set(writeStr(name, 100), 0);
    header.set(writeStr('0000644', 8), 100);
    header.set(writeStr('0000000', 8), 108);
    header.set(writeStr('0000000', 8), 116);
    header.set(writeOctal(f.data.length, 12), 124);
    header.set(writeOctal(Math.floor(Date.now() / 1000), 12), 136);
    header.set(writeStr('0', 1), 156);
    header.set(writeStr('ustar', 6), 257);

    const blockCount = Math.ceil(f.data.length / 512);
    const content = new Uint8Array(blockCount * 512);
    content.set(f.data);
    chunks.push(header, content);
  }
  chunks.push(new Uint8Array(1024)); // 结束块
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// --- 解压 ---

/** 解压 ZIP */
export function decompressZip(buffer) {
  const data = new Uint8Array(buffer);
  const files = unzipSync(data);
  return Object.entries(files).map(([name, data]) => ({
    name,
    size: data.length,
    blob: new Blob([data]),
    data,
  }));
}

/** 解压 GZIP（单文件） */
export function decompressGzip(buffer) {
  const data = new Uint8Array(buffer);
  const out = gunzipSync(data);
  return [{ name: 'extracted', size: out.length, blob: new Blob([out]), data: out }];
}

/** 解压 TAR.GZ */
export function decompressTarGz(buffer) {
  const data = new Uint8Array(buffer);
  const tarBytes = gunzipSync(data);
  const files = parseTar(tarBytes.buffer);
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    blob: new Blob([f.data]),
    data: f.data,
  }));
}

/** 解压 BROTLI（异步） */
export async function decompressBrotli(buffer) {
  const brotli = await getBrotli();
  const out = brotli.decompress(new Uint8Array(buffer));
  if (!out) throw new Error('Brotli decompress failed');
  const arr = new Uint8Array(out);
  return [{ name: 'extracted', size: arr.length, blob: new Blob([arr]), data: arr }];
}

// --- 拖拽/选择 ---

/**
 * 从 DataTransfer 读取文件，支持拖入文件夹（递归保留目录结构）
 * @returns {Promise<Array<{ file: File, name: string }>>}
 */
export async function readFilesFromDataTransfer(dataTransfer) {
  const items = dataTransfer?.items;
  if (!items?.length) return [];

  const results = [];

  async function processEntry(entry, basePath = '') {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res));
      const path = basePath ? `${basePath}/${entry.name}` : entry.name;
      results.push({ file, name: path });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      let entries = [];
      let batch;
      do {
        batch = await new Promise((res, rej) => dirReader.readEntries(res, rej));
        entries = entries.concat(batch);
      } while (batch.length > 0);
      const nextBase = basePath ? `${basePath}/${entry.name}` : entry.name;
      for (const e of entries) {
        await processEntry(e, nextBase);
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry?.();
    if (!entry) {
      const file = item.getAsFile();
      if (file) results.push({ file, name: file.name });
      continue;
    }
    await processEntry(entry);
  }

  return results;
}

// --- 压缩 ---

/** 压缩为 ZIP */
export async function compressZip(files) {
  const obj = {};
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const data =
      f instanceof File
        ? new Uint8Array(await f.arrayBuffer())
        : f.data || new Uint8Array(await f.file.arrayBuffer());
    const name = f.name || f.file?.name || `file_${i}`;
    obj[name] = data;
  }
  const out = zipSync(obj);
  return new Blob([out], { type: 'application/zip' });
}

/** 压缩为 GZIP（单文件） */
export async function compressGzip(file, filename) {
  const data = file instanceof ArrayBuffer ? new Uint8Array(file) : new Uint8Array(await file.arrayBuffer());
  const out = gzipSync(data, { filename: filename || 'file' });
  return new Blob([out], { type: 'application/gzip' });
}

/** 压缩为 TAR.GZ */
export async function compressTarGz(files) {
  const tarFiles = await Promise.all(
    files.map(async (f) => {
      const data =
        f instanceof File
          ? new Uint8Array(await f.arrayBuffer())
          : f.data || new Uint8Array(await f.file.arrayBuffer());
      return { name: f.name || f.file?.name || 'file', data };
    })
  );
  const tar = createTar(tarFiles);
  const gz = gzipSync(tar);
  return new Blob([gz], { type: 'application/gzip' });
}

/** 压缩为 BROTLI（异步） */
export async function compressBrotli(file) {
  const brotli = await getBrotli();
  const data = file instanceof ArrayBuffer ? new Uint8Array(file) : new Uint8Array(await file.arrayBuffer());
  const out = brotli.compress(data);
  if (!out) throw new Error('Brotli compress failed');
  return new Blob([out], { type: 'application/x-brotli' });
}

// 根据扩展名检测格式
export const FORMATS = {
  zip: { ext: ['.zip'], decompress: decompressZip },
  gzip: { ext: ['.gz', '.gzip'], decompress: decompressGzip, singleFile: true },
  targz: { ext: ['.tgz', '.tar.gz'], decompress: decompressTarGz },
  brotli: { ext: ['.br'], decompress: decompressBrotli, singleFile: true },
};

export function detectFormat(filename) {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'targz';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.br')) return 'brotli';
  if (lower.endsWith('.gz') || lower.endsWith('.gzip')) return 'gzip';
  return null;
}

import {
  FORMATS,
  compressBrotli,
  compressBrotliBytes,
  compressGzip,
  compressGzipBytes,
  compressTarGz,
  compressTarGzBytes,
  compressZip,
  compressZipBytes,
  createTarBytes,
  decompressBrotli,
  decompressBrotliEntries,
  decompressGzip,
  decompressGzipEntries,
  decompressTarGz,
  decompressTarGzEntries,
  decompressZip,
  decompressZipEntries,
  detectFormat,
  parseTarEntries,
} from '../../packages/tools-core/src/archive.js';

export {
  FORMATS,
  compressBrotli,
  compressBrotliBytes,
  compressGzip,
  compressGzipBytes,
  compressTarGz,
  compressTarGzBytes,
  compressZip,
  compressZipBytes,
  createTarBytes,
  decompressBrotli,
  decompressBrotliEntries,
  decompressGzip,
  decompressGzipEntries,
  decompressTarGz,
  decompressTarGzEntries,
  decompressZip,
  decompressZipEntries,
  detectFormat,
  parseTarEntries,
};

export async function readFilesFromDataTransfer(dataTransfer) {
  const items = dataTransfer?.items;
  if (!items?.length) return [];

  const results = [];

  async function processEntry(entry, basePath = '') {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      const path = basePath ? `${basePath}/${entry.name}` : entry.name;
      results.push({ file, name: path });
      return;
    }

    if (entry.isDirectory) {
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

<script>
  /**
   * 压缩包解压 - ZIP, GZIP, TAR.GZ, BROTLI
   */
  import { t } from '$lib/i18n.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import {
    decompressZip,
    decompressGzip,
    decompressTarGz,
    decompressBrotli,
    detectFormat,
  } from '$lib/archiveTools.js';

  let archiveFile = $state(null);
  let extractedFiles = $state([]);
  let processing = $state(false);
  let error = $state('');
  let dropActive = $state(false);
  let inputRef = $state(null);

  const ACCEPT = '.zip,.gz,.tgz,.br,application/zip,application/gzip,application/x-brotli';

  async function handleFile(file) {
    if (!file) return;
    archiveFile = file;
    extractedFiles = [];
    error = '';
  }

  function handleInputChange(e) {
    const files = e.target?.files;
    if (files?.[0]) handleFile(files[0]);
    if (inputRef) inputRef.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  async function decompress() {
    if (!archiveFile) {
      error = t('archive.errEmptyInput');
      return;
    }
    error = '';
    extractedFiles = [];
    processing = true;
    try {
      const fmt = detectFormat(archiveFile.name);
      if (!fmt) {
        error = t('archive.errUnsupportedFormat');
        return;
      }
      const buffer = await archiveFile.arrayBuffer();
      let files = [];
      if (fmt === 'zip') files = decompressZip(buffer);
      else if (fmt === 'gzip') files = decompressGzip(buffer);
      else if (fmt === 'targz') files = decompressTarGz(buffer);
      else if (fmt === 'brotli') files = await decompressBrotli(buffer);
      extractedFiles = files;
    } catch (e) {
      error = e.message || 'Decompress failed';
    } finally {
      processing = false;
    }
  }

  function downloadSingle(file) {
    downloadBlob(file.blob, file.name);
  }

  async function downloadAll() {
    if (extractedFiles.length === 0) return;
    if (extractedFiles.length === 1) {
      downloadSingle(extractedFiles[0]);
      return;
    }
    const { compressZip } = await import('$lib/archiveTools.js');
    const items = extractedFiles.map((f) => ({ name: f.name, data: f.data, file: null }));
    const blob = await compressZip(items);
    const base = archiveFile.name.replace(/\.[^.]+$/, '').replace(/\.tar$/, '') || 'extracted';
    downloadBlob(blob, `${base}-extracted.zip`);
  }

  function clear() {
    archiveFile = null;
    extractedFiles = [];
    error = '';
    if (inputRef) inputRef.value = '';
  }
</script>

<div class="workspace-content">
  <ToolPageHeader titleKey="archiveDecompress.title" descKey="archiveDecompress.desc" />

  <section class="mb-4">
    <p class="text-sm font-medium block mb-2 m-0">{t('archiveDecompress.input')}</p>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="card preset-outlined-surface-200-800 p-4 cursor-pointer transition {dropActive ? 'border-primary-500 bg-primary-500/5' : ''}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => inputRef?.click()}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
    >
      <input
        type="file"
        accept={ACCEPT}
        class="hidden"
        bind:this={inputRef}
        onchange={handleInputChange}
      />
      <p class="text-surface-600-400 text-sm m-0">{t('archiveDecompress.uploadHint')}</p>
      {#if archiveFile}
        <p class="text-sm text-primary-500 mt-1 m-0">{archiveFile.name}</p>
      {/if}
    </div>
    <p class="text-xs text-surface-500-500 mt-2 m-0">{t('archiveDecompress.formats')}</p>
  </section>

  <section class="flex gap-3 mb-4">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={decompress}
      disabled={processing || !archiveFile}
    >
      {processing ? t('common.processing') : t('archiveDecompress.decompress')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if extractedFiles.length > 0}
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-4 border-b border-surface-200-800 flex justify-between items-center">
        <h2 class="text-base font-medium m-0">{t('archiveDecompress.results')} ({extractedFiles.length})</h2>
        <button class="btn btn-sm preset-filled-primary-500" onclick={downloadAll}>
          {t('common.downloadAll')}
        </button>
      </div>
      <div class="max-h-[400px] overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200-800 text-surface-600-400 text-left">
              <th class="p-3">{t('common.filename')}</th>
              <th class="p-3 w-24">{t('common.size')}</th>
              <th class="p-3 w-24 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {#each extractedFiles as file}
              <tr class="border-b border-surface-200-800 last:border-b-0 hover:bg-surface-100-900/50">
                <td class="p-3 truncate max-w-[200px]" title={file.name}>{file.name}</td>
                <td class="p-3">{formatFileSize(file.size)}</td>
                <td class="p-3 text-right">
                  <button class="btn btn-sm preset-outlined-surface-200-800" onclick={() => downloadSingle(file)}>
                    {t('common.download')}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

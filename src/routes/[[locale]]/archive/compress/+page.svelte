<script>
  /**
   * 压缩包压缩 - ZIP, GZIP, TAR.GZ, BROTLI
   */
  import { t } from '$lib/i18n.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import {
    compressZip,
    compressGzip,
    compressTarGz,
    compressBrotli,
    readFilesFromDataTransfer,
  } from '$lib/archiveTools.js';

  const FMT_ZIP = 'zip';
  const FMT_GZIP = 'gzip';
  const FMT_TARGZ = 'targz';
  const FMT_BROTLI = 'brotli';

  let format = $state(FMT_ZIP);
  let files = $state([]);
  let processing = $state(false);
  let error = $state('');
  let folderInputRef = $state(null);

  const singleFileFormats = [FMT_GZIP, FMT_BROTLI];

  const isSingleFormat = $derived(singleFileFormats.includes(format));

  const fileStats = $derived.by(() => {
    if (!files.length) return null;
    const totalBytes = files.reduce((sum, it) => sum + (it.file?.size ?? 0), 0);
    const fmt = (n) =>
        n < 1024
          ? `${n} B`
          : n < 1048576
            ? `${(n / 1024).toFixed(1)} KB`
            : n < 1073741824
              ? `${(n / 1048576).toFixed(2)} MB`
              : `${(n / 1073741824).toFixed(2)} GB`;
    return { count: files.length, totalBytes, totalFormatted: fmt(totalBytes) };
  });

  function handleFiles(fileList) {
    if (!fileList?.length) return;
    const list = Array.from(fileList).map((f) =>
      f?.file != null ? { file: f.file, name: f.name } : { file: f, name: f.webkitRelativePath || f.name }
    );
    const toAdd = isSingleFormat && list.length > 1 ? list.slice(0, 1) : list;
    files = [...files, ...toAdd];
    error = '';
  }

  async function handleDropRaw(e) {
    const list = await readFilesFromDataTransfer(e.dataTransfer);
    const toAdd = isSingleFormat && list.length > 1 ? list.slice(0, 1) : list;
    if (toAdd.length) handleFiles(toAdd);
  }

  function handleFolderInputChange(e) {
    const fileList = e.target?.files;
    if (fileList?.length) handleFiles(fileList);
    if (folderInputRef) folderInputRef.value = '';
  }

  function removeFile(i) {
    files = files.filter((_, idx) => idx !== i);
  }

  async function compress() {
    if (files.length === 0) {
      error = t('archive.errEmptyInput');
      return;
    }
    if (isSingleFormat && files.length > 1) {
      error = t('archive.errSingleFile');
      return;
    }
    error = '';
    processing = true;
    try {
      let blob;
      const first = files[0];
      const baseName = (first?.name?.split('/').pop() || first?.file?.name || 'archive').replace(
        /\.[^.]+$/,
        ''
      );
      if (format === FMT_ZIP) {
        blob = await compressZip(files);
        downloadBlob(blob, `${baseName}.zip`);
      } else if (format === FMT_GZIP) {
        const f0 = files[0];
        blob = await compressGzip(f0.file, f0.name);
        downloadBlob(blob, `${f0.name.split('/').pop()}.gz`);
      } else if (format === FMT_TARGZ) {
        blob = await compressTarGz(
          files.map((f) => ({ name: f.name, file: f.file, data: null }))
        );
        downloadBlob(blob, `${baseName}.tar.gz`);
      } else if (format === FMT_BROTLI) {
        const f0 = files[0];
        blob = await compressBrotli(f0.file);
        downloadBlob(blob, `${f0.name.split('/').pop()}.br`);
      }
    } catch (e) {
      error = e.message || 'Compress failed';
    } finally {
      processing = false;
    }
  }

  function clear() {
    files = [];
    error = '';
    if (folderInputRef) folderInputRef.value = '';
  }
</script>

<div class="workspace-content">
  <ToolPageHeader titleKey="archiveCompress.title" descKey="archiveCompress.desc" />

  <section class="workspace-content-block">
    <p class="text-sm font-medium block mb-2 m-0">{t('archiveCompress.format')}</p>
    <div class="flex flex-wrap gap-2 mb-4">
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="radio" bind:group={format} value={FMT_ZIP} class="radio" />
        <span>ZIP</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="radio" bind:group={format} value={FMT_GZIP} class="radio" />
        <span>GZIP</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="radio" bind:group={format} value={FMT_TARGZ} class="radio" />
        <span>TAR.GZ</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="radio" bind:group={format} value={FMT_BROTLI} class="radio" />
        <span>BROTLI</span>
      </label>
    </div>
  </section>

  <section class="workspace-content-block">
    <FileDropZone
      accept="*"
      multiple={!isSingleFormat}
      onFilesAdd={handleFiles}
      onDropRaw={handleDropRaw}
      hintKey={isSingleFormat ? 'archiveCompress.uploadSingleHint' : 'archiveCompress.uploadHint'}
      formatsKey=""
      selectedName={files.length > 0 ? `${fileStats?.count} ${t('archiveCompress.filesUnit')} · ${fileStats?.totalFormatted}` : ''}
      onClear={clear}
      showClear={files.length > 0}
      idPrefix="compress"
    />
    {#if !isSingleFormat}
      <div class="flex gap-2 mt-2">
        <input
          type="file"
          webkitdirectory
          multiple
          class="hidden"
          bind:this={folderInputRef}
          onchange={handleFolderInputChange}
        />
        <button
          type="button"
          class="btn btn-sm preset-outlined-surface-200-800"
          onclick={() => folderInputRef?.click()}
        >
          {t('archiveCompress.selectFolder')}
        </button>
      </div>
    {/if}
    {#if files.length > 0}
      <div class="mt-2 text-surface-600-400 text-sm mb-1">
        {fileStats.count} {t('archiveCompress.filesUnit')} · {fileStats.totalFormatted}
      </div>
      <div class="space-y-1 max-h-32 overflow-auto">
        {#each files as item, i}
          <div class="flex items-center justify-between text-sm py-1 gap-2">
            <span class="truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
            <span class="text-surface-600-400 shrink-0">{formatFileSize(item.file?.size ?? 0)}</span>
            <button
              type="button"
              class="btn btn-sm preset-outlined-surface-200-800 shrink-0 ml-2"
              onclick={(ev) => { ev.stopPropagation(); removeFile(i); }}
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="workspace-primary-actions">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={compress}
      disabled={processing || files.length === 0}
    >
      {processing ? t('common.processing') : t('archiveCompress.compress')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}
</div>

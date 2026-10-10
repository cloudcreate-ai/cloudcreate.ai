<script>
  /**
   * 只解压单个未加密 RAR。
   */
  import { t } from '$lib/i18n.js';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import { compressZip, decompressRar, detectFormat } from '$lib/archiveTools.js';

  let archiveFile = $state(null);
  let extractedFiles = $state([]);
  let processing = $state(false);
  let error = $state('');

  const ACCEPT = '.rar,application/vnd.rar,application/x-rar-compressed';

  function handleFile(file) {
    if (!file) return;
    archiveFile = file;
    extractedFiles = [];
    error = '';
  }

  function handleFiles(files) {
    if (files?.[0]) handleFile(files[0]);
  }

  $effect(() => {
    void archiveFile;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.archiveRar',
      getParams: () => ({
        currentUrl: get(page).url.href,
        fileName: archiveFile?.name || '—',
      }),
    });
  });

  function rarMessage(err) {
    const msg = err?.message || '';
    if (msg === 'Encrypted RAR is not supported') return t('archiveRar.errEncrypted');
    if (msg === 'Split RAR volumes are not supported') return t('archiveRar.errSplit');
    return msg || t('archiveRar.errFailed');
  }

  async function decompress() {
    if (!archiveFile) {
      error = t('archiveRar.errEmptyInput');
      return;
    }
    error = '';
    extractedFiles = [];
    processing = true;
    try {
      if (detectFormat(archiveFile.name) !== 'rar') {
        error = t('archiveRar.errNotRar');
        return;
      }
      const buffer = await archiveFile.arrayBuffer();
      extractedFiles = await decompressRar(buffer);
    } catch (e) {
      error = rarMessage(e);
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
    const items = extractedFiles.map((f) => ({ name: f.name, data: f.data, file: null }));
    const blob = await compressZip(items);
    const base = archiveFile.name.replace(/\.rar$/i, '') || 'extracted';
    downloadBlob(blob, `${base}-extracted.zip`);
  }

  function clear() {
    archiveFile = null;
    extractedFiles = [];
    error = '';
  }
</script>

<div class="workspace-layout-operation">
  <ToolPageHeader titleKey="archiveRar.title" descKey="archiveRar.desc" />

  <section class="workspace-content-block">
    <FileDropZone
      accept={ACCEPT}
      multiple={false}
      onFilesAdd={handleFiles}
      hintKey="archiveRar.uploadHint"
      formatsKey=""
      selectedName={archiveFile?.name}
      onClear={clear}
      showClear={!!archiveFile}
      idPrefix="rar"
    />
    <p class="text-xs text-surface-500-500 mt-2 m-0">{t('archiveRar.formats')}</p>
    <p class="text-xs text-surface-500-500 mt-1 m-0">{t('archiveRar.limits')}</p>
  </section>

  <section class="workspace-primary-actions">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={decompress}
      disabled={processing || !archiveFile}
    >
      {processing ? t('common.processing') : t('archiveRar.decompress')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if extractedFiles.length > 0}
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-4 border-b border-surface-200-800 flex justify-between items-center">
        <h2 class="text-base font-medium m-0">{t('archiveRar.results')} ({extractedFiles.length})</h2>
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
                <td class="p-3 truncate min-w-[220px]" title={file.name}>{file.name}</td>
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

<script>
  import { link } from 'svelte-spa-router';
  import { t } from '../lib/i18n.js';
  import { ENCODE_FORMATS } from '../lib/imageProcessor.js';
  import {
    buildFileItem,
    downloadBlob,
    downloadAsZip,
    computeTotalStats,
    filterImageFiles,
  } from '../lib/batchHelpers.js';
  import { loadToolConfig, saveToolConfig } from '../lib/toolConfig.js';
  import { loadWorkflow, runWorkflowFromPreset } from '../lib/workflow/workflowLoader.js';
  import StepBar from './workflow/StepBar.svelte';
  import ToolPageHeader from '../components/ToolPageHeader.svelte';
  import FileDropZone from '../components/FileDropZone.svelte';
  import BatchResultsTable from '../components/BatchResultsTable.svelte';
  import SliderComparePreview from '../components/SliderComparePreview.svelte';

  const compressDefaults = { targetFormat: 'webp', quality: 75 };
  const saved = loadToolConfig('compress', compressDefaults);
  const validFormat = saved.targetFormat === '' || ENCODE_FORMATS.includes(saved.targetFormat) ? saved.targetFormat : 'webp';

  let workflow = $state(null);
  let items = $state([]);
  let targetFormat = $state(validFormat);
  let quality = $state(Math.min(100, Math.max(1, saved.quality ?? 75)));
  $effect(() => saveToolConfig('compress', { targetFormat, quality }));

  $effect(() => {
    loadWorkflow('/workflows/compress.json').then((r) => (workflow = r.workflow)).catch(() => {});
  });

  let processing = $state(false);
  let error = $state('');
  let idCounter = 0;

  async function addFiles(fileList) {
    const filtered = filterImageFiles(fileList);
    if (filtered.length === 0) return;
    error = '';
    for (const file of filtered) {
      const item = await buildFileItem(file, ++idCounter);
      items = [...items, item];
    }
  }

  async function processFiles() {
    if (items.length === 0) {
      error = t('common.errAddOne');
      return;
    }
    error = '';
    processing = true;
    const paramsOverrides = { output: { targetFormat: targetFormat || undefined, quality } };
    const files = items.map((x) => x.file);
    items = items.map((x) => ({ ...x, status: 'processing' }));
    try {
      const results = await runWorkflowFromPreset('/workflows/compress.json', files, {
        paramsOverrides,
      });
      items = items.map((x, i) => {
        const r = results[i];
        const status = r?.error ? 'error' : r?.blob ? 'done' : 'pending';
        const newSize = r?.blob?.size;
        const ratio = x.size > 0 && newSize != null ? (1 - newSize / x.size) * 100 : null;
        return {
          ...x,
          status,
          error: r?.error,
          blob: r?.blob,
          outputName: r?.outputName,
          newSize,
          ratio,
        };
      });
    } catch (e) {
      error = e.message || 'Run failed';
      items = items.map((x) => ({ ...x, status: 'pending' }));
    } finally {
      processing = false;
    }
  }

  function download(item) {
    if (item.status !== 'done' || !item.blob) return;
    downloadBlob(item.blob, item.outputName || item.name);
  }

  async function downloadAll() {
    const done = items.filter((x) => x.status === 'done' && x.blob);
    await downloadAsZip(done, 'compressed-images.zip');
  }

  function clear() {
    items.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
    items = [];
    error = '';
    previewItem = null;
  }

  let previewItem = $state(null);
  let previewBlobUrl = $state(null);

  function openPreview(item) {
    if (item.status !== 'done' || !item.blob) return;
    previewBlobUrl?.startsWith('blob:') && URL.revokeObjectURL(previewBlobUrl);
    previewItem = item;
    previewBlobUrl = URL.createObjectURL(item.blob);
  }

  function closePreview() {
    if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl);
    previewItem = null;
    previewBlobUrl = null;
  }

  const steps = $derived.by(() => {
    const s = workflow?.steps ?? [];
    return s.map((step) =>
      step.type === 'output' ? { ...step, params: { ...step.params, targetFormat: targetFormat || '', quality } } : step
    );
  });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closePreview(); }} />

<main class="p-8 max-w-4xl mx-auto">
  <ToolPageHeader titleKey="compress.title" descKey="compress.desc" />

  {#if steps.length > 0}
    <div class="mb-4">
      <StepBar steps={steps} readonly={true} />
    </div>
  {/if}

  <details class="card preset-outlined-surface-200-800 p-4 mb-4">
    <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
      <span class="font-medium">{t('common.options')}</span>
      <span class="text-surface-600-400 text-sm">{targetFormat ? targetFormat.toUpperCase() : t('common.sameAsOriginal')}, {t('common.quality')}: {quality}</span>
    </summary>
    <div class="mt-4 pt-4 border-t border-surface-200-800 flex gap-8 flex-wrap">
      <div class="flex flex-col gap-1">
        <label for="format" class="text-sm text-surface-600-400">{t('compress.outputFormat')}</label>
        <select id="format" bind:value={targetFormat} class="select w-28">
          <option value="">{t('common.sameAsOriginal')}</option>
          {#each ENCODE_FORMATS as fmt}
            <option value={fmt}>{fmt.toUpperCase()}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="quality" class="text-sm text-surface-600-400">{t('common.quality')} {quality}</label>
        <input id="quality" type="range" min="1" max="100" bind:value={quality} class="input w-32" />
      </div>
    </div>
  </details>

  <section class="mb-4">
    <FileDropZone onFilesAdd={addFiles} />
    {#if error}
      <p class="text-sm text-error-500 mt-2">{error}</p>
    {/if}
  </section>

  <section class="flex gap-3 mb-4">
    <button
      onclick={processFiles}
      disabled={processing || items.length === 0}
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {processing ? t('common.processing') : t('common.compress')}
    </button>
    <button onclick={clear} class="btn preset-outlined-surface-200-800">{t('common.clearAll')}</button>
  </section>

  {#if items.length > 0}
    <BatchResultsTable
      items={items}
      onPreview={openPreview}
      onDownload={download}
      onDownloadAll={downloadAll}
    />
  {/if}

  <SliderComparePreview
    open={!!previewItem}
    item={previewItem}
    resultBlobUrl={previewBlobUrl}
    onClose={closePreview}
  />
</main>

<script>
  /**
   * 图片旋转与镜像
   */
  import { t } from '$lib/i18n.js';
  import { ENCODE_FORMATS } from '$lib/imageProcessor.js';
  import {
    buildFileItem,
    downloadBlob,
    downloadAsZip,
    computeTotalStats,
    filterImageFiles,
  } from '$lib/batchHelpers.js';
  import { loadToolConfig, saveToolConfig } from '$lib/toolConfig.js';
  import { transformImage } from '$lib/imageTransform.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import BatchResultsTable from '$lib/components/BatchResultsTable.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';
  import SliderWithInput from '$lib/components/common/SliderWithInput.svelte';

  const ROTATE_OPTIONS = [
    { value: 0, labelKey: 'rotate.0deg' },
    { value: 90, labelKey: 'rotate.90right' },
    { value: 180, labelKey: 'rotate.180deg' },
    { value: 270, labelKey: 'rotate.90left' },
  ];

  const defaults = { rotate: 0, flipH: false, flipV: false, targetFormat: '', quality: 75 };
  const saved = loadToolConfig('rotate', defaults);
  const validFormat = saved.targetFormat === '' || ENCODE_FORMATS.includes(saved.targetFormat) ? saved.targetFormat : '';

  let items = $state([]);
  let rotate = $state(ROTATE_OPTIONS.some((o) => o.value === saved.rotate) ? saved.rotate : 0);
  let flipH = $state(!!saved.flipH);
  let flipV = $state(!!saved.flipV);
  let targetFormat = $state(validFormat);
  let quality = $state(Math.min(100, Math.max(1, saved.quality ?? 75)));
  let processing = $state(false);
  let error = $state('');
  let idCounter = 0;

  $effect(() => saveToolConfig('rotate', { rotate, flipH, flipV, targetFormat, quality }));

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
    const opts = { rotate, flipH, flipV, targetFormat: targetFormat || undefined, quality };
    items = items.map((x) => ({ ...x, status: 'processing' }));
    try {
      const results = await Promise.all(items.map((x) => transformImage(x.file, opts)));
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
          newWidth: r?.width,
          newHeight: r?.height,
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
    await downloadAsZip(done, 'rotated-images.zip');
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

  const mergedItems = $derived(
    items.map((f, i) => {
      const r = items[i];
      const status = r?.error ? 'error' : r?.blob ? 'done' : processing ? 'processing' : 'pending';
      return {
        ...f,
        status,
        error: r?.error,
        blob: r?.blob,
        outputName: r?.outputName,
        newSize: r?.newSize,
        newWidth: r?.newWidth,
        newHeight: r?.newHeight,
        ratio: r?.ratio,
      };
    })
  );
  const totalStats = $derived(computeTotalStats(mergedItems));
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closePreview(); }} />

<div class="workspace-content">
  <ToolPageHeader titleKey="rotate.title" descKey="rotate.desc" />

  <details class="card preset-outlined-surface-200-800 p-4 mb-4">
    <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
      <span class="font-medium">{t('common.options')}</span>
      <span class="text-surface-600-400 text-sm">
        {t(ROTATE_OPTIONS.find((o) => o.value === rotate)?.labelKey ?? 'rotate.0deg')}
        {flipH ? ', H' : ''}{flipV ? ', V' : ''}
        , {targetFormat ? targetFormat.toUpperCase() : t('common.sameAsOriginal')}
      </span>
    </summary>
    <div class="mt-3 pt-3 border-t border-surface-200-800 flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-0.5">
        <label for="rotate" class="text-xs text-surface-600-400">{t('rotate.rotation')}</label>
        <select id="rotate" bind:value={rotate} class="select w-28">
          {#each ROTATE_OPTIONS as opt}
            <option value={opt.value}>{t(opt.labelKey)}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" bind:checked={flipH} class="checkbox" />
          <span>{t('rotate.flipH')}</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" bind:checked={flipV} class="checkbox" />
          <span>{t('rotate.flipV')}</span>
        </label>
      </div>
      <div class="flex flex-col gap-0.5">
        <label for="format" class="text-xs text-surface-600-400">{t('compress.outputFormat')}</label>
        <select id="format" bind:value={targetFormat} class="select w-24">
          <option value="">{t('common.sameAsOriginal')}</option>
          {#each ENCODE_FORMATS as fmt}
            <option value={fmt}>{fmt.toUpperCase()}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-0.5">
        <label for="quality" class="text-xs text-surface-600-400">{t('common.quality')}</label>
        <SliderWithInput
          id="quality"
          value={quality}
          min={1}
          max={100}
          step={1}
          oninput={(v) => (quality = v)}
          inputWidth="64px"
        />
      </div>
    </div>
  </details>

  <section class="mb-4">
    <FileDropZone onFilesAdd={addFiles} />
    {#if error}
      <p class="text-sm text-error-500 mt-2">{error}</p>
    {/if}
  </section>

  <section class="workspace-primary-actions">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={processFiles}
      disabled={processing || items.length === 0}
    >
      {processing ? t('common.processing') : t('rotate.apply')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if items.length > 0}
    <BatchResultsTable
      items={mergedItems}
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
</div>

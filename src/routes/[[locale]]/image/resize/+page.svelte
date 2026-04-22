<script>
  import { t } from '$lib/i18n.js';
  import { ENCODE_FORMATS } from '$lib/imageProcessor.js';
  import {
    buildFileItem,
    downloadBlob,
    downloadAsZip,
    filterImageFiles,
  } from '$lib/batchHelpers.js';
  import { loadToolConfig, saveToolConfig } from '$lib/toolConfig.js';
  import { runWorkflowFromPreset } from '$lib/workflow/workflowLoader.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import BatchResultsTable from '$lib/components/BatchResultsTable.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';
  import SliderWithInput from '$lib/components/common/SliderWithInput.svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import {
    URL_SYNC_DEBOUNCE_MS,
    hasUrlSearchParams,
    replaceUrlSearchIfChanged,
    searchStringToParams,
  } from '$lib/urlToolSync.js';
  import { buildResizeQuery, parseResizeQuery } from '$lib/urlParams/resizeQuery.js';

  const VALID_MODES = ['percent', 'max', 'width', 'height', 'long', 'exact'];
  const resizeDefaults = {
    scaleMode: 'percent',
    scalePercent: 50,
    maxWidth: 1920,
    maxHeight: 1080,
    targetWidth: 1920,
    targetHeight: 1080,
    targetLong: 1920,
    targetFormat: '',
    quality: 75,
  };
  const saved = loadToolConfig('resize', resizeDefaults);
  const validResizeFormat = saved.targetFormat === '' || ENCODE_FORMATS.includes(saved.targetFormat) ? saved.targetFormat : '';

  let items = $state([]);
  let scaleMode = $state(VALID_MODES.includes(saved.scaleMode) ? saved.scaleMode : 'percent');
  let scalePercent = $state(Math.min(200, Math.max(1, saved.scalePercent ?? 50)));
  let maxWidth = $state(Math.max(1, saved.maxWidth ?? 1920));
  let maxHeight = $state(Math.max(1, saved.maxHeight ?? 1080));
  let targetWidth = $state(Math.max(1, saved.targetWidth ?? 1920));
  let targetHeight = $state(Math.max(1, saved.targetHeight ?? 1080));
  let targetLong = $state(Math.max(1, saved.targetLong ?? 1920));
  let targetFormat = $state(validResizeFormat);
  let quality = $state(Math.min(100, Math.max(1, saved.quality ?? 75)));

  $effect(() =>
    saveToolConfig('resize', {
      scaleMode,
      scalePercent,
      maxWidth,
      maxHeight,
      targetWidth,
      targetHeight,
      targetLong,
      targetFormat,
      quality,
    })
  );

  $effect(() => {
    if (!browser) return;
    if (!hasUrlSearchParams($page.url.search)) return;
    const sp = searchStringToParams($page.url.search);
    if ([...sp.keys()].length === 0) return;
    const p = parseResizeQuery(sp);
    if (p.scaleMode != null) scaleMode = /** @type {typeof scaleMode} */ (p.scaleMode);
    if (p.scalePercent != null) scalePercent = p.scalePercent;
    if (p.maxWidth != null) maxWidth = p.maxWidth;
    if (p.maxHeight != null) maxHeight = p.maxHeight;
    if (p.targetWidth != null) targetWidth = p.targetWidth;
    if (p.targetHeight != null) targetHeight = p.targetHeight;
    if (p.targetLong != null) targetLong = p.targetLong;
    if (p.quality != null) quality = p.quality;
    if (p.targetFormat !== undefined) targetFormat = p.targetFormat;
  });

  $effect(() => {
    if (!browser) return;
    void scaleMode;
    void scalePercent;
    void maxWidth;
    void maxHeight;
    void targetWidth;
    void targetHeight;
    void targetLong;
    void targetFormat;
    void quality;
    const next = buildResizeQuery(
      scaleMode,
      scalePercent,
      maxWidth,
      maxHeight,
      targetWidth,
      targetHeight,
      targetLong,
      targetFormat,
      quality
    ).toString();
    const h = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(h);
  });

  let processing = $state(false);
  let error = $state('');
  let idCounter = 0;

  $effect(() => {
    void scaleMode;
    void scalePercent;
    void maxWidth;
    void maxHeight;
    void targetWidth;
    void targetHeight;
    void targetLong;
    void targetFormat;
    void quality;
    void items;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.imageResize',
      getParams: () => {
        const paramsSummary = `mode=${scaleMode} pct=${scalePercent} maxW=${maxWidth} maxH=${maxHeight} exact=${targetWidth}x${targetHeight} long=${targetLong} fmt=${targetFormat || 'orig'} q=${quality}`;
        return {
          currentUrl: get(page).url.href,
          mode: scaleMode,
          paramsSummary,
          fileCount: String(items.length),
        };
      },
    });
  });

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
    const paramsOverrides = {
      resize: {
        scaleMode,
        scalePercent,
        maxWidth,
        maxHeight,
        targetWidth,
        targetHeight,
        targetLong,
      },
      output: { targetFormat: targetFormat || undefined, quality },
    };
    const files = items.map((x) => x.file);
    items = items.map((x) => ({ ...x, status: 'processing' }));
    try {
      const results = await runWorkflowFromPreset('/workflows/resize.json', files, {
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
          newWidth: r?.width,
          newHeight: r?.height,
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
    await downloadAsZip(done, 'resized-images.zip');
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

  const optionsSummary = $derived(
    scaleMode === 'percent'
      ? `${scalePercent}%`
      : scaleMode === 'max'
        ? `${t('resize.maxLabel')} ${maxWidth}×${maxHeight}`
        : scaleMode === 'width'
          ? `${t('resize.byWidth')} ${targetWidth}px`
          : scaleMode === 'height'
            ? `${t('resize.byHeight')} ${targetHeight}px`
            : scaleMode === 'long'
              ? `${t('resize.byLong')} ${targetLong}px`
              : `${targetWidth}×${targetHeight}`
  );
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closePreview(); }} />

<div class="workspace-content">
  <ToolPageHeader titleKey="resize.title" descKey="resize.desc" />

  <section class="workspace-content-block">
    <FileDropZone onFilesAdd={addFiles} />
    {#if error}
      <p class="text-sm text-error-500 mt-2">{error}</p>
    {/if}
  </section>

  <details open class="card preset-outlined-surface-200-800 p-4 workspace-content-block">
    <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
      <span class="font-medium">{t('common.options')}</span>
      <span class="text-surface-600-400 text-sm">{targetFormat ? targetFormat.toUpperCase() : t('common.sameAsOriginal')}, {optionsSummary}, {t('common.quality')}: {quality}</span>
    </summary>
    <div class="mt-3 pt-3 border-t border-surface-200-800 flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-0.5">
        <label for="outFormat" class="text-xs text-surface-600-400">{t('compress.outputFormat')}</label>
        <select id="outFormat" bind:value={targetFormat} class="select w-24">
          <option value="">{t('common.sameAsOriginal')}</option>
          {#each ENCODE_FORMATS as fmt}
            <option value={fmt}>{fmt.toUpperCase()}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <label class="flex items-center gap-1.5 cursor-pointer text-xs">
          <input type="radio" name="scaleMode" value="percent" bind:group={scaleMode} class="radio" />
          <span>{t('resize.byPercent')}</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-xs">
          <input type="radio" name="scaleMode" value="max" bind:group={scaleMode} class="radio" />
          <span>{t('resize.byMax')}</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-xs">
          <input type="radio" name="scaleMode" value="width" bind:group={scaleMode} class="radio" />
          <span>{t('resize.byWidth')}</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-xs">
          <input type="radio" name="scaleMode" value="height" bind:group={scaleMode} class="radio" />
          <span>{t('resize.byHeight')}</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-xs">
          <input type="radio" name="scaleMode" value="long" bind:group={scaleMode} class="radio" />
          <span>{t('resize.byLong')}</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-xs">
          <input type="radio" name="scaleMode" value="exact" bind:group={scaleMode} class="radio" />
          <span>{t('resize.byExact')}</span>
        </label>
      </div>
      {#if scaleMode === 'exact'}
        <p class="text-xs text-surface-500-500 w-full mb-1">{t('resize.aspectWarning')}</p>
        <div class="flex flex-col gap-0.5">
          <label for="exactW" class="text-xs text-surface-600-400">{t('resize.targetWidth')}</label>
          <input id="exactW" type="number" min="1" bind:value={targetWidth} class="input w-20" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label for="exactH" class="text-xs text-surface-600-400">{t('resize.targetHeight')}</label>
          <input id="exactH" type="number" min="1" bind:value={targetHeight} class="input w-20" />
        </div>
      {:else if scaleMode === 'percent'}
        <div class="flex flex-col gap-0.5">
          <label for="scalePercent" class="text-xs text-surface-600-400">{t('resize.scalePercent')}</label>
          <SliderWithInput
            id="scalePercent"
            value={scalePercent}
            min={1}
            max={200}
            step={1}
            oninput={(v) => (scalePercent = v)}
            inputWidth="64px"
          />
        </div>
      {:else if scaleMode === 'max'}
        <div class="flex flex-col gap-0.5">
          <label for="maxW" class="text-xs text-surface-600-400">{t('resize.maxWidth')}</label>
          <input id="maxW" type="number" min="1" bind:value={maxWidth} class="input w-20" />
        </div>
        <div class="flex flex-col gap-0.5">
          <label for="maxH" class="text-xs text-surface-600-400">{t('resize.maxHeight')}</label>
          <input id="maxH" type="number" min="1" bind:value={maxHeight} class="input w-20" />
        </div>
      {:else if scaleMode === 'width'}
        <div class="flex flex-col gap-0.5">
          <label for="targetW" class="text-xs text-surface-600-400">{t('resize.targetWidth')}</label>
          <input id="targetW" type="number" min="1" bind:value={targetWidth} class="input w-20" />
        </div>
      {:else if scaleMode === 'height'}
        <div class="flex flex-col gap-0.5">
          <label for="targetH" class="text-xs text-surface-600-400">{t('resize.targetHeight')}</label>
          <input id="targetH" type="number" min="1" bind:value={targetHeight} class="input w-20" />
        </div>
      {:else if scaleMode === 'long'}
        <div class="flex flex-col gap-0.5">
          <label for="targetLong" class="text-xs text-surface-600-400">{t('resize.targetLong')}</label>
          <input id="targetLong" type="number" min="1" bind:value={targetLong} class="input w-20" />
        </div>
      {/if}
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

  <section class="workspace-primary-actions">
    <button
      onclick={processFiles}
      disabled={processing || items.length === 0}
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {processing ? t('common.processing') : t('resize.resize')}
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
</div>

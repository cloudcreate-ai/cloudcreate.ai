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
  import CropModal from '$lib/components/workflow/CropModal.svelte';
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
  import { buildCropQuery, parseCropQuery } from '$lib/urlParams/cropQuery.js';

  const ASPECT_OPTIONS = [
    { labelKey: 'crop.free', value: 0 },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
    { label: '3:2', value: 3 / 2 },
    { label: '2:3', value: 2 / 3 },
    { labelKey: 'crop.custom', value: 'custom' },
  ];

  const cropDefaults = { aspectRatio: 0, customWidth: 16, customHeight: 9, targetFormat: '', quality: 75 };
  const savedCrop = loadToolConfig('crop', cropDefaults);
  const presetMatch = ASPECT_OPTIONS.find(
    (o) => typeof o.value === 'number' && Math.abs(o.value - (savedCrop.aspectRatio ?? 0)) < 1e-6
  );
  const validAspect = presetMatch ? presetMatch.value : (savedCrop.customWidth && savedCrop.customHeight ? 'custom' : 0);
  const validCropFormat = savedCrop.targetFormat === '' || ENCODE_FORMATS.includes(savedCrop.targetFormat)
    ? savedCrop.targetFormat
    : '';

  let items = $state([]);
  let aspectRatio = $state(validAspect);
  let customWidth = $state(Math.max(1, savedCrop.customWidth ?? 16));
  let customHeight = $state(Math.max(1, savedCrop.customHeight ?? 9));
  let targetFormat = $state(validCropFormat);
  let quality = $state(Math.min(100, Math.max(1, savedCrop.quality ?? 75)));

  const effectiveAspectRatio = $derived.by(() => {
    if (aspectRatio === 'custom') {
      const w = Math.max(1, Number(customWidth) || 1);
      const h = Math.max(1, Number(customHeight) || 1);
      return w / h;
    }
    return Number(aspectRatio) || 0;
  });

  $effect(() =>
    saveToolConfig('crop', { aspectRatio, customWidth, customHeight, targetFormat, quality })
  );

  $effect(() => {
    if (!browser) return;
    if (!hasUrlSearchParams($page.url.search)) return;
    const sp = searchStringToParams($page.url.search);
    if ([...sp.keys()].length === 0) return;
    const p = parseCropQuery(sp);
    if (p.aspectRatio !== undefined) aspectRatio = p.aspectRatio;
    if (p.customWidth != null) customWidth = p.customWidth;
    if (p.customHeight != null) customHeight = p.customHeight;
    if (p.quality != null) quality = p.quality;
    if (p.targetFormat !== undefined) targetFormat = p.targetFormat;
  });

  $effect(() => {
    if (!browser) return;
    void aspectRatio;
    void customWidth;
    void customHeight;
    void targetFormat;
    void quality;
    const next = buildCropQuery(
      aspectRatio,
      customWidth,
      customHeight,
      targetFormat,
      quality
    ).toString();
    const t = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  });

  let processing = $state(false);
  let error = $state('');
  let cropRequest = $state(null);
  let idCounter = 0;

  $effect(() => {
    void aspectRatio;
    void customWidth;
    void customHeight;
    void targetFormat;
    void items;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.imageCrop',
      getParams: () => {
        const aspectMode =
          aspectRatio === 'custom'
            ? 'custom'
            : aspectRatio === 0
              ? 'free'
              : `fixed(${String(aspectRatio)})`;
        let sizeLabel = 'free';
        if (aspectRatio === 'custom') {
          sizeLabel = `${customWidth}x${customHeight}`;
        } else if (typeof aspectRatio === 'number' && aspectRatio > 0) {
          const eff = (Number(aspectRatio) || 0).toFixed(3);
          sizeLabel = `ratio~${eff}`;
        }
        return {
          currentUrl: get(page).url.href,
          aspectMode,
          sizeLabel,
          outputFormat: targetFormat || t('common.sameAsOriginal'),
          fileCount: String(items.length),
        };
      },
    });
  });

  function createRequestCropRegion() {
    return (imageData, params) =>
      new Promise((resolve, reject) => {
        cropRequest = {
          imageData,
          params,
          resolve: (r) => {
            cropRequest = null;
            resolve(r);
          },
          reject: (e) => {
            cropRequest = null;
            reject(e);
          },
        };
      });
  }

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
      crop: { aspectRatio: effectiveAspectRatio },
      output: { targetFormat: targetFormat || undefined, quality },
    };
    const files = items.map((x) => x.file);
    items = items.map((x) => ({ ...x, status: 'processing' }));
    try {
      const results = await runWorkflowFromPreset('/workflows/crop.json', files, {
        paramsOverrides,
        requestCropRegion: createRequestCropRegion(),
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
    await downloadAsZip(done, 'cropped-images.zip');
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

</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') (cropRequest ? null : closePreview()); }} />

<div class="workspace-content">
  <ToolPageHeader titleKey="crop.title" descKey="crop.desc" />

  <section class="workspace-content-block">
    <FileDropZone onFilesAdd={addFiles} />
    {#if error}
      <p class="text-sm text-error-500 mt-2">{error}</p>
    {/if}
  </section>

  <details open class="card preset-outlined-surface-200-800 p-4 workspace-content-block">
    <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
      <span class="font-medium">{t('common.options')}</span>
      <span class="text-surface-600-400 text-sm">{targetFormat ? targetFormat.toUpperCase() : t('common.sameAsOriginal')}, {t('common.quality')}: {quality}</span>
    </summary>
    <div class="mt-3 pt-3 border-t border-surface-200-800 flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-0.5">
        <label for="outFormat" class="text-xs text-surface-600-400">{t('compress.outputFormat')}</label>
        <select id="outFormat" bind:value={targetFormat} class="select w-24">
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
      <div class="flex flex-col gap-0.5">
        <label for="aspect" class="text-xs text-surface-600-400">{t('crop.aspectRatio')}</label>
        <div class="flex items-center gap-2">
          <select id="aspect" bind:value={aspectRatio} class="select preset-outlined-surface-200-800 w-24">
            {#each ASPECT_OPTIONS as opt}
              <option value={opt.value}>{opt.labelKey ? t(opt.labelKey) : opt.label}</option>
            {/each}
          </select>
          {#if aspectRatio === 'custom'}
            <div class="flex items-center gap-1 text-sm">
              <label for="customW" class="sr-only">{t('crop.customRatioW')}</label>
              <input
                id="customW"
                type="number"
                min="1"
                max="9999"
                bind:value={customWidth}
                class="input w-20 text-center"
                placeholder="W"
              />
              <span class="text-surface-600-400">:</span>
              <label for="customH" class="sr-only">{t('crop.customRatioH')}</label>
              <input
                id="customH"
                type="number"
                min="1"
                max="9999"
                bind:value={customHeight}
                class="input w-20 text-center"
                placeholder="H"
              />
            </div>
          {/if}
        </div>
      </div>
    </div>
  </details>

  <section class="workspace-primary-actions">
    <button
      onclick={processFiles}
      disabled={processing || items.length === 0}
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {processing ? t('common.processing') : t('crop.selectRegion')}
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

  {#if cropRequest}
    <CropModal request={cropRequest} />
  {/if}

  <SliderComparePreview
    open={!!previewItem}
    item={previewItem}
    resultBlobUrl={previewBlobUrl}
    onClose={closePreview}
  />
</div>

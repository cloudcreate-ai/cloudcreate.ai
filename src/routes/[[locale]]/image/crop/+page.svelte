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
  import { loadWorkflow, runWorkflowFromPreset } from '$lib/workflow/workflowLoader.js';
  import StepBar from '$lib/components/workflow/StepBar.svelte';
  import CropModal from '$lib/components/workflow/CropModal.svelte';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import PresetJsonActions from '$lib/components/PresetJsonActions.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import BatchResultsTable from '$lib/components/BatchResultsTable.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

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

  let workflow = $state(null);
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
    loadWorkflow('/workflows/crop.json').then((r) => (workflow = r.workflow)).catch(() => {});
  });

  let processing = $state(false);
  let error = $state('');
  let cropRequest = $state(null);
  let idCounter = 0;

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

  const steps = $derived.by(() => {
    const s = workflow?.steps ?? [];
    return s.map((step) => {
      if (step.type === 'crop') {
        return { ...step, params: { ...step.params, aspectRatio: effectiveAspectRatio } };
      }
      if (step.type === 'output') {
        return { ...step, params: { ...step.params, targetFormat: targetFormat || '', quality } };
      }
      return step;
    });
  });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') (cropRequest ? null : closePreview()); }} />

<div class="workspace-content">
  <ToolPageHeader titleKey="crop.title" descKey="crop.desc" />

  {#if steps.length > 0}
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <StepBar steps={steps} readonly={true} />
      <PresetJsonActions
        effectiveWorkflow={workflow ? { ...workflow, steps } : null}
        presetName="crop"
      />
    </div>
  {/if}

  <details class="card preset-outlined-surface-200-800 p-4 mb-4">
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
        <label for="quality" class="text-xs text-surface-600-400">{t('common.quality')} {quality}</label>
        <input id="quality" type="range" min="1" max="100" bind:value={quality} class="input w-28" />
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

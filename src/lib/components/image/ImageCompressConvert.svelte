<script>
  /**
   * 图片压缩/格式转换公共组件
   * 支持 compress（默认原格式）与 convert（默认 webp）两种模式
   */
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
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import BatchResultsTable from '$lib/components/BatchResultsTable.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';
  import SliderWithInput from '$lib/components/common/SliderWithInput.svelte';

  /** @type {{ defaultTargetFormat: string, configKey: string, titleKey: string, descKey: string, showSameAsOriginal?: boolean }} */
  let {
    defaultTargetFormat = '',
    configKey = 'compress',
    titleKey = 'compress.title',
    descKey = 'compress.desc',
    showSameAsOriginal = true,
  } = $props();

  const defaults = $derived({ targetFormat: defaultTargetFormat, quality: 75 });
  const saved = $derived(loadToolConfig(configKey, defaults));
  const validFormat = $derived((() => {
    const v = saved.targetFormat;
    if (v === '' && !showSameAsOriginal) return defaultTargetFormat || 'webp';
    if (v === '' || ENCODE_FORMATS.includes(v)) return v;
    return defaultTargetFormat || 'webp';
  })());

  let items = $state([]);
  let targetFormat = $state(validFormat);
  let quality = $state(Math.min(100, Math.max(1, saved.quality ?? 75)));
  $effect(() => saveToolConfig(configKey, { targetFormat, quality }));

  let processing = $state(false);
  let error = $state('');
  let idCounter = 0;

  $effect(() => {
    const tk = configKey === 'compress' ? 'agentPrompt.imageCompress' : 'agentPrompt.imageConvert';
    void targetFormat;
    void quality;
    void items;
    return registerAgentPrompt({
      templateKey: tk,
      getParams: () => ({
        currentUrl: get(page).url.href,
        targetFormat: targetFormat || '',
        quality: String(quality),
        fileCount: String(items.length),
      }),
    });
  });

  const actionKey = $derived(configKey === 'compress' ? 'common.compress' : 'common.convert');
  const zipName = $derived(
    configKey === 'compress' ? 'compressed-images.zip' : 'converted-images.zip',
  );
  const formatLabelKey = $derived(
    configKey === 'compress' ? 'compress.outputFormat' : 'convert.targetFormat',
  );

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
      output: { targetFormat: targetFormat || undefined, quality },
    };
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
        const ratio =
          x.size > 0 && newSize != null ? (1 - newSize / x.size) * 100 : null;
        return {
          ...x,
          status,
          error: r?.error,
          blob: r?.blob,
          outputName: r?.outputName,
          newSize,
          newWidth: r?.width ?? x.width,
          newHeight: r?.height ?? x.height,
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
    await downloadAsZip(done, zipName);
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

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closePreview(); }} />

<div class="workspace-content">
  <ToolPageHeader {titleKey} {descKey} />

  <section class="workspace-content-block">
    <FileDropZone onFilesAdd={addFiles} />
    {#if error}
      <p class="text-sm text-error-500 mt-2">{error}</p>
    {/if}
  </section>

  <details open class="card preset-outlined-surface-200-800 p-4 workspace-content-block">
    <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
      <span class="font-medium">{t('common.options')}</span>
      <span class="text-surface-600-400 text-sm"
        >{targetFormat ? targetFormat.toUpperCase() : t('common.sameAsOriginal')}, {t('common.quality')}:
        {quality}</span
      >
    </summary>
    <div class="mt-3 pt-3 border-t border-surface-200-800 flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-0.5">
        <label for="format" class="text-xs text-surface-600-400">{t(formatLabelKey)}</label>
        <select id="format" bind:value={targetFormat} class="select w-24">
          {#if showSameAsOriginal}
            <option value="">{t('common.sameAsOriginal')}</option>
          {/if}
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

  <section class="workspace-primary-actions">
    <button
      onclick={processFiles}
      disabled={processing || items.length === 0}
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {processing ? t('common.processing') : t(actionKey)}
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

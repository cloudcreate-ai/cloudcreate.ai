<script>
  /**
   * Gemini 可见水印去除（浏览器端，基于 @pilio/gemini-watermark-remover / GargantuaX）
   */
  import { browser } from '$app/environment';
  import { t } from '$lib/i18n.js';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import { filterImageFiles, downloadBlob } from '$lib/batchHelpers.js';
  import { getImageDimensions, formatFileSize } from '$lib/imageProcessor.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

  let sourceFile = $state(/** @type {File | null} */ (null));
  let sourcePreviewUrl = $state('');
  let sourceWidth = $state(/** @type {number | null} */ (null));
  let sourceHeight = $state(/** @type {number | null} */ (null));
  let resultBlob = $state(/** @type {Blob | null} */ (null));
  let resultPreviewUrl = $state('');
  /** 引擎返回的检测与处理元信息 */
  let resultMeta = $state(
    /** @type {{ applied?: boolean; decisionTier?: string | null; skipReason?: string | null } | null} */ (null)
  );
  let processing = $state(false);
  let error = $state('');
  let previewOpen = $state(false);

  $effect(() => {
    void sourceFile;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.watermarkGemini',
      getParams: () => ({
        currentUrl: get(page).url.href,
        fileName: sourceFile?.name || '—',
      }),
    });
  });

  function revokeResult() {
    if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    resultPreviewUrl = '';
    resultBlob = null;
    resultMeta = null;
  }

  async function handleFiles(files) {
    const filtered = filterImageFiles(files);
    if (filtered.length === 0) return;
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    revokeResult();
    sourceFile = filtered[0];
    sourcePreviewUrl = URL.createObjectURL(sourceFile);
    sourceWidth = null;
    sourceHeight = null;
    try {
      const dim = await getImageDimensions(sourceFile);
      sourceWidth = dim.width;
      sourceHeight = dim.height;
    } catch {
      /* 忽略 */
    }
    error = '';
  }

  function outputFilename(originalName) {
    const n = String(originalName || 'image');
    const i = n.lastIndexOf('.');
    const base = i > 0 ? n.slice(0, i) : n;
    return `${base}-gemini-clean.png`;
  }

  /**
   * 与 @pilio/gemini-watermark-remover 内 canvasBlob 一致：支持 HTMLCanvasElement.toBlob 与 OffscreenCanvas.convertToBlob
   * @param {any} canvas
   */
  async function canvasToPngBlob(canvas) {
    const type = 'image/png';
    const fail = () => new Error(t('watermarkGemini.encodeFailed'));
    if (canvas && typeof canvas.convertToBlob === 'function') {
      const b = await canvas.convertToBlob({ type });
      if (!b) throw fail();
      return b;
    }
    if (canvas && typeof canvas.toBlob === 'function') {
      return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(fail())), type);
      });
    }
    throw fail();
  }

  async function removeWatermark() {
    if (!sourceFile || !browser) {
      error = t('common.errAddOne');
      return;
    }
    error = '';
    processing = true;
    revokeResult();
    const blobUrl = URL.createObjectURL(sourceFile);
    try {
      const { removeWatermarkFromImage } = await import('@pilio/gemini-watermark-remover/browser');
      const img = new Image();
      img.decoding = 'async';
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(undefined);
        img.onerror = () => reject(new Error(t('watermarkGemini.loadImageFailed')));
        img.src = blobUrl;
      });
      const { canvas, meta } = await removeWatermarkFromImage(img, {
        adaptiveMode: 'auto',
        maxPasses: 4,
      });
      resultBlob = await canvasToPngBlob(canvas);
      resultMeta = meta;
      resultPreviewUrl = URL.createObjectURL(resultBlob);
    } catch (e) {
      error = e?.message || String(e);
    } finally {
      URL.revokeObjectURL(blobUrl);
      processing = false;
    }
  }

  function download() {
    if (!resultBlob || !sourceFile) return;
    downloadBlob(resultBlob, outputFilename(sourceFile.name));
  }

  function clear() {
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    revokeResult();
    sourceFile = null;
    sourcePreviewUrl = '';
    sourceWidth = null;
    sourceHeight = null;
    error = '';
    previewOpen = false;
  }

  function openPreview() {
    if (!resultBlob || !sourcePreviewUrl || !sourceFile) return;
    previewOpen = true;
  }
</script>

<div class="workspace-content">
  <ToolPageHeader titleKey="watermarkGemini.title" descKey="watermarkGemini.desc" />

  <section class="workspace-content-block text-sm text-surface-600-400 space-y-2">
    <p class="m-0">{t('watermarkGemini.disclaimer')}</p>
    <p class="m-0 text-xs text-surface-500-500">
      {t('watermarkGemini.credits')}
      <a
        href="https://github.com/GargantuaX/gemini-watermark-remover"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary-500 hover:underline"
      >{t('watermarkGemini.upstreamLink')}</a>
    </p>
  </section>

  <section class="workspace-content-block">
    <p class="text-sm font-medium block mb-2 m-0">{t('watermarkGemini.source')}</p>
    <FileDropZone
      multiple={false}
      onFilesAdd={handleFiles}
      onClear={() => {}}
      idPrefix="remove-watermark-gemini"
    />
    {#if sourcePreviewUrl}
      <div class="mt-2 flex items-center gap-3">
        <img src={sourcePreviewUrl} alt="" class="w-16 h-16 object-cover rounded border border-surface-200-800" />
        <span class="text-sm text-surface-600-400">{sourceFile?.name}</span>
      </div>
    {/if}
  </section>

  <section class="workspace-primary-actions">
    <button
      type="button"
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={removeWatermark}
      disabled={processing || !sourceFile}
    >
      {processing ? t('common.processing') : t('watermarkGemini.remove')}
    </button>
    <button type="button" class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if resultMeta}
    <p class="text-xs text-surface-600-400 mb-4 m-0">
      {t('watermarkGemini.metaHint')}
      {resultMeta.applied ? t('watermarkGemini.metaApplied') : t('watermarkGemini.metaSkipped')}
      {#if resultMeta.decisionTier}
        · {resultMeta.decisionTier}
      {/if}
      {#if resultMeta.skipReason}
        · {resultMeta.skipReason}
      {/if}
    </p>
  {/if}

  {#if resultBlob && resultPreviewUrl}
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-4 border-b border-surface-200-800 flex justify-between items-center flex-wrap gap-2">
        <h2 class="text-base font-medium m-0">{t('common.result')}</h2>
        <div class="flex gap-2">
          <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={openPreview}>
            {t('common.preview')}
          </button>
          <button type="button" class="btn btn-sm preset-filled-primary-500" onclick={download}>{t('common.download')}</button>
        </div>
      </div>
      <div class="p-4 flex flex-wrap items-center gap-6">
        <button
          type="button"
          class="block p-0 border-0 bg-transparent cursor-pointer"
          onclick={openPreview}
          aria-label={t('common.preview')}
        >
          <img src={resultPreviewUrl} alt="" class="max-w-[200px] max-h-[200px] object-contain border border-surface-200-800 rounded" />
        </button>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">{outputFilename(sourceFile?.name ?? 'image')}</span>
          <span class="text-xs text-surface-500-500">{formatFileSize(resultBlob.size)}</span>
        </div>
      </div>
    </section>
  {/if}

  <SliderComparePreview
    open={previewOpen}
    item={resultBlob && sourceFile && sourcePreviewUrl
      ? {
          name: outputFilename(sourceFile.name),
          previewUrl: sourcePreviewUrl,
          size: sourceFile.size,
          newSize: resultBlob.size,
          width: sourceWidth ?? undefined,
          height: sourceHeight ?? undefined,
          newWidth: sourceWidth ?? undefined,
          newHeight: sourceHeight ?? undefined,
        }
      : null}
    resultBlobUrl={resultPreviewUrl || null}
    onClose={() => (previewOpen = false)}
  />
</div>

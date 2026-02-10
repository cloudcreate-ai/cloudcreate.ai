<script>
  /**
   * App Store 图标生成 - 1024×1024 PNG（Apple 要求）
   */
  import { t } from '$lib/i18n.js';
  import { filterImageFiles, downloadBlob } from '$lib/batchHelpers.js';
  import { generateAppStoreIcon } from '$lib/appStoreIcon.js';
  import { getImageDimensions } from '$lib/imageProcessor.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

  let sourceFile = $state(null);
  let sourcePreviewUrl = $state(null);
  let sourceWidth = $state(null);
  let sourceHeight = $state(null);
  let result = $state(null);
  let processing = $state(false);
  let error = $state('');
  let previewOpen = $state(false);

  async function handleFiles(files) {
    const filtered = filterImageFiles(files);
    if (filtered.length === 0) return;
    sourcePreviewUrl && URL.revokeObjectURL(sourcePreviewUrl);
    result?.previewUrl && URL.revokeObjectURL(result.previewUrl);
    sourceFile = filtered[0];
    sourcePreviewUrl = URL.createObjectURL(sourceFile);
    sourceWidth = null;
    sourceHeight = null;
    try {
      const dim = await getImageDimensions(sourceFile);
      sourceWidth = dim.width;
      sourceHeight = dim.height;
    } catch (_) {}
    result = null;
    error = '';
  }

  async function generate() {
    if (!sourceFile) {
      error = t('common.errAddOne');
      return;
    }
    error = '';
    processing = true;
    result = null;
    try {
      const r = await generateAppStoreIcon(sourceFile);
      result = {
        ...r,
        previewUrl: URL.createObjectURL(r.blob),
      };
    } catch (e) {
      error = e.message || 'Generate failed';
    } finally {
      processing = false;
    }
  }

  function download() {
    if (!result?.blob) return;
    downloadBlob(result.blob, result.name);
  }

  function clear() {
    sourcePreviewUrl && URL.revokeObjectURL(sourcePreviewUrl);
    result?.previewUrl && URL.revokeObjectURL(result.previewUrl);
    sourceFile = null;
    sourcePreviewUrl = null;
    result = null;
    error = '';
    previewOpen = false;
  }

  function openPreview() {
    if (!result || !sourcePreviewUrl || !sourceFile) return;
    previewOpen = true;
  }
</script>

<main class="p-8 max-w-4xl mx-auto">
  <ToolPageHeader titleKey="appstore.title" descKey="appstore.desc" />

  <section class="mb-4">
    <p class="text-sm text-surface-600-400 mb-2">{t('appstore.steps')}</p>
    <ol class="list-decimal list-inside text-sm text-surface-600-400 space-y-1 mb-4">
      <li>{t('appstore.step1')}</li>
      <li>{t('appstore.step2')}</li>
    </ol>
    <p class="text-xs text-surface-500-500 mb-4">{t('appstore.spec')}</p>
  </section>

  <section class="mb-4">
    <p class="text-sm font-medium block mb-2 m-0">{t('appstore.sourceImage')}</p>
    <FileDropZone multiple={false} onFilesAdd={handleFiles} idPrefix="appstore" />
    {#if sourcePreviewUrl}
      <div class="mt-2 flex items-center gap-3">
        <img src={sourcePreviewUrl} alt="" class="w-16 h-16 object-cover rounded border border-surface-200-800" />
        <span class="text-sm text-surface-600-400">{sourceFile?.name}</span>
      </div>
    {/if}
  </section>

  <section class="flex gap-3 mb-4">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={generate}
      disabled={processing || !sourceFile}
    >
      {processing ? t('common.processing') : t('appstore.generate')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if result}
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-4 border-b border-surface-200-800 flex justify-between items-center">
        <h2 class="text-base font-medium m-0">{t('appstore.results')}</h2>
        <div class="flex gap-2">
          <button class="btn btn-sm preset-outlined-surface-200-800" onclick={openPreview}>{t('common.preview')}</button>
          <button class="btn btn-sm preset-filled-primary-500" onclick={download}>{t('common.download')}</button>
        </div>
      </div>
      <div class="p-4 flex flex-wrap items-center gap-6">
        <button type="button" class="block p-0 border-0 bg-transparent cursor-pointer" onclick={openPreview} aria-label={t('common.preview')}>
          <img src={result.previewUrl} alt="" class="w-32 h-32 object-contain border border-surface-200-800 rounded" />
        </button>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">{result.name}</span>
          <span class="text-xs text-surface-500-500">{formatFileSize(result.blob.size)}</span>
          <span class="text-xs text-surface-500-500">1024×1024 PNG</span>
        </div>
      </div>
    </section>
  {/if}

  <SliderComparePreview
    open={previewOpen}
    item={result && sourceFile ? { name: result.name, previewUrl: sourcePreviewUrl, size: sourceFile.size, newSize: result.blob.size, width: sourceWidth, height: sourceHeight, newWidth: 1024, newHeight: 1024 } : null}
    resultBlobUrl={result?.previewUrl ?? null}
    onClose={() => (previewOpen = false)}
  />
</main>

<script>
  /**
   * Favicon 图标生成 - 上传图片，裁剪为正方形，生成多尺寸 PNG
   */
  import { t } from '$lib/i18n.js';
  import { filterImageFiles, downloadBlob } from '$lib/batchHelpers.js';
  import { loadToolConfig, saveToolConfig } from '$lib/toolConfig.js';
  import { generateFavicons, FAVICON_SIZES } from '$lib/faviconGenerator.js';
  import { getImageDimensions, formatFileSize } from '$lib/imageProcessor.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
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
  import { buildFaviconQuery, parseFaviconQuery } from '$lib/urlParams/faviconQuery.js';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';
  import JSZip from 'jszip';

  const DEFAULT_SIZES = [16, 32, 48, 180, 192, 512];
  const saved = loadToolConfig('favicon', { sizes: DEFAULT_SIZES, includeIco: true });
  const validSizes = Array.isArray(saved.sizes) ? saved.sizes : DEFAULT_SIZES;

  let sourceFile = $state(null);
  let sourcePreviewUrl = $state(null);
  let sourceWidth = $state(null);
  let sourceHeight = $state(null);
  let selectedSizes = $state(new Set(validSizes));
  let includeIco = $state(saved.includeIco !== false);
  let results = $state([]);
  let processing = $state(false);
  let error = $state('');
  let previewItem = $state(null);

  $effect(() => {
    const arr = Array.from(selectedSizes).sort((a, b) => a - b);
    saveToolConfig('favicon', { sizes: arr, includeIco });
  });

  $effect(() => {
    if (!browser) return;
    if (!hasUrlSearchParams($page.url.search)) return;
    const p = parseFaviconQuery(searchStringToParams($page.url.search));
    if (p.sizes?.length) {
      const next = new Set(
        p.sizes.filter((n) => FAVICON_SIZES.some((d) => d.size === n))
      );
      if (next.size) selectedSizes = next;
    }
    if (p.includeIco !== undefined) includeIco = p.includeIco;
  });

  $effect(() => {
    if (!browser) return;
    void selectedSizes;
    void includeIco;
    const next = buildFaviconQuery(selectedSizes, includeIco).toString();
    const t = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  });

  $effect(() => {
    void selectedSizes;
    void includeIco;
    void sourceFile;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.imageFavicon',
      getParams: () => {
        const sizes = Array.from(selectedSizes).sort((a, b) => a - b).join(',');
        return {
          currentUrl: get(page).url.href,
          optionsSummary: `PNG sizes [${sizes}] ico=${includeIco}`,
          fileCount: sourceFile ? '1' : '0',
        };
      },
    });
  });

  function toggleSize(size) {
    const next = new Set(selectedSizes);
    if (next.has(size)) next.delete(size);
    else next.add(size);
    selectedSizes = next;
  }

  function selectAll() {
    selectedSizes = new Set(FAVICON_SIZES.map((d) => d.size));
  }

  function clearAll() {
    selectedSizes = new Set();
  }

  async function handleFiles(files) {
    const filtered = filterImageFiles(files);
    if (filtered.length === 0) return;
    sourcePreviewUrl && URL.revokeObjectURL(sourcePreviewUrl);
    sourceFile = filtered[0];
    sourcePreviewUrl = URL.createObjectURL(sourceFile);
    sourceWidth = null;
    sourceHeight = null;
    try {
      const dim = await getImageDimensions(sourceFile);
      sourceWidth = dim.width;
      sourceHeight = dim.height;
    } catch (_) {}
    results = [];
    error = '';
  }

  async function generate() {
    if (!sourceFile || selectedSizes.size === 0) {
      error = selectedSizes.size === 0 ? t('favicon.errSelectSize') : t('common.errAddOne');
      return;
    }
    error = '';
    processing = true;
    results = [];
    try {
      const sizes = Array.from(selectedSizes).sort((a, b) => a - b);
      const list = await generateFavicons(sourceFile, sizes, { includeIco });
      results = list.map((r) => ({
        ...r,
        previewUrl: URL.createObjectURL(r.blob),
      }));
    } catch (e) {
      error = e.message || 'Generate failed';
    } finally {
      processing = false;
    }
  }

  function getHtmlForItem(item) {
    if (item.format === 'ico' || item.name === 'favicon.ico') {
      return `<link rel="icon" type="image/x-icon" href="/favicon.ico">`;
    }
    const size = item.size;
    const name = item.name;
    if (size === 180 && name.includes('apple-touch')) {
      return `<link rel="apple-touch-icon" sizes="180x180" href="/${name}">`;
    }
    if ([192, 512].includes(size)) {
      return `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/${name}">`;
    }
    return `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/${name}">`;
  }

  function buildHtmlExample() {
    const icoItem = results.find((r) => r.name === 'favicon.ico');
    const rest = results.filter((r) => r.name !== 'favicon.ico');
    const items = icoItem ? [icoItem, ...rest] : rest;
    const lines = [
      '<!-- Favicon HTML - add to <head> -->',
      '',
      ...items.map((r) => getHtmlForItem(r)),
    ];
    return lines.join('\n');
  }

  function downloadSingle(item) {
    downloadBlob(item.blob, item.name);
  }

  function copyHtml(item) {
    navigator.clipboard?.writeText(getHtmlForItem(item));
  }

  async function downloadAll() {
    if (results.length === 0) return;
    const zip = new JSZip();
    for (const r of results) {
      zip.file(r.name, r.blob);
    }
    const htmlExample = buildHtmlExample();
    zip.file('favicon-html-example.txt', htmlExample);
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'favicons.zip');
  }

  function clear() {
    sourcePreviewUrl && URL.revokeObjectURL(sourcePreviewUrl);
    results.forEach((r) => r.previewUrl && URL.revokeObjectURL(r.previewUrl));
    sourceFile = null;
    sourcePreviewUrl = null;
    results = [];
    error = '';
    previewItem = null;
  }

  function openPreview(item) {
    previewItem = item;
  }
</script>

<div class="workspace-content">
  <ToolPageHeader titleKey="favicon.title" descKey="favicon.desc" />

  <section class="workspace-content-block">
    <p class="text-sm text-surface-600-400 mb-2">{t('favicon.steps')}</p>
    <ol class="list-decimal list-inside text-sm text-surface-600-400 space-y-1 mb-4">
      <li>{t('favicon.step1')}</li>
      <li>{t('favicon.step2')}</li>
      <li>{t('favicon.step3')}</li>
    </ol>
  </section>

  <section class="workspace-content-block">
    <p class="text-sm font-medium block mb-2 m-0">{t('favicon.sourceImage')}</p>
    <FileDropZone multiple={false} onFilesAdd={handleFiles} idPrefix="favicon" />
    {#if sourcePreviewUrl}
      <div class="mt-2 flex items-center gap-3">
        <img src={sourcePreviewUrl} alt="" class="w-16 h-16 object-cover rounded border border-surface-200-800" />
        <span class="text-sm text-surface-600-400">{sourceFile?.name}</span>
      </div>
    {/if}
  </section>

  <section class="workspace-content-block">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium">{t('favicon.sizes')}</span>
      <div class="flex gap-2">
        <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={selectAll}>{t('favicon.selectAll')}</button>
        <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={clearAll}>{t('favicon.clearAll')}</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 items-center mb-3">
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" bind:checked={includeIco} class="checkbox" />
        <span>{t('favicon.includeIco')}</span>
        <span class="text-surface-500-500 text-xs">(16×16)</span>
      </label>
    </div>
    <div class="flex flex-wrap gap-2">
      {#each FAVICON_SIZES as def}
        <label class="flex items-center gap-1.5 cursor-pointer text-sm px-2 py-1 rounded border border-surface-200-800 hover:border-primary-500 {selectedSizes.has(def.size) ? 'border-primary-500 bg-primary-500/10' : ''}">
          <input type="checkbox" checked={selectedSizes.has(def.size)} onchange={() => toggleSize(def.size)} class="checkbox" />
          <span>{def.size}×{def.size}</span>
          <span class="text-surface-500-500 text-xs">({def.desc})</span>
        </label>
      {/each}
    </div>
  </section>

  <section class="workspace-primary-actions">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={generate}
      disabled={processing || !sourceFile || selectedSizes.size === 0}
    >
      {processing ? t('common.processing') : t('favicon.generate')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if results.length > 0}
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-4 border-b border-surface-200-800 flex justify-between items-center">
        <h2 class="text-base font-medium m-0">{t('favicon.results')}</h2>
        <button class="btn btn-sm preset-filled-primary-500" onclick={downloadAll}>{t('common.downloadAll')}</button>
      </div>
      <div class="divide-y divide-surface-200-800">
        {#each results as item}
          <div class="p-4 flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <button type="button" class="block p-0 border-0 bg-transparent cursor-pointer shrink-0" onclick={() => openPreview(item)} aria-label={t('common.preview')}>
                <img src={item.previewUrl} alt="" class="w-12 h-12 object-contain border border-surface-200-800 rounded" />
              </button>
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium">{item.name}</span>
                <span class="text-xs text-surface-500-500">{formatFileSize(item.blob.size)}</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-surface-600-400 mb-1">{t('favicon.htmlExample')}</p>
              <code class="block text-xs font-mono bg-surface-100-900 px-2 py-1.5 rounded overflow-x-auto">{getHtmlForItem(item)}</code>
            </div>
            <div class="flex gap-2 shrink-0">
              <button class="btn btn-sm preset-outlined-surface-200-800" onclick={() => openPreview(item)}>{t('common.preview')}</button>
              <button class="btn btn-sm preset-outlined-surface-200-800" onclick={() => copyHtml(item)} title={t('favicon.copyHtml')}>
                Copy
              </button>
              <button class="btn btn-sm preset-outlined-surface-200-800" onclick={() => downloadSingle(item)}>
                {t('common.download')}
              </button>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <SliderComparePreview
    open={!!previewItem}
    item={previewItem && sourceFile ? { name: previewItem.name, previewUrl: sourcePreviewUrl, size: sourceFile.size, newSize: previewItem.blob.size, width: sourceWidth, height: sourceHeight, newWidth: previewItem.size, newHeight: previewItem.size } : null}
    resultBlobUrl={previewItem?.previewUrl ?? null}
    onClose={() => (previewItem = null)}
  />
</div>

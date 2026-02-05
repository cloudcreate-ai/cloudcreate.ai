<script>
  import { link } from 'svelte-spa-router';
  import { t } from '../lib/i18n.js';
  import { formatFileSize } from '../lib/imageProcessor.js';
  import { compressImage } from '../lib/workflows/compress.js';
  import {
    ACCEPT_IMAGES,
    buildFileItem,
    downloadBlob,
    downloadAsZip,
    computeTotalStats,
    filterImageFiles,
  } from '../lib/batchHelpers.js';
  import { loadToolConfig, saveToolConfig } from '../lib/toolConfig.js';

  const compressDefaults = { quality: 75 };
  const saved = loadToolConfig('compress', compressDefaults);
  let items = $state([]);
  let quality = $state(Math.min(100, Math.max(1, saved.quality ?? 75)));

  $effect(() => saveToolConfig('compress', { quality }));
  let processing = $state(false);
  let error = $state('');
  let inputRef;
  let dropActive = $state(false);
  let idCounter = 0;

  async function addFiles(fileList) {
    const files = filterImageFiles(fileList);
    if (files.length === 0) return;
    error = '';
    for (const file of files) {
      const item = await buildFileItem(file, ++idCounter);
      items = [...items, item];
    }
    if (inputRef) inputRef.value = '';
  }

  function handleInput(e) {
    addFiles(e.target.files);
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  async function processFiles() {
    if (items.length === 0) {
      error = t('common.errAddOne');
      return;
    }
    error = '';
    processing = true;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      items = items.map((x, j) => (j === i ? { ...x, status: 'processing' } : x));
      try {
        const { blob, outputName, newSize, ratio } = await compressImage(item.file, { quality });
        items = items.map((x, j) =>
          j === i ? { ...x, status: 'done', blob, newSize, ratio, outputName } : x
        );
      } catch (e) {
        items = items.map((x, j) => (j === i ? { ...x, status: 'error', error: e.message } : x));
      }
    }
    processing = false;
  }

  function download(item) {
    if (item.status !== 'done' || !item.blob) return;
    downloadBlob(item.blob, item.outputName || item.name);
  }

  async function downloadAll() {
    const done = items.filter((x) => x.status === 'done' && x.blob);
    await downloadAsZip(done, 'compressed-images.zip');
  }

  function removeItem(id) {
    const item = items.find((x) => x.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    items = items.filter((x) => x.id !== id);
  }

  function clear() {
    items.forEach((x) => {
      if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
    });
    items = [];
    error = '';
    previewItem = null;
    if (inputRef) inputRef.value = '';
  }

  let previewItem = $state(null);
  let previewBlobUrl = $state(null);
  let comparePos = $state(50);

  function openPreview(item) {
    if (item.status !== 'done' || !item.blob) return;
    previewBlobUrl?.startsWith('blob:') && URL.revokeObjectURL(previewBlobUrl);
    previewItem = item;
    previewBlobUrl = URL.createObjectURL(item.blob);
    comparePos = 50;
  }

  function closePreview() {
    if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl);
    previewItem = null;
    previewBlobUrl = null;
  }

  const totalStats = $derived.by(() => computeTotalStats(items));
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closePreview(); }} />

<main class="p-8 max-w-4xl mx-auto">
  <header class="mb-6">
    <a href="/" use:link class="text-primary-500 text-sm no-underline hover:underline block mb-3"
      >{t('common.backWorkspace')}</a
    >
    <h1 class="text-2xl font-semibold mb-1">{t('compress.title')}</h1>
    <p class="text-surface-600-400 text-sm m-0">{t('compress.desc')}</p>
  </header>

  <details class="card preset-outlined-surface-200-800 p-4 mb-4">
    <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
      <span class="font-medium">{t('common.options')}</span>
      <span class="text-surface-600-400 text-sm">{t('common.quality')}: {quality}</span>
    </summary>
    <div class="mt-4 pt-4 border-t border-surface-200-800">
      <label for="quality" class="text-sm text-surface-600-400 block mb-1">{t('common.quality')} {quality}</label>
      <input id="quality" type="range" min="1" max="100" bind:value={quality} class="input w-full max-w-xs" />
    </div>
  </details>

  <section class="mb-4">
    <div
      role="button"
      tabindex="0"
      class="card preset-outlined-surface-200-800 p-6 text-center cursor-pointer transition {dropActive
        ? 'border-primary-500 bg-primary-500/5'
        : ''}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => inputRef?.click()}
      onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
    >
      <input
        type="file"
        {ACCEPT_IMAGES}
        multiple
        onchange={handleInput}
        bind:this={inputRef}
        class="hidden"
      />
      <p class="text-surface-600-400 m-0">{t('common.addImages')}</p>
      <p class="text-sm text-surface-600-400 mt-1 m-0">{t('common.formats')}</p>
    </div>
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
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="flex justify-between items-center p-4 border-b border-surface-200-800 flex-wrap gap-2">
        <div class="flex items-center gap-4">
          <h2 class="text-base font-medium m-0">{t('common.fileList')}</h2>
          {#if totalStats}
            <span class="text-sm text-surface-600-400">
              {t('common.total')}: {formatFileSize(totalStats.totalOriginal)} → {formatFileSize(totalStats.totalNew)}
              <span class={totalStats.ratio > 0 ? 'text-success-500' : totalStats.ratio < 0 ? 'text-warning-500' : 'text-surface-600-400'}>
                ({totalStats.ratio > 0 ? totalStats.ratio.toFixed(1) + '% ' + t('common.smaller') : totalStats.ratio < 0 ? Math.abs(totalStats.ratio).toFixed(1) + '% ' + t('common.larger') : t('common.same')})
              </span>
            </span>
          {/if}
        </div>
        <button onclick={downloadAll} class="btn preset-outlined-surface-200-800 btn-sm">
          {t('common.downloadAll')}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200-800 text-surface-600-400 text-left">
              <th class="p-3 w-12">#</th>
              <th class="p-3 w-16">{t('common.preview')}</th>
              <th class="p-3 min-w-[140px]">{t('common.filename')}</th>
              <th class="p-3 w-16">{t('common.format')}</th>
              <th class="p-3 w-20">{t('common.size')}</th>
              <th class="p-3 w-24">{t('common.dimensions')}</th>
              <th class="p-3 min-w-[180px] text-right">{t('common.result')}</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item, i}
              <tr class="border-b border-surface-200-800 last:border-b-0 hover:bg-surface-100-900/50">
                <td class="p-3">{i + 1}</td>
                <td class="p-3">
                  <img
                    src={item.previewUrl}
                    alt=""
                    class="w-12 h-12 object-cover rounded block"
                  />
                </td>
                <td class="p-3 truncate max-w-[140px]" title={item.name}>{item.name}</td>
                <td class="p-3">{item.format}</td>
                <td class="p-3">{formatFileSize(item.size)}</td>
                <td class="p-3">{item.width}×{item.height}</td>
                <td class="p-3 text-right">
                  {#if item.status === 'processing'}
                    <span class="text-surface-600-400">{t('common.processing')}</span>
                  {:else if item.status === 'error'}
                    <span class="text-error-500">{item.error}</span>
                  {:else if item.status === 'done'}
                    <div class="space-y-0.5">
                      <div class="text-surface-600-400">
                        {formatFileSize(item.size)} → {formatFileSize(item.newSize)}
                      </div>
                      <div class={item.ratio > 0 ? 'text-success-500' : item.ratio < 0 ? 'text-warning-500' : 'text-surface-600-400'}>
                        {item.ratio > 0 ? item.ratio.toFixed(1) + '% ' + t('common.smaller') : item.ratio < 0 ? Math.abs(item.ratio).toFixed(1) + '% ' + t('common.larger') : t('common.sameSize')}
                      </div>
                      <div class="flex gap-1 mt-1">
                        <button
                          onclick={() => openPreview(item)}
                          class="btn preset-outlined-surface-200-800 btn-sm"
                        >
                          {t('common.preview')}
                        </button>
                        <button
                          onclick={() => download(item)}
                          class="btn preset-outlined-surface-200-800 btn-sm"
                        >
                          {t('common.download')}
                        </button>
                      </div>
                    </div>
                  {:else}
                    <span class="text-surface-600-400">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if previewItem}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Preview comparison"
      tabindex="-1"
      onclick={(e) => e.target === e.currentTarget && closePreview()}
      onkeydown={(e) => e.key === 'Escape' && closePreview()}
    >
      <div class="card preset-filled-surface-50-950 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-4 border-b border-surface-200-800">
          <h3 class="font-medium m-0">{previewItem.name}</h3>
          <button onclick={closePreview} class="btn preset-outlined-surface-200-800 btn-sm" aria-label={t('common.close')}>
            {t('common.close')}
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="flex flex-col items-center">
              <p class="text-sm text-surface-600-400 mb-2">{t('common.original')} · {formatFileSize(previewItem.size)}</p>
              <img
                src={previewItem.previewUrl}
                alt="Original"
                class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
              />
            </div>
            <div class="flex flex-col items-center">
              <p class="text-sm text-surface-600-400 mb-2">{t('common.result')} · {formatFileSize(previewItem.newSize)}</p>
              <img
                src={previewBlobUrl}
                alt="Result"
                class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
              />
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-surface-600-400">{t('common.sliderCompare')}</span>
            <input
              type="range"
              min="0"
              max="100"
              bind:value={comparePos}
              class="input flex-1 max-w-xs"
            />
          </div>
          <div class="relative mt-2 rounded overflow-hidden border border-surface-200-800" style="aspect-ratio: 16/9; max-height: 40vh;">
            <img
              src={previewItem.previewUrl}
              alt="Original"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <div class="absolute inset-0 overflow-hidden" style="clip-path: inset(0 {100 - comparePos}% 0 0);">
              <img
                src={previewBlobUrl}
                alt="Result"
                class="absolute inset-0 w-full h-full object-contain"
              />
            </div>
            <div
              class="absolute top-0 bottom-0 w-0.5 bg-primary-500 pointer-events-none"
              style="left: {comparePos}%;"
            ></div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>

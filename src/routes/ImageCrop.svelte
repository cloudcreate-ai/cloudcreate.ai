<script>
  import { tick } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { t } from '../lib/i18n.js';
  import Cropper from 'cropperjs';
  import 'cropperjs/src/css/cropper.css';
  import { formatFileSize, getImageDimensions, ENCODE_FORMATS, formatLabelFromFilename } from '../lib/imageProcessor.js';
  import { cropToBlob } from '../lib/workflows/crop.js';
  import { downloadBlob, ACCEPT_IMAGES } from '../lib/batchHelpers.js';
  import { loadToolConfig, saveToolConfig } from '../lib/toolConfig.js';

  const ASPECT_OPTIONS = [
    { labelKey: 'crop.free', value: 0 },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
    { label: '3:2', value: 3 / 2 },
    { label: '2:3', value: 2 / 3 },
  ];

  let inputRef = $state(null);
  let imgRef = $state(null);
  let containerRef = $state(null);
  let cropper = $state(null);
  let file = $state(null);
  let previewUrl = $state(null);
  const cropDefaults = { aspectRatio: 0, targetFormat: '', quality: 75 };
  const savedCrop = loadToolConfig('crop', cropDefaults);
  const validAspect = ASPECT_OPTIONS.some((o) => Math.abs(o.value - (savedCrop.aspectRatio ?? 0)) < 1e-6)
    ? savedCrop.aspectRatio
    : 0;
  const validCropFormat = savedCrop.targetFormat === '' || ENCODE_FORMATS.includes(savedCrop.targetFormat)
    ? savedCrop.targetFormat
    : '';
  let aspectRatio = $state(validAspect);
  let targetFormat = $state(validCropFormat);
  let quality = $state(Math.min(100, Math.max(1, savedCrop.quality ?? 75)));

  $effect(() => saveToolConfig('crop', { aspectRatio, targetFormat, quality }));
  let cropW = $state(0);
  let cropH = $state(0);
  let origWidth = $state(0);
  let origHeight = $state(0);
  let resultBlob = $state(null);
  let resultName = $state('');
  let resultWidth = $state(0);
  let resultHeight = $state(0);
  let processing = $state(false);
  let error = $state('');
  let dropActive = $state(false);

  // 更新 cropper 的 aspectRatio
  function applyAspectRatio() {
    if (!cropper) return;
    const v = Number(aspectRatio);
    cropper.setAspectRatio(v === 0 || Number.isNaN(v) ? NaN : v);
  }

  // 从精确输入应用裁剪框（cropW/cropH 为原图自然像素）
  function applyCropBoxFromInput() {
    if (!cropper || cropW <= 0 || cropH <= 0) return;
    const data = cropper.getData();
    cropper.setData({
      x: data.x,
      y: data.y,
      width: cropW,
      height: cropH,
    });
  }

  // crop 事件时同步输入框（natural 像素）
  function onCrop(e) {
    const d = e.detail;
    if (d && (d.width || d.height)) {
      cropW = Math.round(d.width || 0);
      cropH = Math.round(d.height || 0);
    }
  }

  function initCropper() {
    if (!imgRef || !containerRef || !previewUrl) return;
    destroyCropper();
    imgRef.src = previewUrl;
    imgRef.onload = () => {
      const v = Number(aspectRatio);
      cropper = new Cropper(imgRef, {
        aspectRatio: v === 0 || Number.isNaN(v) ? NaN : v,
        viewMode: 1,
        dragMode: 'crop',
        autoCropArea: 0.8,
        crop(event) {
          onCrop(event);
        },
      });
      cropW = 0;
      cropH = 0;
    };
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  async function addFile(f) {
    if (!f || !f.type?.startsWith('image/')) return;
    error = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(f);
    file = f;
    resultBlob = null;
    resultName = '';
    resultWidth = 0;
    resultHeight = 0;
    try {
      const dim = await getImageDimensions(f);
      origWidth = dim.width;
      origHeight = dim.height;
    } catch (_) {
      origWidth = 0;
      origHeight = 0;
    }
    await tick();
    initCropper();
    if (inputRef) inputRef.value = '';
  }

  function handleInput(e) {
    const files = e.target.files;
    if (files?.length) addFile(files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    if (e.dataTransfer.files?.length) addFile(e.dataTransfer.files[0]);
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  async function doCrop() {
    if (!cropper || !file) {
      error = t('crop.errAddFirst');
      return;
    }
    error = '';
    processing = true;
    try {
      const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
      const { blob, outputName, width: w, height: h } = await cropToBlob(canvas, file, {
        targetFormat: targetFormat || undefined,
        quality,
      });
      resultBlob = blob;
      resultName = outputName;
      resultWidth = w;
      resultHeight = h;
    } catch (e) {
      error = e.message || t('crop.cropFailed');
    } finally {
      processing = false;
    }
  }

  function downloadResult() {
    if (!resultBlob || !resultName) return;
    downloadBlob(resultBlob, resultName);
  }

  let previewOpen = $state(false);
  let previewBlobUrl = $state(null);
  let comparePos = $state(50);

  function openPreview() {
    if (!resultBlob || !file || !previewUrl) return;
    previewBlobUrl?.startsWith('blob:') && URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = URL.createObjectURL(resultBlob);
    previewOpen = true;
    comparePos = 50;
  }

  function closePreview() {
    if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = null;
    previewOpen = false;
  }

  function clearAll() {
    destroyCropper();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    file = null;
    origWidth = 0;
    origHeight = 0;
    resultBlob = null;
    resultName = '';
    resultWidth = 0;
    resultHeight = 0;
    closePreview();
    cropW = 0;
    cropH = 0;
    error = '';
    if (inputRef) inputRef.value = '';
  }

  // 监听 aspectRatio 变化
  $effect(() => {
    aspectRatio;
    if (cropper) applyAspectRatio();
  });

  // 组件卸载时清理
  $effect(() => () => {
    destroyCropper();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') previewOpen ? closePreview() : null; }} />

<main class="p-8 max-w-4xl mx-auto">
  <header class="mb-6">
    <a href="/" use:link class="text-primary-500 text-sm no-underline hover:underline block mb-3"
      >{t('common.backWorkspace')}</a
    >
    <h1 class="text-2xl font-semibold mb-1">{t('crop.title')}</h1>
    <p class="text-surface-600-400 text-sm m-0">{t('crop.desc')}</p>
  </header>

  {#if !file}
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
      <input type="file" accept={ACCEPT_IMAGES} onchange={handleInput} bind:this={inputRef} class="hidden" />
      <p class="text-surface-600-400 m-0">{t('common.addImage')}</p>
      <p class="text-sm text-surface-600-400 mt-1 m-0">{t('common.formats')}</p>
    </div>
  {:else}
    <details class="card preset-outlined-surface-200-800 p-4 mb-4">
      <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        <span class="font-medium">{t('common.options')}</span>
        <span class="text-surface-600-400 text-sm">{targetFormat ? targetFormat.toUpperCase() : t('common.sameAsOriginal')}, {t('common.quality')}: {quality}</span>
      </summary>
      <div class="mt-4 pt-4 border-t border-surface-200-800 space-y-4">
        <div class="flex gap-6 flex-wrap">
          <div>
            <label for="outFormat" class="text-sm text-surface-600-400 block mb-1">{t('compress.outputFormat')}</label>
            <select id="outFormat" bind:value={targetFormat} class="select w-28">
              <option value="">{t('common.sameAsOriginal')}</option>
              {#each ENCODE_FORMATS as fmt}
                <option value={fmt}>{fmt.toUpperCase()}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="quality" class="text-sm text-surface-600-400 block mb-1">{t('common.quality')} {quality}</label>
            <input id="quality" type="range" min="1" max="100" bind:value={quality} class="input w-32" />
          </div>
        </div>
        <div>
          <label for="aspect" class="text-sm text-surface-600-400 block mb-1">{t('crop.aspectRatio')}</label>
          <select
            id="aspect"
            bind:value={aspectRatio}
            class="select preset-outlined-surface-200-800"
          >
            {#each ASPECT_OPTIONS as opt}
              <option value={opt.value}>{opt.labelKey ? t(opt.labelKey) : opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="flex gap-4 flex-wrap">
          <div>
            <label for="cropW" class="text-sm text-surface-600-400 block mb-1">{t('crop.widthPx')}</label>
            <input
              id="cropW"
              type="number"
              min="1"
              bind:value={cropW}
              onchange={applyCropBoxFromInput}
              class="input w-24"
            />
          </div>
          <div>
            <label for="cropH" class="text-sm text-surface-600-400 block mb-1">{t('crop.heightPx')}</label>
            <input
              id="cropH"
              type="number"
              min="1"
              bind:value={cropH}
              onchange={applyCropBoxFromInput}
              class="input w-24"
            />
          </div>
          <div class="flex items-end">
            <button
              onclick={applyCropBoxFromInput}
              class="btn preset-outlined-surface-200-800 btn-sm"
            >
              {t('crop.applySize')}
            </button>
          </div>
        </div>
      </div>
    </details>

    <!-- 添加后立即显示文件列表 -->
    <section class="card preset-outlined-surface-200-800 overflow-hidden mb-4">
        <div class="flex justify-between items-center p-4 border-b border-surface-200-800 flex-wrap gap-2">
          <h2 class="text-base font-medium m-0">{t('common.fileList')}</h2>
          <div class="flex gap-2">
            <button
              onclick={doCrop}
              disabled={processing}
              class="btn preset-filled-primary-500 btn-sm disabled:opacity-60"
            >
              {processing ? t('crop.cropping') : t('crop.crop')}
            </button>
            {#if resultBlob}
              <button onclick={downloadResult} class="btn preset-outlined-surface-200-800 btn-sm">
                {t('common.download')}
              </button>
            {/if}
            <button onclick={clearAll} class="btn preset-outlined-surface-200-800 btn-sm">
              {t('common.changeImage')}
            </button>
          </div>
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
              <tr class="border-b border-surface-200-800 last:border-b-0 hover:bg-surface-100-900/50">
                <td class="p-3">1</td>
                <td class="p-3">
                  <img src={previewUrl} alt="" class="w-12 h-12 object-cover rounded block" />
                </td>
                <td class="p-3 truncate max-w-[140px]" title={file.name}>{file.name}</td>
                <td class="p-3">{formatLabelFromFilename(file.name)}</td>
                <td class="p-3">{formatFileSize(file.size)}</td>
                <td class="p-3">{origWidth}×{origHeight}</td>
                <td class="p-3 text-right">
                  {#if processing}
                    <span class="text-surface-600-400">{t('common.processing')}</span>
                  {:else if resultBlob}
                    <div class="space-y-0.5">
                      <div class="text-surface-600-400">
                        {formatLabelFromFilename(resultName)} · {origWidth}×{origHeight} → {resultWidth}×{resultHeight}
                      </div>
                      <div class="text-surface-600-400">
                        {formatFileSize(file.size)} → {formatFileSize(resultBlob.size)}
                      </div>
                      <div class={file.size > 0 && (1 - resultBlob.size / file.size) * 100 > 0 ? 'text-success-500' : file.size > 0 && (1 - resultBlob.size / file.size) * 100 < 0 ? 'text-warning-500' : 'text-surface-600-400'}>
                        {#if file.size > 0}
                          {@const pct = (1 - resultBlob.size / file.size) * 100}
                          {pct > 0 ? pct.toFixed(1) + '% ' + t('common.smaller') : pct < 0 ? Math.abs(pct).toFixed(1) + '% ' + t('common.larger') : t('common.sameSize')}
                        {:else}
                          {t('common.sameSize')}
                        {/if}
                      </div>
                      <div class="flex gap-1 mt-1">
                        <button onclick={openPreview} class="btn preset-outlined-surface-200-800 btn-sm">
                          {t('common.preview')}
                        </button>
                        <button onclick={downloadResult} class="btn preset-outlined-surface-200-800 btn-sm">
                          {t('common.download')}
                        </button>
                      </div>
                    </div>
                  {:else}
                    <span class="text-surface-600-400">—</span>
                  {/if}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    <!-- 裁剪区域 -->
    <div class="card preset-outlined-surface-200-800 overflow-hidden mb-4">
      <div
        bind:this={containerRef}
        class="relative bg-surface-100-900"
        style="height: 400px;"
      >
        <img
          bind:this={imgRef}
          alt="Crop preview"
          class="block max-w-full max-h-full"
        />
      </div>
    </div>

    {#if error}
      <p class="text-sm text-error-500 mb-4">{error}</p>
    {/if}

  {#if previewOpen}
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
          <h3 class="font-medium m-0">{file?.name}</h3>
          <button onclick={closePreview} class="btn preset-outlined-surface-200-800 btn-sm" aria-label={t('common.close')}>
            {t('common.close')}
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="flex flex-col items-center">
              <p class="text-sm text-surface-600-400 mb-2">{t('common.original')} · {formatFileSize(file?.size)} · {origWidth}×{origHeight}</p>
              <img
                src={previewUrl}
                alt="Original"
                class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
              />
            </div>
            <div class="flex flex-col items-center">
              <p class="text-sm text-surface-600-400 mb-2">{t('common.result')} · {formatFileSize(resultBlob?.size)} · {resultWidth}×{resultHeight}</p>
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
              src={previewUrl}
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
  {/if}
</main>

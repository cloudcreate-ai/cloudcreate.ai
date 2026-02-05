<script>
  import { tick } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { t } from '../lib/i18n.js';
  import Cropper from 'cropperjs';
  import 'cropperjs/src/css/cropper.css';
  import { formatFileSize, getImageDimensions } from '../lib/imageProcessor.js';
  import { cropToBlob } from '../lib/workflows/crop.js';
  import { downloadBlob, ACCEPT_IMAGES } from '../lib/batchHelpers.js';

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
  let aspectRatio = $state(0);
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

  // 从精确输入应用裁剪框（cropW/cropH 为目标输出像素）
  function applyCropBoxFromInput() {
    if (!cropper || cropW <= 0 || cropH <= 0) return;
    const imageData = cropper.getImageData();
    const canvasData = cropper.getCanvasData();
    const scale = imageData.width / canvasData.width;
    const displayW = Math.min(cropW / scale, canvasData.width);
    const displayH = Math.min(cropH / scale, canvasData.height);
    const cd = cropper.getCropBoxData();
    cropper.setCropBoxData({
      left: cd.left,
      top: cd.top,
      width: Math.max(1, displayW),
      height: Math.max(1, displayH),
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
      const { blob, outputName, width: w, height: h } = await cropToBlob(canvas, file, { quality: 0.92 });
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
    cropW = 0;
    cropH = 0;
    error = '';
    if (inputRef) inputRef.value = '';
  }

  function formatAspectRatio(w, h) {
    if (!w || !h) return '—';
    const g = (a, b) => (b ? g(b, a % b) : a);
    const d = g(w, h);
    return `${w / d}:${h / d}`;
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

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') clearAll(); }} />

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
      </summary>
      <div class="mt-4 pt-4 border-t border-surface-200-800 space-y-4">
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

    <!-- 原始图片信息 -->
    <section class="card preset-outlined-surface-200-800 p-4 mb-4">
      <h3 class="text-sm font-medium text-surface-600-400 mb-3">{t('crop.originalImage')}</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span class="text-surface-600-400 block">{t('common.filename')}</span>
          <span class="truncate block max-w-[180px]" title={file.name}>{file.name}</span>
        </div>
        <div>
          <span class="text-surface-600-400 block">{t('common.size')}</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
        <div>
          <span class="text-surface-600-400 block">{t('common.dimensions')}</span>
          <span>{origWidth} × {origHeight}</span>
        </div>
        <div>
          <span class="text-surface-600-400 block">{t('crop.aspectRatioLabel')}</span>
          <span>{formatAspectRatio(origWidth, origHeight)}</span>
        </div>
      </div>
    </section>

    <div class="card preset-outlined-surface-200-800 overflow-hidden mb-4">
      <div class="border-b border-surface-200-800 p-4 flex justify-between items-center flex-wrap gap-2">
        <span class="text-sm truncate max-w-[200px]" title={file.name}>{file.name}</span>
        <div class="flex gap-2">
          <button
            onclick={doCrop}
            disabled={processing}
            class="btn preset-filled-primary-500 disabled:opacity-60"
          >
            {processing ? t('crop.cropping') : t('crop.crop')}
          </button>
          <button onclick={clearAll} class="btn preset-outlined-surface-200-800">{t('common.changeImage')}</button>
        </div>
      </div>
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

    {#if resultBlob}
      <section class="card preset-outlined-surface-200-800 p-4">
        <h3 class="text-sm font-medium text-surface-600-400 mb-3">{t('crop.resultComparison')}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-surface-200-800 text-surface-600-400 text-left">
                <th class="p-3 w-24"></th>
                <th class="p-3">{t('common.original')}</th>
                <th class="p-3">{t('common.result')}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-surface-200-800">
                <td class="p-3 font-medium">{t('common.filename')}</td>
                <td class="p-3 truncate max-w-[160px]" title={file.name}>{file.name}</td>
                <td class="p-3 truncate max-w-[160px]" title={resultName}>{resultName}</td>
              </tr>
              <tr class="border-b border-surface-200-800">
                <td class="p-3 font-medium">{t('common.size')}</td>
                <td class="p-3">{formatFileSize(file.size)}</td>
                <td class="p-3">
                  {formatFileSize(resultBlob.size)}
                  {#if file.size > 0}
                    {@const pct = (1 - resultBlob.size / file.size) * 100}
                    <span class="text-surface-600-400 ml-1">
                      ({pct > 0 ? pct.toFixed(1) + '% ' + t('common.smaller') : pct < 0 ? Math.abs(pct).toFixed(1) + '% ' + t('common.larger') : t('common.same')})
                    </span>
                  {/if}
                </td>
              </tr>
              <tr class="border-b border-surface-200-800">
                <td class="p-3 font-medium">{t('common.dimensions')}</td>
                <td class="p-3">{origWidth} × {origHeight}</td>
                <td class="p-3">{resultWidth} × {resultHeight}</td>
              </tr>
              <tr class="border-b border-surface-200-800">
                <td class="p-3 font-medium">{t('crop.aspectRatioLabel')}</td>
                <td class="p-3">{formatAspectRatio(origWidth, origHeight)}</td>
                <td class="p-3">{formatAspectRatio(resultWidth, resultHeight)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4">
          <button onclick={downloadResult} class="btn preset-filled-primary-500">{t('common.download')}</button>
        </div>
      </section>
    {/if}
  {/if}
</main>

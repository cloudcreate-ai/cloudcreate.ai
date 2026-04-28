<script>
  /**
   * PDF「压缩」：PDF.js 栅格化页面 + jsPDF 回写 PDF（纯前端）。
   * 注意：PDF 默认 72pt≈72dpi，scale=1 时栅格极糊；默认约 2×≈144dpi 才适合阅读。
   */
  import { onMount } from 'svelte';
  import { ACCEPT_PDF } from '$lib/fileConstants.js';
  import { t } from '$lib/i18n.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
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
  import { buildPdfCompressQuery, parsePdfCompressQuery } from '$lib/urlParams/pdfCompressQuery.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';
  import SliderWithInput from '$lib/components/common/SliderWithInput.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

  /** @type {any} */
  let getDocumentRef = $state(null);
  let pdfReady = $state(false);
  let initError = $state('');

  let sourceFile = $state(/** @type {File | null} */ (null));
  let sourceBuffer = $state(/** @type {ArrayBuffer | null} */ (null));
  /** 渲染倍率：相对 PDF 用户空间；1≈72dpi，2≈144dpi，3≈216dpi（越高越清晰、越慢、越大） */
  let renderScale = $state(2);
  /** JPEG 质量（百分数）；仅在选择 JPEG 时生效 */
  let jpegQualityPercent = $state(92);
  /** 页面位图编码：jpeg 体积小；png 栅格无损、文件明显更大 */
  let pageImageFormat = $state(/** @type {'jpeg' | 'png'} */ ('jpeg'));
  let processing = $state(false);
  let progressLabel = $state('');
  let error = $state('');
  let outputBlob = $state(/** @type {Blob | null} */ (null));
  let outputName = $state('compressed.pdf');

  let previewOriginalUrl = $state(/** @type {string | null} */ (null));
  let previewResultUrl = $state(/** @type {string | null} */ (null));
  let previewW = $state(0);
  let previewH = $state(0);
  let previewError = $state('');

  $effect(() => {
    void renderScale;
    void jpegQualityPercent;
    void pageImageFormat;
    void sourceFile;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.pdfCompress',
      getParams: () => ({
        currentUrl: get(page).url.href,
        fileName: sourceFile?.name || '—',
        settingsSummary: `rasterScale=${renderScale} pageImg=${pageImageFormat} jpegQ%=${jpegQualityPercent}`,
      }),
    });
  });

  $effect(() => {
    if (!browser) return;
    if (!hasUrlSearchParams($page.url.search)) return;
    const p = parsePdfCompressQuery(searchStringToParams($page.url.search));
    if (p.renderScale != null) renderScale = p.renderScale;
    if (p.jpegQualityPercent != null) jpegQualityPercent = p.jpegQualityPercent;
    if (p.pageImageFormat != null) pageImageFormat = p.pageImageFormat;
  });

  $effect(() => {
    if (!browser) return;
    void renderScale;
    void jpegQualityPercent;
    void pageImageFormat;
    const next = buildPdfCompressQuery(
      renderScale,
      jpegQualityPercent,
      pageImageFormat
    ).toString();
    const t = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  });

  const compareItem = $derived(
    sourceFile && previewOriginalUrl && previewResultUrl && outputBlob
      ? {
          name: sourceFile.name,
          size: sourceFile.size,
          previewUrl: previewOriginalUrl,
          width: previewW,
          height: previewH,
          newSize: outputBlob.size,
          newWidth: previewW,
          newHeight: previewH,
        }
      : null,
  );

  onMount(async () => {
    try {
      const [pdfModule, workerModule] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default;
      getDocumentRef = pdfModule.getDocument;
      pdfReady = true;
    } catch (e) {
      console.error(e);
      initError = t('pdfCompress.initError');
    }
  });

  /**
   * 首页栅格预览（白底，与压缩管线一致）
   * @param {ArrayBuffer} buf
   * @param {number} maxSidePx
   */
  async function rasterizeFirstPageForPreview(buf, maxSidePx = 1400) {
    if (!getDocumentRef) throw new Error('pdf engine');
    const task = getDocumentRef({ data: buf.slice(0) });
    const pdfDocument = await task.promise;
    try {
      const page = await pdfDocument.getPage(1);
      const vp1 = page.getViewport({ scale: 1 });
      const maxDim = Math.max(vp1.width, vp1.height);
      const scale = Math.min(2, maxSidePx / Math.max(1, maxDim));
      const viewport = page.getViewport({ scale });
      const rw = Math.max(1, Math.floor(viewport.width));
      const rh = Math.max(1, Math.floor(viewport.height));
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      canvas.width = rw;
      canvas.height = rh;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rw, rh);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return { dataUrl: canvas.toDataURL('image/png'), width: rw, height: rh };
    } finally {
      await pdfDocument.destroy();
    }
  }

  function clearFile() {
    sourceFile = null;
    sourceBuffer = null;
    outputBlob = null;
    error = '';
    progressLabel = '';
    previewOriginalUrl = null;
    previewResultUrl = null;
    previewW = 0;
    previewH = 0;
    previewError = '';
  }

  async function handleFiles(files) {
    const f = files?.[0];
    if (!f) return;
    const ok = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf');
    if (!ok) {
      error = t('pdfViewer.invalidFile');
      return;
    }
    error = '';
    outputBlob = null;
    previewOriginalUrl = null;
    previewResultUrl = null;
    previewError = '';
    sourceFile = f;
    sourceBuffer = await f.arrayBuffer();
    const base = f.name.replace(/\.pdf$/i, '') || 'document';
    outputName = `${base}-compressed.pdf`;
  }

  async function runCompress() {
    if (!getDocumentRef || !sourceBuffer) {
      error = t('pdfCompress.needFile');
      return;
    }
    error = '';
    outputBlob = null;
    previewOriginalUrl = null;
    previewResultUrl = null;
    previewError = '';
    processing = true;
    const { jsPDF } = await import('jspdf');
    const jpegQ = jpegQualityPercent / 100;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      error = t('pdfCompress.noCanvas');
      processing = false;
      return;
    }

    let pdfDocument = null;
    try {
      const task = getDocumentRef({ data: sourceBuffer.slice(0) });
      pdfDocument = await task.promise;
      const numPages = pdfDocument.numPages;
      /** @type {any} */
      let doc = null;

      for (let i = 1; i <= numPages; i++) {
        progressLabel = `${t('pdfViewer.page')} ${i} ${t('pdfViewer.of')} ${numPages}`;

        const page = await pdfDocument.getPage(i);
        const vpBase = page.getViewport({ scale: 1 });
        const wPt = vpBase.width;
        const hPt = vpBase.height;
        const viewport = page.getViewport({ scale: renderScale });
        const rw = Math.max(1, Math.floor(viewport.width));
        const rh = Math.max(1, Math.floor(viewport.height));
        canvas.width = rw;
        canvas.height = rh;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rw, rh);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const isPng = pageImageFormat === 'png';
        const imgData = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', jpegQ);
        const orientation = wPt >= hPt ? 'landscape' : 'portrait';
        if (doc === null) {
          doc = new jsPDF({ unit: 'pt', format: [wPt, hPt], orientation });
        } else {
          doc.addPage([wPt, hPt], orientation);
        }
        doc.addImage(imgData, isPng ? 'PNG' : 'JPEG', 0, 0, wPt, hPt, undefined, 'MEDIUM');
        await new Promise((r) => requestAnimationFrame(r));
      }

      if (doc) {
        const buf = doc.output('arraybuffer');
        outputBlob = new Blob([buf], { type: 'application/pdf' });
        try {
          const outBuf = await outputBlob.arrayBuffer();
          const [srcRaster, outRaster] = await Promise.all([
            rasterizeFirstPageForPreview(sourceBuffer, 1400),
            rasterizeFirstPageForPreview(outBuf, 1400),
          ]);
          previewOriginalUrl = srcRaster.dataUrl;
          previewResultUrl = outRaster.dataUrl;
          previewW = srcRaster.width;
          previewH = srcRaster.height;
        } catch (prevErr) {
          console.error(prevErr);
          previewError = t('pdfCompress.previewError');
        }
      }
      progressLabel = t('pdfCompress.done');
    } catch (e) {
      console.error(e);
      error = e?.message || t('pdfViewer.loadError');
    } finally {
      if (pdfDocument) {
        try {
          await pdfDocument.destroy();
        } catch {
          /* 忽略 */
        }
      }
      processing = false;
    }
  }

  function download() {
    if (!outputBlob) return;
    downloadBlob(outputBlob, outputName);
  }
</script>

<div class="workspace-layout-operation">
  <ToolPageHeader titleKey="pdfCompress.title" descKey="pdfCompress.desc" />

  <section class="card preset-outlined-surface-200-800 p-4 mb-4 space-y-3">
    <h3 class="text-sm font-medium m-0 text-surface-600-400">{t('pdfCompress.caveatTitle')}</h3>
    <ul class="list-disc list-inside text-sm text-surface-600-400 space-y-1 m-0 pl-1">
      <li>{t('pdfCompress.caveat1')}</li>
      <li>{t('pdfCompress.caveat2')}</li>
      <li>{t('pdfCompress.caveat3')}</li>
      <li>{t('pdfCompress.caveat4')}</li>
      <li>{t('pdfCompress.caveat5')}</li>
    </ul>
    <p class="text-xs text-surface-500-500 m-0">{t('pdfCompress.caveatNote')}</p>
  </section>

  {#if initError}
    <p class="text-sm text-error-500 mb-4">{initError}</p>
  {/if}

  <section class="mb-4">
    <FileDropZone
      accept={ACCEPT_PDF}
      multiple={false}
      onFilesAdd={handleFiles}
      disabled={!pdfReady}
      hintKey={pdfReady ? 'pdfCompress.uploadHint' : 'pdfViewer.loadingDocument'}
      formatsKey=""
      selectedName={sourceFile?.name ?? ''}
      onClear={clearFile}
      showClear={!!sourceFile}
      idPrefix="pdf-compress"
    />
  </section>

  <section class="card preset-outlined-surface-200-800 px-3 py-2.5 mb-4">
    <div class="flex flex-nowrap items-center gap-x-4 gap-y-2 overflow-x-auto min-h-10 w-full min-w-0">
      <div class="flex items-center gap-2 shrink-0 min-w-[220px]">
        <label for="pdf-compress-scale" class="text-xs text-surface-600-400 whitespace-nowrap">{t('pdfCompress.renderScale')}</label>
        <div class="w-40 min-w-28 max-w-48">
          <SliderWithInput
            id="pdf-compress-scale"
            value={renderScale}
            min={0.75}
            max={3}
            step={0.1}
            oninput={(v) => (renderScale = v)}
            inputWidth="64px"
          />
        </div>
        <span
          class="text-[10px] text-surface-500-500 tabular-nums whitespace-nowrap w-10 text-right"
          title={t('pdfCompress.scaleDpiHint')}>{renderScale.toFixed(1)}×</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <label for="pdf-compress-format" class="text-xs text-surface-600-400 whitespace-nowrap">{t('pdfCompress.pageFormat')}</label>
        <select
          id="pdf-compress-format"
          class="select select-sm preset-outlined-surface-200-800 text-xs py-1 px-2 min-w-0 max-w-32"
          bind:value={pageImageFormat}
          disabled={processing || !sourceBuffer}
        >
          <option value="jpeg">{t('pdfCompress.formatJpeg')}</option>
          <option value="png">{t('pdfCompress.formatPng')}</option>
        </select>
      </div>
      <div class="flex items-center gap-2 shrink-0 min-w-[200px] {pageImageFormat === 'png' ? 'opacity-45 pointer-events-none' : ''}">
        <label for="pdf-compress-jpeg" class="text-xs text-surface-600-400 whitespace-nowrap">{t('pdfCompress.jpegQuality')}</label>
        <div class="w-36 min-w-24 max-w-44">
          <SliderWithInput
            id="pdf-compress-jpeg"
            value={jpegQualityPercent}
            min={75}
            max={98}
            step={1}
            oninput={(v) => (jpegQualityPercent = v)}
            inputWidth="52px"
          />
        </div>
        <span class="text-[10px] text-surface-500-500 tabular-nums whitespace-nowrap w-8 text-right">{jpegQualityPercent}%</span>
      </div>
      <div class="flex items-center gap-2 shrink-0 ml-auto pl-2 border-l border-surface-200-800">
        <button
          type="button"
          class="btn btn-sm preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          onclick={runCompress}
          disabled={!pdfReady || processing || !sourceBuffer}
        >
          {processing ? t('common.processing') : t('pdfCompress.run')}
        </button>
        <button
          type="button"
          class="btn btn-sm preset-outlined-surface-200-800 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          onclick={download}
          disabled={!outputBlob || processing}
        >
          {t('common.download')}
        </button>
      </div>
    </div>
  </section>

  {#if processing && progressLabel}
    <div class="mb-4">
      <ProgressBar indeterminate label={progressLabel} />
    </div>
  {/if}

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if previewError}
    <p class="text-sm text-warning-500 mb-4">{previewError}</p>
  {/if}

  {#if sourceFile && sourceBuffer}
    <p class="text-xs text-surface-600-400 mb-2 m-0">
      {t('pdfCompress.originalSize')}: {formatFileSize(sourceFile.size)}
      {#if outputBlob}
        · {t('pdfCompress.outputSize')}: {formatFileSize(outputBlob.size)}
        · {t('pdfCompress.ratioToOriginal')}: {Math.round((outputBlob.size / sourceFile.size) * 100)}%
      {/if}
    </p>
  {/if}

  {#if compareItem && previewResultUrl}
    <SliderComparePreview
      inline
      sectionTitle={t('pdfCompress.compareTitle')}
      item={compareItem}
      resultBlobUrl={previewResultUrl}
    />
    <p class="text-xs text-surface-500-500 mb-4 m-0">{t('pdfCompress.compareHint')}</p>
  {/if}
</div>

<script>
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ACCEPT_PDF } from '$lib/fileConstants.js';
  import { t } from '$lib/i18n.js';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import {
    URL_SYNC_DEBOUNCE_MS,
    hasUrlSearchParams,
    replaceUrlSearchIfChanged,
    searchStringToParams,
  } from '$lib/urlToolSync.js';
  import { buildPdfViewerQuery, parsePdfViewerQuery } from '$lib/urlParams/pdfViewerQuery.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';
  import ZoomControls from '$lib/components/common/ZoomControls.svelte';

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const SCALE_STEP = 0.1;

  let canvasRef = $state(null);
  let pdfDoc = $state(null);
  let totalPages = $state(0);
  let currentPage = $state(1);
  let scale = $state(1);
  let rendering = $state(false);
  let error = $state('');
  let fileName = $state('');
  let renderTask = null;
  let pdfReady = $state(false);
  let getDocumentRef = null;
  let docLoading = $state(false);
  let pdfInfo = $state(null);

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  async function readPdfInfo(doc) {
    const next = {
      title: null,
      author: null,
      creator: null,
      producer: null,
      firstPageWidthMm: null,
      firstPageHeightMm: null,
    };

    try {
      const metadata = await doc.getMetadata();
      const info = metadata?.info || {};
      next.title = info.Title?.trim?.() || null;
      next.author = info.Author?.trim?.() || null;
      next.creator = info.Creator?.trim?.() || null;
      next.producer = info.Producer?.trim?.() || null;
    } catch {
      /* ignore metadata errors */
    }

    try {
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      next.firstPageWidthMm = round2((viewport.width / 72) * 25.4);
      next.firstPageHeightMm = round2((viewport.height / 72) * 25.4);
      firstPage.cleanup?.();
    } catch {
      /* ignore page info errors */
    }

    return next;
  }

  $effect(() => {
    void fileName;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.pdf',
      getParams: () => ({
        currentUrl: get(page).url.href,
        fileName: fileName || '—',
      }),
    });
  });

  $effect(() => {
    if (!browser) return;
    if (!hasUrlSearchParams($page.url.search)) return;
    const p = parsePdfViewerQuery(searchStringToParams($page.url.search));
    if (p.page != null) currentPage = p.page;
    if (p.scale != null) scale = p.scale;
  });

  $effect(() => {
    if (!browser) return;
    void currentPage;
    void totalPages;
    void scale;
    const next = buildPdfViewerQuery(currentPage, totalPages, scale).toString();
    const t = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  });

  onMount(async () => {
    if (!browser) return;
    try {
      const [pdfModule, workerModule] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default;
      getDocumentRef = pdfModule.getDocument;
      pdfReady = true;
    } catch (err) {
      console.error('Failed to load pdf.js', err);
      error = t('pdfViewer.loadError');
    }
  });

  async function handleFile(file) {
    if (!file) return;
    if (!browser || !getDocumentRef) {
      error = t('pdfViewer.loading');
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      error = t('pdfViewer.invalidFile');
      return;
    }
    docLoading = true;
    error = '';
    pdfInfo = null;
    if (pdfDoc) {
      pdfDoc.destroy();
      pdfDoc = null;
    }
    const buffer = await file.arrayBuffer();
    const loadingTask = getDocumentRef({ data: buffer });
    try {
      const doc = await loadingTask.promise;
      pdfDoc = doc;
      totalPages = doc.numPages;
      currentPage = 1;
      fileName = file.name || 'document.pdf';
      pdfInfo = await readPdfInfo(doc);
    } catch (err) {
      console.error(err);
      error = t('pdfViewer.loadError');
      pdfDoc = null;
      pdfInfo = null;
      totalPages = 0;
      currentPage = 1;
      docLoading = false;
    }
  }

  function handleFiles(files) {
    if (files?.[0]) handleFile(files[0]);
  }

  async function renderCurrentPage() {
    if (!browser || !pdfDoc || !canvasRef) return;
    const shouldStopDocLoading = docLoading;
    rendering = true;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const dpr = window.devicePixelRatio || 1;
      const outputScale = scale * dpr;
      const viewport = page.getViewport({ scale: outputScale });
      const canvas = canvasRef;
      const context = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
          const logicalW = Math.floor(viewport.width / dpr);
      const logicalH = Math.floor(viewport.height / dpr);
      canvas.style.width = logicalW + 'px';
      canvas.style.height = logicalH + 'px';
      if (renderTask) {
        renderTask.cancel();
        renderTask = null;
      }
      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(err);
        error = t('pdfViewer.loadError');
      }
    } finally {
      rendering = false;
      renderTask = null;
      if (shouldStopDocLoading) {
        docLoading = false;
      }
    }
  }

  $effect(() => {
    if (!browser) return;
    pdfDoc;
    currentPage;
    scale;
    canvasRef;
    if (pdfDoc && canvasRef) {
      renderCurrentPage();
    }
  });

  function clearPdf() {
    if (pdfDoc) {
      pdfDoc.destroy();
    }
    pdfDoc = null;
    totalPages = 0;
    currentPage = 1;
    scale = 1;
    pdfInfo = null;
    fileName = '';
    error = '';
    rendering = false;
    docLoading = false;
  }

  function prevPage() {
    if (!pdfDoc || currentPage <= 1) return;
    currentPage -= 1;
  }

  function nextPage() {
    if (!pdfDoc || currentPage >= totalPages) return;
    currentPage += 1;
  }

  onDestroy(() => {
    if (pdfDoc) {
      pdfDoc.destroy();
    }
  });
</script>

<div class="workspace-layout-operation pdf-viewer">
  <ToolPageHeader titleKey="pdfViewer.title" descKey="pdfViewer.desc" />

  <section class="mb-4">
    <FileDropZone
      accept={ACCEPT_PDF}
      multiple={false}
      onFilesAdd={handleFiles}
      disabled={!pdfReady}
      hintKey={pdfReady ? 'pdfViewer.uploadHint' : 'pdfViewer.loading'}
      formatsKey=""
      selectedName={fileName}
      onClear={clearPdf}
      showClear={!!pdfDoc}
      idPrefix="pdf"
    />
  </section>

  <section class="viewer card preset-outlined-surface-200-800 p-4">
    {#if docLoading}
      <div class="progress-wrapper">
        <ProgressBar indeterminate label={t('pdfViewer.loadingDocument')} />
      </div>
    {/if}
    <div class="viewer-toolbar">
      <div class="file-name text-xs">
        <span class="label">{t('pdfViewer.currentFile')}</span>
        <span class="value">{fileName || '—'}</span>
      </div>
      <div class="toolbar-gap"></div>
      <div class="page-controls">
        <button
          type="button"
          class="control-btn"
          onclick={prevPage}
          disabled={!pdfDoc || currentPage <= 1}
        >
          {t('pdfViewer.previous')}
        </button>
        <span class="page-indicator text-sm">
          {#if pdfDoc}
            {t('pdfViewer.page')} {currentPage} {t('pdfViewer.of')} {totalPages}
          {:else}
            --
          {/if}
        </span>
        <button
          type="button"
          class="control-btn"
          onclick={nextPage}
          disabled={!pdfDoc || currentPage >= totalPages}
        >
          {t('pdfViewer.next')}
        </button>
      </div>
      <div class="zoom-controls">
        <ZoomControls
          value={scale}
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={SCALE_STEP}
          resetValue={1}
          suffix="%"
          scaleDisplay={true}
          disabled={!pdfDoc}
          onchange={(v) => (scale = v)}
        />
      </div>
    </div>
    <div class="canvas-wrapper">
      {#if pdfDoc && pdfInfo}
        <div class="doc-info-grid">
          {#if pdfInfo.title}
            <div class="info-item">
              <span class="info-label">{t('pdfViewer.metaTitle')}</span>
              <span class="info-value">{pdfInfo.title}</span>
            </div>
          {/if}
          {#if pdfInfo.author}
            <div class="info-item">
              <span class="info-label">{t('pdfViewer.metaAuthor')}</span>
              <span class="info-value">{pdfInfo.author}</span>
            </div>
          {/if}
          {#if pdfInfo.creator}
            <div class="info-item">
              <span class="info-label">{t('pdfViewer.metaCreator')}</span>
              <span class="info-value">{pdfInfo.creator}</span>
            </div>
          {/if}
          {#if pdfInfo.producer}
            <div class="info-item">
              <span class="info-label">{t('pdfViewer.metaProducer')}</span>
              <span class="info-value">{pdfInfo.producer}</span>
            </div>
          {/if}
          {#if pdfInfo.firstPageWidthMm && pdfInfo.firstPageHeightMm}
            <div class="info-item">
              <span class="info-label">{t('pdfViewer.firstPageSize')}</span>
              <span class="info-value">{pdfInfo.firstPageWidthMm} x {pdfInfo.firstPageHeightMm} mm</span>
            </div>
          {/if}
        </div>
      {/if}
      {#if pdfDoc}
        <canvas bind:this={canvasRef}></canvas>
        {#if rendering}
          <div class="loading-mask">
            <span>{t('pdfViewer.loading')}</span>
          </div>
        {/if}
      {:else}
        <p class="placeholder text-sm">{t('pdfViewer.noFile')}</p>
      {/if}
    </div>
    {#if error}
      <p class="error-text text-xs">{error}</p>
    {/if}

    {#if pdfDoc}
      <div class="viewer-toolbar viewer-toolbar-bottom">
        <div class="page-controls">
          <button
            type="button"
            class="control-btn"
            onclick={prevPage}
            disabled={!pdfDoc || currentPage <= 1}
          >
            {t('pdfViewer.previous')}
          </button>
          <span class="page-indicator text-sm">
            {t('pdfViewer.page')} {currentPage} {t('pdfViewer.of')} {totalPages}
          </span>
          <button
            type="button"
            class="control-btn"
            onclick={nextPage}
            disabled={!pdfDoc || currentPage >= totalPages}
          >
            {t('pdfViewer.next')}
          </button>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .pdf-viewer :global(canvas) {
    max-width: 100%;
    height: auto;
    display: block;
  }
  .viewer-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }
  .doc-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.9rem;
  }
  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: rgba(255, 255, 255, 0.03);
    min-width: 0;
  }
  .info-label {
    font-size: 0.72rem;
    color: var(--ccw-text-muted);
    text-transform: uppercase;
  }
  .info-value {
    font-size: 0.88rem;
    color: var(--ccw-text-primary);
    overflow-wrap: anywhere;
  }
  .file-name .label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ccw-text-muted);
    margin-right: 0.35rem;
  }
  .file-name .value {
    color: var(--ccw-text-primary);
  }
  .toolbar-gap {
    flex: 1;
  }
  .page-controls,
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .page-indicator {
    min-width: 90px;
    text-align: center;
    color: var(--ccw-text-secondary);
  }
  .control-btn {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-pill);
    background: rgba(255, 255, 255, 0.02);
    color: var(--ccw-text-secondary);
    font-size: 0.75rem;
    padding: 0.2rem 0.75rem;
    transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
    cursor: pointer;
  }
  .control-btn:hover:not(:disabled) {
    border-color: var(--ccw-border-contrast);
    background: rgba(255, 255, 255, 0.06);
    color: var(--ccw-text-primary);
  }
  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .canvas-wrapper {
    position: relative;
    min-height: 320px;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: var(--ccw-bg-elevated);
    padding: 1rem;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .canvas-wrapper canvas {
    margin: 0 auto;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    background: #fff;
  }
  .loading-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--ccw-text-primary);
  }
  .placeholder {
    margin: 0;
    color: var(--ccw-text-muted);
  }
  .error-text {
    margin: 0.5rem 0 0;
    color: #ff8a8a;
  }
  .progress-wrapper {
    margin-bottom: 1rem;
  }
  .viewer-toolbar-bottom {
    margin-top: 1rem;
    justify-content: center;
  }
</style>

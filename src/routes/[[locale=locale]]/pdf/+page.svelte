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
  import PdfThumbnailSidebar from '$lib/components/pdf/PdfThumbnailSidebar.svelte';

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;
  const SCALE_STEP = 0.1;

  let canvasRef = $state(null);
  let canvasWrapperRef = $state(null);
  let pdfDoc = $state(null);
  let sourceBuffer = $state(/** @type {ArrayBuffer | null} */ (null));
  let totalPages = $state(0);
  let currentPage = $state(1);
  let pageInput = $state('1');
  let scale = $state(1);
  let fitMode = $state('page');
  let rendering = $state(false);
  let error = $state('');
  let fileName = $state('');
  let renderTask = null;
  let pdfReady = $state(false);
  let getDocumentRef = null;
  let docLoading = $state(false);
  let pdfInfo = $state(null);
  let viewportWidth = $state(0);
  let viewportHeight = $state(0);
  let pageSizeCache = new Map();
  let fitSyncToken = 0;

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function clampScale(value) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, round2(value)));
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

  async function getPageBaseSize(pageNumber) {
    if (!pdfDoc) return null;
    const cached = pageSizeCache.get(pageNumber);
    if (cached) return cached;
    const pageRef = await pdfDoc.getPage(pageNumber);
    const viewport = pageRef.getViewport({ scale: 1 });
    const next = { width: viewport.width, height: viewport.height };
    pageSizeCache.set(pageNumber, next);
    pageRef.cleanup?.();
    return next;
  }

  async function computeFitScale(mode) {
    if (!pdfDoc || !canvasWrapperRef || !viewportWidth || !viewportHeight) return null;
    const pageSize = await getPageBaseSize(currentPage);
    if (!pageSize) return null;
    const availableWidth = Math.max(180, viewportWidth - 32);
    const availableHeight = Math.max(180, viewportHeight - 32);
    if (mode === 'width') {
      return clampScale(availableWidth / pageSize.width);
    }
    if (mode === 'page') {
      return clampScale(Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height));
    }
    return null;
  }

  function setCurrentPage(nextPage) {
    if (!pdfDoc) return;
    currentPage = Math.min(Math.max(1, nextPage), totalPages);
  }

  function commitPageInput() {
    const next = Math.floor(Number(pageInput));
    if (!Number.isFinite(next)) {
      pageInput = String(currentPage);
      return;
    }
    setCurrentPage(next);
  }

  function handleScaleChange(nextScale) {
    fitMode = 'custom';
    scale = clampScale(nextScale);
  }

  async function activateFitMode(mode) {
    fitMode = mode;
    const nextScale = await computeFitScale(mode);
    if (nextScale != null) scale = nextScale;
  }

  $effect(() => {
    pageInput = String(currentPage || 1);
  });

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
    if (p.scale != null) {
      scale = p.scale;
      fitMode = 'custom';
    }
  });

  $effect(() => {
    if (!browser) return;
    void currentPage;
    void totalPages;
    void scale;
    const next = buildPdfViewerQuery(currentPage, totalPages, scale).toString();
    const timer = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
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

  $effect(() => {
    if (!browser || !canvasWrapperRef) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      viewportWidth = rect?.width ? Math.round(rect.width) : 0;
      viewportHeight = rect?.height ? Math.round(rect.height) : 0;
    });
    observer.observe(canvasWrapperRef);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!browser) return;
    const token = ++fitSyncToken;
    void currentPage;
    void viewportWidth;
    void viewportHeight;
    void fitMode;
    if (!pdfDoc || fitMode === 'custom' || !canvasWrapperRef) return;
    let active = true;
    (async () => {
      const nextScale = await computeFitScale(fitMode);
      if (!active || token !== fitSyncToken || nextScale == null) return;
      scale = nextScale;
    })();
    return () => {
      active = false;
    };
  });

  $effect(() => {
    if (!browser || !pdfDoc) return;
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        prevPage();
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        nextPage();
      } else if (event.key === 'Home') {
        event.preventDefault();
        setCurrentPage(1);
      } else if (event.key === 'End') {
        event.preventDefault();
        setCurrentPage(totalPages);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
    sourceBuffer = null;
    pageSizeCache = new Map();
    if (pdfDoc) {
      pdfDoc.destroy();
      pdfDoc = null;
    }

    const buffer = await file.arrayBuffer();
    const loadingTask = getDocumentRef({ data: buffer });
    try {
      const doc = await loadingTask.promise;
      pdfDoc = doc;
      sourceBuffer = buffer;
      totalPages = doc.numPages;
      currentPage = Math.min(Math.max(1, currentPage), doc.numPages);
      fileName = file.name || 'document.pdf';
      pdfInfo = await readPdfInfo(doc);
      await activateFitMode('page');
    } catch (err) {
      console.error(err);
      error = t('pdfViewer.loadError');
      pdfDoc = null;
      pdfInfo = null;
      totalPages = 0;
      currentPage = 1;
      sourceBuffer = null;
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
      const pageRef = await pdfDoc.getPage(currentPage);
      const dpr = window.devicePixelRatio || 1;
      const outputScale = scale * dpr;
      const viewport = pageRef.getViewport({ scale: outputScale });
      const canvas = canvasRef;
      const context = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const logicalW = Math.floor(viewport.width / dpr);
      const logicalH = Math.floor(viewport.height / dpr);
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;
      if (renderTask) {
        renderTask.cancel();
        renderTask = null;
      }
      renderTask = pageRef.render({ canvasContext: context, viewport });
      await renderTask.promise;
      pageRef.cleanup?.();
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(err);
        error = t('pdfViewer.loadError');
      }
    } finally {
      rendering = false;
      renderTask = null;
      if (shouldStopDocLoading) docLoading = false;
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
    if (pdfDoc) pdfDoc.destroy();
    pdfDoc = null;
    sourceBuffer = null;
    totalPages = 0;
    currentPage = 1;
    pageInput = '1';
    scale = 1;
    fitMode = 'page';
    pdfInfo = null;
    fileName = '';
    error = '';
    rendering = false;
    docLoading = false;
    pageSizeCache = new Map();
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
    if (pdfDoc) pdfDoc.destroy();
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

      <div class="toolbar-block page-controls">
        <button type="button" class="control-btn" onclick={prevPage} disabled={!pdfDoc || currentPage <= 1}>
          {t('pdfViewer.previous')}
        </button>
        <label class="page-jump">
          <span class="sr-only">{t('pdfViewer.pageJump')}</span>
          <input
            type="number"
            class="page-input input preset-outlined-surface-200-800"
            min="1"
            max={totalPages || 1}
            bind:value={pageInput}
            disabled={!pdfDoc}
            onblur={commitPageInput}
            onkeydown={(event) => event.key === 'Enter' && commitPageInput()}
          />
        </label>
        <span class="page-indicator text-sm">
          {#if pdfDoc}
            {t('pdfViewer.of')} {totalPages}
          {:else}
            --
          {/if}
        </span>
        <button type="button" class="control-btn" onclick={nextPage} disabled={!pdfDoc || currentPage >= totalPages}>
          {t('pdfViewer.next')}
        </button>
      </div>

      <div class="toolbar-block fit-controls">
        <button
          type="button"
          class="control-btn {fitMode === 'page' ? 'is-active' : ''}"
          onclick={() => activateFitMode('page')}
          disabled={!pdfDoc}
        >
          {t('pdfViewer.fitPage')}
        </button>
        <button
          type="button"
          class="control-btn {fitMode === 'width' ? 'is-active' : ''}"
          onclick={() => activateFitMode('width')}
          disabled={!pdfDoc}
        >
          {t('pdfViewer.fitWidth')}
        </button>
        <button
          type="button"
          class="control-btn {fitMode === 'custom' && scale === 1 ? 'is-active' : ''}"
          onclick={() => handleScaleChange(1)}
          disabled={!pdfDoc}
        >
          {t('pdfViewer.actualSize')}
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
          onchange={handleScaleChange}
        />
      </div>
    </div>

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

    <div class="reader-shell">
      {#if pdfDoc && sourceBuffer}
        <div class="sidebar-panel">
          <PdfThumbnailSidebar
            fileBuffer={sourceBuffer}
            totalPages={totalPages}
            currentPage={currentPage}
            disabled={docLoading}
            onPageSelect={setCurrentPage}
          />
        </div>
      {/if}

      <div class="canvas-wrapper" bind:this={canvasWrapperRef}>
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
    </div>

    {#if error}
      <p class="error-text text-xs">{error}</p>
    {/if}
  </section>
</div>

<style>
  .pdf-viewer :global(canvas) {
    max-width: none;
    height: auto;
    display: block;
  }
  .viewer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .viewer-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem 0.9rem;
    align-items: center;
  }
  .toolbar-block,
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .file-name {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: min(100%, 240px);
    margin-right: auto;
  }
  .file-name .label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ccw-text-muted);
    white-space: nowrap;
  }
  .file-name .value {
    color: var(--ccw-text-primary);
    overflow-wrap: anywhere;
  }
  .page-jump {
    display: flex;
  }
  .page-input {
    width: 74px;
    text-align: center;
  }
  .page-indicator {
    color: var(--ccw-text-secondary);
    min-width: 50px;
    text-align: center;
  }
  .doc-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem;
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
  .reader-shell {
    display: grid;
    grid-template-columns: minmax(164px, 212px) minmax(0, 1fr);
    gap: 1rem;
    min-height: 540px;
  }
  .sidebar-panel {
    min-height: 0;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: rgba(255, 255, 255, 0.02);
    padding: 0.75rem;
  }
  .canvas-wrapper {
    position: relative;
    min-height: 540px;
    height: min(72vh, 920px);
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
  .control-btn.is-active {
    border-color: color-mix(in srgb, var(--ccw-accent) 78%, white);
    background: rgba(10, 132, 255, 0.14);
    color: #fff;
  }
  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
    margin: auto;
    color: var(--ccw-text-muted);
  }
  .error-text {
    margin: 0;
    color: #ff8a8a;
  }
  .progress-wrapper {
    margin-bottom: 0.25rem;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 980px) {
    .reader-shell {
      grid-template-columns: 1fr;
    }
    .sidebar-panel {
      max-height: 260px;
    }
    .canvas-wrapper {
      min-height: 420px;
      height: 62vh;
    }
  }
</style>

<script>
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { t } from '$lib/i18n.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';
  import ZoomControls from '$lib/components/common/ZoomControls.svelte';

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const SCALE_STEP = 0.1;

  let inputRef = $state(null);
  let canvasRef = $state(null);
  let dropActive = $state(false);
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
    dropActive = false;
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
    } catch (err) {
      console.error(err);
      error = t('pdfViewer.loadError');
      pdfDoc = null;
      totalPages = 0;
      currentPage = 1;
      docLoading = false;
    }
    if (inputRef) inputRef.value = '';
  }

  async function renderCurrentPage() {
    if (!browser || !pdfDoc || !canvasRef) return;
    const shouldStopDocLoading = docLoading;
    rendering = true;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef;
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
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

  function handleInputChange(event) {
    const file = event.target?.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!pdfReady) return;
    dropActive = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dropActive = false;
  }

  function handleDrop(event) {
    event.preventDefault();
    dropActive = false;
    if (!pdfReady) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  function clearPdf() {
    if (pdfDoc) {
      pdfDoc.destroy();
    }
    pdfDoc = null;
    totalPages = 0;
    currentPage = 1;
    scale = 1;
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

<div class="workspace-content workspace-content-wide pdf-viewer">
  <ToolPageHeader titleKey="pdfViewer.title" descKey="pdfViewer.desc" />

  <section class="upload card preset-outlined-surface-200-800 p-4 mb-4">
    <p class="text-sm font-medium m-0 mb-2">{t('pdfViewer.upload')}</p>
    <div class="actions">
      <input
        bind:this={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        class="hidden"
        onchange={handleInputChange}
      />
      <button
        type="button"
        class="btn btn-sm preset-outlined-surface-200-800"
        onclick={() => pdfReady && inputRef?.click()}
        disabled={!pdfReady}
      >
        {t('pdfViewer.upload')}
      </button>
      <button
        type="button"
        class="btn btn-sm preset-outlined-surface-200-800"
        onclick={clearPdf}
        disabled={!pdfDoc}
      >
        {t('common.clearAll')}
      </button>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="drop-zone {dropActive ? 'is-active' : ''} {!pdfReady ? 'is-disabled' : ''}"
      role="button"
      tabindex="0"
      aria-disabled={!pdfReady}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => pdfReady && inputRef?.click()}
      onkeydown={(e) => pdfReady && e.key === 'Enter' && inputRef?.click()}
    >
      <p class="hint">{pdfReady ? t('pdfViewer.uploadHint') : t('pdfViewer.loading')}</p>
      {#if pdfReady}
        <p class="sub-hint">{t('pdfViewer.dropHint')}</p>
      {/if}
    </div>
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
  .upload .actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .drop-zone {
    border: 1px dashed var(--ccw-border-contrast);
    border-radius: var(--ccw-radius-card);
    padding: 1rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 150ms ease, background-color 150ms ease;
    cursor: pointer;
  }
  .drop-zone.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .drop-zone.is-active {
    border-color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.08);
  }
  .drop-zone .hint {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ccw-text-primary);
  }
  .drop-zone .sub-hint {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: var(--ccw-text-muted);
  }
  .viewer-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
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

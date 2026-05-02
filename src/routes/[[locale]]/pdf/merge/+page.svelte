<script>
  import { onMount } from 'svelte';
  import { ACCEPT_PDF } from '$lib/fileConstants.js';
  import { t } from '$lib/i18n.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';

  let pdfReady = $state(false);
  let processing = $state(false);
  let error = $state('');
  let progressLabel = $state('');
  let outputBlob = $state(/** @type {Blob | null} */ (null));
  let outputName = $state('merged.pdf');
  let dragIndex = $state(-1);
  let dragOverIndex = $state(-1);

  /** @type {any} */
  let PDFDocumentRef = null;
  let items = $state(/** @type {Array<{ id: string, file: File, name: string, size: number, buffer: ArrayBuffer, pageCount: number }>} */ ([]));

  const totalPages = $derived(items.reduce((sum, item) => sum + item.pageCount, 0));

  onMount(async () => {
    const mod = await import('pdf-lib');
    PDFDocumentRef = mod.PDFDocument;
    pdfReady = true;
  });

  async function handleFiles(files) {
    if (!PDFDocumentRef) return;

    error = '';
    outputBlob = null;

    const nextItems = [];
    for (const file of files || []) {
      const ok = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
      if (!ok) continue;

      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocumentRef.load(buffer, { updateMetadata: false });
      nextItems.push({
        id: crypto.randomUUID(),
        file,
        name: file.name || 'document.pdf',
        size: file.size,
        buffer,
        pageCount: pdfDoc.getPageCount(),
      });
    }

    if (!nextItems.length) {
      error = t('pdfViewer.invalidFile');
      return;
    }

    items = [...items, ...nextItems];
    const base = nextItems[0].name.replace(/\.pdf$/i, '') || 'merged';
    outputName = `${base}-merged.pdf`;
  }

  function clearAll() {
    items = [];
    error = '';
    progressLabel = '';
    outputBlob = null;
    outputName = 'merged.pdf';
    dragIndex = -1;
    dragOverIndex = -1;
  }

  function removeItem(index) {
    const next = items.slice();
    next.splice(index, 1);
    items = next;
    outputBlob = null;
  }

  function moveItem(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
      return;
    }
    const next = items.slice();
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    items = next;
    outputBlob = null;
  }

  function handleDragStart(index, event) {
    dragIndex = index;
    dragOverIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(index, event) {
    event.preventDefault();
    dragOverIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDrop(index, event) {
    event.preventDefault();
    if (dragIndex < 0) return;
    moveItem(dragIndex, index);
    dragIndex = -1;
    dragOverIndex = -1;
  }

  function handleDragEnd() {
    dragIndex = -1;
    dragOverIndex = -1;
  }

  async function runMerge() {
    if (!PDFDocumentRef || !items.length) {
      error = t('pdfMerge.needFiles');
      return;
    }

    processing = true;
    error = '';
    outputBlob = null;

    try {
      const outDoc = await PDFDocumentRef.create();
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        progressLabel = `${t('common.processing')} ${index + 1}/${items.length}`;
        const sourceDoc = await PDFDocumentRef.load(item.buffer.slice(0), { updateMetadata: false });
        const copiedPages = await outDoc.copyPages(
          sourceDoc,
          Array.from({ length: item.pageCount }, (_, pageIndex) => pageIndex),
        );
        for (const page of copiedPages) {
          outDoc.addPage(page);
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      const bytes = await outDoc.save();
      outputBlob = new Blob([bytes], { type: 'application/pdf' });
      progressLabel = t('pdfMerge.done');
    } catch (err) {
      console.error(err);
      error = err?.message || t('pdfViewer.loadError');
    } finally {
      processing = false;
    }
  }

  function download() {
    if (!outputBlob) return;
    downloadBlob(outputBlob, outputName);
  }
</script>

<div class="workspace-layout-operation">
  <ToolPageHeader titleKey="pdfMerge.title" descKey="pdfMerge.desc" />

  <section class="mb-4">
    <FileDropZone
      accept={ACCEPT_PDF}
      multiple
      onFilesAdd={handleFiles}
      disabled={!pdfReady}
      hintKey={pdfReady ? 'pdfMerge.uploadHint' : 'pdfViewer.loadingDocument'}
      formatsKey=""
      selectedName={items.length ? `${items.length} PDF` : ''}
      onClear={clearAll}
      showClear={items.length > 0}
      idPrefix="pdf-merge"
    />
  </section>

  <section class="card preset-outlined-surface-200-800 p-4 mb-4">
    <div class="merge-toolbar">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">{t('pdfMerge.totalFiles')}</span>
          <span class="summary-value">{items.length || '—'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{t('pdfMerge.totalPages')}</span>
          <span class="summary-value">{totalPages || '—'}</span>
        </div>
        {#if outputBlob}
          <div class="summary-item">
            <span class="summary-label">{t('pdfMerge.outputPages')}</span>
            <span class="summary-value">{totalPages}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{t('pdfMerge.outputSize')}</span>
            <span class="summary-value">{formatFileSize(outputBlob.size)}</span>
          </div>
        {/if}
      </div>
      <div class="merge-actions">
        <button
          type="button"
          class="btn btn-sm preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={runMerge}
          disabled={!items.length || processing}
        >
          {processing ? t('common.processing') : t('pdfMerge.run')}
        </button>
        <button
          type="button"
          class="btn btn-sm preset-outlined-surface-200-800 disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={download}
          disabled={!outputBlob || processing}
        >
          {t('common.download')}
        </button>
      </div>
    </div>
    <p class="text-xs text-surface-500-500 mt-0 mb-4">{t('pdfMerge.orderHint')}</p>

    {#if items.length}
      <div class="merge-list" role="list">
        {#each items as item, index}
          <div
            class="merge-item {dragIndex === index ? 'is-dragging' : ''} {dragOverIndex === index ? 'is-target' : ''}"
            role="listitem"
            aria-grabbed={dragIndex === index}
            draggable={!processing}
            ondragstart={(event) => handleDragStart(index, event)}
            ondragover={(event) => handleDragOver(index, event)}
            ondrop={(event) => handleDrop(index, event)}
            ondragend={handleDragEnd}
          >
            <div class="merge-item-handle" aria-hidden="true">⋮⋮</div>
            <div class="merge-item-main">
              <div class="merge-item-name">{item.name}</div>
              <div class="merge-item-meta text-xs text-surface-500-500">
                {item.pageCount} pages · {formatFileSize(item.size)}
              </div>
            </div>
            <div class="merge-item-actions">
              <button
                type="button"
                class="control-btn"
                onclick={() => removeItem(index)}
                disabled={processing}
                title={t('pdfMerge.removeFile')}
                aria-label={t('pdfMerge.removeFile')}
              >
                ×
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="placeholder text-sm">{t('pdfMerge.empty')}</p>
    {/if}
  </section>

  {#if processing && progressLabel}
    <div class="mb-4">
      <ProgressBar indeterminate label={progressLabel} />
    </div>
  {/if}

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}
</div>

<style>
  .merge-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: start;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    flex: 1;
    min-width: min(100%, 420px);
  }
  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.7rem;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: rgba(255, 255, 255, 0.03);
    min-width: 0;
  }
  .summary-label {
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
    text-transform: uppercase;
  }
  .summary-value {
    color: var(--ccw-text-primary);
    overflow-wrap: anywhere;
  }
  .merge-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .merge-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .merge-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.8rem;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 150ms ease, background-color 150ms ease, opacity 150ms ease;
  }
  .merge-item.is-dragging {
    opacity: 0.55;
  }
  .merge-item.is-target {
    border-color: color-mix(in srgb, var(--ccw-accent) 78%, white);
    background: rgba(10, 132, 255, 0.12);
  }
  .merge-item-handle {
    flex-shrink: 0;
    font-size: 1.05rem;
    color: var(--ccw-text-muted);
    cursor: grab;
    user-select: none;
  }
  .merge-item-main {
    min-width: 0;
    flex: 1;
  }
  .merge-item-name {
    color: var(--ccw-text-primary);
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .merge-item-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: nowrap;
  }
  .placeholder {
    margin: 0;
    color: var(--ccw-text-muted);
  }
</style>

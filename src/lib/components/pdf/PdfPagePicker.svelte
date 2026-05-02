<script>
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import { t } from '$lib/i18n.js';
  import { getAllPages, getEvenPages, getOddPages } from '$lib/pdfPageSelection.js';

  let {
    fileBuffer = null,
    totalPages = 0,
    selectedPages = [],
    disabled = false,
    onSelectionChange = () => {},
  } = $props();

  let getDocumentRef = $state(null);
  let pdfReady = $state(false);
  let loadError = $state('');
  let loadingThumbnails = $state(false);
  let thumbnails = $state(/** @type {Array<{ pageNumber: number, src: string, loading: boolean }>} */ ([]));
  let selectionAnchor = $state(null);
  let renderToken = 0;

  const selectedSet = $derived(new Set(selectedPages));
  const hasFile = $derived(Boolean(fileBuffer && totalPages > 0));

  function makeEmptyThumbnails(pageCount) {
    return Array.from({ length: Math.max(0, pageCount) }, (_, idx) => ({
      pageNumber: idx + 1,
      src: '',
      loading: false,
    }));
  }

  function setSelection(nextPages) {
    onSelectionChange(Array.from(new Set(nextPages)).sort((a, b) => a - b));
  }

  function togglePage(pageNumber, event) {
    const next = new Set(selectedPages);

    if (event?.shiftKey && selectionAnchor != null) {
      const start = Math.min(selectionAnchor, pageNumber);
      const end = Math.max(selectionAnchor, pageNumber);
      const range = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
      const shouldSelect = range.some((value) => !next.has(value));
      for (const value of range) {
        if (shouldSelect) next.add(value);
        else next.delete(value);
      }
    } else if (next.has(pageNumber)) {
      next.delete(pageNumber);
    } else {
      next.add(pageNumber);
    }

    selectionAnchor = pageNumber;
    setSelection(Array.from(next));
  }

  function applyPreset(kind) {
    if (kind === 'all') {
      setSelection(getAllPages(totalPages));
      return;
    }
    if (kind === 'clear') {
      setSelection([]);
      return;
    }
    if (kind === 'odd') {
      setSelection(getOddPages(totalPages));
      return;
    }
    if (kind === 'even') {
      setSelection(getEvenPages(totalPages));
      return;
    }
  }

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
      loadError = t('pdfPagePicker.previewError');
      thumbnails = makeEmptyThumbnails(totalPages);
    }
  });

  $effect(() => {
    thumbnails = makeEmptyThumbnails(totalPages);
  });

  $effect(() => {
    const buffer = fileBuffer;
    const pageCount = totalPages;
    const ready = pdfReady;
    const loader = getDocumentRef;

    renderToken += 1;
    const currentToken = renderToken;

    if (!buffer || !pageCount) {
      loadingThumbnails = false;
      loadError = '';
      thumbnails = makeEmptyThumbnails(pageCount);
      return;
    }

    if (!ready || !loader) {
      loadingThumbnails = true;
      return;
    }

    let destroyed = false;
    /** @type {any} */
    let activeDoc = null;

    (async () => {
      loadingThumbnails = true;
      loadError = '';
      thumbnails = makeEmptyThumbnails(pageCount).map((item) => ({ ...item, loading: true }));

      try {
        const task = loader({ data: buffer.slice(0) });
        activeDoc = await task.promise;

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          if (destroyed || currentToken !== renderToken) break;

          const pdfPage = await activeDoc.getPage(pageNumber);
          const viewport = pdfPage.getViewport({ scale: 1 });
          const scale = Math.min(180 / viewport.width, 240 / viewport.height);
          const renderViewport = pdfPage.getViewport({ scale: Math.max(scale, 0.18) });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });
          if (!context) {
            pdfPage.cleanup?.();
            continue;
          }

          canvas.width = Math.max(1, Math.floor(renderViewport.width));
          canvas.height = Math.max(1, Math.floor(renderViewport.height));

          const renderTask = pdfPage.render({
            canvasContext: context,
            viewport: renderViewport,
          });
          await renderTask.promise;
          const src = canvas.toDataURL('image/jpeg', 0.82);
          pdfPage.cleanup?.();

          if (destroyed || currentToken !== renderToken) break;
          thumbnails = thumbnails.map((item) =>
            item.pageNumber === pageNumber ? { ...item, src, loading: false } : item,
          );
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      } catch (err) {
        if (!destroyed) {
          console.error(err);
          loadError = t('pdfPagePicker.previewError');
          thumbnails = makeEmptyThumbnails(pageCount);
        }
      } finally {
        if (!destroyed) {
          loadingThumbnails = false;
        }
        activeDoc?.destroy?.();
      }
    })();

    return () => {
      destroyed = true;
      activeDoc?.destroy?.();
    };
  });

  onDestroy(() => {
    renderToken += 1;
  });
</script>

<div class="picker-shell">
  <div class="picker-toolbar">
    <div class="picker-copy">
      <p class="picker-title">{t('pdfPagePicker.title')}</p>
      <p class="picker-hint">{t('pdfPagePicker.hint')}</p>
    </div>
    <div class="picker-actions">
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={() => applyPreset('all')} disabled={!totalPages || disabled}>
        {t('pdfPagePicker.selectAll')}
      </button>
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={() => applyPreset('odd')} disabled={!totalPages || disabled}>
        {t('pdfPagePicker.selectOdd')}
      </button>
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={() => applyPreset('even')} disabled={!totalPages || disabled}>
        {t('pdfPagePicker.selectEven')}
      </button>
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={() => applyPreset('clear')} disabled={!selectedPages.length || disabled}>
        {t('pdfPagePicker.clear')}
      </button>
    </div>
  </div>

  <div class="picker-status">
    <span>{t('pdfPagePicker.total')} {totalPages || 0}</span>
    <span>{t('pdfPagePicker.selected')} {selectedPages.length}</span>
    {#if hasFile && loadingThumbnails}
      <span>{t('pdfPagePicker.rendering')}</span>
    {/if}
  </div>

  {#if loadError}
    <p class="picker-error text-sm text-error-500">{loadError}</p>
  {/if}

  <div class="picker-grid" aria-disabled={disabled}>
    {#each thumbnails as thumbnail (thumbnail.pageNumber)}
      <button
        type="button"
        class:selected={selectedSet.has(thumbnail.pageNumber)}
        class="page-tile"
        onclick={(event) => togglePage(thumbnail.pageNumber, event)}
        disabled={disabled || !totalPages}
        aria-pressed={selectedSet.has(thumbnail.pageNumber)}
      >
        <span class="thumb-surface">
          {#if thumbnail.src}
            <img src={thumbnail.src} alt={`${t('pdfViewer.page')} ${thumbnail.pageNumber}`} />
          {:else}
            <span class="thumb-placeholder {thumbnail.loading ? 'is-loading' : ''}">
              {thumbnail.pageNumber}
            </span>
          {/if}
        </span>
        <span class="tile-meta">
          <span class="tile-page">{t('pdfViewer.page')} {thumbnail.pageNumber}</span>
          {#if selectedSet.has(thumbnail.pageNumber)}
            <span class="tile-tag">{t('pdfPagePicker.selectedTag')}</span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .picker-shell {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .picker-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: end;
  }
  .picker-copy {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .picker-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ccw-text-primary);
  }
  .picker-hint {
    margin: 0;
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .picker-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .picker-status {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .picker-error {
    margin: 0;
  }
  .picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(152px, 1fr));
    gap: 0.75rem;
  }
  .page-tile {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: 100%;
    padding: 0.7rem;
    border-radius: var(--ccw-radius-card);
    border: 1px solid var(--ccw-border-soft);
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
    text-align: left;
    color: inherit;
  }
  .page-tile:hover:not(:disabled) {
    border-color: var(--ccw-border-contrast);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  .page-tile.selected {
    border-color: color-mix(in srgb, var(--ccw-accent) 78%, white);
    background: rgba(10, 132, 255, 0.12);
    box-shadow: 0 0 0 1px rgba(10, 132, 255, 0.2);
  }
  .page-tile:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  .thumb-surface {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 3 / 4;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(0, 0, 0, 0.28);
    overflow: hidden;
  }
  .thumb-surface img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #fff;
  }
  .thumb-placeholder {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    color: var(--ccw-text-secondary);
    font-size: 1.05rem;
    font-weight: 700;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
      repeating-linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.03) 0,
        rgba(255, 255, 255, 0.03) 10px,
        transparent 10px,
        transparent 20px
      );
  }
  .thumb-placeholder.is-loading {
    color: rgba(255, 255, 255, 0.55);
  }
  .tile-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
  }
  .tile-page {
    font-size: 0.8rem;
    color: var(--ccw-text-primary);
  }
  .tile-tag {
    flex-shrink: 0;
    border-radius: var(--ccw-radius-pill);
    padding: 0.12rem 0.45rem;
    font-size: 0.68rem;
    color: #fff;
    background: color-mix(in srgb, var(--ccw-accent) 88%, white);
  }
</style>

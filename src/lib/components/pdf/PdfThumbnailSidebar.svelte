<script>
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import { t } from '$lib/i18n.js';

  let {
    fileBuffer = null,
    totalPages = 0,
    currentPage = 1,
    disabled = false,
    onPageSelect = () => {},
  } = $props();

  let getDocumentRef = $state(null);
  let pdfReady = $state(false);
  let loadError = $state('');
  let loadingThumbnails = $state(false);
  let thumbnails = $state(/** @type {Array<{ pageNumber: number, src: string, loading: boolean }>} */ ([]));
  let renderToken = 0;

  function makeEmptyThumbnails(pageCount) {
    return Array.from({ length: Math.max(0, pageCount) }, (_, idx) => ({
      pageNumber: idx + 1,
      src: '',
      loading: false,
    }));
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
          const scale = Math.min(132 / viewport.width, 172 / viewport.height);
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
        if (!destroyed) loadingThumbnails = false;
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

<aside class="thumb-sidebar">
  <div class="sidebar-head">
    <div>
      <p class="sidebar-title">{t('pdfViewer.thumbnailTitle')}</p>
      <p class="sidebar-hint">{t('pdfViewer.thumbnailHint')}</p>
    </div>
    <div class="sidebar-meta">
      <span>{totalPages || 0}</span>
      {#if loadingThumbnails}
        <span>{t('pdfPagePicker.rendering')}</span>
      {/if}
    </div>
  </div>

  {#if loadError}
    <p class="text-xs text-error-500 m-0">{loadError}</p>
  {/if}

  <div class="thumb-list">
    {#each thumbnails as thumbnail (thumbnail.pageNumber)}
      <button
        type="button"
        class="thumb-tile {currentPage === thumbnail.pageNumber ? 'is-active' : ''}"
        onclick={() => onPageSelect(thumbnail.pageNumber)}
        disabled={disabled || !totalPages}
        aria-current={currentPage === thumbnail.pageNumber ? 'page' : undefined}
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
        <span class="thumb-label">{t('pdfViewer.page')} {thumbnail.pageNumber}</span>
      </button>
    {/each}
  </div>
</aside>

<style>
  .thumb-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    height: 100%;
  }
  .sidebar-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: start;
  }
  .sidebar-title {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ccw-text-primary);
  }
  .sidebar-hint {
    margin: 0.18rem 0 0 0;
    font-size: 0.72rem;
    color: var(--ccw-text-muted);
  }
  .sidebar-meta {
    display: flex;
    flex-direction: column;
    align-items: end;
    gap: 0.15rem;
    font-size: 0.72rem;
    color: var(--ccw-text-muted);
    flex-shrink: 0;
  }
  .thumb-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    overflow: auto;
    min-height: 0;
    padding-right: 0.2rem;
  }
  .thumb-tile {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    width: 100%;
    padding: 0.55rem;
    border-radius: var(--ccw-radius-card);
    border: 1px solid var(--ccw-border-soft);
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
    transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
  }
  .thumb-tile:hover:not(:disabled) {
    border-color: var(--ccw-border-contrast);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  .thumb-tile.is-active {
    border-color: color-mix(in srgb, var(--ccw-accent) 78%, white);
    background: rgba(10, 132, 255, 0.12);
    box-shadow: 0 0 0 1px rgba(10, 132, 255, 0.22);
  }
  .thumb-tile:disabled {
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
    display: block;
    object-fit: contain;
    background: #fff;
  }
  .thumb-placeholder {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    color: var(--ccw-text-secondary);
    font-size: 1rem;
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
  .thumb-label {
    font-size: 0.76rem;
    color: var(--ccw-text-primary);
    text-align: left;
  }
</style>

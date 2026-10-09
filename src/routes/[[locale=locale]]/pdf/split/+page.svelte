<script>
  import { onMount } from 'svelte';
  import JSZip from 'jszip';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ACCEPT_PDF } from '$lib/fileConstants.js';
  import { t } from '$lib/i18n.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';
  import PdfPagePicker from '$lib/components/pdf/PdfPagePicker.svelte';
  import {
    URL_SYNC_DEBOUNCE_MS,
    hasUrlSearchParams,
    replaceUrlSearchIfChanged,
    searchStringToParams,
  } from '$lib/urlToolSync.js';
  import { buildPdfExtractQuery, parsePdfExtractQuery } from '$lib/urlParams/pdfExtractQuery.js';
  import {
    PAGE_RANGE_ERROR_INVALID,
    pageRangeFromPages,
    parsePageRangeSpec,
  } from '$lib/pdfPageSelection.js';

  let sourceFile = $state(/** @type {File | null} */ (null));
  let sourceBuffer = $state(/** @type {ArrayBuffer | null} */ (null));
  let totalPages = $state(0);
  let pageRange = $state('');
  let splitPages = $state(/** @type {number[]} */ ([]));
  let outputBlob = $state(/** @type {Blob | null} */ (null));
  let outputName = $state('split-pages.zip');
  let pdfReady = $state(false);
  let processing = $state(false);
  let error = $state('');
  let progressLabel = $state('');
  let PDFDocumentRef = null;

  function mapRangeError(err) {
    if (err?.message === PAGE_RANGE_ERROR_INVALID) return t('pdfSplit.invalidRange');
    return t('pdfSplit.invalidRange');
  }

  $effect(() => {
    if (!browser) return;
    if (!hasUrlSearchParams($page.url.search)) return;
    const p = parsePdfExtractQuery(searchStringToParams($page.url.search));
    if (p.pages != null) pageRange = p.pages;
  });

  $effect(() => {
    if (!browser) return;
    void pageRange;
    const next = buildPdfExtractQuery(pageRange).toString();
    const timer = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, next);
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  onMount(async () => {
    const mod = await import('pdf-lib');
    PDFDocumentRef = mod.PDFDocument;
    pdfReady = true;
  });

  $effect(() => {
    const buffer = sourceBuffer;
    const pages = pageRange;
    if (!buffer || !PDFDocumentRef) {
      totalPages = 0;
      splitPages = [];
      return;
    }
    let active = true;
    (async () => {
      try {
        const pdfDoc = await PDFDocumentRef.load(buffer.slice(0), { updateMetadata: false });
        const count = pdfDoc.getPageCount();
        const nextPages = parsePageRangeSpec(pages, count, { empty: 'all' });
        if (!active) return;
        totalPages = count;
        splitPages = nextPages;
        error = '';
      } catch (err) {
        if (!active) return;
        splitPages = [];
        try {
          const pdfDoc = await PDFDocumentRef.load(buffer.slice(0), { updateMetadata: false });
          totalPages = pdfDoc.getPageCount();
        } catch {
          totalPages = 0;
        }
        if (String(pages || '').trim()) {
          error = mapRangeError(err);
        }
      }
    })();
    return () => {
      active = false;
    };
  });

  function clearFile() {
    sourceFile = null;
    sourceBuffer = null;
    totalPages = 0;
    pageRange = '';
    splitPages = [];
    outputBlob = null;
    outputName = 'split-pages.zip';
    error = '';
    progressLabel = '';
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
    progressLabel = '';
    sourceFile = f;
    sourceBuffer = await f.arrayBuffer();
    const pdfDoc = await PDFDocumentRef.load(sourceBuffer, { updateMetadata: false });
    totalPages = pdfDoc.getPageCount();

    const initialRange = String(pageRange || '').trim();
    if (initialRange) {
      try {
        parsePageRangeSpec(initialRange, totalPages, { empty: 'all' });
      } catch {
        pageRange = '';
      }
    }

    const base = f.name.replace(/\.pdf$/i, '') || 'document';
    outputName = `${base}-split.zip`;
  }

  function handleSelectionChange(nextPages) {
    pageRange = nextPages.length >= totalPages ? '' : pageRangeFromPages(nextPages);
    outputBlob = null;
    error = '';
  }

  async function runSplit() {
    if (!sourceBuffer) {
      error = t('pdfSplit.needFile');
      return;
    }

    processing = true;
    error = '';
    outputBlob = null;
    progressLabel = t('common.processing');

    try {
      const base = (sourceFile?.name || 'document').replace(/\.pdf$/i, '') || 'document';
      const sourceDoc = await PDFDocumentRef.load(sourceBuffer.slice(0), { updateMetadata: false });
      const selectedPages = parsePageRangeSpec(String(pageRange || '').trim(), sourceDoc.getPageCount(), { empty: 'all' });
      const zip = new JSZip();
      for (const pageNumber of selectedPages) {
        const outDoc = await PDFDocumentRef.create();
        const [copiedPage] = await outDoc.copyPages(sourceDoc, [pageNumber - 1]);
        outDoc.addPage(copiedPage);
        const bytes = await outDoc.save();
        zip.file(`${base}-p${String(pageNumber).padStart(3, '0')}.pdf`, bytes);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      outputBlob = blob;
      splitPages = selectedPages;
      progressLabel = t('pdfSplit.done');
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
  <ToolPageHeader titleKey="pdfSplit.title" descKey="pdfSplit.desc" />

  <section class="mb-4">
    <FileDropZone
      accept={ACCEPT_PDF}
      multiple={false}
      onFilesAdd={handleFiles}
      disabled={!pdfReady}
      hintKey={pdfReady ? 'pdfSplit.uploadHint' : 'pdfViewer.loadingDocument'}
      formatsKey=""
      selectedName={sourceFile?.name ?? ''}
      onClear={clearFile}
      showClear={!!sourceFile}
      idPrefix="pdf-split"
    />
  </section>

  <section class="card preset-outlined-surface-200-800 p-4 mb-4">
    {#if sourceBuffer}
      <PdfPagePicker
        fileBuffer={sourceBuffer}
        totalPages={totalPages}
        selectedPages={splitPages}
        disabled={processing}
        onSelectionChange={handleSelectionChange}
      />

      <details class="advanced-panel">
        <summary>{t('pdfPagePicker.advanced')}</summary>
        <label class="range-field" for="pdf-split-pages">
          <span class="range-label">{t('pdfSplit.pageRange')}</span>
          <input
            id="pdf-split-pages"
            class="input preset-outlined-surface-200-800"
            type="text"
            bind:value={pageRange}
            placeholder={t('pdfSplit.pageRangePlaceholder')}
            disabled={!sourceBuffer || processing}
          />
        </label>
        <p class="range-hint text-xs text-surface-500-500 m-0">{t('pdfSplit.pageRangeHint')}</p>
      </details>
    {:else}
      <p class="placeholder text-sm">{t('pdfPagePicker.empty')}</p>
    {/if}

    <div class="split-footer">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">{t('pdfViewer.currentFile')}</span>
          <span class="summary-value">{sourceFile?.name || '—'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{t('pdfSplit.totalPages')}</span>
          <span class="summary-value">{totalPages || '—'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{t('pdfSplit.splitPages')}</span>
          <span class="summary-value">{splitPages.length >= totalPages && totalPages ? t('pdfSplit.allPages') : splitPages.length ? splitPages.join(', ') : '—'}</span>
        </div>
        {#if outputBlob}
          <div class="summary-item">
            <span class="summary-label">{t('pdfSplit.outputFiles')}</span>
            <span class="summary-value">{splitPages.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{t('pdfSplit.outputArchive')}</span>
            <span class="summary-value">{outputName}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{t('pdfSplit.outputSize')}</span>
            <span class="summary-value">{formatFileSize(outputBlob.size)}</span>
          </div>
        {/if}
      </div>

      <div class="split-actions">
        <button
          type="button"
          class="btn btn-sm preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={runSplit}
          disabled={!sourceBuffer || processing || !splitPages.length}
        >
          {processing ? t('common.processing') : t('pdfSplit.run')}
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
  .advanced-panel {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--ccw-border-soft);
  }
  .advanced-panel summary {
    cursor: pointer;
    color: var(--ccw-text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
  }
  .advanced-panel[open] summary {
    margin-bottom: 0.75rem;
  }
  .range-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: min(100%, 360px);
  }
  .range-label,
  .summary-label {
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
    text-transform: uppercase;
  }
  .range-hint {
    margin-top: 0.5rem;
  }
  .split-footer {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    flex-wrap: wrap;
    align-items: start;
    margin-top: 1rem;
  }
  .split-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  .summary-value {
    color: var(--ccw-text-primary);
    overflow-wrap: anywhere;
  }
  .placeholder {
    margin: 0;
    color: var(--ccw-text-muted);
  }
</style>

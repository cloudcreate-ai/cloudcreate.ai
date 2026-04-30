<script>
  import { onMount } from 'svelte';
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
  import {
    URL_SYNC_DEBOUNCE_MS,
    hasUrlSearchParams,
    replaceUrlSearchIfChanged,
    searchStringToParams,
  } from '$lib/urlToolSync.js';
  import { buildPdfExtractQuery, parsePdfExtractQuery } from '$lib/urlParams/pdfExtractQuery.js';

  let pdfReady = $state(false);
  let sourceFile = $state(/** @type {File | null} */ (null));
  let sourceBuffer = $state(/** @type {ArrayBuffer | null} */ (null));
  let totalPages = $state(0);
  let pageRange = $state('');
  let selectedPages = $state(/** @type {number[]} */ ([]));
  let outputBlob = $state(/** @type {Blob | null} */ (null));
  let outputName = $state('extracted-pages.pdf');
  let processing = $state(false);
  let error = $state('');
  let progressLabel = $state('');

  let PDFDocumentRef = null;

  function parsePageRangeSpec(spec, pageCount) {
    const text = String(spec || '').trim();
    if (!text) {
      throw new Error(t('pdfExtract.needPages'));
    }

    const out = [];
    const seen = new Set();
    for (const rawPart of text.split(',')) {
      const part = rawPart.trim();
      if (!part) continue;

      const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        if (start < 1 || end < 1 || start > end) {
          throw new Error(t('pdfExtract.invalidRange'));
        }
        if (end > pageCount) {
          throw new Error(`${t('pdfExtract.invalidRange')} (${end} > ${pageCount})`);
        }
        for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
          if (!seen.has(pageNumber)) {
            seen.add(pageNumber);
            out.push(pageNumber);
          }
        }
        continue;
      }

      if (!/^\d+$/.test(part)) {
        throw new Error(t('pdfExtract.invalidRange'));
      }
      const pageNumber = Number(part);
      if (pageNumber < 1 || pageNumber > pageCount) {
        throw new Error(`${t('pdfExtract.invalidRange')} (${pageNumber} > ${pageCount})`);
      }
      if (!seen.has(pageNumber)) {
        seen.add(pageNumber);
        out.push(pageNumber);
      }
    }

    if (!out.length) {
      throw new Error(t('pdfExtract.needPages'));
    }
    return out;
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

  $effect(() => {
    if (!sourceBuffer || totalPages <= 0) {
      selectedPages = [];
      return;
    }
    try {
      selectedPages = parsePageRangeSpec(pageRange, totalPages);
      error = '';
    } catch (err) {
      selectedPages = [];
      if (String(pageRange || '').trim()) {
        error = err?.message || t('pdfExtract.invalidRange');
      }
    }
  });

  onMount(async () => {
    const mod = await import('pdf-lib');
    PDFDocumentRef = mod.PDFDocument;
    pdfReady = true;
  });

  function clearFile() {
    sourceFile = null;
    sourceBuffer = null;
    totalPages = 0;
    outputBlob = null;
    outputName = 'extracted-pages.pdf';
    selectedPages = [];
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
    pageRange = pageRange.trim() ? pageRange : '1';
    const base = f.name.replace(/\.pdf$/i, '') || 'document';
    outputName = `${base}-extract.pdf`;
  }

  async function runExtract() {
    if (!PDFDocumentRef || !sourceBuffer) {
      error = t('pdfExtract.needFile');
      return;
    }

    let pageNumbers;
    try {
      pageNumbers = parsePageRangeSpec(pageRange, totalPages);
    } catch (err) {
      error = err?.message || t('pdfExtract.invalidRange');
      return;
    }

    processing = true;
    progressLabel = t('common.processing');
    error = '';
    outputBlob = null;

    try {
      const sourceDoc = await PDFDocumentRef.load(sourceBuffer.slice(0), { updateMetadata: false });
      const outDoc = await PDFDocumentRef.create();
      const copiedPages = await outDoc.copyPages(
        sourceDoc,
        pageNumbers.map((pageNumber) => pageNumber - 1),
      );
      for (const copiedPage of copiedPages) {
        outDoc.addPage(copiedPage);
      }
      const bytes = await outDoc.save();
      outputBlob = new Blob([bytes], { type: 'application/pdf' });
      progressLabel = t('pdfExtract.done');
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
  <ToolPageHeader titleKey="pdfExtract.title" descKey="pdfExtract.desc" />

  <section class="mb-4">
    <FileDropZone
      accept={ACCEPT_PDF}
      multiple={false}
      onFilesAdd={handleFiles}
      disabled={!pdfReady}
      hintKey={pdfReady ? 'pdfExtract.uploadHint' : 'pdfViewer.loadingDocument'}
      formatsKey=""
      selectedName={sourceFile?.name ?? ''}
      onClear={clearFile}
      showClear={!!sourceFile}
      idPrefix="pdf-extract"
    />
  </section>

  <section class="card preset-outlined-surface-200-800 p-4 mb-4">
    <div class="extract-toolbar">
      <label class="range-field" for="pdf-extract-pages">
        <span class="range-label">{t('pdfExtract.pageRange')}</span>
        <input
          id="pdf-extract-pages"
          class="input preset-outlined-surface-200-800"
          type="text"
          bind:value={pageRange}
          placeholder={t('pdfExtract.pageRangePlaceholder')}
          disabled={!sourceBuffer || processing}
        />
      </label>
      <div class="extract-actions">
        <button
          type="button"
          class="btn btn-sm preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={runExtract}
          disabled={!sourceBuffer || processing}
        >
          {processing ? t('common.processing') : t('pdfExtract.run')}
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
    <p class="range-hint text-xs text-surface-500-500 m-0">{t('pdfExtract.pageRangeHint')}</p>

    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">{t('pdfViewer.currentFile')}</span>
        <span class="summary-value">{sourceFile?.name || '—'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">{t('pdfExtract.totalPages')}</span>
        <span class="summary-value">{totalPages || '—'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">{t('pdfExtract.selectedPages')}</span>
        <span class="summary-value">{selectedPages.length ? selectedPages.join(', ') : '—'}</span>
      </div>
      {#if outputBlob}
        <div class="summary-item">
          <span class="summary-label">{t('pdfExtract.outputPages')}</span>
          <span class="summary-value">{selectedPages.length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{t('pdfExtract.outputSize')}</span>
          <span class="summary-value">{formatFileSize(outputBlob.size)}</span>
        </div>
      {/if}
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
  .extract-toolbar {
    display: flex;
    gap: 1rem;
    align-items: end;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }
  .range-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: min(100%, 360px);
    flex: 1;
  }
  .range-label,
  .summary-label {
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
    text-transform: uppercase;
  }
  .extract-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .range-hint {
    margin-bottom: 1rem;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
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
</style>

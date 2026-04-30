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
  import {
    URL_SYNC_DEBOUNCE_MS,
    hasUrlSearchParams,
    replaceUrlSearchIfChanged,
    searchStringToParams,
  } from '$lib/urlToolSync.js';
  import { buildPdfExtractQuery, parsePdfExtractQuery } from '$lib/urlParams/pdfExtractQuery.js';

  let sourceFile = $state(/** @type {File | null} */ (null));
  let sourceBuffer = $state(/** @type {ArrayBuffer | null} */ (null));
  let totalPages = $state(0);
  let pageRange = $state('');
  let splitPages = $state(/** @type {number[]} */ ([]));
  let outputBlob = $state(/** @type {Blob | null} */ (null));
  let outputName = $state('split-pages.zip');
  let processing = $state(false);
  let error = $state('');
  let progressLabel = $state('');
  let PDFDocumentRef = null;

  function parsePageRangeSpec(spec, pageCount) {
    const raw = String(spec || '').trim();
    if (!raw) {
      return Array.from({ length: pageCount }, (_, idx) => idx + 1);
    }

    const out = [];
    const seen = new Set();
    for (const rawPart of raw.split(',')) {
      const part = rawPart.trim();
      if (!part) continue;

      const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        if (start < 1 || end < 1 || start > end || end > pageCount) {
          throw new Error(t('pdfSplit.invalidRange'));
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
        throw new Error(t('pdfSplit.invalidRange'));
      }
      const pageNumber = Number(part);
      if (pageNumber < 1 || pageNumber > pageCount) {
        throw new Error(t('pdfSplit.invalidRange'));
      }
      if (!seen.has(pageNumber)) {
        seen.add(pageNumber);
        out.push(pageNumber);
      }
    }

    if (!out.length) {
      throw new Error(t('pdfSplit.invalidRange'));
    }
    return out;
  }

  async function resolveSplitPages(buffer, pages) {
    const pdfDoc = await PDFDocumentRef.load(buffer, { updateMetadata: false });
    const total = pdfDoc.getPageCount();
    return {
      totalPages: total,
      splitPages: parsePageRangeSpec(pages, total),
    };
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
        const next = await resolveSplitPages(buffer, pages);
        if (!active) return;
        totalPages = next.totalPages;
        splitPages = next.splitPages;
        error = '';
      } catch (err) {
        if (!active) return;
        splitPages = [];
        totalPages = 0;
        if (String(pages || '').trim()) {
          error = err?.message || t('pdfSplit.invalidRange');
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
    const base = f.name.replace(/\.pdf$/i, '') || 'document';
    outputName = `${base}-split.zip`;
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
      const selectedPages = parsePageRangeSpec(String(pageRange || '').trim(), sourceDoc.getPageCount());
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
      hintKey="pdfSplit.uploadHint"
      formatsKey=""
      selectedName={sourceFile?.name ?? ''}
      onClear={clearFile}
      showClear={!!sourceFile}
      idPrefix="pdf-split"
    />
  </section>

  <section class="card preset-outlined-surface-200-800 p-4 mb-4">
    <div class="split-toolbar">
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
      <div class="split-actions">
        <button
          type="button"
          class="btn btn-sm preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={runSplit}
          disabled={!sourceBuffer || processing}
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
    <p class="range-hint text-xs text-surface-500-500 m-0">{t('pdfSplit.pageRangeHint')}</p>

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
        <span class="summary-value">{splitPages.length ? splitPages.join(', ') : '—'}</span>
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
  .split-toolbar {
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
  .split-actions {
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

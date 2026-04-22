<script>
  /**
   * 表格预览与格式转换 - CSV, TSV, XLSX, JSON
   */
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { URL_SYNC_DEBOUNCE_MS, replaceUrlSearchIfChanged } from '$lib/urlToolSync.js';
  import { buildTableFormatQuery } from '$lib/urlParams/tableFormatQuery.js';
  import { t } from '$lib/i18n.js';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import { getLogicalPath } from '$lib/localePath.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import { parseTableFile, tableToBlob, FORMATS } from '$lib/tableTools.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';

  /** 侧栏 #table-preview / #table-convert 与页面锚点同步滚动 */
  $effect(() => {
    if (!browser) return;
    if (getLogicalPath($page.url.pathname) !== '/table') return;
    const hash = $page.url.hash || '';
    queueMicrotask(() => {
      if (hash === '#table-convert') {
        document.getElementById('table-convert')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.getElementById('table-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const ROW_PAGE_SIZE = 200;
  const COL_PAGE_SIZE = 30;

  let table = $state(null);
  let selectedSheetIndex = $state(0);
  let rowPage = $state(0);
  let colPage = $state(0);
  let error = $state('');
  let outputFormat = $state('csv');
  let processing = $state(false);
  let fileName = $state('');
  /** 按全局列下标存储列宽（px）；未设置则随内容/布局自动 */
  let columnWidthsPx = $state(/** @type {Record<number, number>} */ ({}));

  /** 从 ?fmt= / ?format= / ?out= 同步导出格式，便于带参直链；goto 保留 # 锚点 */
  $effect(() => {
    if (!browser) return;
    const s = $page.url.search;
    if (s == null || s.length <= 1) return;
    const sp = new URLSearchParams(s.slice(1));
    const fmt = (sp.get('fmt') ?? sp.get('format') ?? sp.get('out') ?? '').toLowerCase();
    if (fmt && FORMATS.includes(fmt)) {
      outputFormat = fmt;
    }
  });

  $effect(() => {
    if (!browser) return;
    void outputFormat;
    const handle = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, buildTableFormatQuery(outputFormat));
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  });

  const currentSheet = $derived(table?.sheets?.[selectedSheetIndex] ?? { headers: [], rows: [] });
  const totalRows = $derived(currentSheet.rows?.length ?? 0);
  const totalCols = $derived(currentSheet.headers?.length ?? 0);
  const rowPageCount = $derived(Math.max(1, Math.ceil(totalRows / ROW_PAGE_SIZE)));
  const colPageCount = $derived(Math.max(1, Math.ceil(totalCols / COL_PAGE_SIZE)));
  const rowPageClamped = $derived(Math.min(rowPage, Math.max(0, rowPageCount - 1)));
  const colPageClamped = $derived(Math.min(colPage, Math.max(0, colPageCount - 1)));
  const pageHeaders = $derived(
    currentSheet.headers?.slice(colPageClamped * COL_PAGE_SIZE, (colPageClamped + 1) * COL_PAGE_SIZE) ?? []
  );
  const pageRows = $derived(
    currentSheet.rows?.slice(rowPageClamped * ROW_PAGE_SIZE, (rowPageClamped + 1) * ROW_PAGE_SIZE) ?? []
  );
  const rowStart = $derived(rowPageClamped * ROW_PAGE_SIZE + 1);
  const rowEnd = $derived(Math.min((rowPageClamped + 1) * ROW_PAGE_SIZE, totalRows));
  const colStart = $derived(colPageClamped * COL_PAGE_SIZE + 1);
  const colEnd = $derived(Math.min((colPageClamped + 1) * COL_PAGE_SIZE, totalCols));

  $effect(() => {
    void table;
    void selectedSheetIndex;
    void outputFormat;
    void fileName;
    void $page.url.hash;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.table',
      getParams: () => ({
        currentUrl: get(page).url.href,
        section: get(page).url.hash || '#table-preview',
        outputFormat,
        fileName: fileName || '—',
        rows: String(totalRows),
        cols: String(totalCols),
      }),
    });
  });

  const ACCEPT = '.csv,.tsv,.xlsx,.xls,application/json,text/csv,text/tab-separated-values';

  /**
   * @param {number} pageColIndex 当前页内列下标（0..pageHeaders.length-1）
   * @returns {number} 全局列下标
   */
  function absColIndex(pageColIndex) {
    return colPageClamped * COL_PAGE_SIZE + pageColIndex;
  }

  /** @param {PointerEvent} e */
  function beginColResize(e, pageColIndex) {
    e.preventDefault();
    e.stopPropagation();
    const logical = absColIndex(pageColIndex);
    const t = e.currentTarget;
    const th = t instanceof Element ? t.closest('th') : null;
    if (!(th instanceof HTMLElement)) return;
    const startW = columnWidthsPx[logical] ?? th.getBoundingClientRect().width;
    const startX = e.clientX;

    function onMove(ev) {
      const nw = Math.max(40, Math.round(startW + (ev.clientX - startX)));
      columnWidthsPx = { ...columnWidthsPx, [logical]: nw };
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.style.cursor = '';
      document.documentElement.style.userSelect = '';
    }
    document.documentElement.style.cursor = 'col-resize';
    document.documentElement.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function resetColumnWidths() {
    columnWidthsPx = {};
  }

  async function handleFile(file) {
    if (!file) return;
    error = '';
    processing = true;
    try {
      const result = await parseTableFile(file);
      table = result;
      selectedSheetIndex = 0;
      rowPage = 0;
      colPage = 0;
      columnWidthsPx = {};
      fileName = file.name.replace(/\.[^.]+$/, '') || 'table';
    } catch (e) {
      error = e.message || 'Parse failed';
      table = null;
    } finally {
      processing = false;
    }
  }

  function handleFiles(files) {
    const f = files?.[0];
    if (f && /\.(csv|tsv|xlsx|xls|json)$/i.test(f.name)) handleFile(f);
  }

  function download() {
    if (!table) return;
    const ext = outputFormat === 'tsv' ? 'tsv' : outputFormat;
    const blob = tableToBlob(table, outputFormat, selectedSheetIndex);
    const safeName = (currentSheet.name || '').replace(/[/\\?*:]/g, '_');
    const suffix = table.sheets?.length > 1 && outputFormat !== 'xlsx' && safeName ? `-${safeName}` : '';
    downloadBlob(blob, `${fileName}${suffix}.${ext}`);
  }

  function clear() {
    table = null;
    error = '';
    fileName = '';
    columnWidthsPx = {};
  }
</script>

<div class="workspace-content workspace-content-wide">
  <ToolPageHeader titleKey="tableTools.title" descKey="tableTools.desc" />

  <section class="mb-4 scroll-mt-4" id="table-preview">
    <FileDropZone
      accept={ACCEPT}
      multiple={false}
      onFilesAdd={handleFiles}
      hintKey="tableTools.uploadHint"
      formatsKey=""
      selectedName={table ? fileName + (table.sheets?.length > 1 ? ` (${table.sheets.length} sheets)` : '') : ''}
      onClear={clear}
      showClear={!!table}
      idPrefix="table"
    />
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if processing}
    <p class="text-sm text-surface-600-400 mb-4">{t('common.processing')}</p>
  {/if}

  {#if table}
    {#if table.sheets?.length > 1}
      <section class="mb-3 flex flex-wrap gap-1">
        {#each table.sheets as sheet, i}
          <button
            type="button"
            class="btn btn-sm {selectedSheetIndex === i ? 'preset-filled-primary-500' : 'preset-outlined-surface-200-800'}"
            onclick={() => {
              selectedSheetIndex = i;
              rowPage = 0;
              colPage = 0;
              columnWidthsPx = {};
            }}
          >
            {sheet.name}
          </button>
        {/each}
      </section>
    {/if}

    <section class="mb-4 scroll-mt-4" id="table-convert">
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <span class="text-sm font-medium">{t('tableTools.convertTo')}</span>
        {#each FORMATS as fmt}
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" bind:group={outputFormat} value={fmt} class="radio" />
            <span>{fmt.toUpperCase()}</span>
          </label>
        {/each}
        <button
          type="button"
          class="btn btn-sm preset-filled-primary-500"
          onclick={download}
        >
          {t('tableTools.download')}
        </button>
      </div>
    </section>

    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-2 border-b border-surface-200-800 flex flex-wrap justify-between items-center gap-2">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <span class="text-sm text-surface-600-400">
            {totalCols} {t('tableTools.columns')} · {totalRows} {t('tableTools.rows')}
          </span>
          <button
            type="button"
            class="btn btn-sm preset-outlined-surface-200-800"
            onclick={resetColumnWidths}
            title={t('tableTools.resetColWidths')}
          >
            {t('tableTools.resetColWidths')}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-sm">
          {#if rowPageCount > 1}
            <span class="text-surface-600-400">{t('tableTools.rowsPage')}:</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="btn btn-sm preset-outlined-surface-200-800"
                disabled={rowPageClamped <= 0}
                onclick={() => (rowPage = Math.max(0, rowPage - 1))}
              >
                ←
              </button>
              <span class="px-2 text-surface-600-400 min-w-[120px] text-center">
                {rowStart}-{rowEnd} / {totalRows}
              </span>
              <button
                type="button"
                class="btn btn-sm preset-outlined-surface-200-800"
                disabled={rowPageClamped >= rowPageCount - 1}
                onclick={() => (rowPage = Math.min(rowPageCount - 1, rowPage + 1))}
              >
                →
              </button>
            </div>
          {/if}
          {#if colPageCount > 1}
            <span class="text-surface-600-400">{t('tableTools.colsPage')}:</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="btn btn-sm preset-outlined-surface-200-800"
                disabled={colPageClamped <= 0}
                onclick={() => (colPage = Math.max(0, colPage - 1))}
              >
                ←
              </button>
              <span class="px-2 text-surface-600-400 min-w-[100px] text-center">
                {colStart}-{colEnd} / {totalCols}
              </span>
              <button
                type="button"
                class="btn btn-sm preset-outlined-surface-200-800"
                disabled={colPageClamped >= colPageCount - 1}
                onclick={() => (colPage = Math.min(colPageCount - 1, colPage + 1))}
              >
                →
              </button>
            </div>
          {/if}
        </div>
      </div>
      <div class="overflow-auto max-h-[480px]">
        <table class="table-preview-scroll table table-sm text-sm border-collapse">
          <thead class="sticky top-0 bg-surface-100-900 z-10">
            <tr>
              {#each pageHeaders as h, i}
                {@const cw = columnWidthsPx[absColIndex(i)]}
                <th
                  class="table-preview-th p-0 border-b border-r border-surface-200-800 text-left font-medium last:border-r-0"
                  style={cw != null ? `width:${cw}px;min-width:${cw}px;max-width:${cw}px` : undefined}
                >
                  <div class="flex items-stretch min-h-9">
                    <span
                      class="table-preview-th-label flex-1 min-w-0 px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                      {h || `Col ${colStart + i}`}
                    </span>
                    <button
                      type="button"
                      class="table-col-resize"
                      aria-label={t('tableTools.colResizeHint')}
                      title={t('tableTools.colResizeHint')}
                      onpointerdown={(e) => beginColResize(e, i)}
                    ></button>
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each pageRows as row}
              {@const baseCol = colPageClamped * COL_PAGE_SIZE}
              <tr class="hover:bg-surface-100-900/50">
                {#each pageHeaders as _, i}
                  {@const cw = columnWidthsPx[absColIndex(i)]}
                  <td
                    class="table-preview-td p-2 border-b border-r border-surface-200-800/55 truncate last:border-r-0"
                    class:table-preview-td-fixed={cw != null}
                    style={cw != null ? `width:${cw}px;min-width:${cw}px;max-width:${cw}px` : undefined}
                    title={row[baseCol + i]}
                  >
                    {row[baseCol + i] ?? ''}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<style>
  /**
   * 不用 table-layout:fixed + w-full（会按容器总宽重分配各列）。
   * max-content 仅加宽被手动设定列，其余列仍按内容宽度，拖动单列不牵连其他列。
   */
  .table-preview-scroll {
    width: max-content;
    min-width: 100%;
    table-layout: auto;
  }

  .table-preview-th {
    position: relative;
    vertical-align: top;
  }

  .table-col-resize {
    flex-shrink: 0;
    width: 6px;
    margin: 0 -2px 0 0;
    padding: 0;
    border: none;
    cursor: col-resize;
    touch-action: none;
    align-self: stretch;
    background: transparent;
    transition: background-color 150ms ease;
  }

  .table-col-resize:hover:not(:disabled),
  .table-col-resize:active:not(:disabled) {
    background: var(--ccw-accent);
  }

  .table-preview-td-fixed {
    max-width: none;
  }
</style>

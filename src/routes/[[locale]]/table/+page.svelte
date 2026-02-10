<script>
  /**
   * 表格预览与格式转换 - CSV, TSV, XLSX, JSON
   */
  import { t } from '$lib/i18n.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import { parseTableFile, tableToBlob, FORMATS } from '$lib/tableTools.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';

  const ROW_PAGE_SIZE = 200;
  const COL_PAGE_SIZE = 30;

  let table = $state(null);
  let selectedSheetIndex = $state(0);
  let rowPage = $state(0);
  let colPage = $state(0);
  let error = $state('');
  let dropActive = $state(false);
  let inputRef = $state(null);
  let outputFormat = $state('csv');
  let processing = $state(false);
  let fileName = $state('');

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

  const ACCEPT = '.csv,.tsv,.xlsx,.xls,application/json,text/csv,text/tab-separated-values';

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
      fileName = file.name.replace(/\.[^.]+$/, '') || 'table';
    } catch (e) {
      error = e.message || 'Parse failed';
      table = null;
    } finally {
      processing = false;
    }
  }

  function handleInputChange(e) {
    const f = e.target?.files?.[0];
    if (f) handleFile(f);
    if (inputRef) inputRef.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    const f = e.dataTransfer?.files?.[0];
    if (f && /\.(csv|tsv|xlsx|xls|json)$/i.test(f.name)) handleFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
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
    if (inputRef) inputRef.value = '';
  }
</script>

<main class="p-8 max-w-6xl mx-auto">
  <ToolPageHeader titleKey="tableTools.title" descKey="tableTools.desc" />

  <section class="mb-4">
    <p class="text-sm font-medium block mb-2 m-0">{t('tableTools.input')}</p>
    <input
      type="file"
      accept={ACCEPT}
      class="hidden"
      bind:this={inputRef}
      onchange={handleInputChange}
    />
    <div class="flex gap-2 mb-3">
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={() => inputRef?.click()}>
        {t('tableTools.upload')}
      </button>
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={clear}>
        {t('common.clearAll')}
      </button>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="card preset-outlined-surface-200-800 p-4 mb-2 cursor-pointer transition {dropActive ? 'border-primary-500 bg-primary-500/5' : ''}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => inputRef?.click()}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
    >
      <p class="text-surface-600-400 text-sm m-0">{t('tableTools.uploadHint')}</p>
    </div>
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
            onclick={() => { selectedSheetIndex = i; rowPage = 0; colPage = 0; }}
          >
            {sheet.name}
          </button>
        {/each}
      </section>
    {/if}

    <section class="mb-4">
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
        <span class="text-sm text-surface-600-400">
          {totalCols} {t('tableTools.columns')} · {totalRows} {t('tableTools.rows')}
        </span>
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
        <table class="table table-sm w-full text-sm">
          <thead class="sticky top-0 bg-surface-100-900 z-10">
            <tr>
              {#each pageHeaders as h, i}
                <th class="p-2 border-b border-surface-200-800 text-left font-medium whitespace-nowrap">
                  {h || `Col ${colStart + i}`}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each pageRows as row}
              {@const baseCol = colPageClamped * COL_PAGE_SIZE}
              <tr class="hover:bg-surface-100-900/50">
                {#each pageHeaders as _, i}
                  <td class="p-2 border-b border-surface-200-800/50 max-w-[200px] truncate" title={row[baseCol + i]}>
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
</main>

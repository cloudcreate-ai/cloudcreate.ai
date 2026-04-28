<script>
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { t } from '$lib/i18n.js';
  import {
    URL_SYNC_DEBOUNCE_MS,
    hasUrlSearchParams,
    replaceUrlSearchIfChanged,
    searchStringToParams,
  } from '$lib/urlToolSync.js';
  import {
    buildWorkflowSimpleQuery,
    parseWorkflowSimpleQuery,
  } from '$lib/urlParams/workflowSimpleQuery.js';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import { localePath } from '$lib/localePath.js';
  import { validateWorkflow, runWorkflow } from '$lib/workflow/runner.js';
  import { buildGraphFromSteps } from '$lib/workflow/buildGraph.js';
  import { DEFAULT_STEP_PARAMS } from '$lib/workflow/stepUtils.js';
  import {
    buildFileItem,
    downloadBlob,
    downloadAsZip,
    computeTotalStats,
  } from '$lib/batchHelpers.js';

  const VALID_STEP_TYPES = ['input', 'output', 'resize', 'crop'];
  import { formatFileSize, formatLabelFromFilename } from '$lib/imageProcessor.js';
  import StepBar from '$lib/components/workflow/StepBar.svelte';
  import StepDetailPanel from '$lib/components/workflow/StepDetailPanel.svelte';
  import CropModal from '$lib/components/workflow/CropModal.svelte';
  import ToolPageFavoriteButton from '$lib/components/ToolPageFavoriteButton.svelte';

  const DEFAULT_STEPS = [
    { type: 'input' },
    { type: 'output', params: { targetFormat: '', quality: 75 } },
  ];

  let steps = $state([...DEFAULT_STEPS]);
  let selectedStepIndex = $state(null);
  let workflowName = $state('');
  let workflowDescription = $state('');

  let lastWorkflowSearch = '';

  const advancedHref = $derived(localePath($page.url.pathname, '/workflow/advanced'));

  $effect(() => {
    void steps;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.workflow',
      getParams: () => ({
        currentUrl: get(page).url.href,
        stepCount: String(steps.length),
      }),
    });
  });

  $effect(() => {
    if (!browser) return;
    void $page.url.search;
    const s = $page.url.search;
    if (s === lastWorkflowSearch) return;
    lastWorkflowSearch = s;
    if (!hasUrlSearchParams(s)) return;
    const pq = parseWorkflowSimpleQuery(searchStringToParams(s));
    if (pq.workflowName !== undefined) workflowName = pq.workflowName;
    if (pq.workflowDescription !== undefined) workflowDescription = pq.workflowDescription;
  });

  $effect(() => {
    if (!browser) return;
    void workflowName;
    void workflowDescription;
    const t = setTimeout(() => {
      replaceUrlSearchIfChanged(page, goto, buildWorkflowSimpleQuery(workflowName, workflowDescription));
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(t);
  });

  function addStep(index, type) {
    const params = { ...DEFAULT_STEP_PARAMS[type] };
    const next = [...steps];
    next.splice(index, 0, { type, params });
    steps = next;
    selectedStepIndex = index;
  }

  function removeStep(index) {
    const s = steps[index];
    if (s?.type !== 'resize' && s?.type !== 'crop') return;
    const next = steps.filter((_, i) => i !== index);
    steps = next;
    if (selectedStepIndex === index) selectedStepIndex = null;
    else if (selectedStepIndex != null && selectedStepIndex > index) selectedStepIndex--;
  }

  function updateStepParams(index, params) {
    steps = steps.map((s, i) =>
      i === index ? { ...s, params: { ...s.params, ...params } } : s
    );
  }

  function getGraph() {
    return buildGraphFromSteps(steps);
  }

  /** 构建符合 workflowLoader 格式的 JSON 对象 */
  function getWorkflowJson() {
    return {
      version: 1,
      name: workflowName || 'workflow',
      description: workflowDescription || '',
      steps: steps.map((s) => ({ type: s.type, ...(s.params && Object.keys(s.params).length ? { params: s.params } : {}) })),
    };
  }

  /** 下载当前工作流为 JSON 文件 */
  function downloadJson() {
    const json = JSON.stringify(getWorkflowJson(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const name = (workflowName || 'workflow').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    downloadBlob(blob, name);
  }

  /** 校验并解析导入的 steps，返回 { valid, steps } 或 { valid: false, error } */
  function parseImportedWorkflow(raw) {
    let obj;
    try {
      obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {
      return { valid: false, error: 'Invalid JSON' };
    }
    const s = obj?.steps;
    if (!Array.isArray(s) || s.length < 2) {
      return { valid: false, error: t('workflow.importError') };
    }
    const hasInput = s.some((x) => x?.type === 'input');
    const hasOutput = s.some((x) => x?.type === 'output');
    if (!hasInput || !hasOutput) {
      return { valid: false, error: t('workflow.importError') };
    }
    const filtered = s.filter((x) => x && VALID_STEP_TYPES.includes(x.type));
    if (filtered.length !== s.length) {
      return { valid: false, error: t('workflow.importError') };
    }
    const normalized = filtered.map((x) => {
      if (x.type === 'input') return { type: 'input' };
      const def = x.type === 'output' ? { targetFormat: '', quality: 75 } : DEFAULT_STEP_PARAMS[x.type] || {};
      return { type: x.type, params: { ...def, ...(x.params || {}) } };
    });
    if (normalized[0].type !== 'input') normalized.unshift({ type: 'input' });
    if (normalized[normalized.length - 1].type !== 'output') normalized.push({ type: 'output', params: { targetFormat: '', quality: 75 } });
    return { valid: true, steps: normalized, name: obj.name || '', description: obj.description || '' };
  }

  let showViewJsonModal = $state(false);
  let showImportModal = $state(false);
  let importInputRef = $state(null);
  let importPasteText = $state('');
  let importErrorMsg = $state('');

  function openViewJson() {
    showViewJsonModal = true;
  }

  function closeViewJson() {
    showViewJsonModal = false;
  }

  function openImport() {
    importPasteText = '';
    importErrorMsg = '';
    showImportModal = true;
  }

  function closeImport() {
    showImportModal = false;
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const result = parseImportedWorkflow(r.result);
      if (result.valid) {
        steps = result.steps;
        workflowName = result.name || '';
        workflowDescription = result.description || '';
        selectedStepIndex = null;
        closeImport();
      } else {
        importErrorMsg = result.error;
      }
    };
    r.readAsText(file);
    e.target.value = '';
  }

  function handleImportPaste() {
    const result = parseImportedWorkflow(importPasteText);
    if (result.valid) {
      steps = result.steps;
      workflowName = result.name || '';
      workflowDescription = result.description || '';
      selectedStepIndex = null;
      closeImport();
    } else {
      importErrorMsg = result.error;
    }
  }

  let files = $state([]);
  let processing = $state(false);
  let runResults = $state([]);
  let error = $state('');
  let cropRequest = $state(null);

  const waitingStepIndex = $derived(
    processing && cropRequest ? steps.findIndex((s) => s.type === 'crop') : null
  );
  const executingStepIndex = $derived(waitingStepIndex != null ? waitingStepIndex : null);

  function createRequestCropRegion() {
    return (imageData, params) =>
      new Promise((resolve, reject) => {
        cropRequest = {
          imageData,
          params,
          resolve: (r) => {
            cropRequest = null;
            resolve(r);
          },
          reject: (e) => {
            cropRequest = null;
            reject(e);
          },
        };
      });
  }

  async function run() {
    const graph = getGraph();
    const validation = validateWorkflow(graph);
    if (!validation.valid) {
      error = validation.error;
      return;
    }
    if (files.length === 0) {
      error = t('common.errAddOne');
      return;
    }
    error = '';
    processing = true;
    runResults = [];
    try {
      const results = await runWorkflow(
        graph,
        files.map((f) => f.file),
        { requestCropRegion: createRequestCropRegion(), onProgress() {} }
      );
      runResults = results;
    } catch (e) {
      error = e.message || 'Run failed';
    } finally {
      processing = false;
    }
  }

  async function addFiles(fileList) {
    for (const f of fileList) {
      const item = await buildFileItem(f, Date.now() + Math.random());
      files = [...files, item];
    }
  }

  function clearFiles() {
    files = [];
    runResults = [];
  }

  function downloadSingle(item) {
    if (item.blob && item.outputName) downloadBlob(item.blob, item.outputName);
  }

  async function downloadAll() {
    const list = runResults.filter((r) => r.blob);
    if (list.length === 0) return;
    await downloadAsZip(
      list.map((r) => ({ blob: r.blob, outputName: r.outputName })),
      'workflow-output.zip'
    );
  }

  const mergedItems = $derived(
    files.map((f, i) => {
      const r = runResults[i];
      const status = r?.error ? 'error' : r?.blob ? 'done' : processing ? 'processing' : 'pending';
      const newSize = r?.blob?.size;
      const ratio =
        f.size > 0 && newSize != null ? (1 - newSize / f.size) * 100 : null;
      return {
        ...f,
        status,
        error: r?.error,
        blob: r?.blob,
        outputName: r?.outputName,
        newSize,
        newWidth: r?.width,
        newHeight: r?.height,
        ratio,
      };
    })
  );

  const totalStats = $derived(computeTotalStats(mergedItems));

  let previewItem = $state(null);
  let previewBlobUrl = $state(null);
  let comparePos = $state(50);

  function openPreview(item) {
    if (item.status !== 'done' || !item.blob) return;
    previewBlobUrl?.startsWith('blob:') && URL.revokeObjectURL(previewBlobUrl);
    previewItem = item;
    previewBlobUrl = URL.createObjectURL(item.blob);
    comparePos = 50;
  }

  function closePreview() {
    if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl);
    previewItem = null;
    previewBlobUrl = null;
  }

</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closePreview(); }} />
<input
  type="file"
  accept=".json,application/json"
  class="hidden"
  bind:this={importInputRef}
  onchange={handleImportFile}
/>
<div class="workspace-layout-operation">
<main class="workflow-simple">
  <header class="workflow-header">
    <h1 class="text-xl font-semibold m-0">{t('workflow.title')}</h1>
    <div class="header-actions">
      <ToolPageFavoriteButton />
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={openViewJson}>
        {t('workflow.viewJson')}
      </button>
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={downloadJson}>
        {t('workflow.downloadJson')}
      </button>
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={openImport}>
        {t('workflow.importJson')}
      </button>
      <a href={advancedHref} class="text-sm text-surface-600-400 hover:text-primary-500">
        {t('workflow.advancedMode')}
      </a>
    </div>
  </header>

  <section class="workflow-step-preview">
    <div class="step-bar-row">
      <StepBar
        steps={steps}
        selectedIndex={selectedStepIndex}
        executingStepIndex={executingStepIndex}
        waitingStepIndex={waitingStepIndex}
        onSelect={(i) => (selectedStepIndex = i)}
        onAddStep={addStep}
        onRemoveStep={removeStep}
      />
      <div class="run-controls">
        <button class="btn preset-filled-primary-500" onclick={run} disabled={processing}>
          {processing ? t('common.processing') : t('workflow.run')}
        </button>
        {#if waitingStepIndex != null}
          <p class="run-hint text-warning-500">{t('workflow.waitingCrop')}</p>
        {/if}
      </div>
    </div>
  </section>

  <section class="workflow-detail">
    <StepDetailPanel
      steps={steps}
      selectedStepIndex={selectedStepIndex}
      onParamsChange={updateStepParams}
      files={files}
      onFilesAdd={addFiles}
      onClearFiles={clearFiles}
    />
  </section>

  <section class="workflow-run-section">
    <div class="run-results">
      <h3 class="text-sm font-medium mb-2">{t('common.result')}</h3>
      {#if error}
        <p class="text-error-500 text-sm">{error}</p>
      {:else if files.length === 0}
        <p class="text-surface-600-400 text-sm">{t('workflow.runHintSelectInStep')}</p>
      {:else}
        <div class="results-table-wrap">
          {#if totalStats}
            <div class="results-summary">
              {t('common.total')}: {formatFileSize(totalStats.totalOriginal)} → {formatFileSize(totalStats.totalNew)}
              <span
                class={totalStats.ratio > 0 ? 'text-success-500' : totalStats.ratio < 0 ? 'text-warning-500' : 'text-surface-600-400'}
              >
                ({totalStats.ratio > 0
                  ? totalStats.ratio.toFixed(1) + '% ' + t('common.smaller')
                  : totalStats.ratio < 0
                    ? Math.abs(totalStats.ratio).toFixed(1) + '% ' + t('common.larger')
                    : t('common.same')})
              </span>
            </div>
          {/if}
          <button
            class="btn btn-sm preset-outlined-surface-200-800 mb-2"
            onclick={downloadAll}
            disabled={!mergedItems.some((x) => x.blob)}
          >
            {t('common.downloadAll')}
          </button>
          <div class="overflow-x-auto">
            <table class="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('common.preview')}</th>
                  <th>{t('common.filename')}</th>
                  <th>{t('common.format')}</th>
                  <th>{t('common.size')}</th>
                  <th>{t('common.dimensions')}</th>
                  <th>{t('common.result')}</th>
                </tr>
              </thead>
              <tbody>
                {#each mergedItems as item, i}
                  <tr>
                    <td>{i + 1}</td>
                    <td>
                      <img
                        src={item.previewUrl}
                        alt=""
                        class="result-preview-thumb"
                      />
                    </td>
                    <td class="truncate min-w-[220px]" title={item.name}>{item.name}</td>
                    <td>{item.format}</td>
                    <td>{formatFileSize(item.size)}</td>
                    <td>{item.width}×{item.height}</td>
                    <td>
                      {#if item.status === 'processing'}
                        <span class="text-surface-600-400">{t('common.processing')}</span>
                      {:else if item.status === 'error'}
                        <span class="text-error-500">{item.error}</span>
                      {:else if item.status === 'done'}
                        <div class="result-cell">
                          <div class="text-surface-600-400 text-xs">
                            {formatLabelFromFilename(item.outputName)} · {formatFileSize(item.size)} → {formatFileSize(item.newSize)}
                          </div>
                          <div
                            class={item.ratio > 0 ? 'text-success-500 text-xs' : item.ratio < 0 ? 'text-warning-500 text-xs' : 'text-surface-600-400 text-xs'}
                          >
                            {item.ratio > 0
                              ? item.ratio.toFixed(1) + '% ' + t('common.smaller')
                              : item.ratio < 0
                                ? Math.abs(item.ratio).toFixed(1) + '% ' + t('common.larger')
                                : t('common.sameSize')}
                          </div>
                          <div class="flex gap-1 mt-1">
                            <button
                              class="btn btn-sm preset-outlined-surface-200-800"
                              onclick={() => openPreview(item)}
                            >
                              {t('common.preview')}
                            </button>
                            <button
                              class="btn btn-sm preset-outlined-surface-200-800"
                              onclick={() => downloadSingle(item)}
                            >
                              {t('common.download')}
                            </button>
                          </div>
                        </div>
                      {:else}
                        <span class="text-surface-600-400">—</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </section>

  {#if cropRequest}
    <CropModal request={cropRequest} />
  {/if}

  {#if showViewJsonModal}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('workflow.jsonModalTitle')}
      tabindex="-1"
      onclick={(e) => e.target === e.currentTarget && closeViewJson()}
      onkeydown={(e) => e.key === 'Escape' && closeViewJson()}
    >
      <div class="card preset-filled-surface-50-950 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-4 border-b border-surface-200-800">
          <h3 class="font-medium m-0">{t('workflow.jsonModalTitle')}</h3>
          <div class="flex gap-2">
            <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={() => navigator.clipboard?.writeText(JSON.stringify(getWorkflowJson(), null, 2))}>
              Copy
            </button>
            <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={closeViewJson} aria-label={t('common.close')}>
              {t('common.close')}
            </button>
          </div>
        </div>
        <pre class="flex-1 overflow-auto p-4 text-sm font-mono whitespace-pre-wrap break-all">{JSON.stringify(getWorkflowJson(), null, 2)}</pre>
      </div>
    </div>
  {/if}

  {#if showImportModal}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('workflow.importJson')}
      tabindex="-1"
      onclick={(e) => e.target === e.currentTarget && closeImport()}
      onkeydown={(e) => e.key === 'Escape' && closeImport()}
    >
      <div class="card preset-filled-surface-50-950 max-w-xl w-full overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-4 border-b border-surface-200-800">
          <h3 class="font-medium m-0">{t('workflow.importJson')}</h3>
          <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={closeImport} aria-label={t('common.close')}>
            {t('common.close')}
          </button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <p class="text-sm text-surface-600-400 m-0">{t('workflow.importPasteHint')}</p>
          <button class="btn preset-outlined-surface-200-800 btn-sm self-start" onclick={() => importInputRef?.click()}>
            {t('workflow.load')}
          </button>
          <textarea
            class="input font-mono text-sm min-h-[120px]"
            placeholder={'{"version":1,"name":"...","steps":[...]}'}
            bind:value={importPasteText}
          ></textarea>
          {#if importErrorMsg}
            <p class="text-error-500 text-sm m-0">{importErrorMsg}</p>
          {/if}
          <div class="flex justify-end gap-2">
            <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={closeImport}>Cancel</button>
            <button class="btn preset-filled-primary-500 btn-sm" onclick={handleImportPaste} disabled={!importPasteText.trim()}>
              {t('workflow.import')}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if previewItem}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Preview comparison"
      tabindex="-1"
      onclick={(e) => e.target === e.currentTarget && closePreview()}
      onkeydown={(e) => e.key === 'Escape' && closePreview()}
    >
      <div class="card preset-filled-surface-50-950 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-4 border-b border-surface-200-800">
          <h3 class="font-medium m-0">{previewItem.name}</h3>
          <button onclick={closePreview} class="btn preset-outlined-surface-200-800 btn-sm" aria-label={t('common.close')}>
            {t('common.close')}
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="flex flex-col items-center">
              <p class="text-sm text-surface-600-400 mb-2">
                {t('common.original')} · {formatFileSize(previewItem.size)}{#if previewItem.width != null && previewItem.height != null} · {previewItem.width}×{previewItem.height}{/if}
              </p>
              <img
                src={previewItem.previewUrl}
                alt="Original"
                class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
              />
            </div>
            <div class="flex flex-col items-center">
              <p class="text-sm text-surface-600-400 mb-2">
                {t('common.result')} · {formatFileSize(previewItem.newSize)}{#if previewItem.newWidth != null && previewItem.newHeight != null} · {previewItem.newWidth}×{previewItem.newHeight}{/if}
              </p>
              <img
                src={previewBlobUrl}
                alt="Result"
                class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
              />
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-surface-600-400">{t('common.sliderCompare')}</span>
            <input
              type="range"
              min="0"
              max="100"
              bind:value={comparePos}
              class="input flex-1 max-w-xs"
            />
          </div>
          <div class="relative mt-2 rounded overflow-hidden border border-surface-200-800" style="aspect-ratio: 16/9; max-height: 40vh;">
            <img
              src={previewItem.previewUrl}
              alt="Original"
              class="absolute inset-0 w-full h-full object-contain"
            />
            <div class="absolute inset-0 overflow-hidden" style="clip-path: inset(0 {100 - comparePos}% 0 0);">
              <img
                src={previewBlobUrl}
                alt="Result"
                class="absolute inset-0 w-full h-full object-contain"
              />
            </div>
            <div
              class="absolute top-0 bottom-0 w-0.5 bg-primary-500 pointer-events-none"
              style="left: {comparePos}%;"
            ></div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>
</div>

<style>
  .workflow-simple {
    --workflow-width: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--workflow-width);
    margin: 0 auto;
    box-sizing: border-box;
  }
  .workflow-simple > header,
  .workflow-simple > section {
    width: 100%;
    max-width: var(--workflow-width);
    box-sizing: border-box;
  }
  .workflow-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-surface-200-800);
  }
  .workflow-header h1 {
    flex: 1;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .workflow-step-preview {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
    width: 100%;
  }
  .step-bar-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    width: 100%;
  }
  .run-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .run-hint {
    font-size: 0.8rem;
    margin: 0;
  }
  .workflow-detail {
    flex-shrink: 0;
    width: 100%;
  }
  .workflow-run-section {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1rem;
    flex: 1;
    width: 100%;
    min-width: 0;
  }
  .run-results {
    flex: 1;
    min-width: 0;
  }
  .results-table-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .results-summary {
    font-size: 0.875rem;
    color: var(--color-surface-600-400);
  }
  .results-table {
    width: 100%;
    font-size: 0.875rem;
    border-collapse: collapse;
  }
  .results-table th,
  .results-table td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--color-surface-200-800);
  }
  .results-table th {
    color: var(--color-surface-600-400);
    font-weight: 500;
  }
  .result-preview-thumb {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
  }
  .result-cell {
    min-width: 140px;
  }
</style>

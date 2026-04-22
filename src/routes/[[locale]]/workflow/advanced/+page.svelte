<script>
  import { SvelteFlow, Controls, Background, BackgroundVariant } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { afterNavigate } from '$app/navigation';
  import { t } from '$lib/i18n.js';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import { localePath } from '$lib/localePath.js';
  import { getNodeDef, getAllNodeDefs } from '$lib/workflow/registry.js';
  import { validateWorkflow, runWorkflow } from '$lib/workflow/runner.js';
  import { getPreset } from '$lib/workflow/presets.js';
  import {
    listWorkflows,
    saveWorkflow,
    loadWorkflow,
    getCurrentWorkflowId,
    setCurrentWorkflowId,
    exportWorkflow,
    importWorkflow,
  } from '$lib/workflowStorage.js';
  import { ACCEPT_IMAGES, filterImageFiles, buildFileItem, downloadBlob, downloadAsZip } from '$lib/batchHelpers.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import InputNode from '$lib/components/workflow/nodes/InputNode.svelte';
  import DecodeNode from '$lib/components/workflow/nodes/DecodeNode.svelte';
  import CropNode from '$lib/components/workflow/nodes/CropNode.svelte';
  import ResizeNode from '$lib/components/workflow/nodes/ResizeNode.svelte';
  import EncodeNode from '$lib/components/workflow/nodes/EncodeNode.svelte';
  import OutputNode from '$lib/components/workflow/nodes/OutputNode.svelte';
  import CropModal from '$lib/components/workflow/CropModal.svelte';
  import ToolPageFavoriteButton from '$lib/components/ToolPageFavoriteButton.svelte';

  const nodeTypes = {
    input: InputNode,
    decode: DecodeNode,
    crop: CropNode,
    resize: ResizeNode,
    encode: EncodeNode,
    output: OutputNode,
  };

  const workflowHref = $derived(localePath($page.url.pathname, '/workflow'));

  function toSvelteFlowNodes(nodes) {
    return (nodes || []).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 0, y: 0 },
      data: { params: n.params || {} },
    }));
  }

  function toWorkflowNodes(sfNodes) {
    return (sfNodes || []).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      params: n.data?.params || {},
    }));
  }

  function loadPreset(presetId) {
    const preset = getPreset(presetId);
    if (!preset) return;
    nodes = toSvelteFlowNodes(preset.nodes);
    edges = preset.edges || [];
  }

  function initFromPresetOrStorage() {
    try {
      const presetId = $page.url.searchParams.get('preset');
      if (presetId && getPreset(presetId)) {
        loadPreset(presetId);
        return;
      }
      const currentId = getCurrentWorkflowId();
      const loaded = currentId ? loadWorkflow(currentId) : null;
      if (loaded?.nodes?.length) {
        nodes = toSvelteFlowNodes(loaded.nodes);
        edges = loaded.edges || [];
      } else {
        loadPreset('compress');
      }
    } catch (e) {
      loadPreset('compress');
    }
  }

  let nodes = $state.raw(toSvelteFlowNodes(getPreset('compress').nodes));

  $effect(() => {
    void nodes;
    return registerAgentPrompt({
      templateKey: 'agentPrompt.workflowAdvanced',
      getParams: () => ({
        currentUrl: get(page).url.href,
        nodeCount: String((nodes || []).length),
      }),
    });
  });
  let edges = $state.raw(getPreset('compress').edges || []);

  $effect(() => {
    $page.url.search;
    initFromPresetOrStorage();
  });

  onMount(() => {
    initFromPresetOrStorage();
  });
  let selectedNodeId = $state(null);
  let selectedNode = $derived.by(() => {
    const id = selectedNodeId;
    if (!id) return null;
    return nodes.find((n) => n.id === id) || null;
  });
  let files = $state([]);
  let processing = $state(false);
  let runResults = $state([]);
  let error = $state('');
  let inputRef = $state(null);
  let cropRequest = $state(null);
  let workflowName = $state('');
  let savedWorkflows = $state(listWorkflows());
  let importInputRef = $state(null);

  function getGraph() {
    return {
      nodes: toWorkflowNodes(nodes),
      edges: [...edges],
    };
  }

  function doSave() {
    const graph = getGraph();
    const id = workflowName || `workflow-${Date.now()}`;
    if (saveWorkflow(id, graph, workflowName || id)) {
      setCurrentWorkflowId(id);
      savedWorkflows = listWorkflows();
    }
  }

  function doLoad(id) {
    const g = loadWorkflow(id);
    if (g?.nodes?.length) {
      nodes = toSvelteFlowNodes(g.nodes);
      edges = g.edges || [];
      setCurrentWorkflowId(id);
    }
  }

  function doExport() {
    const json = exportWorkflow(getGraph());
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `workflow-${Date.now()}.json`);
  }

  function doImport() {
    importInputRef?.click();
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const g = importWorkflow(reader.result);
      if (g?.nodes?.length) {
        nodes = toSvelteFlowNodes(g.nodes);
        edges = g.edges || [];
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function addNode(type) {
    const def = getNodeDef(type);
    if (!def) return;
    const id = `${type}-${Date.now()}`;
    const last = nodes[nodes.length - 1];
    const x = last?.position?.x ?? 0;
    const y = (last?.position?.y ?? 0) + 120;
    const params = {};
    for (const [k, v] of Object.entries(def.params || {})) {
      if (v.default !== undefined) params[k] = v.default;
    }
    nodes = [...nodes, { id, type, position: { x, y }, data: { params } }];
  }

  function updateNodeParams(nodeId, params) {
    nodes = nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, params } } : n));
  }

  function handleNodeClick(ev) {
    selectedNodeId = ev?.node?.id ?? ev?.detail?.node?.id ?? null;
  }

  function handlePaneClick() {
    selectedNodeId = null;
  }

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
        {
          requestCropRegion: createRequestCropRegion(),
          onProgress() {},
        }
      );
      runResults = results;
    } catch (e) {
      error = e.message || 'Run failed';
    } finally {
      processing = false;
    }
  }

  function handleFileInput(e) {
    const list = filterImageFiles(e.target.files);
    if (list.length === 0) return;
    addFiles(list);
    if (inputRef) inputRef.value = '';
  }

  async function addFiles(fileList) {
    for (const f of fileList) {
      const item = await buildFileItem(f, Date.now() + Math.random());
      files = [...files, item];
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const list = filterImageFiles(e.dataTransfer?.files);
    if (list.length) addFiles(list);
  }

  function handleDragOver(e) {
    e.preventDefault();
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
</script>

<div class="workspace-content">
<main class="workflow-editor">
  <header class="workflow-header">
    <a href={workflowHref} class="text-surface-600-400 text-sm no-underline hover:text-primary-500">← {t('workflow.simpleMode')}</a>
    <h1 class="text-xl font-semibold m-0">{t('workflow.title')}</h1>
    <div class="header-actions">
      <ToolPageFavoriteButton />
      <input
        type="text"
        class="input text-sm w-32"
        placeholder={t('workflow.workflowName')}
        bind:value={workflowName}
      />
      <select
        class="select preset-outlined-surface-200-800 text-sm"
        onchange={(e) => loadPreset(e.target.value)}
        aria-label="Preset"
      >
        <option value="compress">{t('workflow.presetCompress')}</option>
        <option value="resize">{t('workflow.presetResize')}</option>
        <option value="crop">{t('workflow.presetCrop')}</option>
      </select>
      <select
        class="select preset-outlined-surface-200-800 text-sm"
        onchange={(e) => { const v = e.target.value; if (v) doLoad(v); }}
        aria-label="Load"
      >
        <option value="">{t('workflow.load')}</option>
        {#each savedWorkflows as w}
          <option value={w.id}>{w.name}</option>
        {/each}
      </select>
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={doSave}>{t('workflow.save')}</button>
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={doExport}>{t('workflow.export')}</button>
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={doImport}>{t('workflow.import')}</button>
      <input
        type="file"
        accept=".json"
        class="hidden"
        bind:this={importInputRef}
        onchange={handleImportFile}
      />
      <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={run} disabled={processing}>
        {processing ? t('common.processing') : t('workflow.run')}
      </button>
    </div>
  </header>

  <div class="workflow-layout">
    <aside class="workflow-sidebar workflow-sidebar-left">
      <h3 class="sidebar-title">{t('workflow.addNode')}</h3>
      {#each getAllNodeDefs() as def}
        <button
          class="sidebar-node-btn"
          onclick={() => addNode(def.type)}
        >
          {def.label}
        </button>
      {/each}
    </aside>

    <div class="workflow-canvas-wrap">
      <SvelteFlow
        {nodes}
        {edges}
        {nodeTypes}
        fitView
        class="workflow-canvas"
        onnodeclick={handleNodeClick}
        onpaneclick={handlePaneClick}
        connectionMode="loose"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
      </SvelteFlow>
    </div>

    <aside class="workflow-sidebar workflow-sidebar-right">
      {#if selectedNode}
        <h3 class="sidebar-title">{getNodeDef(selectedNode.type)?.label ?? selectedNode.type}</h3>
        {#if selectedNode.type === 'encode'}
          <div class="param-group">
            <label for="param-format">{t('compress.outputFormat')}</label>
            <select
              id="param-format"
              class="select preset-outlined-surface-200-800 w-full"
              value={selectedNode.data?.params?.targetFormat ?? ''}
              onchange={(e) => updateNodeParams(selectedNode.id, { ...selectedNode.data?.params, targetFormat: e.target.value })}
            >
              <option value="">{t('common.sameAsOriginal')}</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
            </select>
          </div>
          <div class="param-group">
            <label for="param-quality">{t('common.quality')}</label>
            <input
              id="param-quality"
              type="number"
              min="1"
              max="100"
              class="input w-full"
              value={selectedNode.data?.params?.quality ?? 75}
              oninput={(e) => updateNodeParams(selectedNode.id, { ...selectedNode.data?.params, quality: Number(e.target.value) })}
            />
          </div>
        {:else if selectedNode.type === 'resize'}
          <div class="param-group">
            <label for="param-scaleMode">{t('resize.byPercent')}</label>
            <select
              id="param-scaleMode"
              class="select preset-outlined-surface-200-800 w-full"
              value={selectedNode.data?.params?.scaleMode ?? 'percent'}
              onchange={(e) => updateNodeParams(selectedNode.id, { ...selectedNode.data?.params, scaleMode: e.target.value })}
            >
              <option value="percent">{t('resize.byPercent')}</option>
              <option value="max">{t('resize.byMax')}</option>
              <option value="width">{t('resize.byWidth')}</option>
              <option value="height">{t('resize.byHeight')}</option>
              <option value="long">{t('resize.byLong')}</option>
              <option value="exact">{t('resize.byExact')}</option>
            </select>
          </div>
          <div class="param-group">
            <label for="param-scalePercent">{t('resize.scalePercent')}</label>
            <input
              id="param-scalePercent"
              type="number"
              min="1"
              max="200"
              class="input w-full"
              value={selectedNode.data?.params?.scalePercent ?? 50}
              oninput={(e) => updateNodeParams(selectedNode.id, { ...selectedNode.data?.params, scalePercent: Number(e.target.value) })}
            />
          </div>
        {:else}
          <p class="text-sm text-surface-600-400">{t('workflow.noParams')}</p>
        {/if}
      {:else}
        <p class="text-sm text-surface-600-400">{t('workflow.selectNode')}</p>
      {/if}
    </aside>
  </div>

  <section class="workflow-run-section">
    <div class="run-files">
      <h3 class="text-sm font-medium mb-2">{t('workflow.files')}</h3>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="drop-zone"
        role="button"
        tabindex="0"
        ondragover={handleDragOver}
        ondrop={handleDrop}
        onclick={() => inputRef?.click()}
        onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
      >
        <input
          type="file"
          accept={ACCEPT_IMAGES}
          multiple
          class="hidden"
          bind:this={inputRef}
          onchange={handleFileInput}
        />
        <span class="text-surface-600-400">{t('common.addImages')}</span>
      </div>
      {#if files.length > 0}
        <p class="text-sm mt-1">{files.length} {t('workflow.fileCount')}</p>
        <button class="btn btn-sm preset-outlined-surface-200-800 mt-1" onclick={clearFiles}>{t('workflow.clearFiles')}</button>
      {/if}
    </div>
    <div class="run-results">
      <h3 class="text-sm font-medium mb-2">{t('common.result')}</h3>
      {#if error}
        <p class="text-error-500 text-sm">{error}</p>
      {:else if runResults.length > 0}
        <div class="results-list">
          {#each runResults as r}
            <div class="result-item">
              <span class="truncate flex-1">{r.file?.name ?? '-'}</span>
              {#if r.error}
                <span class="text-error-500 text-sm">{r.error}</span>
              {:else if r.blob}
                <span class="text-surface-600-400 text-sm">{formatFileSize(r.blob.size)}</span>
                <button class="btn btn-sm preset-outlined-surface-200-800" onclick={() => downloadSingle(r)}>
                  {t('common.download')}
                </button>
              {/if}
            </div>
          {/each}
        </div>
        {#if runResults.some((r) => r.blob)}
          <button class="btn btn-sm preset-filled-primary-500 mt-2" onclick={downloadAll}>
            {t('common.downloadAll')}
          </button>
        {/if}
      {:else}
        <p class="text-surface-600-400 text-sm">{t('workflow.runHint')}</p>
      {/if}
    </div>
  </section>

  {#if cropRequest}
    <CropModal request={cropRequest} />
  {/if}
</main>
</div>

<style>
  .workflow-editor {
    display: flex;
    flex-direction: column;
    min-height: 70vh;
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
    gap: 0.5rem;
  }
  .workflow-layout {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .workflow-sidebar {
    width: 180px;
    padding: 0.75rem;
    border-right: 1px solid var(--color-surface-200-800);
    overflow-y: auto;
  }
  .workflow-sidebar-right {
    border-right: none;
    border-left: 1px solid var(--color-surface-200-800);
  }
  .sidebar-title {
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0 0 0.5rem;
  }
  .sidebar-node-btn {
    display: block;
    width: 100%;
    padding: 0.4rem 0.5rem;
    margin-bottom: 0.25rem;
    font-size: 0.8rem;
    text-align: left;
    background: var(--color-surface-100-900);
    border: 1px solid var(--color-surface-200-800);
    border-radius: 6px;
    cursor: pointer;
  }
  .sidebar-node-btn:hover {
    background: var(--color-surface-200-800);
  }
  .workflow-canvas-wrap {
    flex: 1;
    min-width: 0;
    min-height: 400px;
    height: 100%;
  }
  .workflow-canvas-wrap :global(.svelte-flow) {
    width: 100%;
    height: 100%;
  }
  .param-group {
    margin-bottom: 0.75rem;
  }
  .param-group label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-surface-600-400);
    margin-bottom: 0.25rem;
  }
  .workflow-run-section {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    border-top: 1px solid var(--color-surface-200-800);
    flex-shrink: 0;
  }
  .run-files,
  .run-results {
    min-width: 200px;
  }
  .drop-zone {
    padding: 1rem;
    border: 2px dashed var(--color-surface-200-800);
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
  }
  .drop-zone:hover {
    border-color: var(--color-primary-500);
  }
  .results-list {
    max-height: 120px;
    overflow-y: auto;
  }
  .result-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    font-size: 0.875rem;
  }

  :global(.workflow-node) {
    padding: 0.5rem 0.75rem;
    min-width: 80px;
    background: var(--color-surface-50-950);
    border: 1px solid var(--color-surface-200-800);
    border-radius: 8px;
    font-size: 0.875rem;
  }
  :global(.workflow-node .node-label) {
    font-weight: 500;
  }
  :global(.workflow-node .node-params) {
    font-size: 0.75rem;
    color: var(--color-surface-600-400);
  }
  :global(.workflow-node .node-content) {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>

<script>
  /**
   * 图片批处理（标准表）：加载规格表、智能合并输入、按行执行、目标 vs 实际对比
   */
  import { t } from '$lib/i18n.js';
  import { formatFileSize } from '$lib/imageProcessor.js';
  import {
    buildFileItem,
    downloadBlob,
    downloadAsZip,
    filterImageFiles,
  } from '$lib/batchHelpers.js';
  import {
    loadBatchSpecs,
    expandSpecsAndAssignInputs,
    specToParamsOverrides,
    normalizeBatchSpecRow,
  } from '$lib/batchSpecHelpers.js';
  import { runWorkflowFromPreset } from '$lib/workflow/workflowLoader.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import SliderComparePreview from '$lib/components/SliderComparePreview.svelte';

  const EXT_BY_FORMAT = { jpeg: 'jpg', jpg: 'jpg', webp: 'webp', png: 'png', avif: 'avif' };

  let specs = $state([]);
  let specLoadError = $state('');
  let fileItems = $state([]);
  let manualOverrides = $state({});
  /** 全局配置：文件前缀、是否在文件名中含渠道id（勾选）。格式与质量均从 spec 读取，不可修改 */
  let globalFilePrefix = $state('');
  let includeChannelInFilename = $state(true);
  /** 隐藏不支持格式（GIF/视频）行，默认开启 */
  let hideUnsupported = $state(true);
  let results = $state([]);
  let processing = $state(false);
  let error = $state('');
  let previewResult = $state(null);
  let previewBlobUrl = $state('');
  let idCounter = 0;
  /** 当前打开“选择输入”下拉的行索引，null 表示未打开 */
  let pickerOpenForRow = $state(null);
  /** 导入规格用隐藏 file input */
  let importInputEl = $state(/** @type {HTMLInputElement | null} */ (null));
  /** 在线编辑 spec JSON 弹窗 */
  let editSpecsOpen = $state(false);
  let editSpecsJson = $state('');
  let editSpecsError = $state('');
  /** 下拉层固定定位用（避免被表格 overflow 裁剪） */
  let pickerRect = $state({ top: 0, left: 0, maxHeight: 420 });
  /** 下拉层元素引用：用于滚动到当前选中项 */
  let pickerEl = $state(/** @type {HTMLDivElement | null} */ (null));
  /** 结果 blob 的 object URL，用于缩略图，按索引与 results 对应 */
  let resultBlobUrls = $state([]);
  let _prevResultUrls = [];

  $effect(() => {
    const urls = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i]?.blob) urls[i] = URL.createObjectURL(results[i].blob);
    }
    for (const u of _prevResultUrls) if (u) URL.revokeObjectURL(u);
    _prevResultUrls = urls.filter(Boolean);
    resultBlobUrls = urls;
    return () => {
      for (const u of _prevResultUrls) if (u) URL.revokeObjectURL(u);
    };
  });

  /** 按 quantity 展开后的行（每张输出一行），含 quantityIndex、quantity、isReused */
  const autoRows = $derived(
    specs.length && fileItems.length
      ? expandSpecsAndAssignInputs(specs, fileItems)
      : specs.flatMap((spec, specIndex) =>
          Array.from({ length: Math.max(1, spec.quantity ?? 1) }, (_, q) => ({
            spec,
            specIndex,
            quantityIndex: q,
            quantity: Math.max(1, spec.quantity ?? 1),
            assignedFile: null,
            isReused: false,
          }))
        )
  );

  /** 支持用户显式选「无输入」：manualOverrides[i] === null 表示该行不输出 */
  const rows = $derived(
    autoRows.map((r, i) => ({
      ...r,
      assignedFile: i in manualOverrides ? manualOverrides[i] : r.assignedFile,
    }))
  );

  /** 不支持的格式：不参与批处理，表格中灰底只读 */
  const UNSUPPORTED_FORMATS = ['gif', 'video'];

  $effect(() => {
    loadBatchSpecs()
      .then((list) => {
        specs = list;
        specLoadError = '';
      })
      .catch((e) => {
        specLoadError = e?.message || 'Failed to load specs';
        specs = [];
      });
  });

  async function addFiles(fileList) {
    const filtered = filterImageFiles(fileList);
    if (!filtered.length) return;
    error = '';
    for (const f of filtered) {
      const item = await buildFileItem(f, ++idCounter);
      fileItems = [...fileItems, item];
    }
  }

  /** @param {number} rowIndex
   *  @param {File | null} file - null 表示该行无输入、不输出 */
  function replaceInput(rowIndex, file) {
    manualOverrides = { ...manualOverrides, [rowIndex]: file };
  }

  function getAssignedItem(row) {
    if (!row.assignedFile) return null;
    return fileItems.find((it) => it.file === row.assignedFile) ?? null;
  }

  function chooseInput(rowIndex, file) {
    replaceInput(rowIndex, file);
    pickerOpenForRow = null;
  }

  function openPicker(e, rowIndex) {
    const isClosing = pickerOpenForRow === rowIndex;
    if (!isClosing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const gap = 8;
      const viewportH = window.innerHeight || 800;
      const viewportW = window.innerWidth || 1200;
      const desiredHeight = 420;
      const minHeight = 140;
      const panelWidth = 420;
      const spaceBelow = Math.max(0, viewportH - rect.bottom - gap);
      const spaceAbove = Math.max(0, rect.top - gap);
      // 仅当下方空间明显不够且上方更充足时，才向上展开，避免“跑到顶部”
      const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow + 60;
      const available = openUpward ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(minHeight, Math.min(desiredHeight, Math.floor(available)));
      const rawTop = openUpward ? rect.top - maxHeight - 4 : rect.bottom + 4;
      const top = Math.max(gap, Math.min(rawTop, viewportH - gap - maxHeight));
      const rawLeft = rect.left;
      const left = Math.max(gap, Math.min(rawLeft, viewportW - gap - panelWidth));
      pickerRect = { top, left, maxHeight };
    }
    pickerOpenForRow = isClosing ? null : rowIndex;
  }

  $effect(() => {
    if (pickerOpenForRow === null || !pickerEl) return;
    queueMicrotask(() => {
      if (!pickerEl) return;
      const selected = pickerEl.querySelector('[data-selected="true"]');
      if (selected && typeof selected.scrollIntoView === 'function') {
        selected.scrollIntoView({ block: 'nearest' });
      }
    });
  });

  /** 将文件前缀转为 slug：小写、空格与特殊字符替换为连字符 */
  function slugifyPrefix(str) {
    if (str == null || typeof str !== 'string') return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** 输出名：前缀在最前，即 {前缀}_{渠道}_{其余}；前缀用 slug，整体小写 */
  function getOutputBaseName(specName, prefix, includeChannel) {
    const slug = slugifyPrefix(prefix);
    const hasPrefix = slug.length > 0;
    if (!hasPrefix && !includeChannel) return (specName || '').toLowerCase();
    if (!specName) return '';
    const parts = specName.split('_');
    const rest = (parts.length > 1 ? parts.slice(1).join('_') : specName).toLowerCase();
    const channel = includeChannel && parts.length > 1 ? parts[0].toLowerCase() : '';
    const segs = [hasPrefix ? slug : null, channel].filter(Boolean);
    return segs.length ? segs.join('_') + '_' + rest : specName.toLowerCase();
  }

  /** 格式与质量均从 spec 读取 */
  function getEffectiveFormat(row) {
    return (row.spec.format || 'webp').toLowerCase().replace('jpg', 'jpeg');
  }

  function getEffectiveQuality(row) {
    return row.spec.quality ?? 85;
  }

  function isUnsupportedFormat(spec) {
    const f = (spec?.format || '').toLowerCase();
    return UNSUPPORTED_FORMATS.includes(f);
  }

  /** 长文件名截短显示，保留完整名在 title 中 */
  const DISPLAY_NAME_MAX = 40;
  function truncateDisplayName(name, maxLen = DISPLAY_NAME_MAX) {
    if (!name || name.length <= maxLen) return name;
    return name.slice(0, maxLen) + '…';
  }

  /** 根据当前全局选项与行格式计算最终输出文件名（多张时加 _2、_3 后缀，统一小写） */
  function getOutputFilename(row, origIndex) {
    if (isUnsupportedFormat(row.spec)) return '—';
    const fmt = getEffectiveFormat(row);
    const ext = (EXT_BY_FORMAT[fmt] || fmt || 'webp').toLowerCase();
    const renameRule = row?.spec?.renameRule;
    let baseName;
    if (renameRule) {
      const slug = slugifyPrefix(globalFilePrefix);
      // 重命名规则启用后：不再考虑 spec.name 以及 includeChannelInFilename 等参数
      baseName = String(renameRule)
        .toLowerCase()
        .replace(/\{prefix\}/g, slug)
        .replace(/__+/g, '_')
        .replace(/^[_-]+|[_-]+$/g, '');
      if (!baseName) baseName = 'output';
    } else {
      baseName = getOutputBaseName(row.spec.name, globalFilePrefix, includeChannelInFilename);
    }
    const qty = row.quantity ?? 1;
    if (qty > 1 && row.quantityIndex > 0) baseName += `_${row.quantityIndex + 1}`;
    return `${baseName}.${ext}`;
  }

  /** 表格展示行：隐藏不支持时过滤掉 gif/video，保留原始索引用于 results/picker */
  const displayRows = $derived(
    rows.map((row, origIndex) => ({ row, origIndex })).filter(({ row }) => !hideUnsupported || !isUnsupportedFormat(row.spec))
  );

  async function runBatch() {
    const toRun = rows.filter((r) => r.assignedFile);
    if (!toRun.length) {
      error = t('batch.errNoAssignment');
      return;
    }
    error = '';
    processing = true;
    results = rows.map((r) => ({
      spec: r.spec,
      assignedFile: r.assignedFile,
      status: r.assignedFile ? 'processing' : 'pending',
      blob: null,
      outputName: '',
      outputFormat: null,
      newWidth: null,
      newHeight: null,
      newSize: null,
      error: null,
    }));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.assignedFile || isUnsupportedFormat(row.spec)) continue;
      const fmt = getEffectiveFormat(row);
      const q = getEffectiveQuality(row);
      const overrides = specToParamsOverrides(row.spec);
      overrides.output = { ...overrides.output, targetFormat: fmt, quality: q };
      try {
        const [res] = await runWorkflowFromPreset('/workflows/resize.json', [row.assignedFile], {
          paramsOverrides: overrides,
        });
        const outputName = getOutputFilename(row, i);
        results = results.map((r, j) =>
          j !== i
            ? r
            : {
                ...r,
                status: res?.error ? 'error' : 'done',
                blob: res?.blob ?? null,
                outputName: res?.error ? '' : outputName,
                outputFormat: res?.error ? null : fmt,
                newWidth: res?.width ?? null,
                newHeight: res?.height ?? null,
                newSize: res?.blob?.size ?? null,
                error: res?.error ?? null,
              }
        );
      } catch (e) {
        results = results.map((r, j) =>
          j !== i ? r : { ...r, status: 'error', error: e?.message ?? 'Failed' }
        );
      }
    }
    processing = false;
  }

  function openPreview(result) {
    if (!result?.assignedFile || !result?.blob) return;
    const item = fileItems.find((it) => it.file === result.assignedFile);
    previewResult = item ? { ...item, blob: result.blob, outputName: result.outputName, newWidth: result.newWidth, newHeight: result.newHeight, newSize: result.newSize } : null;
    previewBlobUrl = result.blob ? URL.createObjectURL(result.blob) : '';
  }

  function closePreview() {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = '';
    previewResult = null;
  }

  function downloadOne(result, row, origIndex) {
    if (!result?.blob) return;
    const name = (row != null && origIndex != null ? getOutputFilename(row, origIndex) : null) || result?.outputName || 'output';
    if (name === '—') return;
    downloadBlob(result.blob, name);
  }

  function downloadAllResults() {
    const done = results
      .map((r, i) => (r.status === 'done' && r.blob ? { blob: r.blob, outputName: getOutputFilename(rows[i], i) } : null))
      .filter((x) => x && x.outputName !== '—');
    if (!done.length) return;
    downloadAsZip(done, 'batch-outputs.zip');
  }

  function clearAll() {
    fileItems = [];
    manualOverrides = {};
    results = [];
    error = '';
  }

  /** 当前规格转为与导出一致的 JSON 结构 */
  function specsToExportPayload() {
    return specs.map((s) => {
      const row = { name: s.name, width: s.width, height: s.height, format: s.format, quality: s.quality ?? 85, quantity: Math.max(1, s.quantity ?? 1) };
      if (s.maxSizeKb != null && s.maxSizeKb > 0) row.maxSizeKb = s.maxSizeKb;
      if (s.renameRule) row.renameRule = s.renameRule;
      return row;
    });
  }

  /** 导出当前规格表为 JSON 文件 */
  function exportSpecs() {
    const blob = new Blob([JSON.stringify(specsToExportPayload(), null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'batch-specs.json');
  }

  /** 从 JSON 文件导入规格表（替换当前规格） */
  async function importSpecsFromFile(file) {
    if (!file) return;
    error = '';
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      if (!Array.isArray(raw)) throw new Error(t('batch.importErrorNotArray'));
      const next = raw.map((row) => normalizeBatchSpecRow(row));
      specs = next;
      specLoadError = '';
    } catch (e) {
      error = e?.message || t('batch.importError');
    }
    if (importInputEl) importInputEl.value = '';
  }

  function openEditSpecs() {
    editSpecsJson = JSON.stringify(specsToExportPayload(), null, 2);
    editSpecsError = '';
    editSpecsOpen = true;
  }

  function applyEditSpecs() {
    editSpecsError = '';
    try {
      const raw = JSON.parse(editSpecsJson);
      if (!Array.isArray(raw)) throw new Error(t('batch.importErrorNotArray'));
      specs = raw.map((row) => normalizeBatchSpecRow(row));
      editSpecsOpen = false;
    } catch (e) {
      editSpecsError = e?.message || t('batch.importError');
    }
  }

  function closeEditSpecs() {
    editSpecsOpen = false;
    editSpecsError = '';
  }

  function dimensionMatch(spec, result) {
    if (result.newWidth == null || result.newHeight == null) return null;
    return result.newWidth === spec.width && result.newHeight === spec.height;
  }

  function sizeOk(spec, result) {
    if (spec.maxSizeKb == null || result.newSize == null) return null;
    return result.newSize <= spec.maxSizeKb * 1024;
  }

  /** 宽高比，保留 2 位小数 */
  function aspectRatio(w, h) {
    return h ? (Number(w) / Number(h)).toFixed(2) : '—';
  }

  /**
   * 按目标规格排序：先宽高比（最接近靠前），再尺寸（比目标大的图靠前，避免放大）
   * 尺寸用所需缩放倍数：max(spec.w/input.w, spec.h/input.h)，越小越优先（≤1 表示可缩小或原尺寸）
   */
  function sortByClosestToSpec(items, spec) {
    const targetRatio = spec.height ? spec.width / spec.height : 0;
    const scaleFactor = (item) => {
      if (!item.width || !item.height) return Infinity;
      const sx = spec.width / item.width;
      const sy = spec.height / item.height;
      return Math.max(sx, sy);
    };
    return [...items].sort((a, b) => {
      const ra = a.height ? a.width / a.height : 0;
      const rb = b.height ? b.width / b.height : 0;
      const da = Math.abs(ra - targetRatio);
      const db = Math.abs(rb - targetRatio);
      if (da !== db) return da - db;
      return scaleFactor(a) - scaleFactor(b);
    });
  }

  /** 当前下拉对应的已排序输入列表（按目标规格智能排序） */
  const sortedFileItemsForPicker = $derived(
    pickerOpenForRow !== null && rows[pickerOpenForRow]
      ? sortByClosestToSpec(fileItems, rows[pickerOpenForRow].spec)
      : []
  );

  /**
   * 输入项与目标规格的匹配程度：完美(绿) / 尚可(黄) / 勉强(红)
   * 数量不足时重复使用的输入标为勉强
   */
  function getInputMatchLevel(item, spec, isReused) {
    if (isReused) return 'poor';
    if (!item.width || !item.height || !spec.width || !spec.height) return 'poor';
    const targetRatio = spec.width / spec.height;
    const inputRatio = item.width / item.height;
    const ratioDiff = Math.abs(inputRatio - targetRatio);
    const scale = Math.max(spec.width / item.width, spec.height / item.height);
    if (ratioDiff <= 0.02 && scale <= 1) return 'perfect';
    if (ratioDiff <= 0.1 && scale <= 2) return 'ok';
    return 'poor';
  }

  const matchLevelStyles = {
    perfect: 'bg-success-500/15 border-l-success-500',
    ok: 'bg-warning-500/15 border-l-warning-500',
    poor: 'bg-error-500/15 border-l-error-500',
  };
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      if (editSpecsOpen) closeEditSpecs();
      else if (previewResult) closePreview();
      else if (pickerOpenForRow !== null) pickerOpenForRow = null;
    }
  }}
  onclick={() => { if (pickerOpenForRow !== null) pickerOpenForRow = null; }}
/>

<div class="workspace-content">
  <ToolPageHeader titleKey="batch.title" descKey="batch.desc" />

  {#if specLoadError}
    <p class="text-sm text-error-500 mb-4">{specLoadError}</p>
  {:else if !specs.length}
    <p class="text-sm text-surface-600-400 mb-4">{t('batch.noSpecs')}</p>
    <p class="mb-4">
      <button type="button" class="btn preset-outlined-surface-200-800 btn-sm" onclick={() => importInputEl?.click()}>{t('batch.importSpecs')}</button>
    </p>
  {/if}

  <input type="file" accept=".json,application/json" class="hidden" bind:this={importInputEl} onchange={(e) => { const f = e.currentTarget?.files?.[0]; if (f) importSpecsFromFile(f); }} />

  {#if specs.length > 0}
    <section class="mb-4">
      <FileDropZone onFilesAdd={addFiles} selectedName={fileItems.length ? `${fileItems.length} ${t('workflow.fileCount')}` : ''} onClear={fileItems.length ? () => (fileItems = []) : undefined} showClear={fileItems.length > 0} />
      {#if error}
        <p class="text-sm text-error-500 mt-2">{error}</p>
      {/if}
    </section>

    <section class="card preset-outlined-surface-200-800 p-4 mb-4">
      <h3 class="text-sm font-medium m-0 mb-3">{t('batch.globalConfig')}</h3>
      <div class="flex flex-wrap gap-4 items-end">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-surface-600-400">{t('batch.filePrefix')}</span>
          <input
            type="text"
            class="input preset-outlined-surface-200-800 w-32 text-sm"
            placeholder=""
            bind:value={globalFilePrefix}
          />
          <span class="text-[10px] text-surface-500-500">{t('batch.filePrefixHint')}</span>
        </label>
        <label class="flex flex-col gap-1">
          <span class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="rounded border-surface-300-700" bind:checked={includeChannelInFilename} />
            <span class="text-xs text-surface-600-400">{t('batch.includeChannel')}</span>
          </span>
          <span class="text-[10px] text-surface-500-500">{t('batch.includeChannelHint')}</span>
        </label>
        <label class="flex flex-col gap-1">
          <span class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="rounded border-surface-300-700" bind:checked={hideUnsupported} />
            <span class="text-xs text-surface-600-400">{t('batch.hideUnsupported')}</span>
          </span>
        </label>
        <div class="flex items-center gap-2">
          <button type="button" class="btn preset-outlined-surface-200-800 btn-sm text-sm" onclick={openEditSpecs}>
            {t('batch.editSpecs')}
          </button>
          <button type="button" class="btn preset-outlined-surface-200-800 btn-sm text-sm" onclick={exportSpecs}>
            {t('batch.exportSpecs')}
          </button>
          <button type="button" class="btn preset-outlined-surface-200-800 btn-sm text-sm" onclick={() => importInputEl?.click()}>
            {t('batch.importSpecs')}
          </button>
        </div>
      </div>
    </section>

    {#if fileItems.length > 0}
      <section class="card preset-outlined-surface-200-800 p-4 mb-4">
        <h3 class="text-sm font-medium m-0 mb-3">{t('batch.inputList')} ({fileItems.length})</h3>
        <div class="flex flex-wrap gap-3">
          {#each fileItems as item}
            <div class="flex items-center gap-2 min-w-0 rounded-lg border border-surface-200-800 p-2 bg-surface-50-950/50">
              <img src={item.previewUrl} alt="" class="w-14 h-14 object-cover rounded shrink-0" />
              <div class="min-w-0 text-sm">
                <p class="font-medium truncate m-0" title={item.name}>{truncateDisplayName(item.name)}</p>
                <p class="text-surface-600-400 text-xs m-0 mt-0.5">
                  {item.width && item.height ? `${item.width}×${item.height} (${aspectRatio(item.width, item.height)})` : '—'} · {item.format} · {formatFileSize(item.size)}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if fileItems.length > 0}
      <p class="text-xs text-surface-600-400 mb-2">{t('batch.autoMatchHint')}</p>
    {/if}
    <div class="overflow-x-auto mb-4">
      <table class="w-full text-sm border border-surface-200-800 rounded-lg">
        <thead>
          <tr class="border-b border-surface-200-800 text-surface-600-400 text-left">
            <th class="p-3 w-10">#</th>
            <th class="p-3 min-w-[100px]">{t('batch.specName')}</th>
            <th class="p-3 w-28">{t('batch.targetSize')}</th>
            <th class="p-3 w-16">{t('common.format')}</th>
            <th class="p-3 w-14">{t('common.quality')}</th>
            <th class="p-3 w-20">{t('batch.targetSizeKb')}</th>
            <th class="p-3 min-w-[340px]">{t('batch.assignedInput')}</th>
            <th class="p-3 min-w-[300px]">{t('common.result')}</th>
          </tr>
        </thead>
        <tbody>
          {#each displayRows as { row, origIndex }, displayIndex}
            {@const item = getAssignedItem(row)}
            {@const res = results[origIndex]}
            {@const unsupported = isUnsupportedFormat(row.spec)}
            {@const dimOk = res ? dimensionMatch(row.spec, res) : null}
            {@const sizeOkRes = res ? sizeOk(row.spec, res) : null}
            <tr class="border-b border-surface-200-800 last:border-b-0 hover:bg-surface-100-900/50 {unsupported ? 'bg-surface-200-800/50' : ''}">
              <td class="p-3">{origIndex + 1}</td>
              <td class="p-3 font-medium">
                {row.spec.name}{#if row.quantity > 1} <span class="text-surface-500-500 font-normal">({row.quantityIndex + 1}/{row.quantity})</span>{/if}
              </td>
              <td class="p-3">{row.spec.width}×{row.spec.height} <span class="text-surface-500-500 text-xs">({aspectRatio(row.spec.width, row.spec.height)})</span></td>
              <td class="p-3 {unsupported ? 'bg-surface-200-800/60' : ''}">
                <span class="text-surface-700-300 text-xs py-1 block">{row.spec.format?.toUpperCase() ?? '—'}</span>
              </td>
              <td class="p-3 {unsupported ? 'bg-surface-200-800/60' : ''}">
                <span class="text-surface-700-300 text-xs py-1 block">{row.spec.quality ?? '—'}</span>
              </td>
              <td class="p-3">{row.spec.maxSizeKb != null ? row.spec.maxSizeKb + ' KB' : '—'}</td>
              <td class="p-3 align-top">
                <div class="relative inline-block min-w-0">
                  {#if item}
                    {@const level = getInputMatchLevel(item, row.spec, row.isReused)}
                    <button
                      type="button"
                      class="flex items-center gap-2 w-full text-left rounded-lg border-l-4 p-1 -m-1 pl-2 cursor-pointer min-w-0 {matchLevelStyles[level]} hover:opacity-90"
                      onclick={(e) => { e.stopPropagation(); openPicker(e, origIndex); }}
                      title={level === 'perfect' ? t('batch.matchPerfect') : level === 'ok' ? t('batch.matchOk') : t('batch.matchPoor')}
                    >
                      <img src={item.previewUrl} alt="" class="w-12 h-12 object-cover rounded shrink-0" />
                      <div class="min-w-0 flex-1 text-xs">
                        <p class="truncate font-medium m-0 flex items-center gap-1.5" title={item.name}>
                          {truncateDisplayName(item.name)}
                          <span class="text-[10px] font-normal text-surface-500-500 shrink-0">
                            {level === 'perfect' ? t('batch.matchPerfect') : level === 'ok' ? t('batch.matchOk') : t('batch.matchPoor')}
                          </span>
                        </p>
                        <p class="text-surface-600-400 m-0 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={item.width && item.height ? `${item.width}×${item.height} (${aspectRatio(item.width, item.height)}) · ${item.format} · ${formatFileSize(item.size)}` : item.name}>
                          {item.width && item.height ? `${item.width}×${item.height} (${aspectRatio(item.width, item.height)})` : '—'} · {item.format} · {formatFileSize(item.size)}
                        </p>
                      </div>
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="w-full min-w-32 flex items-center gap-2 rounded-lg border-l-4 p-1 -m-1 pl-2 text-left text-surface-500-500 bg-surface-200-800/50 border-l-surface-400-600 cursor-pointer hover:opacity-90 text-xs whitespace-nowrap"
                      onclick={(e) => { e.stopPropagation(); openPicker(e, origIndex); }}
                    >
                      <span class="shrink-0 w-12 h-12 rounded bg-surface-200-800 flex items-center justify-center text-surface-400-600">—</span>
                      <span class="truncate">{origIndex in manualOverrides ? t('batch.noInput') : t('batch.selectInput')}</span>
                    </button>
                  {/if}
                </div>
              </td>
              <td class="p-3 align-top">
                <p class="text-xs font-medium m-0 mb-1 truncate" title={getOutputFilename(row, origIndex)}>{truncateDisplayName(getOutputFilename(row, origIndex))}</p>
                {#if res}
                  {#if res.status === 'processing'}
                    <span class="text-surface-600-400 text-xs">{t('common.processing')}</span>
                  {:else if res.status === 'error'}
                    <span class="text-error-500 text-xs">{res.error}</span>
                  {:else if res.status === 'done' && res.blob}
                    <div class="flex items-center gap-2 min-w-0 mt-1">
                      {#if resultBlobUrls[origIndex]}
                        <img src={resultBlobUrls[origIndex]} alt="" class="w-12 h-12 object-cover rounded shrink-0" />
                      {/if}
                      <div class="min-w-0 flex-1 text-xs">
                        <p class="text-surface-600-400 m-0 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                          {res.newWidth != null && res.newHeight != null ? `${res.newWidth}×${res.newHeight} (${aspectRatio(res.newWidth, res.newHeight)})` : '—'}
                          · {(res.outputFormat ?? row.spec.format ?? '').toUpperCase()} · {res.newSize != null ? formatFileSize(res.newSize) : '—'}
                        </p>
                        <p class="m-0 mt-0.5 flex items-center gap-2 flex-wrap text-xs">
                          {#if dimOk === true}
                            <span class="text-success-500">{t('batch.dimMatch')} ✓</span>
                          {:else if dimOk === false}
                            <span class="text-warning-500">{t('batch.dimMismatch')} Δ</span>
                          {/if}
                          {#if sizeOkRes === true}
                            <span class="text-success-500">{t('batch.withinTarget')} ✓</span>
                          {:else if sizeOkRes === false}
                            <span class="text-warning-500">{t('batch.overTarget')}</span>
                          {/if}
                        </p>
                        <div class="flex gap-1 mt-1">
                          <button onclick={() => openPreview(res)} class="btn preset-outlined-surface-200-800 btn-sm text-xs">{t('common.preview')}</button>
                          <button onclick={() => downloadOne(res, row, origIndex)} class="btn preset-outlined-surface-200-800 btn-sm text-xs">{t('common.download')}</button>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <span class="text-surface-500-500 text-xs">—</span>
                  {/if}
                {:else}
                  <span class="text-surface-500-500 text-xs">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if results.length > 0}
      <div class="flex justify-end mt-2">
        <button onclick={downloadAllResults} class="btn preset-outlined-surface-200-800 btn-sm">{t('common.downloadAll')}</button>
      </div>
    {/if}

    <!-- 选择输入下拉：fixed 定位，避免被表格 overflow 裁剪 -->
    {#if pickerOpenForRow !== null}
      {@const rowIndex = pickerOpenForRow}
      {@const currentRow = rows[rowIndex]}
      <div
        class="fixed z-50 min-w-[320px] max-w-[420px] overflow-auto rounded-lg border border-surface-200-800 bg-surface-50-950 shadow-xl py-1"
        style="top: {pickerRect.top}px; left: {pickerRect.left}px; max-height: {pickerRect.maxHeight}px;"
        role="presentation"
        bind:this={pickerEl}
        onclick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-left rounded-none border-none cursor-pointer border-l-4 border-l-surface-400-600 bg-surface-200-800/50 text-surface-500-500 hover:opacity-90 {!currentRow?.assignedFile ? 'ring-2 ring-primary-500' : ''}"
          data-selected={!currentRow?.assignedFile ? 'true' : 'false'}
          onclick={() => chooseInput(rowIndex, null)}
        >
          <span class="shrink-0 w-10 h-10 rounded bg-surface-200-800 flex items-center justify-center text-surface-400-600">—</span>
          <span>{t('batch.noInput')}</span>
        </button>
        {#each sortedFileItemsForPicker as fi}
          {@const level = getInputMatchLevel(fi, currentRow.spec)}
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-left rounded-none border-none cursor-pointer border-l-4 {matchLevelStyles[level]} hover:opacity-90 {currentRow?.assignedFile && currentRow.assignedFile === fi.file ? 'ring-2 ring-primary-500' : ''}"
            data-selected={currentRow?.assignedFile && currentRow.assignedFile === fi.file ? 'true' : 'false'}
            onclick={() => chooseInput(rowIndex, fi.file)}
            title={level === 'perfect' ? t('batch.matchPerfect') : level === 'ok' ? t('batch.matchOk') : t('batch.matchPoor')}
          >
            <img src={fi.previewUrl} alt="" class="w-10 h-10 object-cover rounded shrink-0" />
            <div class="min-w-0 text-sm flex-1">
              <p class="truncate font-medium m-0 flex items-center gap-1.5" title={fi.name}>
                {truncateDisplayName(fi.name)}
                <span class="text-[10px] font-normal text-surface-500-500 shrink-0">
                  {level === 'perfect' ? t('batch.matchPerfect') : level === 'ok' ? t('batch.matchOk') : t('batch.matchPoor')}
                </span>
              </p>
              <p class="text-surface-600-400 text-xs m-0 mt-0.5">
                {fi.width && fi.height ? `${fi.width}×${fi.height} (${aspectRatio(fi.width, fi.height)})` : '—'} · {fi.format} · {formatFileSize(fi.size)}
              </p>
            </div>
          </button>
        {/each}
        <div class="h-2 shrink-0" aria-hidden="true"></div>
      </div>
    {/if}

    <section class="flex gap-3 mb-4">
      <button
        onclick={runBatch}
        disabled={processing || !rows.some((r) => r.assignedFile)}
        class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {processing ? t('common.processing') : t('batch.run')}
      </button>
      <button onclick={clearAll} class="btn preset-outlined-surface-200-800">{t('common.clearAll')}</button>
    </section>

  {/if}

  <!-- 在线编辑 spec JSON 弹窗 -->
  {#if editSpecsOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={t('batch.editSpecs')}
      tabindex="-1"
      onclick={closeEditSpecs}
      onkeydown={(e) => e.key === 'Escape' && closeEditSpecs()}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="card preset-outlined-surface-200-800 w-full max-w-2xl max-h-[85vh] flex flex-col p-4 shadow-xl"
        onclick={(e) => e.stopPropagation()}
      >
        <h3 class="text-sm font-medium m-0 mb-3">{t('batch.editSpecs')}</h3>
        <textarea
          class="input preset-outlined-surface-200-800 w-full flex-1 min-h-[280px] font-mono text-sm resize-y mb-2"
          spellcheck="false"
          bind:value={editSpecsJson}
          placeholder={t('batch.editSpecsPlaceholder')}
        ></textarea>
        {#if editSpecsError}
          <p class="text-sm text-error-500 mb-3 m-0">{editSpecsError}</p>
        {/if}
        <div class="flex justify-end gap-2">
          <button type="button" class="btn preset-outlined-surface-200-800 btn-sm" onclick={closeEditSpecs}>
            {t('batch.editSpecsCancel')}
          </button>
          <button type="button" class="btn preset-filled-primary-500 btn-sm" onclick={applyEditSpecs}>
            {t('batch.editSpecsApply')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <SliderComparePreview
    open={!!previewResult}
    item={previewResult}
    resultBlobUrl={previewBlobUrl}
    onClose={closePreview}
  />
</div>

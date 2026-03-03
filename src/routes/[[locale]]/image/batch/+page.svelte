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
    assignInputsToSpecs,
    specToParamsOverrides,
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
  /** 下拉层固定定位用（避免被表格 overflow 裁剪） */
  let pickerRect = $state({ top: 0, left: 0 });
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

  const autoRows = $derived(
    specs.length && fileItems.length
      ? assignInputsToSpecs(specs, fileItems)
      : specs.map((spec) => ({ spec, assignedFile: null }))
  );

  const rows = $derived(
    autoRows.map((r, i) => ({
      spec: r.spec,
      assignedFile: manualOverrides[i] ?? r.assignedFile ?? null,
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
      pickerRect = { top: rect.bottom + 4, left: rect.left };
    }
    pickerOpenForRow = isClosing ? null : rowIndex;
  }

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

  /** 根据当前全局选项与行格式计算最终输出文件名（随选项切换实时更新，统一小写） */
  function getOutputFilename(row, origIndex) {
    if (isUnsupportedFormat(row.spec)) return '—';
    const fmt = getEffectiveFormat(row);
    const ext = (EXT_BY_FORMAT[fmt] || fmt || 'webp').toLowerCase();
    const baseName = getOutputBaseName(row.spec.name, globalFilePrefix, includeChannelInFilename);
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
        const ext = (EXT_BY_FORMAT[fmt] || fmt || 'webp').toLowerCase();
        const baseName = getOutputBaseName(row.spec.name, globalFilePrefix, includeChannelInFilename);
        const outputName = `${baseName}.${ext}`;
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
   * 完美：比例一致且不需扩图；尚可：比例与尺寸接近；勉强：比例或尺寸偏差大
   */
  function getInputMatchLevel(item, spec) {
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
      if (previewResult) closePreview();
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
  {/if}

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
              <td class="p-3 font-medium">{row.spec.name}</td>
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
                    {@const level = getInputMatchLevel(item, row.spec)}
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
                      class="btn preset-outlined-surface-200-800 btn-sm text-xs"
                      onclick={(e) => { e.stopPropagation(); openPicker(e, origIndex); }}
                    >
                      {t('batch.selectInput')}
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
        class="fixed z-50 min-w-[320px] max-w-[420px] max-h-[70vh] overflow-auto rounded-lg border border-surface-200-800 bg-surface-50-950 shadow-xl py-1"
        style="top: {pickerRect.top}px; left: {pickerRect.left}px;"
        role="presentation"
        onclick={(e) => e.stopPropagation()}
      >
        {#each sortedFileItemsForPicker as fi}
          {@const level = getInputMatchLevel(fi, currentRow.spec)}
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-left rounded-none border-none cursor-pointer border-l-4 {matchLevelStyles[level]} hover:opacity-90 {currentRow?.assignedFile === fi.file ? 'ring-2 ring-primary-500' : ''}"
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

  <SliderComparePreview
    open={!!previewResult}
    item={previewResult}
    resultBlobUrl={previewBlobUrl}
    onClose={closePreview}
  />
</div>

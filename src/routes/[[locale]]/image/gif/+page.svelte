<script>
  import { onDestroy } from 'svelte';
  import { t } from '$lib/i18n.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import FileDropZone from '$lib/components/FileDropZone.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';
  import { gifEditorStore } from '$lib/stores/gifEditorStore.js';
  import { encodeGif } from '$lib/gif/utils.js';
  import JSZip from 'jszip';

  let exporting = false;
  let exportingMessage = '';
  let playbackTimer = null;
  let playing = false;
  let playingIndex = 0;
  const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];
  let previewZoomIndex = 2; // 100%

  $: state = $gifEditorStore;
  $: frames = state.frames ?? [];
  $: compression = state.compression ?? {};
  $: options = state.options ?? {};
  $: selectedFrame = frames[state.selectedIndex] ?? null;
  $: compressionReady = Boolean(compression.frames?.length && !compression.dirty && !compression.running);
  $: compressedFrame = compressionReady
    ? compression.frames[state.selectedIndex % compression.frames.length]
    : null;
  $: scaleRatio = (options.scalePercent || 100) / 100;
  $: targetWidth = Math.max(1, Math.round(state.width * scaleRatio));
  $: targetHeight = Math.max(1, Math.round(state.height * scaleRatio));
  $: originalBytes = state.fileSize || 0;
  $: estimatedBytes = compression.estimatedBytes || 0;
  $: sourceFps = state.sourceFps || 0;
  $: previewZoom = ZOOM_STEPS[previewZoomIndex];

  $: if (!playing) {
    playingIndex = state.selectedIndex;
  }

  $: if (playing && frames.length > 1) {
    clearTimeout(playbackTimer);
    const frame = frames[playingIndex] ?? frames[0];
    const delay = Math.max(30, frame?.delay || 100);
    playbackTimer = setTimeout(() => {
      playingIndex = (playingIndex + 1) % frames.length;
      gifEditorStore.selectFrame(playingIndex);
    }, delay);
  } else {
    clearTimeout(playbackTimer);
  }

  onDestroy(() => {
    clearTimeout(playbackTimer);
    gifEditorStore.reset();
  });

  async function handleFiles(files) {
    if (!files?.length) return;
    playing = false;
    gifEditorStore.reset();
    await gifEditorStore.loadGif(files[0]);
  }

  function handleFpsInput(event) {
    gifEditorStore.updateOptions({ targetFps: Number(event.currentTarget.value) });
  }

  function handleScaleInput(event) {
    gifEditorStore.updateOptions({ scalePercent: Number(event.currentTarget.value) });
  }

  function handlePaletteInput(event) {
    gifEditorStore.updateOptions({ paletteSize: Number(event.currentTarget.value) });
  }

  function toggleOption(key) {
    const currentValue =
      key === 'accuratePreview' ? options.accuratePreview ?? true : options[key];
    gifEditorStore.updateOptions({ [key]: !currentValue });
  }

  async function generatePreview() {
    try {
      await gifEditorStore.generatePreview();
      playing = false;
    } catch (error) {
      console.error(error);
    }
  }

  async function exportGifFile() {
    const canReuseEncoded =
      compression.encodedGifUrl && compression.encodedGifBlob && !compression.dirty && !compression.running;
    if (canReuseEncoded) {
      exporting = true;
      exportingMessage = t('gifTool.downloadGif');
      const link = document.createElement('a');
      link.href = compression.encodedGifUrl;
      link.download = (state.fileName?.replace(/\.gif$/i, '') || 'gif') + '-compressed.gif';
      link.click();
      exporting = false;
      return;
    }
    const payload = gifEditorStore.getExportPayload();
    if (!payload.frames?.length) return;
    exporting = true;
    exportingMessage = t('gifTool.downloadGif');
    try {
      const blob = await encodeGif(payload.frames, {
        width: payload.width,
        height: payload.height,
        delay: payload.frames[0]?.delay || 100,
        loop: payload.loopCount || 0,
        paletteSize: payload.paletteSize,
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = (state.fileName?.replace(/\.gif$/i, '') || 'gif') + '-compressed.gif';
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      exporting = false;
    }
  }

  async function downloadFramesZip(framesToDownload, suffix) {
    if (!framesToDownload?.length) return;
    exporting = true;
    exportingMessage = t('gifTool.downloadFrames');
    try {
      const zip = new JSZip();
      for (let i = 0; i < framesToDownload.length; i += 1) {
        const frame = framesToDownload[i];
        const blob = await imageDataToBlob(frame.imageData);
        zip.file(`frame-${i + 1}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (state.fileName?.replace(/\.gif$/i, '') || 'gif') + suffix;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      exporting = false;
    }
  }

  function imageDataToBlob(imageData) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/png');
    });
  }

  function formatBytes(value) {
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
    const result = value / 1024 ** idx;
    return `${result.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  function formatFps(value) {
    if (!value) return '0';
    return value.toFixed(1).replace(/\.0$/, '');
  }

  function zoomPreviewIn() {
    if (previewZoomIndex < ZOOM_STEPS.length - 1) previewZoomIndex += 1;
  }
  function zoomPreviewOut() {
    if (previewZoomIndex > 0) previewZoomIndex -= 1;
  }
  function zoomPreviewReset() {
    previewZoomIndex = 2;
  }
  function formatUpdatedAt(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
</script>

<div class="workspace-content workspace-content-wide gif-tool">
  <ToolPageHeader titleKey="gifTool.title" descKey="gifTool.desc" />

  <section class="card upload">
    <h3>{t('gifTool.upload')}</h3>
    <FileDropZone accept="image/gif" multiple={false} onFilesAdd={handleFiles} />
  </section>

  {#if state.width === 0}
    <p class="placeholder">{t('gifTool.emptyPlaceholder')}</p>
  {:else}
    <section class="card meta">
      <div>
        <strong>{t('gifTool.metaResolution')}:</strong> {state.width} × {state.height}px
      </div>
      <div>
        <strong>{t('gifTool.metaFrames')}:</strong> {frames.length}
      </div>
        <div>
          <strong>{t('gifTool.metaLoop')}:</strong> {state.loopCount ?? 0}
        </div>
        <div>
          <strong>{t('gifTool.metaPalette')}:</strong> {state.sourcePaletteSize || '—'}
        </div>
        <div>
          <strong>{t('common.size')}:</strong> {formatBytes(originalBytes)}
      </div>
    </section>

    <section class="card options-card">
      <div class="options-heading">
        <div>
          <h4>{t('gifTool.optionsTitle')}</h4>
          <p class="hint">{t('gifTool.optionsNote')}</p>
        </div>
        <div class="options-heading-right">
          <div class="options-toggle-wrap">
            <label class="checkbox toggle-accurate">
              <input
                type="checkbox"
                checked={options.accuratePreview ?? true}
                onchange={() => toggleOption('accuratePreview')}
              />
              <span>{t('gifTool.accuratePreviewLabel')}</span>
            </label>
          </div>
          <div class="options-actions">
            <button
              type="button"
              class="btn preset-filled-primary-500"
              disabled={compression.running || !frames.length}
              onclick={generatePreview}
            >
              {compression.running ? t('gifTool.processingPreview') : t('gifTool.generatePreview')}
            </button>
            {#if compression.dirty}
              <span class="status-badge">{t('gifTool.previewDirty')}</span>
            {:else if compressionReady}
              <span class="status-badge ready">{formatUpdatedAt(compression.lastUpdated)}</span>
            {/if}
          </div>
        </div>
      </div>

      <div class="option-grid">
        <div class="option-block">
          <div class="option-title">{t('gifTool.fpsTitle')}</div>
          <label for="gif-fps-range">{t('gifTool.fpsLabel')}</label>
          <div class="control-pair">
            <input
              id="gif-fps-range"
              type="range"
              min="1"
              max={Math.max(60, Math.round(sourceFps || 60))}
              step="1"
              value={options.targetFps}
              oninput={handleFpsInput}
            />
            <input
              type="number"
              min="1"
              max={Math.max(60, Math.round(sourceFps || 60))}
              value={options.targetFps}
              onchange={handleFpsInput}
            />
          </div>
          <p class="hint">{t('gifTool.fpsAuto').replace('{fps}', formatFps(sourceFps))}</p>
          <p class="hint">{t('gifTool.fpsHint')}</p>
        </div>

        <div class="option-block">
          <div class="option-title">{t('gifTool.sizeTitle')}</div>
          <label for="gif-scale-range">{t('gifTool.scalePercentLabel')}</label>
          <div class="control-pair">
            <input
              id="gif-scale-range"
              type="range"
              min="10"
              max="400"
              step="5"
              value={options.scalePercent}
              oninput={handleScaleInput}
            />
            <input
              type="number"
              min="10"
              max="400"
              step="5"
              value={options.scalePercent}
              onchange={handleScaleInput}
            />
          </div>
          <p class="hint">
            {t('gifTool.sizePreview')
              .replace('{width}', targetWidth.toString())
              .replace('{height}', targetHeight.toString())}
          </p>
        </div>

        <div class="option-block">
          <div class="option-title">{t('gifTool.paletteTitle')}</div>
          <label for="gif-palette-range">{t('gifTool.paletteLabel')}</label>
          <div class="control-pair">
            <input
              id="gif-palette-range"
              type="range"
              min="8"
              max="256"
              step="8"
              value={options.paletteSize}
              oninput={handlePaletteInput}
            />
            <input
              type="number"
              min="8"
              max="256"
              step="1"
              value={options.paletteSize}
              onchange={handlePaletteInput}
            />
          </div>
          <label class="checkbox dither-option" title={t('gifTool.ditherHint')}>
            <input type="checkbox" checked={options.dither} onchange={() => toggleOption('dither')} />
            <span>{t('gifTool.ditherLabel')}</span>
          </label>
          <p class="hint">{t('gifTool.paletteHint')}</p>
        </div>

        <div class="option-block">
          <div class="option-title">{t('gifTool.backgroundTitle')}</div>
          <label class="checkbox">
            <input
              type="checkbox"
              checked={options.optimizeBackground}
              onchange={() => toggleOption('optimizeBackground')}
            />
            <span>{t('gifTool.optimizeLabel')}</span>
          </label>
          <p class="hint">{t('gifTool.optimizeHint')}</p>
        </div>
      </div>

      {#if compression.running}
        <div class="preview-progress">
          <ProgressBar indeterminate label={t('gifTool.processingPreview')} />
        </div>
      {/if}
    </section>

    <section class="editor-grid card">
      <aside class="frame-list">
        <h4>{t('gifTool.frameList')}</h4>
        {#if frames.length}
          <div class="frame-scroll">
            {#each frames as frame, index}
              <button
                type="button"
                class="frame-item {state.selectedIndex === index ? 'is-active' : ''}"
                onclick={() => gifEditorStore.selectFrame(index)}
              >
                <img src={frame.previewUrl} alt={`frame-${index + 1}`} />
                <span class="frame-meta">{index + 1} · {frame.delay} ms</span>
              </button>
            {/each}
          </div>
        {/if}
      </aside>

      <div class="viewer">
        <div class="preview-zoom-bar">
          <span class="zoom-label">{previewZoom}%</span>
          <button type="button" class="control-btn" onclick={zoomPreviewOut} disabled={previewZoomIndex === 0} title={t('gifTool.zoomOut')}>
            −
          </button>
          <button type="button" class="control-btn" onclick={zoomPreviewIn} disabled={previewZoomIndex === ZOOM_STEPS.length - 1} title={t('gifTool.zoomIn')}>
            +
          </button>
          <button type="button" class="control-btn" onclick={zoomPreviewReset} title={t('gifTool.zoomReset')}>
            100%
          </button>
        </div>
        <div class="preview-columns">
          <div class="preview-panel">
            <div class="panel-header">
              <strong>{t('gifTool.previewOriginal')}</strong>
              <button type="button" class="control-btn" onclick={() => (playing = !playing)}>
                {playing ? t('gifTool.pause') : t('gifTool.play')}
              </button>
            </div>
            <div class="viewer-canvas">
              {#if selectedFrame}
                <div class="preview-zoom-wrap" style="width: {state.width * previewZoom / 100}px; height: {state.height * previewZoom / 100}px;">
                  <img src={selectedFrame.previewUrl} alt="original preview" />
                </div>
              {/if}
            </div>
          </div>

          <div class="preview-panel">
            <div class="panel-header">
              <strong>{t('gifTool.previewCompressed')}</strong>
              {#if !compressionReady}
                <span class="hint small">{t('gifTool.previewEmpty')}</span>
              {/if}
            </div>
            <div class="viewer-canvas">
              {#if compressionReady && compressedFrame}
                <div class="preview-zoom-wrap" style="width: {compression.width * previewZoom / 100}px; height: {compression.height * previewZoom / 100}px;">
                  <img src={compressedFrame.previewUrl} alt="compressed preview" />
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card summary-card">
      <h4>{t('gifTool.compressionSummaryTitle')}</h4>
      <div class="summary-table-wrap">
        <table class="summary-table">
          <thead>
            <tr>
              <th></th>
              <th>{t('gifTool.summaryFileSize')}</th>
              <th>{t('gifTool.summaryResolution')}</th>
              <th>{t('gifTool.summaryFrames')}</th>
              <th>{t('gifTool.summaryFps')}</th>
              <th>{t('gifTool.summaryPalette')}</th>
              <th>{t('gifTool.summaryLoops')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('gifTool.summaryColOriginal')}</td>
              <td>{formatBytes(originalBytes)}</td>
              <td>{state.width} × {state.height}px</td>
              <td>{frames.length}</td>
              <td>{formatFps(sourceFps)}</td>
              <td>{state.sourcePaletteSize || 256}</td>
              <td>{state.loopCount ?? 0}</td>
            </tr>
            <tr>
              <td>{t('gifTool.summaryColCompressed')}</td>
              <td>{compressionReady ? formatBytes(estimatedBytes) : '—'}</td>
              <td>{compressionReady ? `${compression.width} × ${compression.height}px` : '—'}</td>
              <td>{compressionReady ? compression.frames?.length : '—'}</td>
              <td>{compressionReady ? formatFps(compression.fps) : '—'}</td>
              <td>{compressionReady ? compression.paletteSize : '—'}</td>
              <td>{state.loopCount ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card export">
      <p class="tips">{t('gifTool.compressionTips')}</p>
      <div class="export-actions">
        <button
          type="button"
          class="btn preset-filled-primary-500"
          onclick={exportGifFile}
          disabled={!frames.length}
        >
          {t('gifTool.downloadGif')}
        </button>
        <button
          type="button"
          class="btn preset-outlined-surface-200-800"
          onclick={() => downloadFramesZip(compression.frames, '-compressed-frames.zip')}
          disabled={!compressionReady}
        >
          {t('gifTool.downloadFrames')}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => downloadFramesZip(frames, '-original-frames.zip')}
          disabled={!frames.length}
        >
          {t('gifTool.downloadOriginalFrames')}
        </button>
      </div>
      {#if exporting}
        <div class="progress">
          <ProgressBar indeterminate label={exportingMessage} />
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .gif-tool .upload h3 {
    margin-top: 0;
  }
  .placeholder {
    color: var(--ccw-text-muted);
  }
  .meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ccw-text-muted);
  }
  .hint.small {
    font-size: 0.75rem;
  }
  .options-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .options-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .options-heading-right {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .options-toggle-wrap {
    width: 100%;
    max-width: 400px;
  }
  .options-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-shrink: 0;
  }
  .status-badge {
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .status-badge.ready {
    color: var(--ccw-accent);
  }
  .option-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }
  .option-block {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: rgba(255, 255, 255, 0.02);
  }
  .option-title {
    font-size: 0.85rem;
    color: var(--ccw-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .control-pair {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .control-pair input[type='number'] {
    width: 80px;
  }
  .checkbox {
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    font-size: 0.85rem;
  }
  .checkbox.toggle-accurate {
    align-items: flex-start;
  }
  .checkbox.toggle-accurate span {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .checkbox input {
    flex: 0 0 auto;
  }
  .checkbox.dither-option {
    cursor: help;
  }
  .checkbox span {
    white-space: nowrap;
  }
  .preview-progress {
    max-width: 320px;
  }
  .editor-grid {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 1rem;
  }
  .frame-list {
    border-right: 1px solid var(--ccw-border-soft);
    padding-right: 0.75rem;
  }
  .frame-list h4 {
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .frame-scroll {
    max-height: 360px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .frame-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: rgba(255, 255, 255, 0.02);
    padding: 0.25rem;
    transition: border-color 150ms ease;
  }
  .frame-item.is-active {
    border-color: var(--ccw-accent);
  }
  .frame-item img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 4px;
    object-fit: cover;
  }
  .frame-item .frame-meta {
    font-size: 0.65rem;
    color: var(--ccw-text-muted);
    white-space: nowrap;
  }
  .viewer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .preview-zoom-bar {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .preview-zoom-bar .zoom-label {
    font-size: 0.85rem;
    color: var(--ccw-text-muted);
    min-width: 2.5rem;
  }
  .preview-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }
  .preview-panel {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .viewer-canvas {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: var(--ccw-bg-base);
    padding: 0.5rem;
    overflow: auto;
    max-height: 420px;
    min-height: 160px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .preview-zoom-wrap {
    flex-shrink: 0;
  }
  .preview-zoom-wrap img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
  }
  .control-btn {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-pill);
    padding: 0.25rem 0.8rem;
    background: rgba(255, 255, 255, 0.02);
    color: var(--ccw-text-secondary);
  }
  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .summary-table-wrap {
    overflow-x: auto;
  }
  .summary-table {
    width: 100%;
    min-width: max-content;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .summary-table th,
  .summary-table td {
    padding: 0.5rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--ccw-border-soft);
  }
  .summary-table th {
    font-weight: 600;
    color: var(--ccw-text-muted);
  }
  .summary-table th:first-child,
  .summary-table td:first-child {
    padding-right: 1.5rem;
    white-space: nowrap;
  }
  .summary-table td:not(:first-child) {
    color: var(--ccw-text-secondary);
  }
  .export {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .tips {
    margin: 0;
    color: var(--ccw-text-muted);
  }
  .export-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .progress {
    max-width: 320px;
  }
  @media (max-width: 960px) {
    .editor-grid {
      grid-template-columns: 1fr;
    }
    .frame-list {
      border-right: none;
      border-bottom: 1px solid var(--ccw-border-soft);
      padding-right: 0;
      padding-bottom: 1rem;
    }
  }
</style>

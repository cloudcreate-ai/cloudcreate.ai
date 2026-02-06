<script>
  /**
   * 步骤详情区 - 展示所有步骤的配置，选中时自动滚动
   */
  import { t } from '../../lib/i18n.js';
  import { getStepOrdinal } from '../../lib/workflow/stepUtils.js';
  import { ACCEPT_IMAGES, filterImageFiles } from '../../lib/batchHelpers.js';

  let {
    steps = [],
    selectedStepIndex = null,
    onParamsChange = () => {},
    files = [],
    onFilesAdd = () => {},
    onClearFiles = () => {},
  } = $props();

  let inputRef = $state(null);

  $effect(() => {
    const idx = selectedStepIndex;
    if (idx == null || idx < 0 || idx >= steps.length) return;
    const el = document.getElementById(`step-detail-${idx}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function updateParams(index, updates) {
    if (index == null) return;
    const step = steps[index];
    onParamsChange(index, { ...step?.params, ...updates });
  }

  function getTarget(e) {
    return e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement
      ? e.target
      : null;
  }

  function getStepTitle(type) {
    if (type === 'resize') return t('workflow.stepResize');
    if (type === 'crop') return t('workflow.stepCrop');
    if (type === 'output') return t('workflow.stepExport');
    if (type === 'input') return t('workflow.stepSelectImages');
    return t('workflow.selectNode');
  }
</script>

<div class="step-detail-list">
  {#each steps as step, index}
    {@const s = step}
    {@const selected = selectedStepIndex === index}
    <div
      id="step-detail-{index}"
      class="step-detail-block"
      class:selected
      data-step-index={index}
    >
      <h3 class="detail-title">
        {getStepOrdinal(index)} {getStepTitle(s.type)}
      </h3>

      {#if s.type === 'input'}
        <p class="config-label config-label-deferred">{t('workflow.inputManualHint')}</p>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="drop-zone"
          role="button"
          tabindex="0"
          ondragover={(e) => e.preventDefault()}
          ondrop={(e) => {
            e.preventDefault();
            const list = filterImageFiles(e.dataTransfer?.files);
            if (list.length) onFilesAdd(list);
          }}
          onclick={() => inputRef?.click()}
          onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
        >
          <input
            type="file"
            accept={ACCEPT_IMAGES}
            multiple
            class="hidden"
            bind:this={inputRef}
            onchange={(e) => {
              const list = filterImageFiles(e.target?.files);
              if (list.length) onFilesAdd(list);
              if (inputRef) inputRef.value = '';
            }}
          />
          <span class="text-surface-600-400">{t('common.addImages')}</span>
        </div>
        {#if files.length > 0}
          <p class="file-count text-sm mt-1">{files.length} {t('workflow.fileCount')}</p>
          <button class="btn btn-sm preset-outlined-surface-200-800 mt-1" onclick={onClearFiles}>
            {t('workflow.clearFiles')}
          </button>
        {/if}
      {:else if s.type === 'resize'}
        <p class="config-label">{t('workflow.presetConfig')}</p>
        <div class="param-row">
          <div class="param-inline">
            <label for="detail-scaleMode-{index}">{t('resize.byPercent')}</label>
            <select
              id="detail-scaleMode-{index}"
              class="select preset-outlined-surface-200-800"
              value={s.params?.scaleMode ?? 'percent'}
              onchange={(e) => { const el = getTarget(e); if (el) updateParams(index, { scaleMode: el.value }); }}
            >
              <option value="percent">{t('resize.byPercent')}</option>
              <option value="max">{t('resize.byMax')}</option>
              <option value="width">{t('resize.byWidth')}</option>
              <option value="height">{t('resize.byHeight')}</option>
              <option value="long">{t('resize.byLong')}</option>
            </select>
          </div>
          {#if (s.params?.scaleMode ?? 'percent') === 'percent'}
            <div class="param-inline">
              <label for="detail-scalePercent-{index}">{t('resize.scalePercent')}</label>
              <input
                id="detail-scalePercent-{index}"
                type="number"
                min="1"
                max="200"
                class="input w-16"
                value={s.params?.scalePercent ?? 50}
                oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { scalePercent: Number(el.value) }); }}
              />
            </div>
          {:else if (s.params?.scaleMode ?? 'percent') === 'max'}
            <div class="param-inline">
              <label for="detail-maxWidth-{index}">{t('resize.maxWidth')}</label>
              <input
                id="detail-maxWidth-{index}"
                type="number"
                min="1"
                class="input w-20"
                value={s.params?.maxWidth ?? 1920}
                oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { maxWidth: Number(el.value) }); }}
              />
            </div>
            <div class="param-inline">
              <label for="detail-maxHeight-{index}">{t('resize.maxHeight')}</label>
              <input
                id="detail-maxHeight-{index}"
                type="number"
                min="1"
                class="input w-20"
                value={s.params?.maxHeight ?? 1080}
                oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { maxHeight: Number(el.value) }); }}
              />
            </div>
          {:else if (s.params?.scaleMode ?? 'percent') === 'width'}
            <div class="param-inline">
              <label for="detail-targetWidth-{index}">{t('resize.targetWidth')}</label>
              <input
                id="detail-targetWidth-{index}"
                type="number"
                min="1"
                class="input w-20"
                value={s.params?.targetWidth ?? 1920}
                oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { targetWidth: Number(el.value) }); }}
              />
            </div>
          {:else if (s.params?.scaleMode ?? 'percent') === 'height'}
            <div class="param-inline">
              <label for="detail-targetHeight-{index}">{t('resize.targetHeight')}</label>
              <input
                id="detail-targetHeight-{index}"
                type="number"
                min="1"
                class="input w-20"
                value={s.params?.targetHeight ?? 1080}
                oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { targetHeight: Number(el.value) }); }}
              />
            </div>
          {:else}
            <div class="param-inline">
              <label for="detail-targetLong-{index}">{t('resize.targetLong')}</label>
              <input
                id="detail-targetLong-{index}"
                type="number"
                min="1"
                class="input w-20"
                value={s.params?.targetLong ?? 1920}
                oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { targetLong: Number(el.value) }); }}
              />
            </div>
          {/if}
        </div>
      {:else if s.type === 'crop'}
        <p class="config-label config-label-deferred">{t('workflow.deferredCropHint')}</p>
        <p class="config-label">{t('workflow.presetConfig')}</p>
        <div class="param-row">
          <div class="param-inline">
            <label for="detail-aspectRatio-{index}">{t('crop.aspectRatioLabel')}</label>
            <select
              id="detail-aspectRatio-{index}"
              class="select preset-outlined-surface-200-800"
              value={String(s.params?.aspectRatio ?? 0)}
              onchange={(e) => { const el = getTarget(e); if (el) updateParams(index, { aspectRatio: Number(el.value) }); }}
            >
              <option value="0">{t('crop.free')}</option>
              <option value="1">1:1</option>
              <option value="1.333">4:3</option>
              <option value="0.75">3:4</option>
              <option value="1.778">16:9</option>
              <option value="0.5625">9:16</option>
            </select>
          </div>
        </div>
      {:else if s.type === 'output'}
        <p class="config-label">{t('workflow.presetConfig')}</p>
        <div class="param-row">
          <div class="param-inline">
            <label for="detail-targetFormat-{index}">{t('compress.outputFormat')}</label>
            <select
              id="detail-targetFormat-{index}"
              class="select preset-outlined-surface-200-800"
              value={s.params?.targetFormat ?? ''}
              onchange={(e) => { const el = getTarget(e); if (el) updateParams(index, { targetFormat: el.value }); }}
            >
              <option value="">{t('common.sameAsOriginal')}</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
            </select>
          </div>
          <div class="param-inline">
            <label for="detail-quality-{index}">{t('common.quality')}</label>
            <input
              id="detail-quality-{index}"
              type="number"
              min="1"
              max="100"
              class="input w-16"
              value={s.params?.quality ?? 75}
              oninput={(e) => { const el = getTarget(e); if (el) updateParams(index, { quality: Number(el.value) }); }}
            />
          </div>
        </div>
      {:else}
        <p class="detail-empty">{t('workflow.noParams')}</p>
      {/if}
    </div>
  {/each}
</div>

<style>
  .step-detail-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem 1rem;
    width: 100%;
    box-sizing: border-box;
  }
  .step-detail-block {
    padding: 0.75rem 1rem;
    background: var(--color-surface-50-950);
    border: 1px solid var(--color-surface-200-800);
    border-radius: 8px;
    width: 100%;
    box-sizing: border-box;
  }
  .step-detail-block.selected {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 1px var(--color-primary-500);
  }
  .detail-title {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0 0 0.5rem;
  }
  .config-label {
    font-size: 0.75rem;
    color: var(--color-surface-600-400);
    margin: 0 0 0.35rem;
  }
  .config-label-deferred {
    color: var(--color-primary-500);
    margin-bottom: 0.5rem;
  }
  .param-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem 1rem;
  }
  .param-inline {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .param-inline label {
    font-size: 0.7rem;
    color: var(--color-surface-600-400);
    white-space: nowrap;
  }
  .param-group {
    margin-bottom: 0.5rem;
  }
  .param-group:last-child {
    margin-bottom: 0;
  }
  .param-group label {
    display: block;
    font-size: 0.75rem;
    color: var(--color-surface-600-400);
    margin-bottom: 0.25rem;
  }
  .detail-empty {
    font-size: 0.85rem;
    color: var(--color-surface-600-400);
    margin: 0;
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
  .file-count {
    margin: 0.25rem 0 0;
    color: var(--color-surface-600-400);
  }
</style>

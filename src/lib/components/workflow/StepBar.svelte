<script>
  /**
   * 步骤条 - 紧凑卡片展示，支持添加步骤、选中
   */
  import { t } from '$lib/i18n.js';
  import { getStepOrdinal, formatStepBrief } from '$lib/workflow/stepUtils.js';

  let {
    steps = [],
    selectedIndex = null,
    executingStepIndex = null,
    waitingStepIndex = null,
    readonly = false,
    onSelect = () => {},
    onAddStep = () => {},
    onRemoveStep = () => {},
  } = $props();

  let addDropdownIndex = $state(null);

  const stepIcons = { input: '📷', resize: '📐', crop: '✂️', output: '⬇️' };
  const stepNameKeys = {
    input: 'workflow.stepSelectImages',
    resize: 'workflow.stepResize',
    crop: 'workflow.stepCrop',
    output: 'workflow.stepExport',
  };

  function toggleAddDropdown(i) {
    addDropdownIndex = addDropdownIndex === i ? null : i;
  }

  function addStepAfter(index, type) {
    onAddStep(index + 1, type);
    addDropdownIndex = null;
  }

  function isMiddleStep(type) {
    return type === 'resize' || type === 'crop';
  }

  function closeAddDropdownOnOutsideClick(e) {
    const el = e.target instanceof Element ? e.target : null;
    if (addDropdownIndex != null && el && !el.closest('.add-dropdown') && !el.closest('.add-step-btn')) {
      addDropdownIndex = null;
    }
  }
</script>

<svelte:window onclick={closeAddDropdownOnOutsideClick} />

<div
  class="step-bar"
  role="group"
  aria-label="Workflow steps"
>
  {#each steps as step, i}
    {#if !readonly && i > 0}
      <div class="step-gap">
        <button
          class="add-step-btn"
          onclick={() => toggleAddDropdown(i - 1)}
          type="button"
          aria-haspopup="true"
          aria-expanded={addDropdownIndex === i - 1}
          title={t('workflow.addStep')}
        >
          +
        </button>
        {#if addDropdownIndex === i - 1}
          <div class="add-dropdown" role="menu">
            <button
              class="add-dropdown-item"
              onclick={() => addStepAfter(i - 1, 'resize')}
              type="button"
              role="menuitem"
            >
              📐 {t('workflow.stepResize')}
            </button>
            <button
              class="add-dropdown-item"
              onclick={() => addStepAfter(i - 1, 'crop')}
              type="button"
              role="menuitem"
            >
              ✂️ {t('workflow.stepCrop')}
            </button>
          </div>
        {/if}
      </div>
    {:else if readonly && i > 0}
      <div class="step-gap step-gap-readonly" aria-hidden="true">→</div>
    {/if}

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="step-card"
      class:selected={!readonly && selectedIndex === i}
      class:executing={!readonly && executingStepIndex === i}
      class:waiting={!readonly && waitingStepIndex === i}
      class:clickable={!readonly && (isMiddleStep(step.type) || step.type === 'output')}
      class:readonly={readonly}
      role={readonly ? 'presentation' : 'button'}
      tabindex={readonly ? -1 : (isMiddleStep(step.type) || step.type === 'output' ? 0 : -1)}
      onclick={() => !readonly && (isMiddleStep(step.type) || step.type === 'output') && onSelect(i)}
      onkeydown={(e) => !readonly && (e.key === 'Enter' || e.key === ' ') && (isMiddleStep(step.type) || step.type === 'output') && (e.preventDefault(), onSelect(i))}
    >
      <span class="step-ordinal" aria-hidden="true">{getStepOrdinal(i)}</span>
      <span class="step-label">{t(stepNameKeys[step.type] ?? 'workflow.stepExport')}</span>
      {#if formatStepBrief(step.type, step.params)}
        <span class="step-brief">{formatStepBrief(step.type, step.params)}</span>
      {/if}
      {#if !readonly && isMiddleStep(step.type)}
        <button
          class="step-remove"
          onclick={(e) => { e.stopPropagation(); onRemoveStep(i); }}
          type="button"
          aria-label="Remove"
          title="Remove"
        >
          ×
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .step-bar {
    display: flex;
    align-items: stretch;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0;
    padding: 0.75rem 1rem;
    background: var(--color-surface-50-950);
    border: 1px solid var(--color-surface-200-800);
    border-radius: 12px;
    width: 100%;
    min-width: 320px;
    box-sizing: border-box;
  }
  .step-gap {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 0.25rem;
  }
  .step-gap-readonly {
    color: var(--color-surface-500-500);
    font-size: 0.8rem;
  }
  .add-step-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: 1rem;
    line-height: 1;
    border-radius: 50%;
    border: 1px dashed var(--color-surface-400-600);
    background: transparent;
    color: var(--color-surface-500-500);
    cursor: pointer;
  }
  .add-step-btn:hover {
    border-color: var(--color-primary-500);
    color: var(--color-primary-500);
  }
  .add-dropdown {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 0.25rem;
    padding: 0.35rem 0;
    min-width: 160px;
    background: var(--color-surface-100-900);
    border: 1px solid var(--color-surface-200-800);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }
  .add-dropdown-item {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
  }
  .add-dropdown-item:hover {
    background: var(--color-surface-200-800);
  }
  .step-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.4rem 0.75rem;
    min-width: 80px;
    min-height: 56px;
    background: var(--color-surface-100-900);
    border: 1px solid var(--color-surface-200-800);
    border-radius: 8px;
  }
  .step-card.clickable {
    cursor: pointer;
  }
  .step-card.readonly {
    cursor: default;
  }
  .step-card.selected {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 2px var(--color-primary-500);
  }
  .step-card.executing {
    border-color: var(--color-primary-500);
    background: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
  }
  .step-card.waiting {
    border-color: var(--color-warning-500, #ff9800);
    background: color-mix(in srgb, var(--color-warning-500, #ff9800) 12%, transparent);
    animation: pulse-waiting 1.2s ease-in-out infinite;
  }
  @keyframes pulse-waiting {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  .step-ordinal {
    font-size: 0.7rem;
    color: var(--color-surface-500-500);
  }
  .step-label {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--color-surface-700-300);
  }
  .step-brief {
    font-size: 0.65rem;
    color: var(--color-surface-600-400);
  }
  .step-remove {
    position: absolute;
    top: 2px;
    right: 4px;
    width: 16px;
    height: 16px;
    padding: 0;
    font-size: 0.9rem;
    line-height: 1;
    border: none;
    background: none;
    color: var(--color-surface-500-500);
    cursor: pointer;
    opacity: 0.7;
  }
  .step-remove:hover {
    color: var(--color-error-500, #e53935);
    opacity: 1;
  }
</style>

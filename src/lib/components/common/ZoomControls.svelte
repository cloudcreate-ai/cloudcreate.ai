<script>
  /**
   * 缩放控制：滑轨 + 缩放按钮 + 数值输入
   * Props: value, min, max, step, onchange, disabled, resetValue, suffix
   */
  import { t } from '$lib/i18n.js';

  let {
    value = 1,
    min = 0.25,
    max = 3,
    step = 0.05,
    onchange: onChange,
    disabled = false,
    resetValue = null,
    suffix = '%',
    /** 当 value 为 scale 系数（如 1=100%）时设为 true，显示会乘以 100 */
    scaleDisplay = false,
  } = $props();

  function clamp(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return value;
    return Math.max(min, Math.min(max, n));
  }

  function handleInput(e) {
    const v = clamp(e.currentTarget.value);
    onChange?.(v);
  }

  function stepDown() {
    if (disabled) return;
    const v = Math.max(min, value - step);
    const rounded = Math.round(v / step) * step;
    onChange?.(Math.max(min, Math.min(max, rounded)));
  }

  function stepUp() {
    if (disabled) return;
    const v = Math.min(max, value + step);
    const rounded = Math.round(v / step) * step;
    onChange?.(Math.max(min, Math.min(max, rounded)));
  }

  function handleReset() {
    if (disabled || resetValue == null) return;
    onChange?.(clamp(resetValue));
  }

  const displayValue = $derived(
    scaleDisplay
      ? Math.round(value * 100)
      : Number.isInteger(value)
        ? value
        : value < 1
          ? value.toFixed(2)
          : value.toFixed(1).replace(/\.0$/, '')
  );
</script>

<div class="zoom-controls">
  <button
    type="button"
    class="control-btn"
    onclick={stepDown}
    disabled={disabled || value <= min}
    title={t('common.zoomOut')}
    aria-label={t('common.zoomOut')}
  >
    −
  </button>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    {disabled}
    oninput={handleInput}
    class="zoom-slider"
  />
  <input
    type="number"
    {min}
    {max}
    {step}
    {value}
    {disabled}
    oninput={handleInput}
    class="zoom-input"
  />
  <span class="zoom-label">{displayValue}{suffix}</span>
  <button
    type="button"
    class="control-btn"
    onclick={stepUp}
    disabled={disabled || value >= max}
    title={t('common.zoomIn')}
    aria-label={t('common.zoomIn')}
  >
    +
  </button>
  {#if resetValue != null}
    <button
      type="button"
      class="control-btn"
      onclick={handleReset}
      disabled={disabled}
      title={t('common.zoomReset')}
      aria-label={t('common.zoomReset')}
    >
      {scaleDisplay ? `${Math.round(resetValue * 100)}%` : suffix ? `${Math.round(resetValue)}${suffix}` : t('common.zoomReset')}
    </button>
  {/if}
</div>

<style>
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .control-btn {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-pill);
    padding: 0.25rem 0.6rem;
    background: rgba(255, 255, 255, 0.02);
    color: var(--ccw-text-secondary);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
  }
  .control-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
  }
  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .zoom-slider {
    flex: 1;
    min-width: 60px;
  }
  .zoom-input {
    width: 64px;
    padding: 0.2rem 0.35rem;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: rgba(255, 255, 255, 0.05);
    color: var(--ccw-text-primary);
    font-size: 0.85rem;
    text-align: center;
  }
  .zoom-label {
    font-size: 0.85rem;
    color: var(--ccw-text-muted);
    min-width: 2.5rem;
  }
</style>

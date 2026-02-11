<script>
  /**
   * 通用进度条
   * Props:
   * - value: 0~max 的当前值
   * - max:   总量，默认 100
   * - indeterminate: 不确定状态
   * - label: 文本，可选
   */
  const props = $props();
  const value = $derived(Number(props.value ?? 0));
  const max = $derived(() => {
    const m = Number(props.max ?? 100);
    return Number.isFinite(m) && m > 0 ? m : 100;
  });
  const indeterminate = $derived(Boolean(props.indeterminate));
  const label = $derived(props.label ?? '');

  const percentage = $derived(Math.max(0, Math.min(100, (value / (max || 1)) * 100)));
</script>

<div
  class="ccw-progress"
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax={max}
  aria-valuenow={indeterminate ? undefined : value}
>
  {#if label}
    <span class="ccw-progress-label">{label}</span>
  {/if}
  <div class="ccw-progress-track">
    <div
      class="ccw-progress-bar"
      class:indeterminate
      style={!indeterminate ? `width: ${percentage}%` : 'width: 100%;'}
    ></div>
  </div>
</div>

<style>
  .ccw-progress {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .ccw-progress-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ccw-text-muted);
  }
  .ccw-progress-track {
    position: relative;
    height: 4px;
    border-radius: var(--ccw-radius-pill);
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .ccw-progress-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, var(--ccw-accent-strong), var(--ccw-accent));
    border-radius: inherit;
    transition: width 200ms ease;
  }
  .ccw-progress-bar.indeterminate {
    animation: ccw-progress-indeterminate 1.4s infinite ease;
  }
  @keyframes ccw-progress-indeterminate {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(0%);
    }
    100% {
      transform: translateX(100%);
    }
  }
</style>

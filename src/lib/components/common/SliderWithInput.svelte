<script>
  /**
   * 滑轨 + 数字输入组合组件，支持拖拽与直接输入
   */
  let { value = 0, min = 0, max = 100, step = 1, id = '', inputWidth = '80px', oninput: onInput } = $props();

  function handleInput(e) {
    const v = Number(e.currentTarget.value);
    if (!Number.isNaN(v)) {
      const clamped = Math.max(min, Math.min(max, v));
      onInput?.(clamped);
    }
  }
</script>

<div class="slider-with-input">
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {value}
    oninput={handleInput}
    class="slider"
  />
  <input
    type="number"
    {min}
    {max}
    {step}
    {value}
    oninput={handleInput}
    class="input-num"
    style="width: {inputWidth}"
  />
</div>

<style>
  .slider-with-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .slider {
    flex: 1;
    min-width: 0;
  }
  .input-num {
    flex-shrink: 0;
    text-align: center;
    padding: 0.25rem 0.35rem;
    border: 1px solid var(--ccw-border-soft, #444);
    border-radius: var(--ccw-radius-card, 6px);
    background: rgba(255, 255, 255, 0.05);
    color: var(--ccw-text-primary, #eee);
    font-size: 0.9rem;
  }
</style>

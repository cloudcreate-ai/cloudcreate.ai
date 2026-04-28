<script>
  /**
   * 框架测试页 - 用于验证布局结构，便于调试和后续填充实际内容
   * 布局结构：app-shell (上|中|下) -> app-shell-main (左|中|右)
   */
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.framework',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<div class="framework-test">
  <div class="framework-region framework-workspace">
    <h2 class="framework-label">Workspace（工作区）</h2>
    <p class="framework-desc">
      此区域为 app-shell-workspace 的 slot 内容。左侧为侧边栏，右侧为 AI 面板。
    </p>
    <div class="framework-grid">
      <div class="framework-cell">1</div>
      <div class="framework-cell">2</div>
      <div class="framework-cell">3</div>
      <div class="framework-cell">4</div>
      <div class="framework-cell">5</div>
      <div class="framework-cell">6</div>
    </div>
  </div>
</div>

<style>
  .framework-test {
    width: 100%;
    min-height: 100%;
    border: 2px dashed var(--color-primary-500);
    border-radius: 8px;
    padding: 1rem;
    background: color-mix(in oklab, var(--color-primary-500) 5%, transparent);
    box-sizing: border-box;
  }
  .framework-region {
    max-width: var(--ccw-layout-content-max);
    margin: 0 auto;
  }
  .framework-label {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--color-primary-600-400);
  }
  .framework-desc {
    font-size: 0.875rem;
    color: var(--color-surface-600-400);
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }
  .framework-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  .framework-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-200-800);
    border-radius: 6px;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-surface-600-400);
  }
</style>

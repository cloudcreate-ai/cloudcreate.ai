<script>
  /**
   * 工具页头部 - 标题、描述（导航由侧边栏提供）；标题行右侧为收藏
   */
  import { t } from '$lib/i18n.js';
  import ToolPageFavoriteButton from '$lib/components/ToolPageFavoriteButton.svelte';

  let { title = '', titleKey = '', desc = '', descKey = '' } = $props();

  const titleText = $derived(titleKey ? t(titleKey) : title);
  const descText = $derived(descKey ? t(descKey) : desc);
</script>

<header class="tool-page-header">
  <div class="tool-page-header-title-row">
    <h1 class="tool-page-header-title text-xl font-semibold m-0 flex-1 min-w-0">{titleText}</h1>
    <ToolPageFavoriteButton />
  </div>
  {#if descText}
    <p class="text-surface-600-400 text-sm m-0 mt-1">{descText}</p>
  {/if}
</header>

<style>
  .tool-page-header {
    margin-bottom: var(--ccw-workspace-block-gap, 1rem);
  }

  .tool-page-header-title-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }
</style>

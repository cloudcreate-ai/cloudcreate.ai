<script>
  /**
   * 工具页头部 - 标题、描述（导航由侧边栏提供）
   */
  import { t } from '$lib/i18n.js';

  let { title = '', titleKey = '', desc = '', descKey = '' } = $props();

  const titleText = $derived(titleKey ? t(titleKey) : title);
  const descText = $derived(descKey ? t(descKey) : desc);
</script>

<header class="tool-page-header">
  <h1 class="text-xl font-semibold mb-1">{titleText}</h1>
  {#if descText}
    <p class="text-surface-600-400 text-sm m-0">{descText}</p>
  {/if}
</header>

<style>
  .tool-page-header {
    margin-bottom: 1rem;
  }
</style>

<script>
  /**
   * 工具页头部 - 返回链接、标题、描述
   */
  import { link } from 'svelte-spa-router';
  import { t } from '../lib/i18n.js';

  let { title = '', titleKey = '', desc = '', descKey = '' } = $props();

  const titleText = $derived(titleKey ? t(titleKey) : title);
  const descText = $derived(descKey ? t(descKey) : desc);
</script>

<header class="mb-6">
  <a href="/" use:link class="text-primary-500 text-sm no-underline hover:underline block mb-3">
    {t('common.backWorkspace')}
  </a>
  <h1 class="text-2xl font-semibold mb-1">{titleText}</h1>
  {#if descText}
    <p class="text-surface-600-400 text-sm m-0">{descText}</p>
  {/if}
</header>

<script>
  /**
   * CSS 工具索引 - 链接到压缩、解压
   */
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { t } from '$lib/i18n.js';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import { localePath } from '$lib/localePath.js';

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.cssIndex',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<div class="workspace-layout-overview">
  <header class="tool-page-header mb-6">
    <h1 class="text-xl font-semibold mb-1">{t('cssIndex.title')}</h1>
    <p class="text-surface-600-400 text-sm m-0">{t('cssIndex.desc')}</p>
  </header>

  <section class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
    <a
      href={localePath($page.url.pathname, '/css/minify')}
      class="card preset-outlined-surface-200-800 block p-5 no-underline text-inherit"
    >
      <span class="text-2xl block mb-2">🗜️</span>
      <h2 class="text-base font-semibold mb-1">{t('cssIndex.minify')}</h2>
      <p class="text-sm text-surface-600-400 m-0">{t('cssIndex.minifyDesc')}</p>
    </a>
    <a
      href={localePath($page.url.pathname, '/css/beautify')}
      class="card preset-outlined-surface-200-800 block p-5 no-underline text-inherit"
    >
      <span class="text-2xl block mb-2">📐</span>
      <h2 class="text-base font-semibold mb-1">{t('cssIndex.beautify')}</h2>
      <p class="text-sm text-surface-600-400 m-0">{t('cssIndex.beautifyDesc')}</p>
    </a>
  </section>
</div>

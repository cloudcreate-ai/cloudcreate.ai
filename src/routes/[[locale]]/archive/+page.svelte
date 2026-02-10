<script>
  /**
   * 压缩包工具索引
   */
  import { page } from '$app/stores';
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
</script>

<main class="p-8 max-w-4xl mx-auto">
  <header class="mb-6">
    <a href={localePath($page.url.pathname, '/')} class="text-primary-500 text-sm no-underline hover:underline block mb-3">
      {t('common.backWorkspace')}
    </a>
    <h1 class="text-2xl font-semibold mb-1">{t('archiveIndex.title')}</h1>
    <p class="text-surface-600-400 text-sm m-0">{t('archiveIndex.desc')}</p>
  </header>

  <section class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
    <a
      href={localePath($page.url.pathname, '/archive/decompress')}
      class="card preset-outlined-surface-200-800 block p-5 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
    >
      <span class="text-2xl block mb-2">📂</span>
      <h2 class="text-base font-semibold mb-1">{t('archiveIndex.decompress')}</h2>
      <p class="text-sm text-surface-600-400 m-0">{t('archiveIndex.decompressDesc')}</p>
    </a>
    <a
      href={localePath($page.url.pathname, '/archive/compress')}
      class="card preset-outlined-surface-200-800 block p-5 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
    >
      <span class="text-2xl block mb-2">📦</span>
      <h2 class="text-base font-semibold mb-1">{t('archiveIndex.compress')}</h2>
      <p class="text-sm text-surface-600-400 m-0">{t('archiveIndex.compressDesc')}</p>
    </a>
  </section>
</main>

<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { locale, setLocale, t } from '$lib/i18n.js';
  import { pathForLocale } from '$lib/localePath.js';

  const tools = [
    { id: 'compress', titleKey: 'home.compressTitle', descKey: 'home.compressDesc', href: '/image/compress', icon: '🗜️' },
    { id: 'crop', titleKey: 'home.cropTitle', descKey: 'home.cropDesc', href: '/image/crop', icon: '✂️' },
    { id: 'resize', titleKey: 'home.resizeTitle', descKey: 'home.resizeDesc', href: '/image/resize', icon: '📐' },
    { id: 'rotate', titleKey: 'home.rotateTitle', descKey: 'home.rotateDesc', href: '/image/rotate', icon: '🔄' },
    { id: 'favicon', titleKey: 'home.faviconTitle', descKey: 'home.faviconDesc', href: '/image/favicon', icon: '🖼️' },
    { id: 'playstore', titleKey: 'home.playstoreTitle', descKey: 'home.playstoreDesc', href: '/image/playstore', icon: '📱' },
    { id: 'appstore', titleKey: 'home.appstoreTitle', descKey: 'home.appstoreDesc', href: '/image/appstore', icon: '🍎' },
    { id: 'cssMinify', titleKey: 'home.cssMinifyTitle', descKey: 'home.cssMinifyDesc', href: '/css/minify', icon: '🗜️' },
    { id: 'cssBeautify', titleKey: 'home.cssBeautifyTitle', descKey: 'home.cssBeautifyDesc', href: '/css/beautify', icon: '📐' },
    { id: 'archiveDecompress', titleKey: 'home.archiveDecompressTitle', descKey: 'home.archiveDecompressDesc', href: '/archive/decompress', icon: '📂' },
    { id: 'archiveCompress', titleKey: 'home.archiveCompressTitle', descKey: 'home.archiveCompressDesc', href: '/archive/compress', icon: '📦' },
    { id: 'workflow', titleKey: 'home.workflowTitle', descKey: 'home.workflowDesc', href: '/workflow', icon: '🔀' },
  ];

  /** 强制跳转到对应语言前缀的当前页；replaceState 避免历史堆积 */
  function switchLocale(lang) {
    setLocale(lang);
    const target = pathForLocale(lang, $page.url.pathname);
    goto(target, { replaceState: true });
  }
</script>

<main class="p-8 max-w-4xl mx-auto">
  <header class="mb-10 text-center relative">
    <div class="absolute top-0 right-0 flex gap-1">
      <button
        onclick={() => switchLocale('en')}
        class="btn btn-sm {$locale === 'en' ? 'preset-filled-primary-500' : 'preset-outlined-surface-200-800'}"
        aria-pressed={$locale === 'en'}
      >
        EN
      </button>
      <button
        onclick={() => switchLocale('zh')}
        class="btn btn-sm {$locale === 'zh' ? 'preset-filled-primary-500' : 'preset-outlined-surface-200-800'}"
        aria-pressed={$locale === 'zh'}
      >
        中文
      </button>
    </div>
    <h1 class="text-3xl font-semibold mb-1">{t('home.title')}</h1>
    <p class="text-surface-600-400 text-sm m-0">{t('home.subtitle')}</p>
  </header>

  <section class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
    {#each tools as tool}
      <a
        href={pathForLocale($locale, tool.href)}
        class="card preset-outlined-surface-200-800 block p-6 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
      >
        <span class="text-3xl block mb-3">{tool.icon}</span>
        <h2 class="text-lg font-semibold mb-2">{t(tool.titleKey)}</h2>
        <p class="text-sm text-surface-600-400 leading-relaxed m-0">{t(tool.descKey)}</p>
      </a>
    {/each}
  </section>
</main>

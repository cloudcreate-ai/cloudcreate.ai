<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { locale, setLocale, t } from '$lib/i18n.js';
  import { pathForLocale } from '$lib/localePath.js';
  import { isCompactMode, leftSidebarOpen } from '$lib/stores/layoutStore.js';

  function switchLocale(lang) {
    setLocale(lang);
    const target = pathForLocale(lang, $page.url.pathname);
    goto(target, { replaceState: true });
  }
</script>

<header class="app-header">
  <div class="app-header-left">
    {#if $isCompactMode}
      <button
        type="button"
        class="app-header-menu-btn"
        onclick={() => leftSidebarOpen.update((v) => !v)}
        aria-label={t('layout.toggleSidebar')}
        aria-expanded={$leftSidebarOpen}
      >
        ☰
      </button>
    {/if}
    <a href={pathForLocale($locale, '/')} class="app-header-title">{t('home.title')}</a>
  </div>
  <div class="app-header-actions">
    <button
      onclick={() => switchLocale('en')}
      class="btn btn-xs {$locale === 'en' ? 'preset-filled-primary-500' : 'preset-outlined-surface-200-800'}"
      aria-pressed={$locale === 'en'}
    >
      EN
    </button>
    <button
      onclick={() => switchLocale('zh')}
      class="btn btn-xs {$locale === 'zh' ? 'preset-filled-primary-500' : 'preset-outlined-surface-200-800'}"
      aria-pressed={$locale === 'zh'}
    >
      中文
    </button>
  </div>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 0.75rem;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-surface-200-800);
    background: var(--color-surface-50-950);
  }
  .app-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .app-header-menu-btn {
    padding: 0.25rem 0.5rem;
    font-size: 1.125rem;
    line-height: 1;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    border-radius: 4px;
  }
  .app-header-menu-btn:hover {
    background: var(--color-surface-200-800);
  }
  .app-header-title {
    font-size: 0.9375rem;
    font-weight: 600;
    text-decoration: none;
    color: inherit;
  }
  .app-header-title:hover {
    color: var(--color-primary-500);
  }
  .app-header-actions {
    display: flex;
    gap: 0.25rem;
  }
  :global(.btn-xs) {
    padding: 0.15rem 0.4rem;
    font-size: 0.75rem;
  }
</style>

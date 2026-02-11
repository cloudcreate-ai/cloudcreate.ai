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
      type="button"
      class="app-header-locale {$locale === 'en' ? 'is-active' : ''}"
      onclick={() => switchLocale('en')}
      aria-pressed={$locale === 'en'}
    >
      EN
    </button>
    <button
      type="button"
      class="app-header-locale {$locale === 'zh' ? 'is-active' : ''}"
      onclick={() => switchLocale('zh')}
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
    height: 46px;
    padding: 0 1rem;
    flex-shrink: 0;
    border-bottom: 1px solid var(--ccw-border-contrast);
    background: var(--ccw-bg-panel);
    box-shadow: 0 1px 0 var(--ccw-border-soft);
  }
  .app-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .app-header-menu-btn {
    padding: 0.2rem 0.55rem;
    font-size: 1.05rem;
    line-height: 1;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--ccw-text-secondary);
    border-radius: var(--ccw-radius-pill);
    transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
  }
  .app-header-menu-btn:hover {
    color: var(--ccw-text-primary);
    border-color: var(--ccw-border-soft);
    background: rgba(255, 255, 255, 0.05);
  }
  .app-header-title {
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--ccw-text-primary);
  }
  .app-header-title:hover {
    color: var(--ccw-accent);
  }
  .app-header-actions {
    display: flex;
    gap: 0.25rem;
  }
  .app-header-locale {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-pill);
    font-size: 0.75rem;
    padding: 0.15rem 0.65rem;
    background: transparent;
    color: var(--ccw-text-secondary);
    cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
  }
  .app-header-locale:hover {
    color: var(--ccw-text-primary);
    border-color: var(--ccw-border-contrast);
    background: rgba(255, 255, 255, 0.04);
  }
  .app-header-locale.is-active {
    background: var(--ccw-accent-strong);
    color: #fff;
    border-color: var(--ccw-accent-strong);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.2);
  }
</style>

<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { locale, setLocale, t } from '$lib/i18n.js';
  import { pathForLocale } from '$lib/localePath.js';
  import { isCompactMode, leftSidebarOpen } from '$lib/stores/layoutStore.js';
  import { NAV_CATEGORIES, resolveCategoryId } from '$lib/navRegistry.js';

  function switchLocale(lang) {
    setLocale(lang);
    const target = pathForLocale(lang, $page.url.pathname);
    goto(target, { replaceState: true });
  }

  const currentCategoryId = $derived(resolveCategoryId($page.url.pathname));
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
  <nav class="app-header-categories" aria-label={t('layout.categoryNav')}>
    {#each NAV_CATEGORIES as cat}
      <a
        href={pathForLocale($locale, cat.navHomeLogicalPath)}
        class="app-header-category"
        class:is-active={currentCategoryId === cat.id}
        aria-current={currentCategoryId === cat.id ? 'page' : undefined}
      >
        {t(cat.labelKey)}
      </a>
    {/each}
  </nav>
  <div class="app-header-actions">
    <div class="app-header-locale-group" role="group" aria-label={t('layout.localeSwitcher')}>
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
  </div>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
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
  .app-header-categories {
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 0.1rem;
    flex: 1 1 auto;
    min-width: 0;
  }
  /* 主导航：文字 + 底部高亮条，与右侧语言分段控件区分 */
  .app-header-category {
    position: relative;
    display: inline-flex;
    align-items: center;
    border: none;
    border-radius: 0;
    font-size: 0.8125rem;
    font-weight: 500;
    padding: 0.35rem 0.5rem 0.4rem;
    margin: 0 0.12rem;
    background: transparent;
    color: var(--ccw-text-secondary);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: color 150ms ease, font-weight 150ms ease;
  }
  a.app-header-category:hover:not(.is-active) {
    color: var(--ccw-text-primary);
  }
  .app-header-category:focus-visible {
    outline: 2px solid var(--ccw-accent);
    outline-offset: 3px;
    border-radius: var(--ccw-radius-card);
  }
  .app-header-category.is-active {
    color: var(--ccw-text-primary);
    font-weight: 600;
  }
  .app-header-category.is-active::after {
    content: '';
    position: absolute;
    left: 0.15rem;
    right: 0.15rem;
    bottom: 0.05rem;
    height: 2px;
    border-radius: 1px;
    background: var(--ccw-accent);
  }
  a.app-header-category.is-active:hover {
    color: var(--ccw-text-primary);
  }
  .app-header-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  /* 语言：单框分段，选中态用表面色块区分（不用主色实心，避免与导航混淆） */
  .app-header-locale-group {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: var(--ccw-bg-base);
    overflow: hidden;
  }
  .app-header-locale {
    margin: 0;
    border: none;
    border-radius: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.28rem 0.6rem;
    min-width: 2.5rem;
    background: transparent;
    color: var(--ccw-text-muted);
    cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease;
  }
  .app-header-locale + .app-header-locale {
    border-left: 1px solid var(--ccw-border-soft);
  }
  .app-header-locale:hover:not(.is-active) {
    color: var(--ccw-text-secondary);
    background: var(--ccw-bg-elevated);
  }
  .app-header-locale:focus-visible {
    outline: 2px solid var(--ccw-accent);
    outline-offset: 2px;
    position: relative;
    z-index: 1;
  }
  .app-header-locale.is-active {
    background: var(--ccw-bg-elevated);
    color: var(--ccw-text-primary);
  }
</style>

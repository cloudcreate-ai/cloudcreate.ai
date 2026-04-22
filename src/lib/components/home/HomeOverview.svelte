<script>
  /**
   * 工作区 / 工具概览 / 创意概览 共用的「我的收藏」「最近使用」「常用」主区。
   */
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import {
    TOOL_GROUPS,
    CREATIVE_CARD_ITEMS,
    findToolByHref,
    isLandingNoPrefsPath,
  } from '$lib/toolList.js';
  import { favorites, recentlyUsed, toggleFavorite } from '$lib/stores/userPrefsStore.js';

  /** @type {'workspace' | 'tools' | 'creative'} */
  let { variant = 'workspace' } = $props();

  $effect(() => {
    void variant;
    const key =
      variant === 'workspace'
        ? 'agentPrompt.genericWorkspace'
        : variant === 'tools'
          ? 'agentPrompt.genericTools'
          : 'agentPrompt.genericCreative';
    return registerAgentPrompt({
      templateKey: key,
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });

  const allTools = $derived(TOOL_GROUPS.flatMap((g) => g.items));

  /** @param {string} storedHref */
  function matchesVariant(storedHref) {
    const i = storedHref.indexOf('#');
    const pathOnly = i >= 0 ? storedHref.slice(0, i) : storedHref;
    const logical = pathOnly.startsWith('/') ? pathOnly : '/' + pathOnly;
    const isCreative = logical === '/creative' || logical.startsWith('/creative/');
    if (variant === 'workspace') return true;
    if (variant === 'tools') return !isCreative;
    return isCreative;
  }

  const introKey = $derived(
    variant === 'workspace'
      ? 'home.subtitle'
      : variant === 'tools'
        ? 'home.toolsOverviewIntro'
        : 'creative.overviewIntro',
  );

  const commonSectionTitleKey = $derived(
    variant === 'creative' ? 'creative.commonShortcutsTitle' : 'home.commonToolsTitle',
  );

  /** @param {string} storedHref */
  function pathOnlyForFilter(storedHref) {
    const i = storedHref.indexOf('#');
    const pathOnly = i >= 0 ? storedHref.slice(0, i) : storedHref;
    return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  }

  const favoriteEntries = $derived(
    $favorites
      .map((storedHref) => {
        if (!matchesVariant(storedHref)) return null;
        if (isLandingNoPrefsPath(pathOnlyForFilter(storedHref))) return null;
        const tool = findToolByHref(storedHref);
        return tool ? { storedHref, tool } : null;
      })
      .filter(Boolean),
  );

  const recentEntries = $derived(
    $recentlyUsed
      .map((entry) => {
        if (!matchesVariant(entry.href)) return null;
        if (isLandingNoPrefsPath(pathOnlyForFilter(entry.href))) return null;
        const tool = findToolByHref(entry.href);
        return tool ? { storedHref: entry.href, tool } : null;
      })
      .filter(Boolean),
  );

  /** @param {string} stored */
  function localeLinkFromStored(stored) {
    const i = stored.indexOf('#');
    const pathOnly = i >= 0 ? stored.slice(0, i) : stored;
    const hash = i >= 0 ? stored.slice(i) : '';
    return localePath($page.url.pathname, pathOnly) + hash;
  }

  function isFavorite(href) {
    return $favorites.includes(href);
  }
</script>

<div class="home-workspace">
  <p class="home-intro" class:home-intro--plain={variant === 'creative'}>{t(introKey)}</p>

  <section class="home-section">
    <h2 class="home-section-title">{t('home.favoritesTitle')}</h2>
    {#if favoriteEntries.length > 0}
      <div class="home-tool-grid">
        {#each favoriteEntries as { storedHref, tool } (storedHref)}
          {@const fav = isFavorite(storedHref)}
          <a
            href={localeLinkFromStored(storedHref)}
            class="home-tool-card card block p-4 no-underline text-inherit"
          >
            <button
              type="button"
              class="home-tool-fav {fav ? 'is-active' : ''}"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(storedHref);
              }}
              aria-label={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
              title={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
            >
              {fav ? '★' : '☆'}
            </button>
            <span class="home-tool-icon">{tool.icon}</span>
            <h3 class="home-tool-name">{t(tool.titleKey)}</h3>
          </a>
        {/each}
      </div>
    {:else}
      <p class="home-empty">{t('home.emptyFavorites')}</p>
    {/if}
  </section>

  <section class="home-section">
    <h2 class="home-section-title">{t('home.recentlyUsedTitle')}</h2>
    {#if recentEntries.length > 0}
      <div class="home-tool-grid">
        {#each recentEntries as { storedHref, tool } (storedHref)}
          {@const fav = isFavorite(storedHref)}
          <a
            href={localeLinkFromStored(storedHref)}
            class="home-tool-card card block p-4 no-underline text-inherit"
          >
            <button
              type="button"
              class="home-tool-fav {fav ? 'is-active' : ''}"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(storedHref);
              }}
              aria-label={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
              title={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
            >
              {fav ? '★' : '☆'}
            </button>
            <span class="home-tool-icon">{tool.icon}</span>
            <h3 class="home-tool-name">{t(tool.titleKey)}</h3>
          </a>
        {/each}
      </div>
    {:else}
      <p class="home-empty">{t('home.emptyRecentlyUsed')}</p>
    {/if}
  </section>

  <section class="home-section">
    <h2 class="home-section-title">{t(commonSectionTitleKey)}</h2>
    {#if variant === 'creative'}
      <div class="home-tool-grid">
        {#each CREATIVE_CARD_ITEMS as item (item.id)}
          {@const href = item.href + (item.hash ?? '')}
          {@const fav = isFavorite(href)}
          <a
            href={localePath($page.url.pathname, item.href) + (item.hash ?? '')}
            class="home-tool-card card block p-4 no-underline text-inherit"
          >
            <button
              type="button"
              class="home-tool-fav {fav ? 'is-active' : ''}"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(href);
              }}
              aria-label={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
              title={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
            >
              {fav ? '★' : '☆'}
            </button>
            <span class="home-tool-icon">{item.icon}</span>
            <h3 class="home-tool-name">{t(item.titleKey)}</h3>
          </a>
        {/each}
      </div>
    {:else}
      <div class="home-tool-grid">
        {#each allTools as tool (tool.id)}
          {@const fav = isFavorite(tool.href + (tool.hash ?? ''))}
          <a
            href={localePath($page.url.pathname, tool.href) + (tool.hash ?? '')}
            class="home-tool-card card block p-4 no-underline text-inherit"
          >
            <button
              type="button"
              class="home-tool-fav {fav ? 'is-active' : ''}"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(tool.href + (tool.hash ?? ''));
              }}
              aria-label={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
              title={fav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
            >
              {fav ? '★' : '☆'}
            </button>
            <span class="home-tool-icon">{tool.icon}</span>
            <h3 class="home-tool-name">{t(tool.titleKey)}</h3>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .home-workspace {
    max-width: 56rem;
    margin: 0 auto;
    padding-bottom: 2rem;
  }
  .home-intro {
    font-size: 0.875rem;
    color: var(--ccw-text-muted);
    margin: 0 0 1rem 0;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .home-intro--plain {
    text-transform: none;
    letter-spacing: normal;
    line-height: 1.5;
  }
  .home-section {
    margin-bottom: 1.75rem;
  }
  .home-section:last-child {
    margin-bottom: 0;
  }
  .home-section-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--ccw-text-primary);
    margin: 0 0 0.85rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .home-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--ccw-border-soft);
    opacity: 0.5;
  }
  .home-tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }
  .home-tool-card {
    position: relative;
    background: var(--ccw-bg-elevated);
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    color: var(--ccw-text-secondary);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  }
  .home-tool-card:focus-visible {
    outline: 2px solid var(--ccw-accent);
    outline-offset: 2px;
  }
  .home-tool-fav {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.2rem;
    font-size: 1rem;
    line-height: 1;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    color: var(--ccw-text-muted);
    transition: color 150ms ease, transform 150ms ease, border-color 150ms ease, background-color 150ms ease;
  }
  .home-tool-fav:hover {
    color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.15);
    border-color: rgba(10, 132, 255, 0.3);
  }
  .home-tool-fav.is-active {
    color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.2);
    border-color: rgba(10, 132, 255, 0.35);
  }
  .home-tool-icon {
    display: block;
    font-size: 2rem;
    margin-bottom: 0.35rem;
    color: var(--ccw-text-primary);
  }
  .home-tool-name {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    color: currentColor;
  }
  .home-empty {
    font-size: 0.8125rem;
    color: var(--ccw-text-muted);
    margin: 0;
  }
</style>

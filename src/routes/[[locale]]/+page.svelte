<script>
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { page } from '$app/stores';
  import { TOOL_GROUPS, findToolByHref } from '$lib/toolList.js';
  import { favorites, recentlyUsed, toggleFavorite } from '$lib/stores/userPrefsStore.js';

  const allTools = $derived(TOOL_GROUPS.flatMap((g) => g.items));

  /** 收藏/最近条目用存储的 href 作 key，避免 /table 与 /table#... 解析成同一 tool.id 时 each 重复 */
  const favoriteEntries = $derived(
    $favorites
      .map((storedHref) => {
        const tool = findToolByHref(storedHref);
        return tool ? { storedHref, tool } : null;
      })
      .filter(Boolean)
  );

  const recentEntries = $derived(
    $recentlyUsed
      .map((entry) => {
        const tool = findToolByHref(entry.href);
        return tool ? { storedHref: entry.href, tool } : null;
      })
      .filter(Boolean)
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

<div class="home-workspace workspace-content">
  <p class="home-intro">{t('home.subtitle')}</p>

  <!-- 1. 我的收藏 -->
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

  <!-- 2. 最近使用 -->
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

  <!-- 3. 常用工具 -->
  <section class="home-section">
    <h2 class="home-section-title">{t('home.commonToolsTitle')}</h2>
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
    transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease, color 150ms ease, background-color 150ms ease;
  }
  .home-tool-card:hover {
    border-color: var(--ccw-accent);
    transform: translateY(-2px);
    box-shadow: var(--ccw-shadow-soft);
    color: var(--ccw-text-primary);
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
  .home-tool-card:hover .home-tool-fav {
    color: var(--ccw-accent);
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

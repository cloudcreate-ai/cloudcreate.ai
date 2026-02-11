<script>
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { page } from '$app/stores';
  import { TOOL_GROUPS, findToolByHref } from '$lib/toolList.js';
  import { favorites, recentlyUsed, toggleFavorite } from '$lib/stores/userPrefsStore.js';

  const allTools = $derived(TOOL_GROUPS.flatMap((g) => g.items));

  const favoriteTools = $derived(
    $favorites
      .map((href) => findToolByHref(href))
      .filter(Boolean)
  );

  const recentTools = $derived(
    $recentlyUsed
      .map(({ href }) => findToolByHref(href))
      .filter(Boolean)
  );

  function isFavorite(href) {
    return $favorites.includes(href);
  }
</script>

<div class="home-workspace workspace-content">
  <p class="home-intro">{t('home.subtitle')}</p>

  <!-- 1. 我的收藏 -->
  <section class="home-section">
    <h2 class="home-section-title">{t('home.favoritesTitle')}</h2>
    {#if favoriteTools.length > 0}
      <div class="home-tool-grid">
        {#each favoriteTools as tool (tool.href)}
          {@const fav = isFavorite(tool.href)}
          <a
            href={localePath($page.url.pathname, tool.href)}
            class="home-tool-card card preset-outlined-surface-200-800 block p-4 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
          >
            <button
              type="button"
              class="home-tool-fav"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(tool.href);
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
    {#if recentTools.length > 0}
      <div class="home-tool-grid">
        {#each recentTools as tool (tool.href)}
          {@const fav = isFavorite(tool.href)}
          <a
            href={localePath($page.url.pathname, tool.href)}
            class="home-tool-card card preset-outlined-surface-200-800 block p-4 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
          >
            <button
              type="button"
              class="home-tool-fav"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(tool.href);
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
      {#each allTools as tool (tool.href)}
        {@const fav = isFavorite(tool.href)}
        <a
          href={localePath($page.url.pathname, tool.href)}
          class="home-tool-card card preset-outlined-surface-200-800 block p-4 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
        >
          <button
            type="button"
            class="home-tool-fav"
            onclick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(tool.href);
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
  }
  .home-intro {
    font-size: 0.9375rem;
    color: var(--color-surface-600-400);
    margin: 0 0 1.5rem 0;
  }
  .home-section {
    margin-bottom: 2rem;
  }
  .home-section:last-child {
    margin-bottom: 0;
  }
  .home-section-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-surface-700-300);
    margin: 0 0 0.75rem 0;
  }
  .home-tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }
  .home-tool-card {
    position: relative;
  }
  .home-tool-fav {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.15rem;
    font-size: 1rem;
    line-height: 1;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-surface-500-500);
    opacity: 0.7;
  }
  .home-tool-fav:hover {
    opacity: 1;
    color: var(--color-primary-500);
  }
  .home-tool-icon {
    display: block;
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  .home-tool-name {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
  }
  .home-empty {
    font-size: 0.8125rem;
    color: var(--color-surface-600-400);
    margin: 0;
  }
</style>

<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n.js';
  import { getFavoriteKeyForCurrentPage } from '$lib/toolList.js';
  import { favorites, toggleFavorite } from '$lib/stores/userPrefsStore.js';

  const favKey = $derived(getFavoriteKeyForCurrentPage($page.url.pathname, $page.url.hash));
  const isFav = $derived(!!favKey && $favorites.includes(favKey));
</script>

{#if favKey}
  <button
    type="button"
    class="tool-page-favorite-btn {isFav ? 'is-active' : ''}"
    onclick={() => toggleFavorite(favKey)}
    aria-label={isFav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
    title={isFav ? t('home.removeFromFavorites') : t('home.addToFavorites')}
  >
    {isFav ? '★' : '☆'}
  </button>
{/if}

<style>
  .tool-page-favorite-btn {
    flex-shrink: 0;
    padding: 0.25rem 0.45rem;
    font-size: 1.125rem;
    line-height: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-pill);
    cursor: pointer;
    color: var(--ccw-text-muted);
    transition:
      color 150ms ease,
      transform 150ms ease,
      border-color 150ms ease,
      background-color 150ms ease;
  }

  .tool-page-favorite-btn:hover {
    color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.12);
    border-color: rgba(10, 132, 255, 0.35);
  }

  .tool-page-favorite-btn.is-active {
    color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.2);
    border-color: rgba(10, 132, 255, 0.4);
  }
</style>

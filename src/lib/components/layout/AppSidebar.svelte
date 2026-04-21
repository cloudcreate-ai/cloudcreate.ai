<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { getSidebarGroupsForPath, resolveCategoryId } from '$lib/navRegistry.js';
  import { isSidebarItemActive, isWorkspaceShortcutActive } from '$lib/navActive.js';

  let collapsedGroups = $state({});

  const sidebarGroups = $derived(getSidebarGroupsForPath($page.url.pathname));
  const categoryId = $derived(resolveCategoryId($page.url.pathname));

  function toggleGroup(id) {
    collapsedGroups = { ...collapsedGroups, [id]: !collapsedGroups[id] };
  }

  /** @param {{ href: string, hash?: string }} item */
  function itemActive(item) {
    if (categoryId === 'workspace' && (item.href === '/tools' || item.href === '/creative')) {
      return isWorkspaceShortcutActive($page.url.pathname, item.href);
    }
    return isSidebarItemActive($page.url.pathname, $page.url.hash || '', item);
  }
</script>

<aside class="app-sidebar">
  <nav class="app-sidebar-nav">
    <a
      href={localePath($page.url.pathname, '/')}
      class="app-sidebar-item"
      class:active={$page.url.pathname === '/en' || $page.url.pathname === '/zh' || $page.url.pathname === '/'}
    >
      <span class="app-sidebar-icon">🏠</span>
      <span class="app-sidebar-label">{t('common.workspace')}</span>
    </a>
    {#each sidebarGroups as group}
      <div class="app-sidebar-group">
        <button
          type="button"
          class="app-sidebar-group-toggle"
          onclick={() => toggleGroup(group.id)}
          aria-expanded={!collapsedGroups[group.id]}
        >
          <span class="app-sidebar-group-chevron">{collapsedGroups[group.id] ? '▶' : '▼'}</span>
          <span>{t(group.labelKey)}</span>
        </button>
        {#if !collapsedGroups[group.id]}
          <div class="app-sidebar-group-items">
            {#each group.items as item}
              <a
                href={localePath($page.url.pathname, item.href) + (item.hash ?? '')}
                class="app-sidebar-item"
                class:active={itemActive(item)}
              >
                <span class="app-sidebar-icon">{item.icon}</span>
                <span class="app-sidebar-label">{t(item.titleKey)}</span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </nav>
</aside>

<style>
  .app-sidebar {
    width: 200px;
    height: 100%;
    flex-shrink: 0;
    border-right: 1px solid var(--ccw-border-contrast);
    background: var(--ccw-bg-panel);
    color: var(--ccw-text-secondary);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: var(--ccw-border-contrast) transparent;
  }
  /* 与工作区、AI 面板标题对齐（0.75rem） */
  .app-sidebar-nav {
    padding: 0.4rem 0.35rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .app-sidebar-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.85rem 0.35rem 1rem;
    font-size: 0.8125rem;
    text-decoration: none;
    color: var(--ccw-text-secondary);
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  }
  .app-sidebar-item::before {
    content: '';
    position: absolute;
    left: 0.25rem;
    top: 4px;
    bottom: 4px;
    width: 2px;
    border-radius: 2px;
    background: transparent;
    transition: background-color 150ms ease;
  }
  .app-sidebar-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--ccw-text-primary);
  }
  .app-sidebar-item.active {
    background: rgba(10, 132, 255, 0.18);
    color: #fff;
  }
  .app-sidebar-item.active::before {
    background: var(--ccw-accent);
  }
  .app-sidebar-icon {
    font-size: 1rem;
    line-height: 1;
    color: var(--ccw-icon-muted);
  }
  .app-sidebar-item.active .app-sidebar-icon {
    color: #fff;
  }
  .app-sidebar-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app-sidebar-group {
    margin-top: 0.35rem;
  }
  .app-sidebar-group-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.85rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ccw-text-muted);
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .app-sidebar-group-toggle:hover {
    color: var(--ccw-text-secondary);
  }
  .app-sidebar-group-chevron {
    font-size: 0.6rem;
  }
  .app-sidebar-group-items {
    padding-left: 0.35rem;
  }
</style>

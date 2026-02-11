<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { TOOL_GROUPS } from '$lib/toolList.js';

  let collapsedGroups = $state({});

  function toggleGroup(id) {
    collapsedGroups = { ...collapsedGroups, [id]: !collapsedGroups[id] };
  }

  function getLogicalPath(path) {
    const m = path.match(/^\/(en|zh)(\/|$)/);
    return m ? (m[2] === '/' ? path.slice(m[1].length + 1) : '/') : path || '/';
  }

  function isActive(href) {
    const logical = getLogicalPath($page.url.pathname);
    const target = href === '/' ? '/' : href;
    return logical === target || (target !== '/' && logical.startsWith(target + '/'));
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
    {#each TOOL_GROUPS as group}
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
                href={localePath($page.url.pathname, item.href)}
                class="app-sidebar-item"
                class:active={isActive(item.href)}
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
    border-right: 1px solid var(--color-surface-200-800);
    background: var(--color-surface-100-900);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  /* 与工作区、AI 面板标题对齐（0.75rem） */
  .app-sidebar-nav {
    padding: 0.4rem 0 0.5rem;
  }
  .app-sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    font-size: 0.8125rem;
    text-decoration: none;
    color: inherit;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .app-sidebar-item:hover {
    background: var(--color-surface-200-800);
  }
  .app-sidebar-item.active {
    background: var(--color-primary-500);
    color: var(--color-primary-500-contrast);
  }
  .app-sidebar-icon {
    font-size: 1rem;
    line-height: 1;
  }
  .app-sidebar-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app-sidebar-group {
    margin-top: 0.25rem;
  }
  .app-sidebar-group-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-surface-600-400);
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .app-sidebar-group-toggle:hover {
    color: inherit;
  }
  .app-sidebar-group-chevron {
    font-size: 0.6rem;
  }
  .app-sidebar-group-items {
    padding-left: 0.25rem;
  }
</style>

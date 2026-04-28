<script>
  import { page } from '$app/stores';
  import { setLocale } from '$lib/i18n.js';
  import { browser } from '$app/environment';
  import { SUPPORTED_LOCALES } from '$lib/i18n.js';
  import { isCompactMode, leftSidebarOpen, aiPanelOpen } from '$lib/stores/layoutStore.js';
  import { recordToolUsed } from '$lib/stores/userPrefsStore.js';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
  import AppFooter from '$lib/components/layout/AppFooter.svelte';
  import AiChatPanel from '$lib/components/layout/AiChatPanel.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';

  let { children } = $props();

  function closeOverlays() {
    leftSidebarOpen.set(false);
    aiPanelOpen.set(false);
  }

  $effect(() => {
    if (!browser) return;
    const localeFromUrl = $page.params.locale;
    if (localeFromUrl && SUPPORTED_LOCALES.includes(localeFromUrl)) {
      setLocale(localeFromUrl);
    }
  });

  // 小屏下导航后自动收起侧边栏
  $effect(() => {
    if (!browser || !$isCompactMode) return;
    $page.url.pathname; // 追踪 pathname 变化
    leftSidebarOpen.set(false);
  });

  // 记录最近使用的工具（含 hash，便于表格工具区分入口）
  $effect(() => {
    if (!browser) return;
    $page.url.hash;
    recordToolUsed($page.url.pathname, $page.url.hash || '');
  });

</script>

<SeoHead />

<!-- 第一层：上中下三区。内联样式确保布局生效（第三方 CSS 会覆盖外部样式表） -->
<div
  class="app-shell"
  style="display: flex; flex-direction: column; width: 100%; height: 100vh; overflow: hidden; background: var(--ccw-bg-base); color: var(--ccw-text-primary); font-family: var(--ccw-font-sans);"
>
  <header class="app-shell-header"><AppHeader /></header>
  <div
    class="app-shell-main"
    style="flex: 1; min-height: 0; min-width: 0; width: 100%; display: flex; flex-direction: row; flex-wrap: nowrap; align-items: stretch; gap: 0.75rem; padding: 0.75rem; background: var(--ccw-bg-base); border-top: 1px solid var(--ccw-border-contrast); overflow: hidden;"
  >
    <!-- 左侧栏：大屏正常显示，小屏折叠时隐藏，展开时覆盖 -->
    <aside
      class="app-shell-sidebar"
      class:app-shell-sidebar-overlay={$isCompactMode && $leftSidebarOpen}
      class:app-shell-sidebar-collapsed={$isCompactMode && !$leftSidebarOpen}
    >
      <AppSidebar />
    </aside>
    {#if $isCompactMode && ($leftSidebarOpen || $aiPanelOpen)}
      <button
        type="button"
        class="app-shell-backdrop"
        onclick={closeOverlays}
        aria-label="Close"
      ></button>
    {/if}
    <!-- 工作区：始终显示，最小宽度 -->
    <main
      class="app-shell-workspace"
      style="flex: 1 1 0%; min-width: 320px; height: 100%; overflow: auto; padding: 0.75rem; background: var(--ccw-bg-panel); border: 1px solid var(--ccw-border-soft); border-radius: var(--ccw-radius-card); box-shadow: var(--ccw-shadow-soft);"
    >{@render children()}</main>
    <!-- 右侧 AI：大屏正常，小屏折叠时窄条，展开时覆盖 -->
    <aside
      class="app-shell-ai"
      class:app-shell-ai-overlay={$isCompactMode && $aiPanelOpen}
      class:app-shell-ai-collapsed={$isCompactMode && !$aiPanelOpen}
    >
      <AiChatPanel />
    </aside>
  </div>
  <footer class="app-shell-footer"><AppFooter /></footer>
</div>

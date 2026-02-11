/**
 * 布局相关 UI 状态
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/** 右侧 AI 面板是否展开，默认 true */
export const aiPanelOpen = writable(true);

/** 左侧导航栏是否展开（小屏覆盖模式下使用） */
export const leftSidebarOpen = writable(false);

/** 小屏模式：宽度 < LAYOUT_BREAKPOINT 时侧边栏自动折叠，展开为覆盖 */
export const LAYOUT_BREAKPOINT = 900;
export const isCompactMode = writable(false);

if (browser) {
  let wasCompact = false;
  function updateCompactMode() {
    const compact = window.innerWidth < LAYOUT_BREAKPOINT;
    if (compact && !wasCompact) {
      leftSidebarOpen.set(false);
      aiPanelOpen.set(false);
    }
    wasCompact = compact;
    isCompactMode.set(compact);
  }
  updateCompactMode();
  window.addEventListener('resize', updateCompactMode);
}

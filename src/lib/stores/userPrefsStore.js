/**
 * 用户偏好：收藏、最近使用
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { ALL_REGISTERED_HREFS, isLandingNoPrefsPath } from '$lib/toolList.js';
import { getLogicalPath } from '$lib/localePath.js';

const STORAGE_KEY_FAV = 'freetools-favorites';
const STORAGE_KEY_RECENT = 'freetools-recently-used';
const RECENT_MAX = 8;

function loadFavorites() {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAV);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((h) => typeof h === 'string') : [];
  } catch {
    return [];
  }
}

function loadRecentlyUsed() {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.href === 'string' && typeof x.usedAt === 'number')
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function saveFavorites(arr) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(arr));
  } catch (_) {}
}

function saveRecentlyUsed(arr) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(arr.slice(0, RECENT_MAX)));
  } catch (_) {}
}

export const favorites = writable(loadFavorites());
export const recentlyUsed = writable(loadRecentlyUsed());

favorites.subscribe((arr) => saveFavorites(arr));
recentlyUsed.subscribe((arr) => saveRecentlyUsed(arr));

/** 切换收藏状态 */
export function toggleFavorite(href) {
  favorites.update((arr) => {
    const i = arr.indexOf(href);
    if (i >= 0) return arr.filter((_, j) => j !== i);
    return [...arr, href];
  });
}

/** 记录工具使用（在进入工具页时调用）；hash 用于区分同页多入口（如 /table#convert） */
export function recordToolUsed(pathname, hash = '') {
  const logical = getLogicalPath(pathname);
  if (isLandingNoPrefsPath(logical)) return;
  const href = logical.startsWith('/') ? logical : '/' + logical;
  if (!ALL_REGISTERED_HREFS.has(href)) return;

  const fullHref = hash ? `${href}${hash}` : href;
  recentlyUsed.update((arr) => {
    const now = Date.now();
    const filtered = arr.filter((x) => x.href !== fullHref);
    return [{ href: fullHref, usedAt: now }, ...filtered].slice(0, RECENT_MAX);
  });
}

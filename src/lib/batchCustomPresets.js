/**
 * 图片批处理：自定义规格集（localStorage，最多 MAX_CUSTOM_PRESETS 条）
 */
import { normalizeBatchSpecRow } from '$lib/batchSpecHelpers.js';

export const MAX_CUSTOM_PRESETS = 10;

const STORAGE_KEY = 'batch-custom-presets-v1';
/** 旧版仅存规格数组，首次读取时迁移 */
const LEGACY_SPECS_KEY = 'batch-profile-custom-specs';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 用于重名时追加的时间后缀（本地时间，纯数字 14 位，无分隔符） */
export function formatPresetTimeSuffix() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * 若与已有预设同名（排除 excludeId），则在名称后追加时间后缀
 * @param {string} baseName
 * @param {{ id: string, name: string }[]} presets
 * @param {string | null} excludeId
 */
export function ensureUniquePresetName(baseName, presets, excludeId) {
  const base = String(baseName ?? '').trim() || 'Untitled';
  const taken = (n) => presets.some((p) => p.id !== excludeId && p.name === n);
  if (!taken(base)) return base;
  return `${base}${formatPresetTimeSuffix()}`;
}

/**
 * @param {unknown} p
 * @returns {{ id: string, name: string, updatedAt: number, specs: ReturnType<typeof normalizeBatchSpecRow>[] }}
 */
export function normalizeCustomPreset(p) {
  const r = /** @type {Record<string, unknown>} */ (p || {});
  const specsRaw = r.specs;
  const specs = Array.isArray(specsRaw)
    ? specsRaw.map((row) => normalizeBatchSpecRow(row))
    : [];
  return {
    id: String(r.id || randomId()),
    name: String(r.name ?? '').trim() || 'Untitled',
    updatedAt: Math.max(0, Number(r.updatedAt) || Date.now()),
    specs,
  };
}

/**
 * @returns {ReturnType<typeof normalizeCustomPreset>[]}
 */
export function loadCustomPresetsFromStorage() {
  if (typeof localStorage === 'undefined') return [];

  let presets = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.presets && Array.isArray(data.presets)) {
        presets = data.presets.map(normalizeCustomPreset);
      }
    }
  } catch {
    presets = [];
  }

  if (presets.length === 0) {
    try {
      const legacy = localStorage.getItem(LEGACY_SPECS_KEY);
      if (legacy) {
        const arr = JSON.parse(legacy);
        if (Array.isArray(arr) && arr.length) {
          presets = [
            {
              id: randomId(),
              name: 'Migrated',
              updatedAt: Date.now(),
              specs: arr.map((row) => normalizeBatchSpecRow(row)),
            },
          ];
          persistCustomPresets(presets);
          localStorage.removeItem(LEGACY_SPECS_KEY);
        }
      }
    } catch {
      /* 忽略损坏的旧数据 */
    }
  }

  return presets;
}

/**
 * @param {{ id: string, name: string, updatedAt: number, specs: unknown[] }[]} presets
 */
export function persistCustomPresets(presets) {
  if (typeof localStorage === 'undefined') return;
  const normalized = presets.map(normalizeCustomPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, presets: normalized }));
}

export function formatBuiltinKey(builtinId) {
  return `builtin:${builtinId}`;
}

export function formatPresetKey(presetId) {
  return `preset:${presetId}`;
}

export function parseProfileStorageKey(key) {
  const k = String(key || '');
  if (k.startsWith('builtin:')) return { kind: 'builtin', builtinId: k.slice(8), presetId: null };
  if (k.startsWith('preset:')) return { kind: 'preset', builtinId: null, presetId: k.slice(7) };
  return { kind: 'unknown', builtinId: null, presetId: null };
}

/**
 * @param {string | null | undefined} saved
 * @param {{ id: string }[]} presets
 * @param {string} defaultBuiltinId
 * @param {string[]} validBuiltinIds
 */
export function normalizeStoredProfileKey(saved, presets, defaultBuiltinId, validBuiltinIds) {
  const fallbackBuiltin = formatBuiltinKey(defaultBuiltinId);
  const validBuiltinSet = new Set(validBuiltinIds);

  if (!saved) return fallbackBuiltin;

  // 旧版：仅内置 id 或 custom
  if (saved === 'custom') {
    if (presets.length > 0) return formatPresetKey(presets[0].id);
    return fallbackBuiltin;
  }
  if (validBuiltinSet.has(saved)) return formatBuiltinKey(saved);

  const parsed = parseProfileStorageKey(saved);
  if (parsed.kind === 'builtin' && parsed.builtinId && validBuiltinSet.has(parsed.builtinId)) {
    return formatBuiltinKey(parsed.builtinId);
  }
  if (parsed.kind === 'preset' && parsed.presetId && presets.some((p) => p.id === parsed.presetId)) {
    return formatPresetKey(parsed.presetId);
  }

  return fallbackBuiltin;
}

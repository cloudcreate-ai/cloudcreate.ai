/**
 * 根据 locale 生成带语言前缀的路径（切换语言时统一使用前缀，如 /en、/zh）
 */
const LOCALE_PREFIXES = ['en', 'zh'];

/** 去掉 pathname 中已知的语言前缀，得到逻辑路径 */
function stripLocalePrefix(pathname) {
  const normalized = pathname.replace(/\/$/, '') || '/';
  for (const p of LOCALE_PREFIXES) {
    const m = normalized.match(new RegExp(`^/${p}(/|$)`));
    if (m) return m[1] === '/' ? normalized.slice(p.length + 1) : '/';
  }
  return normalized;
}

/**
 * 给定 locale 和当前 pathname，返回该语言下的路径（均带语言前缀）。
 * - locale === 'en'：/en、/en/image/compress
 * - locale === 'zh'：/zh、/zh/image/compress
 */
export function pathForLocale(locale, pathname) {
  const logical = stripLocalePrefix(pathname);
  const path = logical === '/' ? '' : logical;
  if (locale === 'en') {
    return '/en' + path;
  }
  if (locale === 'zh') {
    return '/zh' + path;
  }
  return pathname;
}

/**
 * 根据当前 pathname 和逻辑路径，生成当前语境下的 href（保持当前语言前缀）。
 * 用于站内链接（工作区、workflow 等）。
 */
export function localePath(pathname, logicalPath) {
  const base = logicalPath === '/' ? '' : logicalPath;
  if (pathname.startsWith('/zh')) return '/zh' + base;
  if (pathname.startsWith('/en')) return '/en' + base;
  return logicalPath;
}

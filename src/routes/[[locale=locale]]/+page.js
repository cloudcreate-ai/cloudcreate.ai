/** 可选语言段：枚举带前缀的 locale，供预渲染 /en、/zh */
export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export function entries() {
  return [{ locale: 'en' }, { locale: 'zh' }];
}

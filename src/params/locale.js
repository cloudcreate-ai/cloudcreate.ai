/**
 * 语言段只允许 en / zh。
 * 否则 /simple-snip/privacy 会被 [[locale]]/privacy 当成 locale=simple-snip。
 * @param {string} param
 */
export function match(param) {
  return param === 'en' || param === 'zh';
}

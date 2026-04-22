/**
 * 将 i18n 模板中的 {{key}} 替换为 params[key] 的字符串形式。
 * 缺失的键保留原占位符，便于发现漏传。
 * @param {string} template
 * @param {Record<string, string | number | boolean | null | undefined>} params
 */
export function interpolateTemplate(template, params) {
  if (!template) return '';
  return template.replace(/\{\{(\s*[^}]+\s*)\}\}/g, (match, key) => {
    const k = String(key).trim();
    if (!Object.prototype.hasOwnProperty.call(params, k)) return match;
    const v = params[k];
    if (v == null) return '';
    return String(v);
  });
}

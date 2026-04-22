/**
 * 侧栏「本页简介」：仅说明页面用途的静态一句，不随当前参数变化。
 * @param {string} templateKey 如 agentPrompt.imageCompress
 * @param {(k: string) => string} t
 */
export function getPanelPagePurpose(templateKey, t) {
  const sub = templateKey.replace(/^agentPrompt\./, '');
  const i18nKey = `agentPrompt.panelBrief.${sub}`;
  const raw = t(i18nKey);
  if (raw === i18nKey) {
    return t('agentPrompt.panelBrief._fallback');
  }
  return raw;
}

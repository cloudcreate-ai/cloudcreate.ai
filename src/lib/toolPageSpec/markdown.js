import { specIdToAnchor, TOOL_PAGE_SPECS } from './registry.js';

/**
 * @param {(k: string) => string} t
 * @param {import('./registry.js').ToolPageSpec} spec
 */
export function buildSpecSectionMarkdown(t, spec) {
  const title = t(spec.titleKey);
  const h = specIdToAnchor(spec.id);
  const pKey = `agentPrompt.panelBrief.${spec.id}`;
  const pRaw = t(pKey);
  const purposeText = pRaw === pKey ? t('agentPrompt.panelBrief._fallback') : pRaw;
  return [
    `## ${title}`,
    `<a id="${h}"></a>`,
    '',
    `**${t('agentPrompt.aiSpecPage.purposeLabel')}:** ${purposeText}`,
    '',
    `**${t('agentPrompt.aiSpecPage.interpolateLabel')}:** ${t(`agentPrompt.toolSpecDetail.${spec.id}.interpolate`)}`,
    '',
    `**${t('agentPrompt.aiSpecPage.urlQueryLabel')}:** ${t(`agentPrompt.toolSpecDetail.${spec.id}.urlQuery`)}`,
  ].join('\n');
}

/**
 * @param {(k: string) => string} t
 */
export function buildFullPageMarkdown(t) {
  const head = [
    `# ${t('agentPrompt.aiSpecPage.pageTitle')}`,
    '',
    t('agentPrompt.aiSpecPage.pageIntro'),
    '',
  ];
  return head.concat(TOOL_PAGE_SPECS.map((s) => buildSpecSectionMarkdown(t, s))).join('\n\n');
}

/**
 * 无 HTML、无 Markdown 标记的纯文本，供 `text/plain` 直链与「给 AI 的」复制用。
 * @param {(k: string) => string} t
 * @param {import('./registry.js').ToolPageSpec} spec
 */
export function buildSpecSectionPlainText(t, spec) {
  const title = t(spec.titleKey);
  const pKey = `agentPrompt.panelBrief.${spec.id}`;
  const pRaw = t(pKey);
  const purposeText = pRaw === pKey ? t('agentPrompt.panelBrief._fallback') : pRaw;
  return [
    `## ${title}`,
    '',
    `${t('agentPrompt.aiSpecPage.purposeLabel')}: ${purposeText}`,
    '',
    `${t('agentPrompt.aiSpecPage.interpolateLabel')}: ${t(`agentPrompt.toolSpecDetail.${spec.id}.interpolate`)}`,
    '',
    `${t('agentPrompt.aiSpecPage.urlQueryLabel')}: ${t(`agentPrompt.toolSpecDetail.${spec.id}.urlQuery`)}`,
  ].join('\n');
}

/**
 * 与 /[locale]/ai-spec/llm.txt GET 的 body 一致（同 locale、t 函数下）。
 * @param {(k: string) => string} t
 */
export function buildFullPagePlainText(t) {
  const head = [
    `# ${t('agentPrompt.aiSpecPage.pageTitle')}`,
    '',
    t('agentPrompt.aiSpecPage.pageIntro'),
    '',
  ];
  return head.concat(TOOL_PAGE_SPECS.map((s) => buildSpecSectionPlainText(t, s))).join('\n\n');
}

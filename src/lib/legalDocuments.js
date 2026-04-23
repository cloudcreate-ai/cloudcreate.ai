/**
 * 隐私政策 / 服务条款正文（与 UI 语言一致）。非法律建议，可随业务替换。
 * @typedef {{ type: 'h2' | 'p', text: string }} LegalBlock
 */
import { siteContactEmail } from '$lib/siteConfig.js';

/** @type {Record<'privacy' | 'terms', { en: LegalBlock[], zh: LegalBlock[] }>} */
const DOCS = {
  privacy: {
    en: [
      {
        type: 'p',
        text:
          'This policy describes how CloudCreate.ai (this site) handles information when you use our in-browser tools. The site is designed so that most processing runs locally in your browser; we do not run a login system in this public toolkit.',
      },
      { type: 'h2', text: 'Local processing' },
      {
        type: 'p',
        text:
          'Image, PDF, table, and other tool operations are generally performed in your device using client-side code. We do not intentionally collect the files you process as part of “cloud processing” for these tools on this static deployment.',
      },
      { type: 'h2', text: 'Technical data and hosting' },
      {
        type: 'p',
        text:
          'Like any website, the hosting network (e.g. CDN / Pages provider) and your browser may create standard server or access logs (such as IP address, time, and requested URL) needed to deliver pages and protect the service. We use this to operate and secure the site, not to sell personal data.',
      },
      { type: 'h2', text: 'Storage in your browser' },
      {
        type: 'p',
        text:
          'We may store non-sensitive preferences (for example, language or UI state) in your browser using local storage or similar technologies. This stays on your device and can be cleared in your browser settings.',
      },
      { type: 'h2', text: 'Children' },
      {
        type: 'p',
        text:
          'This service is not directed at children under 16; if you are a parent and believe we should remove information, use the contact email in the “Contact” section on this page.',
      },
      { type: 'h2', text: 'Changes' },
      {
        type: 'p',
        text: 'We may update this policy; the “Last updated” date on the page will change when we do. Continued use after changes means you accept the updated policy.',
      },
    ],
    zh: [
      {
        type: 'p',
        text:
          '本说明介绍您使用 CloudCreate.ai（本站）浏览器内工具时，本站如何处理信息。本站以在浏览器中本地处理为主；公开展示的工具集不依赖登录即可使用。',
      },
      { type: 'h2', text: '本地处理' },
      {
        type: 'p',
        text:
          '图片、PDF、表格等操作通常在您的设备上通过前端代码完成。在此静态部署形态下，我们无意将您为使用工具而选择的文件作为「云端处理数据」进行收集。',
      },
      { type: 'h2', text: '技术数据与托管' },
      {
        type: 'p',
        text:
          '与多数网站一样，内容分发与托管方及浏览器可能产生常见的访问与防护相关记录（如 IP、访问时间、请求路径等），用于向访客交付页面与保障服务安全；我们不以此出售您的个人信息。',
      },
      { type: 'h2', text: '浏览器内存储' },
      {
        type: 'p',
        text:
          '我们可能通过 localStorage 等机制在您的浏览器中保存非敏感偏好（如语言或界面状态）。数据仅保存在您的设备上，您可在浏览器设置中清除。',
      },
      { type: 'h2', text: '未成年人' },
      {
        type: 'p',
        text:
          '本服务不面向 16 周岁以下儿童定向提供；若您为监护人并认为需删除相关信息，请通过本页末「联系我们」中的联系邮箱处理。',
      },
      { type: 'h2', text: '变更' },
      {
        type: 'p',
        text: '我们可能不时更新本政策；页面上的「最后更新」日期将随之变更。您继续使用即表示知悉并同意更新后的内容。',
      },
    ],
  },
  terms: {
    en: [
      {
        type: 'p',
        text:
          'By accessing or using CloudCreate.ai, you agree to these Terms of Service. If you do not agree, do not use the site.',
      },
      { type: 'h2', text: 'The service' },
      {
        type: 'p',
        text:
          'The site offers creative and utility tools that run in your browser. Features may change, be added, or removed. We aim for reliable behavior but the service is provided on an “as is” and “as available” basis without warranties of any kind, to the maximum extent allowed by law.',
      },
      { type: 'h2', text: 'Your use' },
      {
        type: 'p',
        text:
          'You are responsible for your use of the tools and for any content you process. You must not use the site to break the law, infringe others’ rights, or attack or overload our or others’ systems. You must not attempt unauthorized access to our systems or other users’ data beyond what the normal website allows.',
      },
      { type: 'h2', text: 'Output and third parties' },
      {
        type: 'p',
        text:
          'We do not guarantee that outputs from any demo or tool meet your business or legal requirements. Integrations, links, or third-party code on the site are subject to their own terms; we are not responsible for them.',
      },
      { type: 'h2', text: 'Limitation of liability' },
      {
        type: 'p',
        text:
          'To the fullest extent permitted by law, CloudCreate.ai and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the site, including data loss, loss of profit, or business interruption.',
      },
      { type: 'h2', text: 'Changes' },
      {
        type: 'p',
        text:
          'We may change these terms or the site. The updated “Last updated” date will appear on this page. Continued use after changes constitutes acceptance. If a change is material and you cannot accept it, you should stop using the service.',
      },
    ],
    zh: [
      {
        type: 'p',
        text:
          '访问或使用 CloudCreate.ai 即表示您同意本服务条款。若您不同意，请勿使用本站。',
      },
      { type: 'h2', text: '服务说明' },
      {
        type: 'p',
        text:
          '本站提供在浏览器中运行的创意与实用类工具。功能可能变更、新增或下线。我们尽力保持稳定，但在适用法律允许范围内，本服务按「现状」和「现有可用性」提供，不作任何明示或默示担保。',
      },
      { type: 'h2', text: '您的使用' },
      {
        type: 'p',
        text:
          '您应自行对使用行为及所处理内容负责。不得利用本站从事违法、侵犯他人权利或攻击/滥用基础设施等行为；除正常访问网页外，不得未经授权访问本站或他人系统与数据。',
      },
      { type: 'h2', text: '结果与第三方' },
      {
        type: 'p',
        text:
          '我们不保证任何工具或演示的输出满足您特定的业务或法律要求。站内外链、集成的第三方服务受其各自条款约束，我们不对其内容或服务承担责任。',
      },
      { type: 'h2', text: '责任限制' },
      {
        type: 'p',
        text:
          '在适用法律允许的最大范围内，对因使用本站而产生的任何间接、附带或后果性损害（如数据灭失、利润损失、业务中断等），CloudCreate.ai 及其运营方不承担责任。',
      },
      { type: 'h2', text: '变更' },
      {
        type: 'p',
        text:
          '我们可修改本条款或网站内容。本页会更新「最后更新」日期。您继续使用即视为接受修改。若重要变更使您无法接受，请停止使用本服务。',
      },
    ],
  },
};

/**
 * 文末联系说明（与 siteConfig.siteContactEmail、页脚展示一致）
 * @param {string} locale
 * @returns {LegalBlock[]}
 */
function contactBlocks(locale) {
  const e = siteContactEmail;
  if (locale === 'zh') {
    return [
      { type: 'h2', text: '联系我们' },
      { type: 'p', text: `咨询、合作或问题反馈，请发送邮件至：${e}。` },
    ];
  }
  return [
    { type: 'h2', text: 'Contact' },
    { type: 'p', text: `For questions, cooperation, or feedback, email us at ${e}.` },
  ];
}

/**
 * @param {'privacy' | 'terms'} pageId
 * @param {string} locale
 * @returns {LegalBlock[]}
 */
export function getLegalBlocks(pageId, locale) {
  const d = DOCS[pageId];
  if (!d) return [];
  const main = locale === 'zh' ? d.zh : d.en;
  return [...main, ...contactBlocks(locale)];
}

/** 页面脚注日期（与构建或发布策略无关，仅作展示，可选后续改为构建时注入） */
export const LEGAL_LAST_UPDATED = { en: '22 April 2026', zh: '2026 年 4 月 22 日' };

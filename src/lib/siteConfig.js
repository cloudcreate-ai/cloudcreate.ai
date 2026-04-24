/**
 * 生产环境 canonical / Open Graph 使用的站点根 URL。
 * 可在构建时通过 `PUBLIC_SITE_URL`（如 https://example.com）覆盖。
 */
export const siteOrigin = (
  typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SITE_URL
    ? String(import.meta.env.PUBLIC_SITE_URL).replace(/\/$/, '')
    : 'https://cloudcreate.ai'
);

/** 对外联系邮箱（页脚、法律页与文案引用均用此值） */
export const siteContactEmail = 'contact@cloudcreate.ai';

/** 站点源码仓库 */
export const siteGithubUrl = 'https://github.com/cloudcreate-ai/cloudcreate.ai';

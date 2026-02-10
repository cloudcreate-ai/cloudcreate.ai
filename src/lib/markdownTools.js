/**
 * Markdown 工具 - 解析、sanitize、渲染
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** 将 Markdown 转为安全的 HTML */
export function markdownToHtml(md) {
  if (!md || typeof md !== 'string') return '';
  try {
    const html = marked(md, { async: false });
    const str = typeof html === 'string' ? html : String(html ?? '');
    if (typeof window === 'undefined') return str;
    return DOMPurify.sanitize(str, { USE_PROFILES: { html: true } });
  } catch {
    return '';
  }
}

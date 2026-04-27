import DOMPurify from 'dompurify';
import { markdownToHtml as renderMarkdownToHtml } from '../../packages/tools-core/src/markdown.js';

export function markdownToHtml(md) {
  return renderMarkdownToHtml(md, {
    sanitizer:
      typeof window === 'undefined'
        ? null
        : (html) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
  });
}

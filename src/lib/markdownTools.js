import DOMPurify from 'dompurify';
import { markdownToHtml as renderMarkdownToHtml } from '@cloudcreate/freetools-core/markdown';

export function markdownToHtml(md) {
  return renderMarkdownToHtml(md, {
    sanitizer:
      typeof window === 'undefined'
        ? null
        : (html) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
  });
}

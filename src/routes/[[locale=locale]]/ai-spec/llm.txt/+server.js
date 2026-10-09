import { tLang } from '$lib/i18n.js';
import { buildFullPagePlainText } from '$lib/toolPageSpec/markdown.js';

export const prerender = true;

/** 供 AI / 程序拉取的同一份参考全文（`text/plain; charset=utf-8`） */
export async function GET({ params }) {
  const { locale: loc } = params;
  const lang = loc === 'zh' ? 'zh' : 'en';
  const t = (/** @type {string} */ k) => tLang(lang, k);
  const text = buildFullPagePlainText(t);
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // 建议浏览器内联展示，而不是当作「下载附件」
      'Content-Disposition': 'inline; filename="llm.txt"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

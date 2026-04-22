/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const path = event.url.pathname;
  const langAttr = path.startsWith('/zh') ? 'zh-CN' : 'en';

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replaceAll('%lang%', langAttr),
  });
  return response;
}

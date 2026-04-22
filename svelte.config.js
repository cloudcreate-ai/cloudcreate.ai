import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { PRERENDER_PATHS } from './src/lib/site-paths.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    prerender: {
      /** /table 为客户端渲染（+layout.js ssr:false），预渲染 HTML 中无锚点 id，链向 #table-* 时需忽略校验 */
      handleMissingId: 'ignore',
      entries: [...PRERENDER_PATHS],
    },
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    prerender: {
      entries: [
        '/en',
        '/en/image/compress',
        '/en/image/crop',
        '/en/image/resize',
        '/en/image/favicon',
        '/en/image/rotate',
        '/en/workflow',
        '/en/workflow/advanced',
        '/zh',
        '/zh/image/compress',
        '/zh/image/crop',
        '/zh/image/resize',
        '/zh/image/favicon',
        '/zh/image/rotate',
        '/zh/workflow',
        '/zh/workflow/advanced',
      ],
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

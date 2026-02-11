import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    prerender: {
      entries: [
        '/',
        '/en',
        '/en/image/compress',
        '/en/image/crop',
        '/en/image/resize',
        '/en/image/favicon',
        '/en/image/rotate',
        '/en/image/playstore',
        '/en/image/appstore',
        '/en/css',
        '/en/css/minify',
        '/en/css/beautify',
        '/en/archive',
        '/en/archive/decompress',
        '/en/archive/compress',
        '/en/workflow',
        '/en/workflow/advanced',
        '/zh',
        '/zh/image/compress',
        '/zh/image/crop',
        '/zh/image/resize',
        '/zh/image/favicon',
        '/zh/image/rotate',
        '/zh/image/playstore',
        '/zh/image/appstore',
        '/zh/css',
        '/zh/css/minify',
        '/zh/css/beautify',
        '/zh/archive',
        '/zh/archive/decompress',
        '/zh/archive/compress',
        '/en/markdown',
        '/zh/markdown',
        '/en/table',
        '/zh/table',
        '/en/framework',
        '/zh/framework',
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const localCoreSrc = path.resolve(root, '../cloudcreate-lib/src');
const useLocalCore = fs.existsSync(path.join(localCoreSrc, 'archive.js'));

/** 本机有兄弟仓库时用源码，这样未发布的核心能力能进站点构建。 */
const coreAlias = useLocalCore
  ? [
      { find: /^@cloudcreate\/core\/archive$/, replacement: path.join(localCoreSrc, 'archive.js') },
      { find: /^@cloudcreate\/core\/browser$/, replacement: path.join(localCoreSrc, 'browser.js') },
      { find: /^@cloudcreate\/core\/css$/, replacement: path.join(localCoreSrc, 'css.js') },
      { find: /^@cloudcreate\/core\/image$/, replacement: path.join(localCoreSrc, 'image.js') },
      { find: /^@cloudcreate\/core\/markdown$/, replacement: path.join(localCoreSrc, 'markdown.js') },
      { find: /^@cloudcreate\/core\/pdf$/, replacement: path.join(localCoreSrc, 'pdf.js') },
      { find: /^@cloudcreate\/core\/table$/, replacement: path.join(localCoreSrc, 'table.js') },
      { find: /^@cloudcreate\/core$/, replacement: path.join(localCoreSrc, 'index.js') },
    ]
  : [];

/** @type {import('vite').UserConfig} */
export default {
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: coreAlias,
  },
  server: {
    fs: {
      allow: [path.resolve(root, '..')],
    },
  },
  optimizeDeps: {
    exclude: [
      '@jsquash/jpeg',
      '@jsquash/png',
      '@jsquash/webp',
      '@jsquash/avif',
      'brotli-wasm',
      'node-unrar-js',
    ],
  },
};

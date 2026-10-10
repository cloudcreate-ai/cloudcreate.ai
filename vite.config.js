import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const localArchive = path.resolve(root, '../cloudcreate-lib/src/archive.js');
const useLocalArchive = fs.existsSync(localArchive);

/**
 * 只把 archive 指到旁边的核心库。
 * 整包别名会把图片 WASM worker 卷进生产构建并失败。
 */
const coreAlias = useLocalArchive
  ? [{ find: /^@cloudcreate\/core\/archive$/, replacement: localArchive }]
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

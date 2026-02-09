import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

/** @type {import('vite').UserConfig} */
export default {
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    exclude: ['@jsquash/jpeg', '@jsquash/png', '@jsquash/webp', '@jsquash/avif'],
  },
};

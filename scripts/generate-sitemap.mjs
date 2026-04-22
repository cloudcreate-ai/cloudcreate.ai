/**
 * 构建完成后写入 build/sitemap.xml 与 build/robots.txt
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRERENDER_PATHS } from '../src/lib/site-paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, '..', 'build');

const site = (process.env.PUBLIC_SITE_URL || 'https://cloudcreate.ai').replace(/\/$/, '');

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const lastmod = new Date().toISOString().slice(0, 10);

const urlEntries = PRERENDER_PATHS.map((path) => {
  const loc = path === '/' ? `${site}/` : `${site}${path}`;
  const priority = path === '/' ? '1.0' : path === '/en' || path === '/zh' ? '0.9' : '0.8';
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

writeFileSync(join(buildDir, 'sitemap.xml'), sitemap, 'utf8');

const robots = `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`;

writeFileSync(join(buildDir, 'robots.txt'), robots, 'utf8');

console.log(`Sitemap: ${PRERENDER_PATHS.length} URLs → build/sitemap.xml`);
console.log(`robots.txt → build/robots.txt (Sitemap: ${site}/sitemap.xml)`);

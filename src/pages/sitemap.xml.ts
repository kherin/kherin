export const prerender = false;

import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const siteUrl = 'https://kherin.com';

  const staticPages = [
    { url: `${siteUrl}/`,          priority: '1.0', changefreq: 'weekly' },
    { url: `${siteUrl}/about`,     priority: '0.8', changefreq: 'monthly' },
    { url: `${siteUrl}/portfolio`, priority: '0.9', changefreq: 'monthly' },
    { url: `${siteUrl}/blog`,      priority: '0.9', changefreq: 'weekly' },
  ];

  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const blogPages = posts.map(post => ({
    url: `${siteUrl}/blog/${post.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
    lastmod: post.data.publishedAt,
  }));

  const allPages = [...staticPages, ...blogPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${p.url}</loc>
    ${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

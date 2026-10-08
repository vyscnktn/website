import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getCleanSlug } from '../i18n/ui';

export async function GET(context: { site: string }) {
  const guides = await getCollection('guides');
  const enGuides = guides.filter(guide => (guide.data.lang || 'en') === 'en');

  return rss({
    title: 'Veysi Can Keten | AI & Cloud Architecture Technical Guides',
    description: 'Technical guides and architectural blueprints for AI systems, cloud infrastructures, and open-source tooling.',
    site: context.site || 'https://vyscnktn.com',
    items: enGuides.map(guide => ({
      title: guide.data.title,
      pubDate: guide.data.date,
      description: guide.data.description,
      link: `/guides/${getCleanSlug(guide.id)}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}

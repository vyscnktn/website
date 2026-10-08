import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getCleanSlug } from '../../i18n/ui';

export async function GET(context: { site: string }) {
  const guides = await getCollection('guides');
  const trGuides = guides.filter(guide => guide.data.lang === 'tr');

  return rss({
    title: 'Veysi Can Keten | Yapay Zeka & Bulut Mimarı Rehberleri',
    description: 'Yapay zeka sistemleri, bulut mimarileri ve açık kaynak yazılımlar üzerine teknik rehberler.',
    site: context.site || 'https://vyscnktn.com',
    items: trGuides.map(guide => ({
      title: guide.data.title,
      pubDate: guide.data.date,
      description: guide.data.description,
      link: `/tr/guides/${getCleanSlug(guide.id)}/`,
    })),
    customData: `<language>tr-tr</language>`,
  });
}

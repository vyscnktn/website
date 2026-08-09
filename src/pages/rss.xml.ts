import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: string }) {
  const guides = await getCollection('guides');
  const trGuides = guides.filter(guide => (guide.data.lang || 'tr') === 'tr');

  return rss({
    title: 'Veysi Can Keten | Yapay Zeka & Bulut Mimarı Rehberleri',
    description: 'Yapay zeka sistemleri, bulut mimarileri ve açık kaynak yazılımlar üzerine teknik rehberler.',
    site: context.site || 'https://vyscnktn.com',
    items: trGuides.map(guide => ({
      title: guide.data.title,
      pubDate: guide.data.date,
      description: guide.data.description,
      link: `/guides/${guide.id}/`,
    })),
    customData: `<language>tr-tr</language>`,
  });
}

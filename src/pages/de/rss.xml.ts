import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getCleanSlug } from '../../i18n/ui';

export async function GET(context: { site: string }) {
  const guides = await getCollection('guides');
  const deGuides = guides.filter(guide => guide.data.lang === 'de');

  return rss({
    title: 'Veysi Can Keten | Technische Leitfäden für KI & Cloud',
    description: 'Technische Leitfäden und Architektur-Blaupausen für KI-Systeme, Cloud-Infrastrukturen und Open-Source-Tools.',
    site: context.site || 'https://vyscnktn.com',
    items: deGuides.map(guide => ({
      title: guide.data.title,
      pubDate: guide.data.date,
      description: guide.data.description,
      link: `/de/guides/${getCleanSlug(guide.id)}/`,
    })),
    customData: `<language>de-de</language>`,
  });
}

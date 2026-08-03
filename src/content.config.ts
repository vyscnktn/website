import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const projectsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    techs: z.array(z.string()),
    githubUrl: z.string().url(),
    featured: z.boolean().default(false),
  }),
});

const guidesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.date(),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  projects: projectsCollection,
  guides: guidesCollection,
};

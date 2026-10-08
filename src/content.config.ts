import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const projectsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    techs: z.array(z.string()),
    githubUrl: z.string().url(),
    demoUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    status: z.string().optional(),
    order: z.number().optional(),
    lang: z.enum(['en', 'de', 'tr']).default('en'),
  }),
});

const guidesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.date(),
    readTime: z.string().default('5 min read'),
    featured: z.boolean().default(false),
    lang: z.enum(['en', 'de', 'tr']).default('en'),
  }),
});

export const collections = {
  projects: projectsCollection,
  guides: guidesCollection,
};


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
  }),
});

const guidesCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.date(),
    readTime: z.string().default('5 dk okuma'),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  projects: projectsCollection,
  guides: guidesCollection,
};


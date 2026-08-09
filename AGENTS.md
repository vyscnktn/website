# Project Overview: Veysi Can Keten Tech Portfolio & Resource Hub

A personal portfolio and tech documentation hub for Veysi Can Keten focusing on AI architectures, cloud systems, and open-source projects.

## Tech Stack
- **Framework:** Astro (v5)
- **Styling:** Tailwind CSS (v4) with `@tailwindcss/vite`
- **Content:** Astro Content Collections (MDX / Markdown)
- **Language:** TypeScript / Astro

## Key File Locations
- `src/pages/`: Main page (`index.astro`) and dynamic guide routes (`guides/[id].astro`).
- `src/components/`: Modular components (`Hero.astro`, `GuideCard.astro`, `ProjectCard.astro`, `Section.astro`).
- `src/content/`: MDX content collections (`guides/`, `projects/`) validated via `src/content.config.ts`.
- `src/styles/`: Base styles (`global.css` importing `@import "tailwindcss";`).

## Development

When starting the dev server, use background mode:

```bash
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation
Full Astro Documentation: https://docs.astro.build


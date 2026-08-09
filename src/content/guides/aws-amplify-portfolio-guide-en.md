---
title: "Guide: Building a Serverless Portfolio & Automated CI/CD with Astro v5 & AWS Amplify"
description: "Architecting a zero-server, high-performance tech platform that automatically builds and deploys from GitHub to AWS Edge CDN locations."
category: "Cloud Architecture"
date: 2026-08-08
readTime: "6 min read"
featured: true
lang: "en"
---

Operating a high-performance, secure, and scalable personal portfolio platform in modern software engineering no longer requires managing legacy virtual servers (e.g., EC2 instances) or executing manual file uploads.

In this guide, I break down the exact **Serverless CI/CD Pipeline** architecture powering this platform, built with **Astro v5 (Islands Architecture)**, **Tailwind CSS v4**, and **AWS Amplify Hosting**.

---

## Why Serverless & Static-First Architectures?

Dynamic server-side rendered (SSR) applications consume continuous compute resources for every incoming HTTP request, incurring idle server costs. In contrast, technical portfolio platforms benefit massively from pre-compiled Static Site Generation (SSG).

* **Zero Server Maintenance:** Eliminate OS patching, Nginx configurations, and security maintenance.
* **Maximum Performance (CWV):** Pre-rendered static pages guarantee sub-second Time-To-First-Byte (TTFB), easily scoring 100/100 on Google Core Web Vitals.
* **Global Edge Distribution:** Static assets are automatically cached across AWS's global CloudFront Edge CDN network via AWS Amplify.

---

## Architecture & CI/CD Workflow

The pipeline is designed to optimize Developer Experience (DX) and automate deployments:

```text
[Local Dev] -> git push origin main -> [GitHub Webhook] -> [AWS Amplify Build Container] -> npm run build -> [Global AWS CDN]
```

1. **Development (Local):** Built using Astro v5's "Islands Architecture" to eliminate unnecessary client-side JavaScript execution.
2. **Version Control (GitHub):** Pushing code changes or new MDX guides to the `main` branch triggers an automated GitHub Webhook.
3. **Automated Build (AWS Amplify):** AWS Amplify pulls the latest commit into an isolated container and executes `npm ci` and `npm run build`.
4. **Global Deployment & SSL:** Compiled static files in `dist/` are instantly distributed across global Edge locations with automated Wildcard SSL certificates.

---

## Build Specification (`amplify.yml`)

The build specification configured within AWS Amplify Hosting is defined as follows:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

---

## Step-by-Step Setup & Deployment

### 1. Astro Project Configuration
Define your canonical production site URL inside `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vyscnktn.com',
  integrations: [sitemap()]
});
```

### 2. Connecting to AWS Amplify
1. Sign in to the [AWS Management Console](https://aws.amazon.com) and navigate to **AWS Amplify**.
2. Select **"Create new app"** and choose **GitHub** as the source repository provider.
3. Authorize your repository (`vyscnktn/website`) and target `main` branch.
4. Review the auto-detected build commands and click **"Save and Deploy"**.

Your portfolio and technical guides are now fully automated—every `git push` triggers a live global deployment within seconds!

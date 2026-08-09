---
title: "Serverless Portfolio & CI/CD Pipeline"
description: "A static web platform built from scratch using Astro and AWS Amplify, featuring a fully automated Continuous Deployment (CI/CD) architecture."
techs: ["Astro v5", "AWS Amplify", "CI/CD", "Tailwind CSS v4"]
githubUrl: "https://github.com/vyscnktn/website"
featured: true
status: "Production"
lang: "tr"
---
This project demonstrates the integration of modern web development principles with cloud infrastructure. Instead of relying on traditional server hosting (e.g., EC2), a fully serverless architecture was implemented to ensure high availability and scalability.

## Architecture and Workflow

The system is designed to maximize the developer experience and eliminate operational overhead:

1. **Development (Local):** Built with Astro's "Islands Architecture" to eliminate unnecessary client-side JavaScript. Tailwind CSS v4 is used for modern, responsive styling.
2. **Version Control (GitHub):** Pushing code changes to the `main` branch immediately triggers a webhook.
3. **Continuous Integration (AWS Amplify):** AWS automatically pulls the latest commit and runs the `npm run build` process inside an isolated container.
4. **Global Deployment (CDN):** The compiled static files (HTML/CSS) are instantly distributed across AWS's global Edge Network.

Thanks to this CI/CD pipeline, whenever a new `.md` file (like a guide or project) is created locally, it is deployed live within seconds—fully optimized and secured with an SSL certificate.

## Learning Outcomes

Building this infrastructure was a practical exercise in applying core cloud computing concepts. Moving away from legacy manual uploads, this project provided end-to-end, hands-on experience with Automated Deployment and configuration management (using YAML-based build specifications) — the industry standards utilized by modern DevOps and software engineering teams.

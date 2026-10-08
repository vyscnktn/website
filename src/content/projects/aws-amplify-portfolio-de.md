---
title: "Serverless Portfolio & CI/CD Pipeline"
description: "Eine von Grund auf mit Astro und AWS Amplify entwickelte statische Webplattform mit einer vollautomatisierten Continuous-Deployment-Architektur (CI/CD)."
techs: ["Astro v5", "AWS Amplify", "CI/CD", "Tailwind CSS v4"]
githubUrl: "https://github.com/vyscnktn/website"
featured: true
status: "Produktion"
order: 2
lang: "de"
---
Dieses Projekt demonstriert die Integration moderner Webentwicklungsprinzipien mit Cloud-Infrastruktur. Anstelle herkömmlicher Server-Hostings (z. B. EC2) wurde eine vollständig serverlose Architektur implementiert, um höchste Verfügbarkeit und Skalierbarkeit zu gewährleisten.

## Architektur und Workflow

Das System wurde entwickelt, um die Developer Experience zu maximieren und jeglichen manuellen Betriebsaufwand zu eliminieren:

1. **Entwicklung (Lokal):** Entwickelt mit Astros Islands-Architektur, um unnötiges clientseitiges JavaScript vollständig zu vermeiden. Tailwind CSS v4 sorgt für modernes, responsives Styling.
2. **Versionskontrolle (GitHub):** Jeder Git-Push auf den `main`-Branch löst unmittelbar einen Webhook aus.
3. **Continuous Integration (AWS Amplify):** AWS lädt den neuesten Commit automatisch in einen isolierten Container und führt `npm run build` aus.
4. **Globales Deployment (CDN):** Kompilierte statische Dateien (HTML/CSS) werden sofort weltweit über das globale AWS CloudFront Edge-Netzwerk verteilt.

## Wichtigste Lernergebnisse

Der Verzicht auf manuelle Uploads ermöglichte praxisnahe End-to-End-Erfahrungen mit automatisiertem Deployment und Konfigurationsmanagement (mittels YAML-basierter Build-Spezifikationen) – den Branchenstandards moderner DevOps- und Software-Engineering-Teams.

---
title: "Leitfaden: Aufbau eines serverlosen Portfolios & automatisierte CI/CD mit Astro v5 & AWS Amplify"
description: "Entwicklung einer serverlosen, hochperformanten Technologieplattform, die automatisch von GitHub zu weltweiten AWS Edge CDN-Standorten gebaut und bereitgestellt wird."
category: "Cloud-Architektur"
date: 2026-08-08
readTime: "6 Min. Lesezeit"
featured: true
lang: "de"
---

Der Betrieb einer leistungsstarken, sicheren und skalierbaren persönlichen Portfolio-Plattform im modernen Software Engineering erfordert längst keine Verwaltung herkömmlicher virtueller Server (z. B. EC2-Instanzen) oder fehleranfällige manuelle Datei-Uploads mehr.

In diesem Leitfaden erläutere ich die genaue Architektur der **Serverless CI/CD Pipeline**, auf der diese Plattform basiert – realisiert mit **Astro v5 (Islands-Architektur)**, **Tailwind CSS v4** und **AWS Amplify Hosting**.

---

## Warum serverlose & Static-First-Architekturen?

Dynamische server-side gerenderte (SSR) Webanwendungen verbrauchen für jede eingehende HTTP-Anfrage kontinuierlich Rechenressourcen, was unnötige Leerlaufkosten verursacht. Technische Portfolios profitieren dagegen enorm von vorkompilierter statischer Seitengenerierung (SSG):

* **Kein Serverwartungsaufwand:** Keine Betriebssystem-Patches, Nginx-Konfigurationen oder Sicherheits-Updates auf Serverebene.
* **Maximale Performance (CWV):** Vorgerenderte statische HTML-Seiten garantieren minimale Time-To-First-Byte (TTFB) und mühelose 100/100-Werte bei den Google Core Web Vitals.
* **Weltweite Edge-Verteilung:** Statische Assets werden über AWS Amplify automatisch im weltweiten CloudFront Edge-Netzwerk zwischengespeichert.

---

## Architektur & CI/CD-Workflow

Die Pipeline ist auf optimale Developer Experience (DX) und automatisierte Bereitstellung ausgelegt:

```text
[Lokale Entwicklung] -> git push origin main -> [GitHub Webhook] -> [AWS Amplify Build Container] -> npm run build -> [Globales AWS CDN]
```

1. **Entwicklung (Lokal):** Entwickelt mit Astros Islands-Architektur, um unnötige clientseitige JavaScript-Ausführung zu vermeiden.
2. **Versionskontrolle (GitHub):** Jeder Push von neuem Code oder neuen Leitfäden auf den `main`-Branch löst automatisch einen Webhook aus.
3. **Automatisierter Build (AWS Amplify):** AWS Amplify lädt den neuesten Commit in einen isolierten Container und führt `npm ci` und `npm run build` aus.
4. **Weltweites Deployment & SSL:** Die kompilierten statischen Dateien in `dist/` werden sofort auf weltweite Edge-Standorte mit automatischen Wildcard-SSL-Zertifikaten verteilt.

---

## Build-Spezifikation (`amplify.yml`)

Die in AWS Amplify Hosting hinterlegte Build-Konfiguration ist wie folgt definiert:

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

## Schritt-für-Schritt-Einrichtung & Bereitstellung

### 1. Astro-Projektkonfiguration
Definieren Sie Ihre kanonische Produktions-URL in `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vyscnktn.com',
  integrations: [sitemap()]
});
```

### 2. Anbindung an AWS Amplify
1. Melden Sie sich in der [AWS Management Console](https://aws.amazon.com) an und navigieren Sie zu **AWS Amplify**.
2. Wählen Sie **„Neue App erstellen“** und bestimmen Sie **GitHub** als Repository-Anbieter.
3. Autorisieren Sie Ihr Repository (`vyscnktn/website`) und wählen Sie den `main`-Branch aus.
4. Überprüfen Sie die automatisch erkannten Build-Befehle und klicken Sie auf **„Speichern und Bereitstellen“**.

Ihr Portfolio und Ihre Leitfäden sind nun vollständig automatisiert – jeder `git push` führt innerhalb weniger Sekunden zu einem weltweiten Live-Deployment!

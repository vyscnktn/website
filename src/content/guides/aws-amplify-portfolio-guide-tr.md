---
title: "Rehber: Astro v5 ve AWS Amplify ile Serverless Mimari & CI/CD Dağıtımı"
description: "Geleneksel sanal sunucu maliyetlerini sıfırlayan, GitHub repoxundan AWS Edge CDN ağlarına otomatik yayın yapan sıfır-sunucu altyapı rehberi."
category: "Bulut Mimari"
date: 2026-08-08
readTime: "6 dk okuma"
featured: true
lang: "tr"
---

Modern web mühendisliğinde yüksek performanslı, güvenli ve ölçeklenebilir bir portföy platformu işletmek artık karmaşık EC2 sanal sunucuları yönetmeyi veya manuel FTP yüklemeleri yapmayı gerektirmiyor. 

Bu rehberde, bu web platformunu inşa ederken kullandığım **Astro v5 (Islands Architecture)**, **Tailwind CSS v4** ve **AWS Amplify Hosting** entegrasyonu ile tam otomatik **Sunucusuz (Serverless) CI/CD Boru Hattı** mimarisini adım adım açıklıyorum.

---

## Neden Sunucusuz (Serverless) ve Statik Mimariler?

Dinamik sunucu taraflı (SSR) uygulamalar, gelen her istek için işlemci kaynağı tüketir ve sürekli çalışan sunucu maliyeti yaratır. Oysa bir teknik portföy ve blog platformunda içeriklerin büyük kısmı önceden derlenebilir (Static Site Generation - SSG).

* **Sıfır Sunucu Bakımı:** İşletim sistemi güncellemeleri, Nginx yapılandırması veya güvenlik yamaları ile uğraşmazsınız.
* **Maksimum Performans (CWV):** Sayfalar önceden derlendiği için sunucu yanıt süresi (TTFB) minimum düzeye inerek Google Core Web Vitals skorlarında 100/100 değerine ulaşır.
* **Küresel CDN Dağıtımı:** İçeriklerin tamamı AWS Amplify aracılığıyla dünyanın dört bir yanındaki CloudFront Edge lokasyonlarına önbelleklenir.

---

## Sistem Mimarisi ve CI/CD Akışı

Sistem, geliştirici deneyimini (Developer Experience) en üst düzeye çıkaracak şekilde tasarlanmıştır:

```text
[Yerel Geliştirme] -> git push origin main -> [GitHub Webhook] -> [AWS Amplify Container] -> npm run build -> [Global AWS CDN]
```

1. **Geliştirme (Local):** Astro v5'in "Islands Architecture" yapısı sayesinde istemciye gereksiz JavaScript yükü gönderilmez.
2. **Sürüm Kontrolü (GitHub):** Kod değişiklikleri veya yeni bir MDX rehberi `main` dalına (branch) gönderildiği an otomatik GitHub Webhook tetiklenir.
3. **Otomatik Derleme (AWS Amplify):** AWS Amplify, izole bir Docker konteyner içerisinde depoyu çeker, `npm ci` ve `npm run build` komutlarını çalıştırır.
4. **Dağıtım ve SSL:** Derlenen `dist/` klasörü anında küresel Edge ağına yayınlanır ve ücretsiz Wildcard SSL sertifikası ile sunulur.

---

## Otomatik Build Yapılandırması (`amplify.yml`)

AWS Amplify konsolunda projenizi bağladığınızda kullanılan build spesifikasyonu şu şekildedir:

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

## Adım Adım Kurulum ve Dağıtım

### 1. Astro Projesini Hazırlama
Projeyi yerel ortamınızda oluşturduktan sonra `astro.config.mjs` dosyasında alan adınızı tanımlayın:

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vyscnktn.com',
  integrations: [sitemap()]
});
```

### 2. AWS Amplify Konsoluna Bağlanma
1. [AWS Management Console](https://aws.amazon.com) ekranına giriş yapın ve **AWS Amplify** servisine gidin.
2. **"Create new app"** seçeneğini tıklayın ve kod kaynağı olarak **GitHub**'ı seçin.
3. Repozitörünüzü (`vyscnktn/website`) ve `main` dalını yetkilendirin.
4. Otomatik algılanan build ayarlarını onaylayın ve **"Save and Deploy"** butonuna basın.

Tebrikler! Artık her `git push` işleminizde siteniz ve yeni rehberleriniz saniyeler içinde canlıya alınacaktır.

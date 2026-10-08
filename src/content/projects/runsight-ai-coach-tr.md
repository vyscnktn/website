---
title: "RunSight — Otonom AI Koşu Koçu"
description: "Strava antrenmanlarını GRU derin öğrenme modeli (Test AUC: 0.850) ve RAG destekli LLM koçluk ajanı ile analiz eden uçtan uca otonom n8n koçluk sistemi."
techs: ["Deep Learning (GRU)", "AWS Lambda & ECR", "n8n Workflow", "Pinecone RAG", "Strava API", "Telegram Bot"]
githubUrl: "https://github.com/vyscnktn/zero-to-ai-architect/tree/main/runsight"
featured: true
status: "Production"
order: 1
lang: "tr"
---

RunSight, dayanıklılık sporcularının antrenman kalitesini maksimize etmek ve aşırı yüklenmeyi (overtraining) önlemek için geliştirilmiş otonom bir yapay zeka koşu koçudur. Stephen Seiler'in **Polarized Training (Kutuplanmış Antrenman)** metodolojisini temel alarak koşu oturumlarını fizyolojik eşiklere göre sınıflandırır ve kişiye özel koçluk içgörüleri sunar.

## Temel Mimari Bileşenleri

1. **Derin Öğrenme Katmanı (GRU):** EndomondoHR/FitRec veri seti (13.884 test antrenmanı) üzerinde eğitilmiş çift katmanlı GRU (Gated Recurrent Unit) zaman serisi modeli. Ham GPS, nabız, irtifa ve hız serilerinden tek bir antrenman bazında aerobik/anaerobik yoğunluk sınıflandırması yapar (Test AUC: 0.850).
2. **Serverless Çıkarım (AWS Lambda & ECR):** Özel Docker container imajı ile AWS Lambda üzerinde barındırılan düşük gecikmeli çıkarım API'si.
3. **Kardiyak Kayma & Hata Analizi (JavaScript):** İki yarı arasındaki Efficiency Factor (hız/nabız) korelasyonundan dinamik `hr_drift_pct` (aerobik decoupling) hesabı.
4. **Güven Skoru & Human-in-the-Loop:** GRU modelinin tahmin güveni 0.60'ın altına düştüğünde Telegram üzerinden koşucuya etkileşimli doğrulama anketi yönlendirilir.
5. **RAG Destekli LLM Koçu:** Pinecone vektör veritabanında saklanan spor bilimi literatürü (Seiler 2010, laktat eşiği ve ACWR protokolleri) referans alınarak Gemini tabanlı yapılandırılmış JSON çıktılı koçluk raporları üretilir.
6. **Haftalık Adaptif Takip:** Her pazar n8n üzerinden otomatik tetiklenen cron döngüsü ile planlanan vs. gerçekleşen antrenman hacmi kıyaslanır ve gelecek haftanın antrenman yükü dinamik olarak revize edilir.

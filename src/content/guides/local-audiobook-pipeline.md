---
title: "Rehber: Local Audiobook Pipeline Kurulumu ve Mimarisi"
description: "Bulut maliyetlerini sıfırlayan, tüketici donanımlarında kesintisiz çalışabilen yerel TTS (Metinden Sese) sesli kitap ardışık düzeni."
category: "AI Araçları"
date: 2026-08-03
readTime: "7 dk okuma"
featured: true
---

Uzun belgelerin ve kitapların seslendirilmesi genellikle API maliyeti yüksek bulut hizmetlerine, devasa GPU altyapılarına veya manuel ses üretim süreçlerine bağımlıdır. 

Geliştirdiğim **[Local Audiobook Pipeline](https://github.com/vyscnktn/local-audiobook-pipeline)** projesi, bu bağımlılığı ortadan kaldırmak için tasarlandı. Tüketici sınıfı donanımlarda çalışan, tekrarlanabilir, kesintiye uğradığında veri kaybı yaşatmayan (resumable) ve açık kaynaklı araçlar kullanan tamamen yerel bir sistem inşa ettim.

> **💻 Kaynak Kod ve Repozitörü:** Projenin tüm kodlarına, detaylı yapılandırma ayarlarına ve güncel sürümlerine [GitHub repomdan (vyscnktn/local-audiobook-pipeline)](https://github.com/vyscnktn/local-audiobook-pipeline) ulaşabilir, yıldızlayarak destek olabilirsiniz.

---

## Neden Böyle Bir Sisteme İhtiyaç Var?

Sadece kısa bir metni sese dönüştürmek kolaydır. Ancak gerçek bir EPUB dosyasından tam bir sesli kitap üretmek karmaşık bir sistem mühendisliği problemidir:

*   **Veri Kirliliği:** EPUB dosyaları; kapaklar, ön sayfalar, bozuk XHTML etiketleri ve seslendirmeyi bozan dipnotlar içerir.
*   **Donanım Limitleri:** Uzun paragrafları tek seferde TTS modeline göndermek, tüketici GPU'larında VRAM'in (Video RAM) dolup çökmesine neden olur.
*   **Hata Toleransı:** 5 saatlik bir render işleminin 4. saatinde sistem çökerse, tüm sürecin baştan başlamaması, sadece kalınan yerden devam etmesi gerekir.

Bu proje, "kara kutu" bir dönüştürücü olmak yerine, her adımı izlenebilir (manifest-driven) bir ardışık düzen (pipeline) kurarak bu sorunları çözüyor.

---

## Sistem Mimarisi ve İş Akışı

Sistem, kırılgan olan "tek komutla her şeyi yap" mantığından kaçınır. İş akışı, her biri bağımsız olan ve arıza durumunda yeniden başlatılabilen şu 7 adıma bölünmüştür:

1.  **Ingestion (İçeri Aktarma):** EPUB içindeki XHTML dosyaları ve meta veriler ayrıştırılır.
2.  **Cleanup (Temizleme):** XHTML etiketleri, kitap yapısını (başlıklar, paragraflar) koruyarak saf metne (JSONL) dönüştürülür.
3.  **Manifest Generation:** Temizlenen kitaptan bölüm bazlı (chapter-level) manifestolar çıkarılır.
4.  **Job Generation:** Uzun metinler, bellek sınırlarını aşmayacak şekilde GPU-güvenli kısa TTS işlerine (jobs) bölünür.
5.  **Synthesis (Sentez):** Chatterbox Multilingual TTS kullanılarak işlerden `.wav` dosyaları üretilir.
6.  **Assembly (Birleştirme):** Kısa ses dosyaları, ayarlanabilir çapraz geçişler (crossfade) ve duraklamalarla tek bir bölüm dosyasına birleştirilir.
7.  **QA (Kalite Kontrol):** Tüm işlemlerin sonucunda başarı/hata oranını gösteren makine okunabilir bir rapor üretilir.

---

## Donanım Profili ve VRAM Optimizasyonu

Bu ardışık düzen, özellikle kısıtlı kaynaklara sahip yerel donanımlarda çalışacak şekilde optimize edilmiştir. Geliştirme ve doğrulama testleri şu profilde yapılmıştır:

*   **GPU:** NVIDIA GeForce RTX 4050 Laptop GPU
*   **VRAM:** 6 GB
*   **Runtime:** Python + PyTorch + CUDA
*   **TTS Motoru:** Chatterbox Multilingual TTS

Muhafazakar metin parçalama stratejisi (conservative chunking) sayesinde, sınırlı belleğe sahip sistemlerde dahi "Out of Memory" (OOM) hatalarının önüne geçilir.

---

## Adım Adım Kurulum ve Kullanım

Sistemi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz. *Gerekli olan CUDA uyumlu PyTorch kurulumunu kendi işletim sisteminize göre yapmayı unutmayın.*

### 1. Ortam Hazırlığı
```bash
python -m venv .venv-chatterbox
source .venv-chatterbox/bin/activate
pip install -r requirements.txt

``` 

2. Yapılandırma

Örnek ayar dosyasını kopyalayarak sistemi özelleştirin (Örn: konuşmacı referans dosyası ekleme):

```bash

cp config.example.yaml config.yaml

```
3. Kitabı İşleme ve Temizleme

Bir EPUB dosyasını sisteme dahil edip okumaya hazır, temizlenmiş metne dönüştürün:

```bash

# İçeri aktarma
python ingest_epub.py --book my-book --epub /path/to/my-book.epub

# Temizleme (Artifact ve HTML etiketlerinden arındırma)
python clean_epub.py --book my-book

``` 

4. Manifestoları ve Görevleri Oluşturma

Seslendirme görevlerini (GPU iş paketleri) oluşturun. Bu adım henüz ses üretmez, sadece stratejiyi belirler:

```bash

python build_book_manifests.py
python run_chatterbox_chapter.py --chapter-id <chapter-id> --rebuild-jobs --jobs-only

```

5. Render (Sentezleme)

Son olarak GPU çıkarımını başlatın ve bölümü oluşturun:

```bash

python run_chatterbox_chapter.py --chapter-id <chapter-id>

```

Daha fazla detay, koda katkıda bulunma (contributing) kuralları ve LLM destekli yapılandırmalar (NVIDIA NIM) için GitHub Repository sayfasını ziyaret edebilirsiniz.
---
title: "Rehber: Uçtan Uca AI Koşu Koçu Mimarisi — GRU Zaman Serisi, AWS Lambda ve n8n Ajanı (RunSight)"
description: "Strava antrenman verilerini GRU derin öğrenme modeli (Test AUC 0.850), serverless AWS Lambda ve RAG destekli n8n LLM koçluk ajanı ile birleştiren otonom sistem mimarisi."
category: "Yapay Zeka & MLOps"
date: 2026-10-06
readTime: "14 dk okuma"
featured: true
lang: "tr"
---

Dayanıklılık sporcularının ve amatör koşucuların en sık karşılaştığı handikaplardan biri, antrenmanların hedeflenen fizyolojik yoğunlukta geçip geçmediğini objektif biçimde ölçememektir. Çoğu koşucu farkında olmadan "gri bölge" (junk miles) tuzağına düşer: kolay koşular gereğinden hızlı koşularak aerobik taban yıpratılır, yüksek yoğunluklu interval günlerinde ise yorgunluk nedeniyle hedeflenen anaerobik eşiğe ulaşılamaz.

Stephen Seiler'in spor bilimi literatürüne kazandırdığı **Polarized Training (Kutuplanmış Antrenman)** modeline göre, elit dayanıklılık sporcuları hacimlerinin yaklaşık %80'ini düşük yoğunlukta (aerobik eşik / VT1 altı), %15-20'sini ise yüksek yoğunlukta (laktat eşiği / VT2 üstü) tamamlar.

Bu rehberde; ham GPS ve nabız zaman serilerinden antrenman yoğunluğunu sınıflandıran çift katmanlı bir **GRU (Gated Recurrent Unit) derin öğrenme modelinin**, **AWS Lambda** üzerinde serverless dağıtımının ve **n8n + Pinecone RAG** ile otonom bir AI koçuna dönüştürülmesinin uçtan uca mimarisini inceliyoruz.

---

## Sistem Genel Mimarisi

Sistem üç ana katmanın uyumlu entegrasyonu üzerine kurulmuştur:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. VERİ & DERİN ÖĞRENME                         │
│  Strava Activity Streams (Speed, HR, Altitude, Lat/Lon)               │
│                            │                                           │
│                            ▼                                           │
│  4-Kanal Ön İşleme (MinMaxScaler & PCA) ──► GRU Modeli (Test AUC 0.850)│
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼ [AWS Lambda Container API (ECR)]
┌────────────────────────────────────────────────────────────────────────┐
│                        2. ORKESTRASYON & KARAR                         │
│  n8n Webhook Tetikleyici (Self-hosted VPS)                             │
│  ├─ Kardiyak Kayma Hesabı (Efficiency Factor Drift % in JS)            │
│  └─ Güven Skoru Kontrolü (Confidence >= 0.60 ?)                        │
│         ├─ [EVET] ──► Doğrudan Kayıt (Google Sheets)                   │
│         └─ [HAYIR] ─► Human-in-the-Loop (Telegram Onay Anketi)         │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      3. RAG DESTEKLİ LLM KOÇU                          │
│  Dinamik Prompt (GitHub Raw) + Pinecone RAG (Seiler 2010 Bilgi Tabanı) │
│                            │                                           │
│                            ▼                                           │
│  Structured JSON Output ──► Telegram Raporu + Notion Plan Güncellemesi │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Veri Hazırlığı ve Kalite Kontrolü (QC)

Model eğitiminde halka açık ve yüksek hacimli **EndomondoHR / FitRec** veri seti kullanılmıştır. Veri setindeki her antrenman, oturum boyunca eşit aralıklarla örneklenmiş 500 ardışık veri noktasından (`timestamp`, `speed`, `heart_rate`, `latitude`, `longitude`, `altitude`) oluşur.

Ham dosyalar Python-dict formatında JSON Lines olarak saklandığından tek tırnak ve `NaN` değerlerini desteklemek adına `ast.literal_eval` ile ayrıştırılmıştır.

### Kalite Kontrol (QC) Kuralları

Her antrenman oturumu aşağıdaki fizyolojik ve sensör sınırlarına göre taranır:

| Kural Tanımı | Eşik Değeri | Gerekçe |
|---|---|---|
| Minimum Süre | 10 dakika | Yetersiz fizyolojik adaptasyon süresi |
| Maksimum Süre | 300 dakika | Aşırı süreler ve sensör açık unutulma hataları |
| Geçerli Hız Aralığı | 1 – 30 km/h | GPS sıçramaları ve durağan bekleme gürültüsü |
| Geçerli Nabız Aralığı | 60 – 220 bpm | Göğüs bandı / optik sensör temas anomalileri |
| Maks. Eksik Hız Oranı | %20 | Tünel ve yoğun bina arası sinyal kayıpları |
| Min. Geçerli Nabız Oranı | %50 | Zaman serisi bütünselliği |

Filtreleme esnasında geçersiz noktalar silinmez; zaman dizisinin 500 adımlık zamansal hizalanmasını bozmamak için `NaN` atanarak komşu geçerli noktalardan doğrusal interpolasyonla (linear interpolation) doldurulur.

```python
# functions.py içindeki örnek interpolasyon mantığı
def clean_and_interpolate_series(series, min_val, max_val):
    cleaned = np.where((series >= min_val) & (series <= max_val), series, np.nan)
    # Doğrusal interpolasyon ile zamansal ekseni koruma
    nans = np.isnan(cleaned)
    if np.all(nans):
        return None
    cleaned[nans] = np.interp(
        np.flatnonzero(nans), 
        np.flatnonzero(~nans), 
        cleaned[~nans]
    )
    return cleaned
```

---

## 2. Etiketleme Stratejisi: Kural Tabanlı Öğretmen (Teacher Pipeline)

Veri setinde sporcuların yaş, cinsiyet veya laboratuvar VO2max/laktat değerleri bulunmadığından, geleneksel sabit formüller (`220 - yaş`) kullanılamaz. Bunun yerine Karvonen'in **Heart Rate Reserve (Kalp Atım Rezervi)** yaklaşımı, sporcunun kendi antrenman geçmişi üzerinden kişiselleştirilerek referans alınmıştır:

```text
personal_hr_ceiling = Sporcunun tüm antrenmanlarındaki en yüksek p95 nabız değeri
personal_hr_floor   = Sporcunun tüm antrenmanlarındaki en düşük p10 nabız değeri
threshold           = personal_hr_floor + 0.70 × (personal_hr_ceiling − personal_hr_floor)
```

Buradaki `%70` eşiği, fizyolojik olarak **Ventilatuar Eşik 1'e (VT1 - Aerobik Eşik)** karşılık gelir. Antrenman boyunca nabzın bu eşiğin üzerinde geçirdiği süre oranı hesaplanır:

```python
# Cutoff = 0.02 (%2 tolerans)
training_zone = "anaerobik" if anaerobic_time_frac > 0.02 else "aerobik"
```

### Neden Kümeleme (K-Means/GMM) Terk Edildi?
İlk aşamada K-Means ve Gaussian Mixture Models (k=4) denenmiştir; ancak uzun koşular tempo düzenliliğinden bağımsız olarak sadece süreyle kümelenmiş, fizyolojik açıdan kritik olan "eşik-altı / eşik-üstü" ayrımı kümeleme algoritmaları tarafından yakalanamamıştır. Bu nedenle doğrudan fizyolojik gerekçeli kural tabanlı pipeline geliştirilmiş ve modelin hedefi olarak belirlenmiştir.

### Neden GRU? (Distillation-Fidelity)
Kural tabanlı yaklaşım doğru çalışsa da ciddi bir kısıtı vardır: **Sporcunun geçmiş antrenman geçmişine (ceiling/floor) ihtiyaç duyar.** Yeni başlayan bir sporcuda (cold start) geçmiş veri olmadığı için çalışmaz. 

GRU derin öğrenme modeli, tek bir koşunun ham zaman serisi sinyallerine (hız dalgalanmaları, nabız kayması, interval paternleri) bakarak, sporcunun geçmişine ihtiyaç duymadan aynı fizyolojik kararı yüksek sadakatle üretmeyi öğrenir.

---

## 3. GRU Modeli Mimarisi ve Eğitimi

Model 500 zaman adımlı 4 ana giriş kanalını değerlendirir:
1. `speed` (km/h)
2. `heart_rate` (bpm)
3. `altitude` (metre)
4. `latlon_pca` (Lat/Lon koordinatları yerel metreye dönüştürüldükten sonra 1 bileşenli PCA ile tek bir hareket eksenine indirgenir).

Veri sızıntısını (data leakage) engellemek için her kanal için ayrı `MinMaxScaler` yalnızca eğitim kümesinde fit edilmiş, ardından doğrulama ve test kümelerine dönüştürülmüştür.

```python
import tensorflow as tf
from tensorflow.keras import layers, models

def build_gru_model(input_shape=(500, 4)):
    model = models.Sequential([
        layers.Input(shape=input_shape),
        layers.GRU(64, return_sequences=True, dropout=0.1),
        layers.GRU(16, return_sequences=False, dropout=0.5),
        layers.Dense(32, activation="relu"),
        layers.Dense(1, activation="sigmoid")
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=[tf.keras.metrics.AUC(name="auc"), "accuracy"]
    )
    return model
```

### Eğitim ve Değerlendirme Sonuçları

13.884 bağımsız test antrenmanı üzerinde elde edilen performans metrikleri:

| Metrik | Test Seti Değeri |
|---|---|
| **Test AUC** | **0.850** |
| **Test Accuracy** | **%76.0** |
| Aerobik Sınıfı Precision / Recall | 0.78 / 0.73 |
| Anaerobik Sınıfı Precision / Recall | 0.75 / 0.79 |
| Rastgele Baseline AUC | 0.500 |

### Eğitim Eğrileri ve Hata Analizi

Eğitim sürecinde eğitim (`auc`) ve doğrulama (`val_auc`) eğrileri birbirine paralel ilerlemiş, ezberleme (overfitting) belirtisi göstermemiştir:

![GRU Model Öğrenme Eğrisi](/images/runsight/learning_curve.png)

Test seti üzerinde elde edilen ROC-AUC eğrisi ve Confusion Matrix dağılımı:

![ROC AUC Eğrisi ve Karmaşıklık Matrisi](/images/runsight/roc_auc_curve.png)

Hata analizi incelendiğinde, modelin yanıldığı antrenmanların ezici bir çoğunlukla `0.02` kesme eşiğinin hemen sınırındaki (%1.8 - %2.2 anaerobik süre) sınır vakalar olduğu görülmüştür:

![Eşik Mesafesine Göre Hata Dağılımı](/images/runsight/error_by_threshold_distance.png)

---

## 4. AWS Lambda ile Serverless Çıkarım (Deployment)

Model çıkarımı, AWS Lambda üzerinde özel Docker konteyneri olarak sunulur. Python 3.13 tabanlı imajda TensorFlow runtime bağımlılığı (`libgomp`) kurulmuş, model ağırlıkları (`gru_model.keras`) ve ön işleme nesneleri (`gru_preprocessing.pkl`) imaj içerisine dahil edilmiştir.

```dockerfile
FROM public.ecr.aws/lambda/python:3.13

RUN dnf install -y libgomp && dnf clean all

COPY requirements-deploy.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements-deploy.txt

COPY gru_model.keras gru_preprocessing.pkl functions.py 8_gru_deploy.py ${LAMBDA_TASK_ROOT}/

CMD [ "8_gru_deploy.handler" ]
```

Lambda fonksiyonu Strava'dan gelen ham akışı alır ve aşağıdaki yapılandırılmış yanıtı döner:

```json
{
  "training_zone": "aerobik",
  "anaerobic_probability": 0.18,
  "confidence": 0.64,
  "hr_p10": 131.0,
  "hr_p95": 168.5
}
```

---

## 5. Kardiyak Kayma (Cardiac Drift / Decoupling) Hesabı

Sıcaklık artışı, dehidrasyon ve kas lifi yorgunluğu sonucunda tempo sabit kalsa dahi nabız zamanla yukarı kayar (Aerobic Decoupling). Bu etki n8n iş akışındaki JavaScript Code node'unda **Efficiency Factor (Hız / Nabız)** yöntemiyle hesaplanır:

```javascript
// n8n Code Node: Efficiency Factor tabanlı Kardiyak Kayma Hesabı
const hrData = items[0].json.heartrate.data;
const speedData = items[0].json.velocity_smooth.data;

const mid = Math.floor(hrData.length / 2);

function getAverage(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const ef1 = getAverage(speedData.slice(0, mid)) / getAverage(hrData.slice(0, mid));
const ef2 = getAverage(speedData.slice(mid)) / getAverage(hrData.slice(mid));

// Pozitif değer: İkinci yarıda aynı nabızla daha az hız üretildi (Kardiyak Kayma)
const hr_drift_pct = Number((((ef1 - ef2) / ef1) * 100).toFixed(2));
```

%5'in altındaki kaymalar aerobik kondisyonun stabilitesini gösterirken, %7-10 üzerindeki kaymalar erken yorgunluk ve glikojen tükenmesi sinyali olarak kabul edilir.

---

## 6. Güven Eşiği ve İnsan Onayı (Human-in-the-Loop)

GRU modelinin hesapladığı güven skoru formülü:

$$\text{Confidence} = |\text{Proba} - 0.5| \times 2$$

n8n iş akışında bu skor bir karar mekanizmasına bağlanmıştır:
- **Confidence $\ge$ 0.60:** Modelin tahmini doğrudan doğrulanmış kabul edilir ve Google Sheets antrenman günlüğüne yazılır.
- **Confidence $<$ 0.60:** Model kararsız kaldığında Telegram Bot üzerinden sporcuya etkileşimli bir buton anketi gönderilir (`sendAndWait`):
  *"Antrenmanın yoğunluğu sınırda görünüyor. Sence bu antrenman Aerobik miydi yoksa Anaerobik mi?"*
  Kullanıcının seçtiği etiket nihai kayıt olarak işlenir. Bu mekanizma hem modelin sessizce hatalı karar vermesini engeller hem de gelecekteki fine-tuning için insan doğrulamalı veri toplar.

---

## 7. Pinecone RAG Destekli LLM Koçluk Ajanı

Koçluk analizini gerçekleştiren yapay zeka ajanı, serbest metin üretimi yerine sıkı bir **JSON Schema (Structured Output Parser)** kuralına tabidir:

1. **Dinamik Prompting:** Ajanın sistem talimatları n8n'e statik olarak yazılmaz. Çalışma anında GitHub'daki ham markdown dosyalarından (`post_workout_prompt.md`, `onboarding_prompt.md`, `weekly_review_prompt.md`) çekilir. Bu sayede koçluk stratejisi kod deploy etmeden GitHub üzerinden güncellenir.
2. **Kalıcı RAG Bilgi Tabanı:** Stephen Seiler'in (2010) polarize antrenman makaleleri, laktat eşik protokolleri ve ACWR (Akut:Kronik Yük Oranı) rehberleri OpenAI `text-embedding-3-small` ile vektörleştirilerek **Pinecone Serverless** indeksine yüklenmiştir. Ajan bir tavsiye üretirken bu literatürü araç (`knowledge_base`) olarak sorgular.
3. **Deterministik Tarih Yönetimi:** n8n üzerinde çalışan JavaScript katmanı sporcunun antrenman planındaki gün ve hafta numarasını önceden hesaplar; böylece dil modelinin tarih aritmetiği hataları yapması engellenir.

---

## 8. Haftalık Otomatik Adaptasyon Döngüsü

Her pazar saat 20:00'de tetiklenen cron iş akışı:
1. Google Sheets'ten sporcunun son 7 günde tamamladığı tüm antrenmanları çeker.
2. Notion üzerindeki haftalık hedef planını okur.
3. Planlanan kilometre ve yoğunluk dağılımını gerçekleşenle kıyaslar.
4. %0–100 arasında bir **Uyum Skoru (Compliance)** üretir ve gelecek haftanın antrenman hacminde yapılması gereken dinamik artış/azalış önerisini sporcunun Telegram hesabına iletir.

---

## Sonuç ve Çıkarılan Dersler

1. **Tek Başına Tahmin Yetersizdir:** Derin öğrenme modeli tek başına bir değer üretmez; modelin etrafındaki güven skoru filtrelemesi, kardiyak kayma hesapları ve RAG destekli LLM koçluk katmanı sistemi gerçek bir ürüne dönüştüren asıl unsurlardır.
2. **Kural Tabanlı Pipeline'lar Değerlidir:** Heuristic kural tabanlı pipeline'lar yalnızca bir yedek plan değil, aynı zamanda derin öğrenme modellerini eğitmek ve denetlemek için mükemmel birer *distillation teacher*'dır.
3. **Promptları Kod Tabanında Tutun:** Orkestrasyon araçları içerisine prompt gömmek yerine versiyon kontrolündeki dosyalardan dinamik enjeksiyon yapmak operasyonel esnekliği katbekat artırır.

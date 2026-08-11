---
title: "Rehber: NASNetMobile ile Transfer Learning ve Fine-Tuning (Atık Sınıflandırma)"
description: "ImageNet üzerinde eğitilmiş NASNetMobile omurgası kullanarak seçici katman dondurma, veri artırma ve derin öğrenme ile atık sınıflandırma rehberi."
category: "Derin Öğrenme"
date: 2026-08-11
readTime: "9 dk okuma"
featured: true
lang: "tr"
---

Derin öğrenme modellerini (Deep Learning) sıfırdan eğitmek devasa veri setleri, yüksek GPU maliyeti ve haftalar süren eğitim süreçleri gerektirir. **Transfer Learning (Transfer Öğrenme)** ve **Fine-Tuning (İnce Ayar)** teknikleri, ImageNet gibi milyonlarca görsel üzerinde eğitilmiş güçlü omurga modellerin bilgi birikimini kendi özel alanımıza (Domain Specific) aktarmamıza olanak tanır.

Bu rehberde, TensorFlow/Keras altyapısında **NASNetMobile** mimarisini kullanarak atık görsellerini 6 sınıfa (*cardboard, glass, metal, paper, plastic, trash*) ayıran yüksek başarımlı bir sınıflandırma modelinin adım adım kurulumunu inceliyoruz.

---

## Mimarinin Genel Yapısı ve İnce Ayar (Fine-Tuning) Mantığı

Geleneksel Transfer Learning yöntemlerinde omurga model tamamen dondurulur ve sadece en üstteki sınıflandırıcı katman eğitilir. Ancak bu yöntemde model, yeni veri setinin özel desenlerini öğrenmekte kısıtlı kalabilir.

Fine-Tuning yaklaşımında ise:
1. Omurganın ilk (düşük seviyeli) katmanları dondurulur (*kenar, köşe, doku gibi genel özellikleri korumak için*).
2. Omurganın son (yüksek seviyeli) blokları eğitime açılır (*alana özgü karmaşık nesne formlarını öğrenmek için*).
3. Aşırı uyumu (overfitting) önlemek için düşük bir öğrenme oranı (`learning_rate = 0.0001`) kullanılır.

```text
[Giriş Görseli (224x224x3)] 
         │
┌────────┴──────────────────────────┐
│ NASNetMobile Omurgası            │
│  ├─ Dondurulmuş İlk Katmanlar    │ -> (Genel Özellik Çıkarımı: Kenar/Doku)
│  └─ Eğitime Açık Üst Bloklar     │ -> ('reduction_concat_reduce_4' Sonrası)
└────────┬──────────────────────────┘
         │
[GlobalAveragePooling2D]
         │
[Dense(256, ReLU)] -> [Dropout(0.5)]
         │
[Dense(6, Softmax)] -> (Atık Sınıf Tahmini & Olasılık Skoru)
```

---

## 1. Veri Hazırlığı ve Veri Artırma (Data Augmentation)

Kısıtlı veri setlerinde modelin ezberlemesini önlemek için `ImageDataGenerator` ile dinamik veri artırma teknikleri uygulanır:

```python
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Eğitim verisi için artırma teknikleri
train_datagen = ImageDataGenerator(
    rescale=1./255,
    horizontal_flip=True,
    vertical_flip=True,
    shear_range=0.1,
    zoom_range=0.2,
    width_shift_range=0.2,
    height_shift_range=0.2,
    validation_split=0.1
)

# Doğrulama verisi için sadece ölçekleme
val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.1
)

# Veri akışlarının oluşturulması (224x224 giriş boyutu)
train_generator = train_datagen.flow_from_directory(
    dir_path,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='training'
)

val_generator = val_datagen.flow_from_directory(
    dir_path,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    subset='validation'
)
```

---

## 2. Omurga Model Hazırlığı ve Seçici Katman Dondurma

Mobil cihazlarda çalışabilecek kadar hafif ve etkili olan **NASNetMobile** omurgası yüklenir. Ardından `'reduction_concat_reduce_4'` bloğundan sonraki katmanlar haricindeki tüm katmanlar dondurulur:

```python
from keras.applications.nasnet import NASNetMobile

# ImageNet ağırlıkları ile omurganın yüklenmesi
backbone = NASNetMobile(
    include_top=False,
    weights='imagenet',
    input_shape=(224, 224, 3)
)

# Tüm omurgayı dondur
backbone.trainable = False

# Seçici olarak son blokları eğitime aç
start_unfreezing_layer = 'reduction_concat_reduce_4'
set_trainable = False

for layer in backbone.layers:
    if layer.name == start_unfreezing_layer:
        set_trainable = True
    if set_trainable:
        layer.trainable = True

print(f"'{start_unfreezing_layer}' katmanından sonrakiler Fine-Tuning için eğitime açıldı.")
```

---

## 3. Özel Sınıflandırıcı Başlığı ve Model Derleme

Omurga çıktısının üzerine `GlobalAveragePooling2D`, 256 nöronlu gizli katman, `%50` oranında `Dropout` ve 6 sınıflı `Softmax` çıkışı eklenir:

```python
from tensorflow.keras.models import Model
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout
from tensorflow.keras.optimizers import SGD

x = backbone.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation='relu')(x)
x = Dropout(0.5)(x)
predictions = Dense(6, activation='softmax')(x)

fine_tuning_model = Model(inputs=backbone.input, outputs=predictions)

# İnce ayar için muhafazakar SGD optimizasyonu
optimizer = SGD(learning_rate=0.0001, momentum=0.9, nesterov=True)

fine_tuning_model.compile(
    optimizer=optimizer,
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
```

---

## 4. Erken Durdurma ve Model Kaydetme Callback'leri

Eğitim sürecinde aşırı uyumu önlemek ve en iyi ağırlıkları kaydetmek için callback yapıları tanımlanır:

```python
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import datetime

early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=10,
    restore_best_weights=True,
    verbose=1
)

model_checkpoint = ModelCheckpoint(
    'NASNetMobile_finetuned.keras',
    monitor='val_loss',
    save_best_only=True,
    verbose=1
)

# Eğitimi başlat ve süreyi ölç
start_time = datetime.datetime.now()

history = fine_tuning_model.fit(
    train_generator,
    epochs=100,
    validation_data=val_generator,
    callbacks=[early_stopping, model_checkpoint]
)

total_duration = datetime.datetime.now() - start_time
print("Eğitim Tamamlandı. Süre:", total_duration)
```

---

## 5. Çıkarım (Inference) ve Tahmin Görselleştirme

Eğitilen model diskten yüklenerek yeni test görselleri üzerinde tahmin üretir:

```python
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model

waste_labels = {0: 'cardboard', 1: 'glass', 2: 'metal', 3: 'paper', 4: 'plastic', 5: 'trash'}
model = load_model('NASNetMobile_finetuned.keras')

def predict_image(model, img_path):
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0) / 255.0
    
    predictions = model.predict(img_array, verbose=0)
    class_idx = np.argmax(predictions[0])
    confidence = np.max(predictions[0])
    
    return waste_labels[class_idx], confidence

# Örnek Çıkarım
label, score = predict_image(model, "test_sample.jpg")
print(f"Tahmin Edilen Sınıf: {label} (Güven Skoru: %{score*100:.2f})")
```

Bu rehberdeki seçici ince ayar yaklaşımı, kısıtlı bilgi işlem kaynaklarıyla endüstriyel standartlarda yüksek doğruluklu bilgisayarlı görü (Computer Vision) çözümleri üretmenizi sağlar.

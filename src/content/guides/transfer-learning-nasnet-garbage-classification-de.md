---
title: "Leitfaden: Fine-Tuning & Transfer Learning mit NASNetMobile zur Abfallklassifizierung"
description: "Ein detaillierter Deep-Learning-Leitfaden zum selektiven Layer-Unfreezing, Data Augmentation und domänenspezifischem Fine-Tuning mit vortrainiertem NASNetMobile."
category: "Deep Learning"
date: 2026-08-11
readTime: "9 Min. Lesezeit"
featured: true
lang: "de"
---

Das Trainieren tiefer Convolutional Neural Networks (CNNs) von Grund auf erfordert riesige Datensätze, massive GPU-Rechenbudgets und wochenlange Trainingszyklen. **Transfer Learning** und **Fine-Tuning** ermöglichen es Entwicklern, leistungsstarke, auf ImageNet vortrainierte Feature-Extraktoren zu nutzen und dieses Wissen auf spezifische Computer-Vision-Aufgaben zu übertragen.

In diesem Leitfaden führen wir Sie durch den Aufbau eines hochgenauen Klassifikators für 6 Abfallklassen (*Pappe, Glas, Metall, Papier, Plastik, Restmüll*) mit **NASNetMobile** in TensorFlow/Keras.

---

## Architekturprinzipien & Fine-Tuning-Strategie

Beim einfachen Transfer Learning bleibt das gesamte Backbone eingefroren und nur der finale Klassifikationskopf wird trainiert. Dies verhindert jedoch, dass das Netzwerk spezifische Merkmale der neuen Domäne lernt.

Bei unserer Fine-Tuning-Strategie:
1. Die unteren Schichten bleiben eingefroren, um fundamentale Bildmerkmale (*Kanten, Texturen, Grundformen*) zu bewahren.
2. Höhere Blöcke werden freigegeben (unfreeze), um spezifische Repräsentationen (*Materialoberflächen, Behälterformen*) zu erlernen.
3. Eine vorsichtige Lernrate (`learning_rate = 0.0001`) mit Nesterov-Momentum verhindert die Zerstörung vortrainierter Gewichte.

```text
[Eingabebild (224x224x3)] 
         │
┌────────┴──────────────────────────┐
│ NASNetMobile Backbone            │
│  ├─ Eingefrorene frühe Schichten │ -> (Feature Extraction: Kanten & Texturen)
│  └─ Freigegebene obere Zellen    │ -> (Freigegeben ab 'reduction_concat_reduce_4')
└────────┬──────────────────────────┘
         │
[GlobalAveragePooling2D]
         │
[Dense(256, ReLU)] -> [Dropout(0.5)]
         │
[Dense(6, Softmax)] -> (Klassenvorhersagen & Konfidenzwerte)
```

---

## 1. Datenvorbereitung & Data Augmentation

Um Overfitting vorzubeugen, wird dynamische Data Augmentation über den Keras `ImageDataGenerator` eingesetzt:

```python
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Dynamische Augmentation-Pipeline für das Training
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

# Nur Rescaling für Validierungsdaten
val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.1
)

# Generatoren (224x224 Zielgröße)
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

## 2. Laden des Backbones & selektives Layer-Unfreezing

Wir laden **NASNetMobile** (`include_top=False`), frieren alle Schichten ein und geben sie selektiv ab Schicht `'reduction_concat_reduce_4'` frei:

```python
from keras.applications.nasnet import NASNetMobile

backbone = NASNetMobile(
    include_top=False,
    weights='imagenet',
    input_shape=(224, 224, 3)
)

backbone.trainable = False

start_unfreezing_layer = 'reduction_concat_reduce_4'
set_trainable = False

for layer in backbone.layers:
    if layer.name == start_unfreezing_layer:
        set_trainable = True
    if set_trainable:
        layer.trainable = True

print(f"Schichten nach '{start_unfreezing_layer}' sind für das Fine-Tuning freigegeben.")
```

---

## 3. Classifier-Head & Modellkompilierung

Wir ergänzen `GlobalAveragePooling2D`, eine Dense-Schicht mit 256 Neuronen, Dropout (0.5) und einen 6-Klassen-`Softmax`-Ausgang:

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

# Geringe Lernrate für stabiles Fine-Tuning
optimizer = SGD(learning_rate=0.0001, momentum=0.9, nesterov=True)

fine_tuning_model.compile(
    optimizer=optimizer,
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
```

---

## 4. Callbacks & Trainingsschleife

`EarlyStopping` verhindert Überanpassung und `ModelCheckpoint` sichert die besten Modellgewichte:

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

start_time = datetime.datetime.now()

history = fine_tuning_model.fit(
    train_generator,
    epochs=100,
    validation_data=val_generator,
    callbacks=[early_stopping, model_checkpoint]
)

print("Training abgeschlossen. Dauer:", datetime.datetime.now() - start_time)
```

---

## 5. Inferenz-Pipeline für Einzelbilder

```python
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model

waste_labels = {0: 'Pappe', 1: 'Glas', 2: 'Metall', 3: 'Papier', 4: 'Plastik', 5: 'Restmüll'}
model = load_model('NASNetMobile_finetuned.keras')

def predict_image(model, img_path):
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0) / 255.0
    
    predictions = model.predict(img_array, verbose=0)
    class_idx = np.argmax(predictions[0])
    confidence = np.max(predictions[0])
    
    return waste_labels[class_idx], confidence

label, score = predict_image(model, "test_sample.jpg")
print(f"Vorhergesagte Klasse: {label} (Konfidenz: {score*100:.2f}%)")
```

Selektives Fine-Tuning ermöglicht es, ressourceneffiziente Vision-Modelle für Edge-Devices bereitzustellen, die hohe Genauigkeit mit minimalem Rechenaufwand verbinden.

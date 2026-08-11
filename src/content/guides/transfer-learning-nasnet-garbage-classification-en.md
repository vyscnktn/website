---
title: "Guide: Fine-Tuning & Transfer Learning with NASNetMobile for Waste Classification"
description: "A step-by-step deep learning guide on selective layer unfreezing, data augmentation, and domain-specific fine-tuning using ImageNet-pretrained NASNetMobile."
category: "Deep Learning"
date: 2026-08-11
readTime: "9 min read"
featured: true
lang: "en"
---

Training deep convolutional neural networks (CNNs) from scratch requires massive datasets, heavy GPU compute budgets, and weeks of training iterations. **Transfer Learning** and **Fine-Tuning** allow engineers to leverage powerful feature extractors pretrained on ImageNet (over millions of images) and transfer that knowledge to domain-specific computer vision tasks.

In this guide, we walk through building a high-accuracy multi-class waste classification model (*cardboard, glass, metal, paper, plastic, trash*) using **NASNetMobile** in TensorFlow/Keras.

---

## Architectural Principles & Fine-Tuning Strategy

In basic Transfer Learning, the entire backbone is kept frozen and only the top linear classifier is trained. However, this restricts the network from learning specialized low-level or mid-level domain features.

In a fine-tuning strategy:
1. The initial layers of the backbone are frozen to preserve low-level features (*edges, textures, basic geometric forms*).
2. Upper blocks are unfreezed to adapt domain-specific high-level representations (*complex material surfaces, container shapes*).
3. A conservative learning rate (`learning_rate = 0.0001`) with Nesterov momentum is used to prevent destroying pretrained weights.

```text
[Input Image (224x224x3)] 
         │
┌────────┴──────────────────────────┐
│ NASNetMobile Backbone            │
│  ├─ Frozen Early Layers          │ -> (Feature Extraction: Edges & Textures)
│  └─ Unfrozen Top Cells           │ -> (Unfrozen from 'reduction_concat_reduce_4')
└────────┬──────────────────────────┘
         │
[GlobalAveragePooling2D]
         │
[Dense(256, ReLU)] -> [Dropout(0.5)]
         │
[Dense(6, Softmax)] -> (Class Predictions & Confidence Scores)
```

---

## 1. Data Preparation & Data Augmentation

To prevent overfitting on custom dataset splits, dynamic data augmentation is applied via Keras `ImageDataGenerator`:

```python
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Dynamic Augmentation Pipeline for Training
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

# Rescaling Only for Validation Data
val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.1
)

# Data Flow Generators (224x224 input target size)
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

## 2. Backbone Loading & Selective Layer Unfreezing

We load **NASNetMobile**, a lightweight backbone optimized for mobile and edge deployment (`include_top=False`). We freeze lower layers and selectively unfreeze starting from layer `'reduction_concat_reduce_4'`:

```python
from keras.applications.nasnet import NASNetMobile

# Load ImageNet-pretrained NASNetMobile backbone
backbone = NASNetMobile(
    include_top=False,
    weights='imagenet',
    input_shape=(224, 224, 3)
)

# Freeze full backbone initially
backbone.trainable = False

# Selectively unfreeze upper reduction blocks
start_unfreezing_layer = 'reduction_concat_reduce_4'
set_trainable = False

for layer in backbone.layers:
    if layer.name == start_unfreezing_layer:
        set_trainable = True
    if set_trainable:
        layer.trainable = True

print(f"Layers after '{start_unfreezing_layer}' are unfrozen for Fine-Tuning.")
```

---

## 3. Top Classifier Head & Model Compilation

We append `GlobalAveragePooling2D`, a 256-unit dense layer, a `0.5` Dropout rate for regularization, and a 6-class `Softmax` output layer:

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

# Low learning rate SGD for stable fine-tuning
optimizer = SGD(learning_rate=0.0001, momentum=0.9, nesterov=True)

fine_tuning_model.compile(
    optimizer=optimizer,
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
```

---

## 4. Callbacks & Training Loop

We configure `EarlyStopping` to prevent overfitting and `ModelCheckpoint` to persist optimal weights:

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

# Execute fine-tuning training loop
start_time = datetime.datetime.now()

history = fine_tuning_model.fit(
    train_generator,
    epochs=100,
    validation_data=val_generator,
    callbacks=[early_stopping, model_checkpoint]
)

total_duration = datetime.datetime.now() - start_time
print("Training Complete. Duration:", total_duration)
```

---

## 5. Preprocessing & Visual Inference Pipeline

We load the saved `.keras` checkpoint and execute single-image inference:

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

# Run sample inference
label, score = predict_image(model, "test_sample.jpg")
print(f"Predicted Class: {label} (Confidence: {score*100:.2f}%)")
```

Selective fine-tuning empowers software engineers to train edge-ready computer vision classifiers achieving high accuracy with minimal compute overhead.

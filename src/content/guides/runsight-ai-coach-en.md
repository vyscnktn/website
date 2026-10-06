---
title: "Guide: End-to-End AI Running Coach Architecture — GRU Time-Series, AWS Lambda & n8n Agent (RunSight)"
description: "A production architecture combining a GRU deep learning model (Test AUC 0.850), serverless AWS Lambda, and a RAG-augmented n8n LLM agent for autonomous endurance coaching."
category: "AI & MLOps"
date: 2026-10-06
readTime: "14 min read"
featured: true
lang: "en"
---

One of the most persistent bottlenecks faced by endurance athletes and recreational runners is the inability to objectively assess whether training sessions achieve their intended physiological intensity. Many athletes unwittingly fall into the "grey zone" (junk miles) trap: easy runs are executed too fast, eroding aerobic base development, while high-intensity interval days suffer from residual fatigue, failing to reach target anaerobic thresholds.

According to Stephen Seiler's seminal **Polarized Training** model, elite endurance athletes distribute approximately 80% of their total volume below the aerobic threshold (Ventilatory Threshold 1 / VT1) and 15–20% above the lactate threshold (VT2), minimizing unproductive mid-zone volume.

In this guide, we break down the end-to-end architecture of **RunSight**—an autonomous AI running coach that pairs a two-layer **GRU (Gated Recurrent Unit)** time-series model deployed on **AWS Lambda** with a **Pinecone-backed RAG agent** orchestrated through **n8n**.

---

## High-Level System Architecture

The system functions across three seamlessly integrated layers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. DATA & DEEP LEARNING                         │
│  Strava Activity Streams (Speed, HR, Altitude, Lat/Lon)               │
│                            │                                           │
│                            ▼                                           │
│  4-Channel Preprocessing (MinMaxScaler & PCA) ──► GRU (Test AUC 0.850) │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼ [AWS Lambda Container API (ECR)]
┌────────────────────────────────────────────────────────────────────────┐
│                     2. ORCHESTRATION & DECISION                        │
│  n8n Webhook Trigger (Self-hosted Hetzner VPS)                         │
│  ├─ Aerobic Decoupling Computation (Efficiency Factor Drift % in JS)   │
│  └─ Confidence Routing Guardrail (Confidence >= 0.60 ?)                │
│         ├─ [YES] ──► Direct Logging (Google Sheets)                    │
│         └─ [NO]  ──► Human-in-the-Loop (Telegram Verification Poll)     │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      3. RAG-AUGMENTED LLM COACH                        │
│  Dynamic Prompts (GitHub Raw) + Pinecone RAG (Seiler 2010 Knowledge)  │
│                            │                                           │
│                            ▼                                           │
│  Structured JSON Output ──► Telegram Report + Notion Training Tracker  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Processing and Quality Control (QC)

The model was trained on the public, high-volume **EndomondoHR / FitRec** dataset. Each workout record represents a resampled 500-step time series (`timestamp`, `speed`, `heart_rate`, `latitude`, `longitude`, `altitude`).

Because raw records were stored in Python-dict JSON Lines format containing single quotes and `NaN` values, parsing was implemented via `ast.literal_eval`.

### Quality Control (QC) Rules

Every workout is validated against physiological and GPS integrity bounds:

| Rule | Threshold | Rationale |
|---|---|---|
| Minimum Duration | 10 minutes | Insufficient physiological cardiovascular adaptation |
| Maximum Duration | 300 minutes | Outlier runs and unpaused tracking errors |
| Valid Speed Range | 1 – 30 km/h | Filters stationary GPS noise and vehicle artifacts |
| Valid HR Range | 60 – 220 bpm | Eliminates optical strap dropouts and sensor spikes |
| Max Missing Speed | 20% | Urban canyon and tunnel GPS dropouts |
| Min Valid HR Ratio | 50% | Ensures time-series continuity |

Crucially, invalid records are not dropped point-by-point; doing so would break time alignment across the 500 steps. Instead, invalid values are masked as `NaN` and imputed via **linear interpolation** from adjacent valid steps.

```python
# Linear interpolation ensuring fixed time-series dimensions
def clean_and_interpolate_series(series, min_val, max_val):
    cleaned = np.where((series >= min_val) & (series <= max_val), series, np.nan)
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

## 2. Labeling Strategy: Heuristic Teacher Pipeline

In the absence of demographic variables (age, sex) or lab-grade VO2max/lactate data, traditional fixed formulas (`220 - age`) are invalid. Instead, we adapted Karvonen's **Heart Rate Reserve (HRR)** formula into a personalized, data-driven heuristic:

```text
personal_hr_ceiling = Athlete's observed p95 heart rate across all runs
personal_hr_floor   = Athlete's observed p10 heart rate across all runs
threshold           = personal_hr_floor + 0.70 × (personal_hr_ceiling − personal_hr_floor)
```

The `0.70` fractional factor corresponds closely to **Ventilatory Threshold 1 (VT1 - Aerobic Threshold)**. For each session, the proportion of time spent above this threshold is calculated:

```python
# Cutoff = 0.02 (2% threshold tolerance)
training_zone = "anaerobic" if anaerobic_time_frac > 0.02 else "aerobic"
```

### Why Unsupervised Clustering (K-Means/GMM) Failed
Initial experiments using K-Means and GMM (k=4) clustered runs almost exclusively by total duration rather than physiological pace dynamics. Because the crucial physiological boundary is threshold excursion, an explicit physiological rule provided an optimal teacher baseline.

### Why GRU? (Distillation-Fidelity)
While the heuristic rule is accurate, it suffers from a fatal operational flaw: **it requires historical workout data (ceiling/floor) to classify a run.** A newly onboarded athlete suffers from cold-start failure.

The GRU network learns to infer this exact physiological label directly from the raw 500-step time-series patterns (tempo variability, cardiac drift, interval surges) of a single run, completely eliminating the historical data prerequisite.

---

## 3. GRU Architecture and Training

The model ingests 4 normalized channels across 500 timesteps:
1. `speed` (km/h)
2. `heart_rate` (bpm)
3. `altitude` (meters)
4. `latlon_pca` (Lat/Lon coordinates projected to local metric coordinates, reduced to 1 component via PCA to capture displacement along the principal variance axis).

To eliminate data leakage, independent `MinMaxScaler` instances were fitted strictly on the training partition and applied to validation and test splits.

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

### Evaluation Metrics on Independent Test Set

Evaluated across 13,884 unseen test workouts:

| Metric | Test Set Value |
|---|---|
| **Test AUC** | **0.850** |
| **Test Accuracy** | **76.0%** |
| Aerobic Precision / Recall | 0.78 / 0.73 |
| Anaerobic Precision / Recall | 0.75 / 0.79 |
| Random Guessing Baseline AUC | 0.500 |

### Learning Curves and Error Distribution

Training curves demonstrate close convergence between training and validation AUC, confirming no overfitting:

![GRU Model Learning Curves](/images/runsight/learning_curve.png)

ROC-AUC curve and test confusion matrix:

![ROC AUC Curve and Confusion Matrix](/images/runsight/roc_auc_curve.png)

Error analysis indicates that misclassifications are concentrated almost entirely near the `0.02` boundary cut-off (borderline sessions with 1.8%–2.2% threshold time):

![Error Rate vs Threshold Distance](/images/runsight/error_by_threshold_distance.png)

---

## 4. Serverless Deployment via AWS Lambda & ECR

Inference is containerized on AWS Lambda using a custom Docker image (`public.ecr.aws/lambda/python:3.13`). `libgomp` is installed for the TensorFlow C runtime, while pre-fitted scalers (`gru_preprocessing.pkl`) and model weights (`gru_model.keras`) remain cached in container memory across invocations.

```dockerfile
FROM public.ecr.aws/lambda/python:3.13

RUN dnf install -y libgomp && dnf clean all

COPY requirements-deploy.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements-deploy.txt

COPY gru_model.keras gru_preprocessing.pkl functions.py 8_gru_deploy.py ${LAMBDA_TASK_ROOT}/

CMD [ "8_gru_deploy.handler" ]
```

Lambda returns a concise, typed payload upon receiving Strava streams:

```json
{
  "training_zone": "aerobic",
  "anaerobic_probability": 0.18,
  "confidence": 0.64,
  "hr_p10": 131.0,
  "hr_p95": 168.5
}
```

---

## 5. Aerobic Decoupling & Cardiac Drift Computation

As fatigue accumulates and core temperature increases, heart rate drifts upward even if pace remains constant. An n8n JavaScript Code node computes **aerobic decoupling (`hr_drift_pct`)** using the **Efficiency Factor (Speed / Heart Rate)** ratio between split halves:

```javascript
// n8n Code Node: Efficiency Factor Based Cardiac Drift
const hrData = items[0].json.heartrate.data;
const speedData = items[0].json.velocity_smooth.data;

const mid = Math.floor(hrData.length / 2);

function getAverage(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const ef1 = getAverage(speedData.slice(0, mid)) / getAverage(hrData.slice(0, mid));
const ef2 = getAverage(speedData.slice(mid)) / getAverage(hrData.slice(mid));

// Positive value indicates less speed produced per heart beat in the second half
const hr_drift_pct = Number((((ef1 - ef2) / ef1) * 100).toFixed(2));
```

Drift below 5% reflects robust aerobic durability, whereas values exceeding 8–10% signal premature decoupling, hydration deficits, or excessive pacing.

---

## 6. Confidence Routing & Human-in-the-Loop

The GRU confidence score is derived as:

$$\text{Confidence} = |\text{Probability} - 0.5| \times 2$$

An n8n IF node partitions the workflow:
- **Confidence $\ge$ 0.60:** Classification accepted automatically and logged to Google Sheets.
- **Confidence $<$ 0.60:** Triggers an interactive Telegram inline poll (`sendAndWait`):
  *"Model confidence is low for this borderline session. Did this workout feel Aerobic or Anaerobic to you?"*
  The athlete's feedback overrides the model label. This prevents silent misclassifications and curates human-verified training pairs for future fine-tuning.

---

## 7. Pinecone RAG & Structured LLM Coaching Agent

The coaching agent enforces strict sports science rigor through:
1. **Dynamic Prompt Injection:** System prompts are retrieved live from GitHub raw URLs (`post_workout_prompt.md`), allowing instant coaching prompt iteration without modifying workflow nodes.
2. **Pinecone Vector RAG:** Academic literature (Seiler 2010 polarized training, lactate threshold methodology, Acute:Chronic Workload Ratio guidelines) is vectorized via OpenAI embeddings into **Pinecone Serverless**. The agent queries this knowledge base as a first-class retrieval tool.
3. **Deterministic Date Arithmetics:** An upstream JavaScript node calculates relative plan progression (`plan_week_number`, `plan_day_name`) deterministically, preventing LLM arithmetic hallucinations.
4. **Structured JSON Output:** Downstream systems (Telegram, Notion, Google Sheets) receive clean, validated JSON schemas containing a summary, 3 actionable items, and decoupling analysis.

---

## 8. Adaptive Weekly Learning Loop

Every Sunday at 20:00, a scheduled cron workflow:
1. Extracts completed workouts from the past 7 days from Google Sheets.
2. Reads target weekly training prescriptions from Notion.
3. Computes a comprehensive **Compliance Score (0–100%)**.
4. Synthesizes an adaptive adjustment proposal for next week's volume and delivers it directly to the athlete's Telegram account.

---

## Key Engineering Takeaways

1. **Inference Alone Is Not a Product:** Raw DL classifications become truly useful only when wrapped with confidence thresholds, physical metric derivations (drift), and conversational LLM reasoning.
2. **Heuristic Teachers Accelerate DL:** Deterministic rules grounded in physiology provide reliable ground-truth proxies for model distillation.
3. **Decouple Prompts from Workflow Engines:** Pulling prompts dynamically from version-controlled repositories maintains single-source-of-truth hygiene across production environments.

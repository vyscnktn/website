---
title: "RunSight — Autonomous AI Running Coach"
description: "An end-to-end AI coaching system classifying Strava runs using a GRU deep learning model (Test AUC: 0.850) and generating personalized advice via a RAG-enabled LLM agent on n8n."
techs: ["Deep Learning (GRU)", "AWS Lambda & ECR", "n8n Workflow", "Pinecone RAG", "Strava API", "Telegram Bot"]
githubUrl: "https://github.com/vyscnktn/zero-to-ai-architect/tree/main/runsight"
featured: true
status: "Production"
order: 1
lang: "en"
---

RunSight is an autonomous AI running coach designed to optimize training distribution and prevent overtraining for endurance athletes. Based on Stephen Seiler's **Polarized Training** methodology, it classifies workouts into physiological effort zones and provides actionable coaching feedback.

## Core Architectural Layers

1. **Deep Learning Layer (GRU):** A 2-layer Gated Recurrent Unit (GRU) time-series model trained on the EndomondoHR/FitRec dataset (13,884 test sessions). Evaluates raw GPS, heart rate, elevation, and speed streams to perform single-session aerobic/anaerobic classification without historical cold-start dependencies (Test AUC: 0.850).
2. **Serverless Inference (AWS Lambda & ECR):** Containerized inference runtime deployed via AWS Lambda container image with pre-warmed scalers and model artifacts.
3. **Cardiac Drift & Decoupling (JavaScript):** Computes aerobic decoupling (`hr_drift_pct`) using an Efficiency Factor (speed / heart rate) ratio between the first and second halves of the run.
4. **Confidence-Based Human-in-the-Loop:** Automatically routes workouts with GRU confidence scores below 0.60 to Telegram interactive polling for athlete validation.
5. **RAG-Augmented LLM Coach:** Retrieves evidence-based sport science literature (Seiler 2010, lactate thresholds, ACWR protocols) from a serverless Pinecone index to output strict structured JSON coaching reports.
6. **Adaptive Weekly Learning Loop:** Weekly cron trigger analyzing scheduled vs. completed workout volume, generating progressive overload adjustments and compliance insights.

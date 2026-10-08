---
title: "Leitfaden: End-to-End KI-Laufcoach-Architektur — GRU-Zeitreihen, AWS Lambda & n8n-Agent (RunSight)"
description: "Eine produktionsreife Architektur, die ein GRU-Deep-Learning-Modell (Test-AUC 0.850), serverlose AWS Lambda und einen RAG-gestützten n8n-LLM-Agenten für autonomes Ausdauer-Coaching vereint."
category: "KI & MLOps"
date: 2026-10-06
readTime: "14 Min. Lesezeit"
featured: true
lang: "de"
---

Einer der hartnäckigsten Engpässe für Ausdauersportler und Freizeitläufer ist die Unfähigkeit, objektiv zu beurteilen, ob Trainingseinheiten ihre beabsichtigte physiologische Intensität erreichen. Viele Sportler tappen unbemerkt in die Falle der sogenannten „Grauzone“ (Junk Miles): Lockere Grundlageneinheiten werden zu schnell absolviert, was den aeroben Basisaufbau hemmt, während hochintensive Intervalltage unter Restmüdigkeit leiden und die anaeroben Schwellen nicht erreichen.

Nach dem bahnbrechenden **Polarized Training**-Modell von Stephen Seiler verteilen Spitzen-Ausdauerathleten etwa 80 % ihres Gesamtvolumens unterhalb der aeroben Schwelle (Ventilatory Threshold 1 / VT1) und 15–20 % oberhalb der Laktatschwelle (VT2), wodurch unproduktive mittlere Intensitäten minimiert werden.

In diesem Leitfaden stellen wir die End-to-End-Architektur von **RunSight** vor – einem autonomen KI-Laufcoach, der ein zweilagiges **GRU (Gated Recurrent Unit)** Zeitreihenmodell auf **AWS Lambda** mit einem **Pinecone-gestützten RAG-Agenten** kombiniert, orchestriert über **n8n**.

---

## High-Level-Systemarchitektur

Das System operiert über drei nahtlos ineinandergreifende Schichten:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. DATEN & DEEP LEARNING                        │
│  Strava-Aktivitätsströme (Tempo, HR, Höhe, Lat/Lon)                   │
│                            │                                           │
│                            ▼                                           │
│  4-Kanal-Vorverarbeitung (MinMaxScaler & PCA) ──► GRU (Test-AUC 0.850) │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼ [AWS Lambda Container API (ECR)]
┌────────────────────────────────────────────────────────────────────────┐
│                   2. ORCHESTRIERUNG & ENTSCHEIDUNG                     │
│  n8n-Webhook-Trigger (Self-hosted Hetzner VPS)                         │
│  ├─ Aerobe Entkopplungsberechnung (Efficiency Factor Drift % in JS)    │
│  └─ Konfidenz-Routing-Guardrail (Konfidenz >= 0.60 ?)                  │
│         ├─ [JA]   ──► Direktes Logging (Google Sheets)                 │
│         └─ [NEIN] ──► Human-in-the-Loop (Telegram-Verifizierungsumfrage) │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     3. RAG-GESTÜTZTER LLM-COACH                        │
│  Dynamische Prompts (GitHub Raw) + Pinecone RAG (Seiler 2010 Wissen)   │
│                            │                                           │
│                            ▼                                           │
│  Strukturierte JSON-Ausgabe ──► Telegram-Bericht + Notion Tracker      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Datenverarbeitung und Qualitätskontrolle (QC)

Das Modell wurde auf dem umfangreichen, öffentlichen **EndomondoHR / FitRec**-Datensatz trainiert. Jeder Trainingsdatensatz besteht aus einer resampelten 500-Schritt-Zeitreihe (`timestamp`, `speed`, `heart_rate`, `latitude`, `longitude`, `altitude`).

Da Rohdaten als Python-Dictionary im JSON-Lines-Format mit einfachen Anführungszeichen und `NaN`-Werten vorlagen, wurde das Parsing mittels `ast.literal_eval` umgesetzt.

### Regeln zur Qualitätskontrolle (QC)

Jede Trainingseinheit wird anhand physiologischer und GPS-Integritätsgrenzen validiert:

| Regel | Schwellenwert | Begründung |
|---|---|---|
| Mindestdauer | 10 Minuten | Unzureichende kardiovaskuläre Anpassung |
| Maximaldauer | 300 Minuten | Ausreißer und fehlerhafte Aufzeichnungen |
| Gültiger Geschwindigkeitsbereich | 1 – 30 km/h | Filtert stationäres Rauschen und Fahrzeuge |
| Gültiger Pulsbereich | 60 – 220 bpm | Eliminiert Sensor-Spikes und Aussetzer |
| Max. fehlendes Tempo | 20 % | Tunnelausfälle und Häuserschluchten |
| Min. gültiges Pulsverhältnis | 50 % | Gewährleistet Zeitreihen-Kontinuität |

Ungültige Werte werden nicht punktweise gelöscht, da dies die zeitliche Ausrichtung über die 500 Zeitschritte zerstören würde. Stattdessen werden ungültige Daten als `NaN` maskiert und über **lineare Interpolation** aus benachbarten Zeitschritten berechnet.

```python
# Lineare Interpolation zur Wahrung der festen Zeitreihendimension
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

## 2. Labeling-Strategie: Heuristisches Teacher-Modell

Ohne demografische Variablen (Alter, Geschlecht) oder Labordaten (VO2max, Laktat) sind starre Standardformeln unbrauchbar. Daher wurde die Karvonen-Formel der **Herzfrequenzreserve (HRR)** zu einer personalisierten Heuristik adaptiert:

```text
personal_hr_ceiling = Beobachtete p95-Herzfrequenz des Athleten über alle Läufe
personal_hr_floor   = Beobachtete p10-Herzfrequenz des Athleten über alle Läufe
threshold           = personal_hr_floor + 0.70 × (personal_hr_ceiling − personal_hr_floor)
```

Der Faktor `0.70` korrespondiert eng mit der **aeroben Schwelle (VT1)**. Für jede Einheit wird der Anteil der Zeit über dieser Schwelle bestimmt:

```python
# Cutoff = 0.02 (2 % Schwellentoleranz)
training_zone = "anaerobic" if anaerobic_time_frac > 0.02 else "aerobic"
```

### Warum unüberwachtes Clustering (K-Means/GMM) scheiterte
Erste Versuche mit K-Means und GMM (k=4) clusterten Läufe primär nach der Gesamtdauer statt nach der physiologischen Dynamik. Eine explizite physiologische Regel bot daher die verlässlichste Baseline.

### Warum GRU? (Distillation & Cold-Start-Lösung)
Die Heuristik benötigt historische Trainingsdaten des Athleten, um eine Einheit einzustufen – ein neuer Nutzer leidet unter einem Cold-Start-Problem. Das GRU-Netzwerk lernt, diese physiologische Einstufung direkt aus den 500 Zeitschritten eines einzelnen Laufs vorherzusagen.

---

## 3. GRU-Architektur und Training

Das Modell verarbeitet 4 normalisierte Kanäle über 500 Zeitschritte:
1. `speed` (km/h)
2. `heart_rate` (bpm)
3. `altitude` (Meter)
4. `latlon_pca` (Lat/Lon-Koordinaten auf lokale Metriken projiziert und per PCA auf 1 Komponente reduziert).

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

### Evaluationsmetriken auf ungesehenem Testset

Getestet auf 13.884 unabhängigen Test-Einheiten:

| Metrik | Testset-Ergebnis |
|---|---|
| **Test-AUC** | **0.850** |
| **Test-Genauigkeit** | **76.0 %** |
| Aerobe Präzision / Recall | 0.78 / 0.73 |
| Anaerobe Präzision / Recall | 0.75 / 0.79 |
| Zufalls-Baseline AUC | 0.500 |

Die Fehleranalyse zeigt, dass Fehlklassifikationen fast ausschließlich im Grenzbereich von `0.02` (Grenzläufe mit 1.8 %–2.2 % Schwellenzeit) liegen.

---

## 4. Serverloses Deployment via AWS Lambda & ECR

Die Inferenz ist auf AWS Lambda containerisiert (`public.ecr.aws/lambda/python:3.13`). `libgomp` ist für die TensorFlow C-Runtime installiert, während Skalierer (`gru_preprocessing.pkl`) und Modellgewichte (`gru_model.keras`) im Speicher des Containers vorgehalten werden.

Lambda liefert eine schlanke, typisierte Antwort:

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

## 5. Aerobe Entkopplung & Kardiale Drift-Berechnung

Mit zunehmender Ermüdung driftet die Herzfrequenz nach oben, selbst wenn das Tempo konstant bleibt. Ein n8n-JavaScript-Knoten berechnet die **aerobe Entkopplung (`hr_drift_pct`)** über das Verhältnis des **Efficiency Factors (Geschwindigkeit / Herzfrequenz)** beider Hälften:

```javascript
// n8n Code Node: Efficiency Factor Drift
const hrData = items[0].json.heartrate.data;
const speedData = items[0].json.velocity_smooth.data;
const mid = Math.floor(hrData.length / 2);

function getAverage(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

const ef1 = getAverage(speedData.slice(0, mid)) / getAverage(hrData.slice(0, mid));
const ef2 = getAverage(speedData.slice(mid)) / getAverage(hrData.slice(mid));

const hr_drift_pct = Number((((ef1 - ef2) / ef1) * 100).toFixed(2));
```

Driftwerte unter 5 % stehen für solide aerobe Ausdauer; Werte über 8–10 % deuten auf verfrühte Entkopplung, Dehydrierung oder zu hohes Anfangstempo hin.

---

## 6. Konfidenz-Routing & Human-in-the-Loop

Der GRU-Konfidenzscore berechnet sich wie folgt:

$$\text{Konfidenz} = |\text{Wahrscheinlichkeit} - 0.5| \times 2$$

Ein n8n-Knoten verzweigt den Workflow:
- **Konfidenz $\ge$ 0.60:** Automatische Protokollierung in Google Sheets.
- **Konfidenz $<$ 0.60:** Löst eine interaktive Telegram-Umfrage aus:
  *„Die Modellkonfidenz ist für diese Grenzwert-Einheit gering. Fühlte sich der Lauf aerob oder anaerob an?“*
  Die Athleten-Rückmeldung überschreibt das Label und schützt vor unbemerkten Fehlern, während sie gleichzeitig verifizierte Trainingsdaten sammelt.

---

## 7. Pinecone RAG & Strukturierter LLM-Coaching-Agent

Der Coaching-Agent gewährleistet sportwissenschaftliche Präzision durch:
1. **Dynamische Prompt-Injektion:** Prompts werden live aus GitHub (`post_workout_prompt.md`) geladen.
2. **Pinecone Vektor-RAG:** Fachliteratur (Seiler 2010, Laktatschwellen, ACWR) ist in **Pinecone Serverless** indexiert.
3. **Strukturierte JSON-Ausgabe:** Nachgelagerte Systeme (Telegram, Notion) erhalten validierte JSON-Objekte mit Zusammenfassungen und konkreten Handlungsempfehlungen.

---

## 8. Adaptiver wöchentlicher Lernzyklus

Jeden Sonntag um 20:00 Uhr analysiert ein Cron-Workflow:
1. Absolvierte Läufe der letzten 7 Tage.
2. Geplantes Wochenpensum aus Notion.
3. Berechnet einen **Compliance-Score (0–100 %)**.
4. Schlägt eine adaptive Volumenanpassung für die nächste Trainingswoche vor.

---

## Wichtigste Erkenntnisse

1. **Reine Inferenz ist noch kein Produkt:** DL-Modelle entfalten ihren vollen Nutzen erst in Kombination mit Konfidenzschwellen, physikalischen Metriken (Drift) und begründenden LLM-Schichten.
2. **Heuristische Teacher beschleunigen DL:** Fundierte deterministische Regeln bieten hervorragende Ground-Truth-Proxys für die Modelldestillation.
3. **Prompts von Workflows entkoppeln:** Das dynamische Nachladen versionierter Prompts sorgt für Wartbarkeit in Produktivsystemen.

---
title: "Leitfaden: Lokale Hörbuch-Pipeline-Architektur & Setup"
description: "Eine robuste, kostenfreie lokale Text-to-Speech (TTS)-Hörbuchgenerierungs-Pipeline für Consumer-GPU-Hardware."
category: "KI-Tools"
date: 2026-08-03
readTime: "7 Min. Lesezeit"
featured: true
lang: "de"
---

Die Umwandlung umfangreicher Bücher und Dokumente in hochwertige Audiodateien ist traditionell auf teure Cloud-APIs, komplexe GPU-Cluster-Infrastrukturen oder aufwendige manuelle Tontechnik angewiesen.

Mein Projekt **[Local Audiobook Pipeline](https://github.com/vyscnktn/local-audiobook-pipeline)** wurde geschaffen, um genau diese Herausforderungen zu lösen. Es etabliert einen vollständig lokalen, ausfallsicheren und manifestgesteuerten Workflow auf Basis von Open-Source-Tools, die auf normaler Consumer-Hardware laufen.

> **💻 Quellcode & Repository:** Der vollständige Quellcode, Konfigurationsvorlagen und Einrichtungsanleitungen stehen auf [GitHub (vyscnktn/local-audiobook-pipeline)](https://github.com/vyscnktn/local-audiobook-pipeline) bereit.

---

## Warum eine lokale Pipeline bauen?

Das Synthetisieren kurzer Textschnipsel ist simpel. Die Erzeugung eines kompletten Hörbuchs aus rohen EPUB-Dateien stellt jedoch echte systemtechnische Herausforderungen dar:

* **Datenbereinigung:** EPUB-Dateien enthalten unstrukturierte Cover-Seiten, Impressum-Texte, fehlerhafte XHTML-Tags und Fußnoten, die die Sprachsynthese stören.
* **Hardware-Beschränkungen:** Die direkte Übergabe langer Buchkapitel an ein TTS-Modell führt auf Consumer-GPUs zu extremen VRAM-Spitzen und Out-Of-Memory (OOM)-Abstürzen.
* **Fehlertoleranz:** Bricht ein 5-stündiger Renderprozess nach 4 Stunden ab, muss die Pipeline nahtlos am letzten Checkpoint fortgesetzt werden können, ohne bereits erzeugte Segmente erneut zu berechnen.

Statt als fragiles „Black-Box“-Skript zu arbeiten, unterteilt dieses Projekt die Aufgaben in eine transparente, manifestbasierte Pipeline.

---

## Systemarchitektur & Workflow

Die Pipeline ist in 7 unabhängige, wiederaufnehmbare Phasen unterteilt:

1. **Ingestion:** Analysiert EPUB-Strukturen, Metadaten und rohe XHTML-Inhalte.
2. **Bereinigung (Cleanup):** Wandelt rohes XHTML in sauberen, strukturerhaltenden Klartext (JSONL-Format) um und entfernt nicht narrative Artefakte.
3. **Manifest-Generierung:** Erstellt Manifeste auf Kapitelebene, die den Synthesefortschritt protokollieren.
4. **Job-Generierung:** Teilt Kapiteltexte in GPU-sichere, feste Chunks für die Inferenz auf.
5. **Synthese:** Erzeugt `.wav`-Audiodateien mithilfe von Chatterbox Multilingual TTS.
6. **Zusammenführung (Assembly):** Fügt einzelne Audioschnipsel zu vollständigen Kapiteldateien zusammen – inklusive konfigurierbarem Crossfading und Pausen.
7. **Qualitätskontrolle (QA):** Erstellt maschinenlesbare Berichte über Erfolgsquoten und fehlende Segmente.

---

## Hardware-Profil & VRAM-Optimierung

Die Pipeline ist für den effizienten Betrieb auf bescheidener Hardware ausgelegt. Entwicklung und Tests erfolgten auf:

* **GPU:** NVIDIA GeForce RTX 4050 Laptop GPU
* **VRAM:** 6 GB
* **Laufzeitumgebung:** Python + PyTorch + CUDA
* **TTS-Engine:** Chatterbox Multilingual TTS

Durch konservative Text-Chunking-Strategien bleibt die VRAM-Auslastung stabil unter 5,5 GB, was OOM-Abstürze selbst bei mehrstündigen Rechensitzungen zuverlässig verhindert.

---

## Schritt-für-Schritt-Installation & Ausführung

Folgen Sie diesen Schritten, um die Pipeline lokal auszuführen:

### 1. Umgebung einrichten
```bash
python -m venv .venv-chatterbox
source .venv-chatterbox/bin/activate
pip install -r requirements.txt
```

### 2. Konfiguration
Kopieren Sie die Beispielkonfiguration und hinterlegen Sie Ihre Sprecher-Audiodatei:
```bash
cp config.example.yaml config.yaml
```

### 3. Ingestion & Textbereinigung
EPUB-Datei einlesen und HTML-Tags bereinigen:
```bash
# Buch einlesen
python ingest_epub.py --book mein-buch --epub /pfad/zu/buch.epub

# XHTML-Artefakte bereinigen
python clean_epub.py --book mein-buch
```

### 4. Manifest & Jobs erstellen
Synthese-Manifeste erzeugen, bevor die GPU-Inferenz startet:
```bash
python build_book_manifests.py
python run_chatterbox_chapter.py --chapter-id <chapter-id> --rebuild-jobs --jobs-only
```

### 5. Rendern & Synthese
GPU-Inferenz starten, um die finalen Audiodateien zu erzeugen:
```bash
python run_chatterbox_chapter.py --chapter-id <chapter-id>
```

Weitere Konfigurationsoptionen und Richtlinien finden Sie im [GitHub Repository](https://github.com/vyscnktn/local-audiobook-pipeline).

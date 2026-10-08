---
title: "RunSight — Autonomer KI-Laufcoach"
description: "Ein End-to-End KI-Coaching-System, das Strava-Läufe mittels eines GRU-Deep-Learning-Modells (Test-AUC: 0.850) klassifiziert und personalisierte Ratschläge über einen RAG-gestützten LLM-Agenten auf n8n generiert."
techs: ["Deep Learning (GRU)", "AWS Lambda & ECR", "n8n Workflow", "Pinecone RAG", "Strava API", "Telegram Bot"]
githubUrl: "https://github.com/vyscnktn/zero-to-ai-architect/tree/main/runsight"
featured: true
status: "Produktion"
order: 1
lang: "de"
---

RunSight ist ein autonomer KI-Laufcoach, der entwickelt wurde, um die Trainingsverteilung von Ausdauersportlern zu optimieren und Übertraining vorzubeugen. Basierend auf Stephen Seilers **Polarized Training**-Methodik klassifiziert das System Einheiten in physiologische Belastungszonen und liefert fundiertes Trainingsfeedback.

## Kernarchitektur-Ebenen

1. **Deep-Learning-Schicht (GRU):** Ein 2-lagiges Gated Recurrent Unit (GRU) Zeitreihenmodell, trainiert auf dem EndomondoHR/FitRec-Datensatz (13.884 Testläufe). Analysiert rohe GPS-, Herzfrequenz-, Höhen- und Geschwindigkeitsdaten zur aeroben/anaeroben Klassifikation einzelner Einheiten ohne historische Cold-Start-Abhängigkeiten (Test-AUC: 0.850).
2. **Serverless Inferenz (AWS Lambda & ECR):** Containerisierte Inferenzlaufzeit, bereitgestellt via AWS Lambda-Container-Image mit vorgewärmten Skalierern und Modellartefakten.
3. **Kardialer Drift & Entkopplung (JavaScript):** Berechnet die aerobe Entkopplung (`hr_drift_pct`) über das Verhältnis des Efficiency Factors (Geschwindigkeit / Herzfrequenz) zwischen der ersten und zweiten Hälfte des Laufs.
4. **Konfidenzbasierter Human-in-the-Loop:** Leitet Läufe mit GRU-Konfidenzwerten unter 0.60 automatisch an interaktive Telegram-Umfragen zur Athletenüberprüfung weiter.
5. **RAG-gestützter LLM-Coach:** Ruft evidenzbasierte sportwissenschaftliche Fachliteratur (Seiler 2010, Laktatschwellen, ACWR-Protokolle) aus einem serverlosen Pinecone-Vektorindex ab, um strukturierte JSON-Trainingsberichte zu erstellen.
6. **Adaptiver wöchentlicher Lernzyklus:** Wöchentlicher Cron-Trigger zur Analyse von geplantem versus absolviertem Trainingsvolumen, der progressive Überlastungsanpassungen und Compliance-Berichte erstellt.

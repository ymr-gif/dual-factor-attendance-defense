# Context — Cold Session Bootstrap

Read this file first when resuming work on this project.

## Research Summary

S.A.F.E. is a dual-factor attendance system combining NFC card scanning with facial recognition. It includes passive liveness detection (rejects photos and screen replays) and real-time guardian notifications.

## Problem

- HSCI attendance is manual (logbook at guardpost)
- No identity verification
- No proxy attendance protection
- No guardian notification
- Card-only systems verify card, not person
- Facial recognition alone vulnerable to spoofing

## Solution Components

1. **NFC Identity Claim** — Student taps card (MIFARE Classic 13.56 MHz)
2. **1:1 Facial Verification** — Confirms cardholder identity
3. **Passive Liveness Detection** — Rejects printed photos and screen replays
4. **Real-Time Guardian Notification** — Parents notified on child's arrival

## Research Questions

### RQ1: Spoof Rejection Rate
What is the spoof rejection rate of the passive liveness detection component against printed photographs and screen replays?

- **Data Source:** 60 spoof attempts (30 printed photographs, 30 screen replays)
- **Sampling:** Purposive Sampling
- **Analysis:** Frequency and Percentage
- **Instrument:** Spoof Trial Record

### RQ2: System Performance (ISO/IEC 25010:2023)
What is the system's performance based on ISO/IEC 25010:2023 in terms of log accuracy, delivery rate, and latency?

- **Data Source:** 100 valid entry attempts at the main guardpost
- **Sampling:** Purposive Sampling
- **Analysis:** Percentage, Mean, Standard Deviation
- **Instrument:** System-Generated Attendance Log

### RQ3: Acceptability
What is the level of acceptability of the system in terms of functional suitability, usability, reliability, and security?

- **Data Source:** 40 Senior High School students and 30 parents/guardians
- **Sampling:** Purposive Sampling
- **Analysis:** Weighted Mean, Standard Deviation, Cronbach's Alpha
- **Instrument:** Researcher-Modified Survey Questionnaire (ISO/IEC 25010:2023)

## Hardware Specs

| Component | Specification | Function |
|-----------|--------------|----------|
| RC522 Scanner | 13.56 MHz NFC reader | Reads student card |
| Arduino | Microcontroller | Relays card ID to backend |
| USB Webcam | Logitech 1080p | Captures facial image |
| NFC Cards | MIFARE Classic 13.56 MHz | Student credential |
| Breadboard + Wires | Prototyping | Connects reader to Arduino |
| Laptop | Acer Nitro 5, GTX 1050 | Runs verification and notification |

## Software Stack

| Component | Purpose |
|-----------|---------|
| FastAPI | Backend API |
| PostgreSQL | Database |
| Redis | Caching/queues |
| face_recognition | 1:1 facial verification |
| MiniFASNet | Passive liveness detection |

## Testing Protocols

### Protocol 1: Spoof Rejection Testing
- Artifacts: Printed photographs (A4) and screen replays (smartphone)
- Trials: 30 per artifact type = 60 total, plus genuine live presentations
- Recorded: Artifact type, trial number, system decision, liveness score
- Output: Spoof Rejection Rate (%)

### Protocol 2: System Performance Testing
- Trials: 100 valid entry attempts at the main guardpost
- Recorded: Timestamp, student ID, result, liveness score, latency, status
- Delivery window: Confirmed within 60 seconds of trigger
- Output: Log Accuracy (%), Delivery Success Rate (%), Mean Latency (s)

## Survey Structure

- **Student Version** — 12 items (ISO/IEC 25010:2023)
- **Parent/Guardian Version** — 12 items (ISO/IEC 25010:2023)
- **Scale:** 5-point Likert (Strongly Agree to Strongly Disagree)
- **Interpretation:**
  - 4.21–5.00: Highly Acceptable
  - 3.41–4.20: Acceptable
  - 2.61–3.40: Moderately Acceptable
  - 1.81–2.60: Slightly Acceptable
  - 1.00–1.80: Not Acceptable

## Full PPTX Slide Content (Extracted)

### Slide 1 — Title
HUA SIONG COLLEGE OF ILOILO | PROPOSAL DEFENSE | Aragon, Miguel · Cabucos, Yamier Zane · De Guzman, Ezckar · Loreno, Ronald James Zairon | STEM (Grade 12 - Euclid)

### Slide 2 — Project Name
S.A.F.E: A Dual-Factor NFC and Facial Recognition Attendance System with Passive Liveness Detection and Real-Time Guardian Notification

### Slide 3 — Background and Objectives
- Attendance at HSCI is still recorded through a manual logbook at the main guardpost
- No identity verification, no protection against proxy attendance, no guardian notification
- Card-only systems verify the card, not the person holding it
- Facial recognition alone remains vulnerable to spoofing through printed photos and screen replays
- Objective: design, develop, and evaluate S.A.F.E. — NFC identity claim, 1:1 facial verification, passive liveness detection, and real-time guardian notification

### Slide 4 — Conceptual Framework/Paradigm
(Placeholder — diagram to be inserted)

### Slide 5 — Research Methodology
System Architecture and Flowchart (diagram to be inserted)

### Slides 6-8 — Research Questions 1-3
(See RQ sections above)

### Slide 9 — Instruments and Prototype
- Attendance Log
- Spoof Trial Record
- Survey Questionnaire (5-point Likert, ISO/IEC 25010:2023)
- Note: Prepare the prototype for demonstration

### Slide 10 — Prototype and System Design
(See Hardware Specs and Software Stack above)

### Slide 11 — Testing Protocols
(See Testing Protocols above)

### Slides 12-14 — Survey Instruments
(See Survey Structure above)

### Slide 15 — Thank You
(Thank you slide)

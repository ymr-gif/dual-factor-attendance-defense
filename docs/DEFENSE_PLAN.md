# Defense Plan — Delivery

> **Assumptions — correct these if wrong:** 15-minute presentation, 15–20 min panel Q&A,
> prototype demo expected.
>
> **Aragon presents the whole deck.** The other three sit in and field questions
> in their own areas — Cabucos on the system and liveness, De Guzman on hardware
> and the RQs, Loreno on instruments and protocols.
> Slide numbers match the built deck (18 slides, as of 2026-08-18).

## Running Order

| # | Slide | Time |
|---|-------|------|
| 1 | Title | 0:30 |
| 2 | The Problem — sheet fills, the extra tick, stamp (3 presses) | 1:15 |
| 3 | NFC + Face | 1:00 |
| 4 | Liveness | 1:00 |
| 5 | Guardian Notification | 0:45 |
| 6 | Conceptual Framework | 1:15 |
| 7 | Architecture | 1:30 |
| 8 | Prototype — rig, then exploded Arduino (2 presses) | 1:15 |
| 9 | RQ1 — Spoof Rejection | 0:45 |
| 10 | RQ2 — Performance | 0:45 |
| 11 | RQ3 — Acceptability | 0:45 |
| 12 | Instruments | 0:45 |
| 13 | Testing Protocols | 1:15 |
| 14 | Survey Structure | 0:45 |
| 15 | Interpretation Scale | 0:30 |
| 16 | Scope & Delimitation | 0:45 |
| 17 | Expected Output | 0:30 |
| 18 | Thank You | 0:15 |

**Total: ~14:45.** Leaves buffer. Demo runs after, or during slide 7.

Rule: slides carry 3–5 words. Everything below is spoken, never shown. One
voice for fifteen minutes is a lot — mark the slide-8 second beat and the scope
slide as places to slow down and breathe.

## Narration Cues

**1 — Title.** Name the school, the team and the section, then one line: "We propose S.A.F.E., a dual-factor attendance system." Do not read the four names off the slide — they are already on it.

**2 — Problem.** Three beats, three presses. Do not rush them — this slide has 1:15.
First beat, the sheet fills: "At HSCI, attendance is recorded by hand. A week looks like this — a tick for present, a blank for absent, an L for late."
Second beat, the extra tick: wait for it to finish drawing, then let the question sit. "A tick tells us a mark was made. It does not tell us who made it, or whether that student was actually there."
Third beat, the stamp: "So the record cannot be verified. And guardians are not told either way."
Keep the tone descriptive, not accusatory — the sheet has a gap, and the study closes it.
The card-only line belongs to slide 3 — do not spend it here.

**3 — NFC + Face.** Card makes the claim. Face proves it. Two factors, one tap.

**4 — Liveness.** Face alone breaks against a printed photo or a phone screen. Passive liveness rejects both — no blinking, no head turns, no user effort.

**5 — Guardian Notification.** Verified entry triggers a message to the parent — email, and Messenger where feasible. Delivery is confirmed inside 60 seconds. Attendance stops being a record and becomes an alert.

**6 — Conceptual Framework.** IPO paradigm. Input: card and reader, webcam, enrolled templates, guardian contacts, FastAPI and PostgreSQL. Process: tap, 1:1 match, liveness check, log, notify. Output: the S.A.F.E. system. A feedback loop feeds evaluation results back into the inputs.

**7 — Architecture.** Walk the flow once, left to right. Name each hop. Do not read specs — they are on the next slide.

**8 — Prototype.** Two beats, two presses.
First beat: the rig. RC522 reader, MIFARE card, Arduino, 1080p webcam, laptop. Off-the-shelf, ₱4,245 total, already acquired.
Second beat: inside the Arduino. Card ID arrives at the headers, the ATmega relays it over USB to the laptop. Do not narrate every part — name the path the card ID takes and move on.

**9 — RQ1.** 60 spoof attempts: 30 printed photos, 30 screen replays. Measured as spoof rejection rate, frequency and percentage.

**10 — RQ2.** 100 valid entries at the main guardpost. Log accuracy, notification delivery rate, mean latency. ISO/IEC 25010:2023.

**11 — RQ3.** 40 students, 30 parents. Functional suitability, usability, reliability, security. Weighted mean, SD, Cronbach's alpha.

**12 — Instruments.** Attendance log, spoof trial record, researcher-modified survey. All three tied to the RQ they answer.

**13 — Protocols.** Protocol 1: spoof trials, artifact type and liveness score recorded per trial. Protocol 2: live entries, latency and delivery confirmed inside a 60-second window.

**14 — Survey.** 20 items per version, student and guardian — five per characteristic across functional suitability, usability, reliability, and security. 5-point Likert, ISO/IEC 25010:2023. 40 items in total.

**15 — Scale.** 4.21–5.00 Highly Acceptable, down to 1.00–1.80 Not Acceptable.

**16 — Scope.** Main guardpost only. Verified entry only — no classroom attendance, no exit logs, no movement tracking. 1:1 verification, not 1:N. Common spoofs only — not 3D masks or deepfakes. Email and Messenger, not SMS. State the limits before the panel finds them.

**17 — Expected Output.** A working prototype, three measured outcomes, and a validated acceptability rating.

**18 — Thank You.** Stop talking. Do not summarize. Hand the floor to the panel.

## Q&A Bank

Every answer: one sentence, then stop. Do not defend beyond the question.

### Methodology
- **Why 60 spoof trials? Why 100 entries?** 30 per artifact type gives a stable percentage per condition. The 100 entries are a simulated full-capacity protocol using enrolled credentials, run regardless of who physically attends that day.
- **Why developmental research design?** The study designs, develops, and evaluates a product — that is the definition of developmental research.
- **Why purposive sampling?** Participants must be actual guardpost users — students who tap and parents who receive notifications. Random sampling would pull in non-users.
- **You measure spoof rejection but not false rejection of real students.** Genuine live presentations are recorded on the same Spoof Trial Record, specifically to confirm the liveness component does not reject legitimate users.
- **Where are the spoof trials run?** In a laboratory setting first, before guardpost deployment, so a weak liveness component never corrupts live entry records.
- **Who validated the modified questionnaire?** A three-member panel of experts in information technology and research methodology reviews relevance, clarity, and comprehensiveness. Name them if asked.
- **Cronbach's alpha threshold?** ≥ 0.70 acceptable.
- **Why five items per characteristic?** Five items per characteristic gives enough within-characteristic variance for a reliable alpha; a single item per characteristic cannot be tested for internal consistency.
- **Pilot test?** Ten participants — five students, five parents or guardians — excluded from the main pool to prevent response bias.

### Technical
- **MIFARE Classic is clonable.** Strongest answer you have: the card is only an identity claim. A cloned card still fails the face match and the liveness check. That is the entire point of dual-factor.
- **Why 1:1 and not 1:N?** The card names who to compare against. 1:1 is faster and far more accurate than searching the whole database.
- **What is the liveness threshold?** MiniFASNet returns a confidence score per frame — know the cutoff you will use. The score is logged for every trial and every entry.
- **Lighting at the guardpost?** Fixed camera position, controlled lighting; state it as a delimitation.
- **Student forgets the card?** Manual override by the guard, flagged in the log as unverified.
- **Twins? Glasses? Masks?** Enrollment captures the student's normal appearance; masks are a stated limitation.
- **Internet down — notifications?** The dispatch is queued; delivery status is classified from the measured latency.
- **What is Redis actually for?** A per-lane session lock, so a captured face is never matched against the wrong card during concurrent taps. That is the answer — do not call it a generic cache.
- **What counts as good latency?** Below 5s Optimal, 5–15s Acceptable, above 15 to 60s Slow, above 60s or undelivered Failed. Latency is measured from verification at the guardpost to the mail server confirming acceptance.
- **Which channels?** Email via SMTP, and Facebook Messenger where technically feasible. SMS is excluded on cost grounds and recommended for future work.
- **Masks or glasses?** Students are required to remove facial coverings during authentication. It is a stated delimitation.
- **Why a laptop and not a Raspberry Pi?** The GTX 1050 is needed for on-device inference — face verification and liveness both run locally.

### Ethics and legal
- **RA 10173, Data Privacy Act.** Expect this. Answer: the study follows RA 10173 and the Philippine national ethical guidelines — respect for persons, beneficence, non-maleficence, justice, privacy, confidentiality. Student assent plus written parental consent for minors. Guardian consent for the notification recipients.
- **School permission?** Have the letter or its status ready.
- **Can a participant withdraw?** Yes, and their data is deleted.

### Practical
- **Cost?** ₱4,245 total for the prototype hardware. Arduino ₱2,000, webcam ₱1,600, 40 NFC cards ₱320, RC522 ₱150, jumper wires ₱115, breadboard ₱60.
- **Scales to the whole campus?** Out of scope. Prototype at one guardpost. Say it plainly.
- **Exit events?** Out of scope — entry only.
- **Build order of the prototype?** Tap, log, and notify end to end first; then facial verification; liveness last. Each layer is confirmed working before the next is added.

## Demo Contingency

- Record a video of a full successful run — tap, verify, notify — before defense day. Keep it on the presenting laptop.
- Also record one successful spoof rejection. That is the demo they actually want.
- If live hardware fails once, switch to video immediately. Do not troubleshoot in front of the panel.
- Test on the exact laptop and projector that will be used.
- Disable sleep, screensaver, and system notifications. Full battery plus charger.
- Copy the whole `ppt-js` folder to a USB drive. Second copy on a phone.
- Have a teammate drive the deck so Aragon's hands stay free. If he drives it himself, keep the clicker in one hand the whole time and never look back at the screen to find his place — the caption under the prototype scene tells him which beat he is on.

## Day-Before Checklist

- [ ] Full run-through, timed, start to finish, no stopping
- [ ] Deck opens with wifi off
- [ ] All 18 slides advance and animate on the venue resolution
- [ ] Demo video exported and playable offline
- [ ] Prototype packed: reader, Arduino, cards, webcam, cables, laptop
- [ ] Printed copy of the proposal for each panelist
- [ ] Aragon can answer every Q&A item unaided; the other three ready to take detail questions in their areas

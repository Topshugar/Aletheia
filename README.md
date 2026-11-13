# ALETHEIA — Call Provenance Verifier

> **Reveal What Is Hidden.**

**Aletheia** is a client-side, privacy-preserving tool that verifies the **provenance** of a telephone call — whether a call truly originates from the organisation it claims to represent.

It does **not** track callers. It does **not** intercept calls. It does **not** locate callers. It verifies consistency against publicly published official numbers, using only data you provide.

**Live Site:** **https://topshugar.github.io/Aletheia/**

**Author:** Topshugar — Provenance & Truth

---

## 1. Definition

**Aletheia** <span lang="el">(ἀλήθεια)</span> — *noun.*

> Truth; disclosure; the state of not being hidden.

In Ancient Greek philosophy, *aletheia* is contrasted with *lethe* — forgetting, concealment. In this project, the term is used in its literal sense: the act of uncovering what has been concealed.

In the context of telecommunications fraud, concealment is the primary mechanism. The caller conceals their true origin by spoofing a trusted number. Aletheia reverses this by testing whether the presented number is consistent with the claimed origin.

### 1.1 What Aletheia Is

Aletheia is a **defensive provenance verifier**.

It answers one question:

> *Does the number that called me match the number this organisation publicly publishes?*

If the answer is **no**, provenance has failed. The call should be treated as spurious.

### 1.2 What Aletheia Is Not

Aletheia is **not**:

- A caller ID lookup service
- A phone tracker
- A call interceptor
- A reverse phone lookup tool
- A law enforcement tool
- A legal determination of fraud

Aletheia does not claim to identify *who* called you. It claims only to test whether the call is *consistent* with its claimed origin. This distinction is critical for both scholarly accuracy and legal safety.

---

## 2. Problem Statement

Caller ID spoofing is one of the most effective forms of social engineering in the United Kingdom.

An attacker can present any number on a victim's phone — including the genuine number of Barclays, HMRC, or the NHS — while calling from an entirely different location.

The victim sees a trusted number and therefore trusts the caller. The attacker then requests:

- One-time passcodes
- Online banking passwords
- Remote access to the victim's device
- Urgent bank transfers

The technical problem is not that the victim is careless. The problem is that the telephone network, as originally designed, provides **no authentication of origin**. The displayed number is an assertion, not a proof.

Aletheia addresses this by introducing a simple, user-side provenance check that requires no trust in the network.

---

## 3. Methodology

Aletheia uses a four-stage verification model. All processing occurs in the browser. No data is uploaded, stored, or transmitted.

### Stage 1 — Normalisation

User input is hostile by nature. It may contain spaces, brackets, dashes, leading `00`, or a missing `+`.

The input is normalised to E.164 international format:

| Input | Normalised |
| :--- | :--- |
| `020 7946 0958` | `+442079460958` |
| `0044 20 7946 0958` | `+442079460958` |
| `+44 20 7946 0958` | `+442079460958` |
| `111` | `111` (short code preserved) |

**Expert Note:** Failure to normalise is the most common bug in telephone tools. Short codes must never be converted to `+44` format.

### Stage 2 — Format Validation

The normalised number is checked against UK numbering rules.

- Valid: `+44` followed by 10 digits, where the first digit after `+44` is `1`, `2`, `3`, or `7`
- Valid: UK short codes — `111`, `999`, `101`
- Invalid: `+1`, `+234`, or any non-UK prefix

A genuine UK bank or HMRC will not call from a foreign number. A non-UK prefix is therefore treated as a strong spoofing indicator.

**Expert Note:** Format validation proves format, not existence. No static site can prove a number exists without querying a carrier, which would violate privacy.

### Stage 3 — Provenance Comparison

The normalised number is compared to the official published number for the claimed organisation.

```javascript
const OFFICIAL_NUMBERS = {
  "Barclays": ["+442071169000"],
  "HSBC": ["+442079920888"],
  "Lloyds": ["+442076261500"],
  "HMRC": ["+443000200300"],
  "NHS": ["111"]
};
- *Exact match* → Provenance is consistent.
- *No match* → Provenance has failed.

This list must be maintained from official sources only — the organisation's own website, not third-party directories. A single incorrect entry destroys trust.

### Stage 4 — Risk Assessment & Scoring

A confidence score is derived from the above, not from location tracking.
Verdict	Meaning	Score
**AUTHENTIC**	Number matches official number	90 / 100
**SPURIOUS**	Number does not match official number	0 – 30 / 100
**INCONCLUSIVE**	No organisation to compare against	0 – 20 / 100
*Expert Note:* A provenance failure should never increase confidence. In v1, a spurious result incorrectly added +5. This has been corrected in v2.

---

## 4. Architecture & Privacy

### 4.1 Client-Side Only

Aletheia is a static site:

- No server
- No database
- No `fetch()` to an API
- No `localStorage`
- No cookies
- No analytics
- No tracking

This is a deliberate privacy architecture. A security tool must not create a new privacy risk while solving one.

### 4.2 Why No Server?

If Aletheia required a server, the user would have to trust:

1. That the server does not log their number
2. That the server does not leak their number
3. That the server is not compromised

By processing everything in the browser, none of these risks exist. The user's number never leaves their device.

### 4.3 Evidence Report

The PDF evidence report is generated entirely in the browser using jsPDF.

Each report includes a *SHA-256 hash* of its contents:
SHA-256: 9f2c...a1b4
This provides tamper-evidence. If the PDF is edited after generation, the hash will no longer match the content. This is suitable for evidence preservation when reporting to Action Fraud.

---

## 5. File Structure
Aletheia/
├── index.html          # Structure — mobile-first, semantic HTML
├── style.css           # Design system — mobile-first CSS
├── app.js              # Verification logic — client-side only
├── README.md           # This file
├── .nojekyll           # Prevents Jekyll from ignoring assets/
├── .gitignore          # Ignores OS / editor junk
├── .github/
│   └── workflows/
│       └── main.yml    # GitHub Actions — auto-deploy to Pages
└── assets/
    └── aletheia.svg    # Coded logo — vector, not PNG
### 5.1 Why SVG, Not PNG?

The logo is coded as SVG, not an image, because:

1. *Vector:* Never blurs on retina / mobile screens
2. *Fast:* ∼2KB vs ∼300KB for a PNG
3. *Editable:* Gold colour can be changed in one line
4. *Professional:* This is how real brands ship logos

---

## 6. How to Use

### For the User

*Try it live:* https://topshugar.github.io/Aletheia/

1. Enter the caller number exactly as displayed
2. Select the claimed organisation
3. Enter the time of the call
4. Add notes — what did the caller ask for?
5. Click *Verify Provenance*
6. If the verdict is *SPURIOUS*, hang up and call the organisation via its official website
7. Click *Download Evidence Report (PDF)* to preserve evidence

### For the Developer

#### Run Locally
# No build step required — open directly
open index.html
Or use a local server:
npx serve .
#### Deploy to GitHub Pages

Live deployment is handled automatically by GitHub Actions.

1. Push to `main` branch
2. GitHub Actions runs `.github/workflows/main.yml`
3. Site deploys automatically to:
https://topshugar.github.io/Aletheia/
No manual Pages setup is needed after the first enable.

---

## 7. Limitations

Aletheia is honest about what it cannot do. This is essential for scholarly credibility.

1. *It cannot detect all spoofing.* If an attacker spoofs the _exact_ official number, the provenance check will pass. This is a limitation of the telephone network, not of Aletheia.
2. *It cannot prove existence.* A valid format does not mean the number is in service.
3. *It relies on the official numbers list.* If that list is out of date, the verdict will be incorrect. The list must be maintained.
4. *It is not a legal tool.* It provides evidence for reporting, not a legal determination.

Users should always follow this rule:

> *Hang up. Call back via the official website. Never use a number given by the caller.*

---

## 8. Legal Disclaimer

*IMPORTANT — READ CAREFULLY*

1. *No Legal Determination:* Aletheia provides an informational assessment of provenance. It does not determine whether fraud has occurred. Only a court or competent authority can do so.
2. *No Guarantee:* Aletheia is provided "as is", without warranty of any kind. An `AUTHENTIC` verdict does not guarantee that a call is safe. An attacker may spoof the exact official number.
3. *No Liability:* The author accepts no liability for any loss, damage, or action taken based on the use of this tool. Users must exercise their own judgement and verify via independent channels.
4. *Not a Substitute for Reporting:* If you suspect fraud, report it to *Action Fraud* on *0300 123 2040* or at *actionfraud.police.uk*. Preserve the PDF report as evidence.
5. *Privacy:* Aletheia does not collect, store, or transmit any user data. All processing occurs in the browser. The author has no access to numbers entered by users.
6. *Official Numbers:* Official numbers are provided for informational purposes. Users should verify them independently via the organisation's official website before acting.
7. *Jurisdiction:* This tool is designed for UK numbering and UK organisations. It may not be accurate for other jurisdictions.

By using Aletheia, you acknowledge that you have read and understood this disclaimer.

---

## 9. Future Work

Potential extensions for future research:

- [ ] Expand official numbers list to include more UK banks and government departments
- [ ] Add support for international numbers with per-country official lists
- [ ] Add Ofcom range validation for more precise format checking
- [ ] Add offline PWA support for use without internet
- [ ] Add Welsh and community language support

These are intentionally not included in v2. The current version prioritises correctness and simplicity over feature breadth.

---

## 10. References

- Ofcom — UK Numbering Plan
- Action Fraud — `actionfraud.police.uk`
- Heidegger, M. — _Being and Time_ (1927) — on _aletheia_ as disclosure
- UK Finance — _Fraud: The Facts_ (2024)

---

*Aletheia — Reveal What Is Hidden.*

_Topshugar · Provenance & Truth_

*Live:* https://topshugar.github.io/Aletheia/

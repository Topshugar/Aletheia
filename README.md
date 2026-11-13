ALETHEIA

UK Call Provenance Verifier — Reveal What Is Hidden

[UK](https://img.shields.io/badge/region-United%20Kingdom-012169)
[Status](https://img.shields.io/badge/status-live-brightgreen)
[License](https://img.shields.io/badge/license-MIT-lightgrey)
[Privacy](https://img.shields.io/badge/privacy-client--only-gold)
[Platform](https://img.shields.io/badge/platform-GitHub%20Pages-black)

**Live:** https://topshugar.github.io/Aletheia/

**Scope:** United Kingdom

Aletheia verifies the provenance of a UK telephone call. It does not track, intercept, or locate callers. It tests one question:

> Does the number that called me match the number this UK organisation publicly publishes?

If it does not, provenance has failed.

Contents

- [Definition](#definition)
- [Problem](#problem)
- [Method](#method)
- [Architecture](#architecture)
- [Usage](#usage)
- [Limitations](#limitations)
- [Legal Notice](#legal-notice)
- [Development](#development)
- [References](#references)

Definition

**Aletheia** (ἀλήθεια) — *n.* Truth; disclosure; the state of not being hidden.

In Greek philosophy, *aletheia* stands against *lethe* — concealment, forgetting. The term is used here in its literal sense: to uncover what has been concealed.

In UK telecommunications fraud, concealment is the mechanism. A caller presents a trusted UK number while calling from elsewhere. Aletheia tests whether that presentation is consistent with its claimed origin.

**Aletheia is not:**

- A caller ID lookup
- A phone tracker
- A call interceptor
- A reverse lookup service
- A legal determination of fraud

It does not identify who called. It assesses whether a call is consistent with its claimed source.

Problem

Caller ID spoofing remains one of the most effective forms of social engineering in the United Kingdom. An attacker can display the genuine number of a UK bank, HMRC, or the NHS, while calling from an unrelated location.

The victim sees a trusted number and extends trust to the caller. The attacker then requests one-time codes, passwords, remote access, or urgent transfers.

The underlying issue is structural. The telephone network was not designed to authenticate origin. A displayed number is an assertion, not a proof.

Aletheia introduces a user-side provenance check that requires no trust in the network.

Method

All verification is performed in the browser. No data is uploaded, stored, or transmitted.

1. Normalisation

Input is normalised to E.164 format.

| Input | Normalised |
| :--- | :--- |
| `020 7946 0958` | `+442079460958` |
| `0044 20 7946 0958` | `+442079460958` |
| `+44 20 7946 0958` | `+442079460958` |
| `111` | `111` |

Short codes are preserved and never converted to `+44` format.

2. Format Validation

The normalised number is checked against UK numbering rules, as defined in the Ofcom UK Numbering Plan.

- Valid: `+44` followed by 10 digits, first digit `1`, `2`, `3`, or `7`
- Valid: UK short codes `111`, `999`, `101`
- Invalid: Any non-UK prefix, including `+1` and `+234`

A genuine UK bank or HMRC will not call from a foreign number. A non-UK prefix is therefore treated as a strong spoofing indicator.

Format validation confirms format only. It does not prove that a number is in service.

3. Provenance Comparison

The number is compared to the official published number for the claimed UK organisation.

```js
const OFFICIAL_NUMBERS = {
  "Barclays": ["+442071169000"],
  "HSBC": ["+442079920888"],
  "Lloyds": ["+442076261500"],
  "HMRC": ["+443000200300"],
  "NHS": ["111"]
};
- *Exact match* — Provenance is consistent
- *No match* — Provenance has failed

Official numbers must be maintained from primary sources only — the organisation's own UK website, not third-party directories.

4. Assessment
Verdict	Interpretation	Score
**AUTHENTIC**	Matches official UK number	90 / 100
**SPURIOUS**	Does not match official UK number	0–30 / 100
**INCONCLUSIVE**	No organisation to compare against	0–20 / 100
A provenance failure never increases confidence.

Architecture

Aletheia is a static site by design.

- No server
- No database
- No API calls
- No localStorage
- No cookies
- No analytics
- No tracking

A defensive tool should not introduce a new privacy risk while addressing one. By processing everything locally, the number entered never leaves the user's device.

Evidence Report

The PDF report is generated in the browser using jsPDF. Each report includes a SHA-256 hash of its contents.
SHA-256: 9f2c...a1b4
If the report is altered after generation, the hash will no longer match. This provides tamper-evidence for reporting to Action Fraud, the UK's national fraud reporting centre.

Usage

*Live site:* https://topshugar.github.io/Aletheia/

1. Enter the caller number as displayed
2. Select the claimed UK organisation
3. Enter the time of the call
4. Add notes on what was requested
5. Select *Verify Provenance*
6. If the verdict is *SPURIOUS*, hang up and call the organisation via its official UK website
7. Select *Download Evidence Report (PDF)* to preserve a record

*Rule:* Hang up. Call back via the official website. Never use a number provided by the caller.

Limitations

1. *Exact spoofing.* If an attacker spoofs the exact official number, the check will pass. This is a limitation of the telephone network, not of this tool.
2. *Existence.* A valid format does not mean a number is in service.
3. *Currency.* If the official numbers list is out of date, the verdict will be incorrect. The list requires maintenance.
4. *Scope.* This tool is built for the UK. It validates UK numbering and UK organisations only. It is not accurate for other jurisdictions, and it is not a legal instrument.

Legal Notice

Aletheia provides an informational assessment of provenance for UK calls. It does not determine whether fraud has occurred.

- An *AUTHENTIC* verdict does not guarantee that a call is safe. An attacker may spoof the exact official number.
- Aletheia is provided “as is”, without warranty of any kind.
- The author accepts no liability for loss, damage, or action taken based on use of this tool.
- If fraud is suspected in the UK, report it to *Action Fraud* on *0300 123 2040* or at *actionfraud.police.uk*.
- Aletheia does not collect, store, or transmit user data.
- Official numbers are provided for reference. Verify them independently via the organisation's official UK website.

By using Aletheia, you acknowledge this notice.

References

- Ofcom — UK Numbering Plan
- Action Fraud — http://actionfraud.police.uk
- Heidegger, M. — _Being and Time_ (1927) — on _aletheia_ as disclosure
- UK Finance — _Fraud: The Facts_ (2024)

*Aletheia — Reveal What Is Hidden.*

_Topshugar · Provenance & Truth · United Kingdom_

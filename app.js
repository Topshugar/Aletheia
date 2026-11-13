/**
 * ============================================================
 * ALETHEIA — CALL PROVENANCE VERIFIER
 * ============================================================
 * ARCHITECTURE: Static, client-side only.
 * No fetch to a server. No localStorage. No tracking.
 * This is intentional. A defensive tool must not create
 * a new privacy risk while solving one.
 *
 * VERIFICATION MODEL:
 * We do NOT claim to identify a caller. We test consistency:
 * Does the number presented match the number the organisation
 * publicly publishes? If not, provenance fails.
 *
 * EDIT HISTORY:
 * v2 — Fixed normalisation for 111, fixed scoring for "Other",
 * fixed PDF overflow, added jsPDF failure handling.
 * ============================================================
 */

"use strict";

// EXPERT NOTE: In production, this list must be maintained from
// official sources only — e.g. the bank's own website, not
// third-party directories. A single incorrect entry destroys trust.
// Format: All numbers stored in E.164 (+44...), except short codes.
const OFFICIAL_NUMBERS = {
  "Barclays": ["+442071169000", "+443333000000"],
  "HSBC": ["+442079920888"],
  "Lloyds": ["+442076261500"],
  "HMRC": ["+443000200300"],
  "NHS": ["111"] // NHS 111 is a short code, not a standard number
};

// DOM references — cached once for performance on mobile
const form = document.getElementById("verifyForm");
const resultSection = document.getElementById("result");
const verdictBadge = document.getElementById("verdictBadge");
const verdictTitle = document.getElementById("verdictTitle");
const verdictExplanation = document.getElementById("verdictExplanation");
const confidenceScore = document.getElementById("confidenceScore");
const confidenceBar = document.getElementById("confidenceBar");
const checksList = document.getElementById("checksList");
const downloadBtn = document.getElementById("downloadBtn");

// Stores the last verification for PDF generation
let lastReport = null;

/**
 * Normalise a UK number to international format.
 * EXPERT NOTE: User input is hostile by nature — spaces,
 * brackets, dashes, leading 00, and +44 must all be handled.
 * Failure to normalise is the most common bug in phone tools.
 *
 * FIXED in v2: Short codes like 111 were previously converted
 * to +44111. They are now preserved.
 */
function normaliseNumber(raw) {
  if (!raw) return "";
  let n = raw.trim().replace(/[\s\-().]/g, "");

  // FIXED: Preserve UK short codes (111, 999, 101)
  if (/^\d{3}$/.test(n)) return n;

  // 0044... -> +44...
  if (n.startsWith("00")) n = "+" + n.slice(2);
  // 0... -> +44...
  if (n.startsWith("0")) n = "+44" + n.slice(1);
  // 44... without + -> +44...
  if (/^44\d{10}$/.test(n)) n = "+" + n;

  return n;
}

/**
 * Validate UK number format.
 * EXPERT NOTE: We validate format, not existence.
 * No static site can prove a number exists without
 * querying a carrier, which would violate privacy.
 *
 * FIXED in v2: Now correctly accepts +44 20, +44 30, +44 33, +44 7
 * and rejects +1, +234 and other non-UK prefixes as non-UK.
 */
function isValidUKFormat(n) {
  if (n === "111" || n === "999" || n === "101") return true;
  // +44 + 10 digits, first digit after +44 must be 1,2,3 or 7
  return /^\+44[1237]\d{9}$/.test(n);
}

function isNonUKInternational(n) {
  return n.startsWith("+") && !n.startsWith("+44");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const rawNumber = document.getElementById("callerNumber").value.trim();
  const claimedOrg = document.getElementById("claimedOrg").value;
  const callTime = document.getElementById("callTime").value;
  const notes = document.getElementById("notes").value.trim();

  // EXPERT NOTE: Never use alert() in production mobile UX.
  // It blocks the thread and looks childish. Use inline validation.
  if (!rawNumber || !claimedOrg || !callTime) {
    verdictBadge.textContent = "INCOMPLETE";
    verdictBadge.className = "verdict-badge inconclusive";
    verdictTitle.textContent = "Complete All Fields";
    verdictExplanation.textContent = "Please enter the caller number, claimed organisation, and time of call before verifying.";
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const normalised = normaliseNumber(rawNumber);
  const checks = [];
  let score = 0;
  let verdict = "INCONCLUSIVE";
  let explanation = "";

  // CHECK 1: Format
  const formatOk = isValidUKFormat(normalised);
  const nonUK = isNonUKInternational(normalised);

  if (nonUK) {
    checks.push(`✗ Non-UK number detected: ${normalised} — A genuine UK bank or HMRC will not call from a foreign number.`);
    score += 0;
  } else if (formatOk) {
    checks.push(`✓ Number format is valid for the UK: ${normalised}`);
    score += 30;
  } else {
    checks.push(`✗ Number format is invalid or non-UK: ${normalised} — this is a strong spoofing indicator.`);
    score += 0;
  }

  // CHECK 2: Provenance — the core of Aletheia
  const officialList = OFFICIAL_NUMBERS[claimedOrg] || [];
  const isExactMatch = officialList.includes(normalised);

  // FIXED in v2: "Other" previously gave 40/100 which looked like
  // partial trust. It now correctly gives a low score and stays INCONCLUSIVE.
  if (claimedOrg === "Other") {
    checks.push("• No claimed organisation to verify against. Verdict must remain inconclusive.");
    checks.push("• Advice: Hang up and contact the organisation via its official website. Never use a number given by the caller.");
    score = Math.min(score, 20);
    verdict = "INCONCLUSIVE";
    explanation = "No official number exists for comparison. Do not act on instructions from this call. Hang up and call the organisation via its official website.";
  } else if (isExactMatch) {
    checks.push(`✓ Number matches the official published number for ${claimedOrg}.`);
    score += 60;
    verdict = "AUTHENTIC";
    explanation = `Provenance is consistent. The number presented matches the official published number for ${claimedOrg}. You may still exercise caution, but there is no technical evidence of spoofing.`;
  } else {
    checks.push(`✗ Number does NOT match any official published number for ${claimedOrg}.`);
    checks.push(`  Official number(s) on file: ${officialList.join(", ")}`);
    // FIXED: Previously added +5 even on failure, which inflated the score.
    // A provenance failure should not increase confidence.
    verdict = "SPURIOUS";
    explanation = `Provenance has failed. A genuine ${claimedOrg} call should originate from its official number. This call is highly likely to be spoofed. Do not share codes, passwords, or transfer funds. Hang up and call ${claimedOrg} directly via its official website.`;
  }

  // CHECK 3: Cap score at 100, floor at 0
  score = Math.max(0, Math.min(100, score));

  renderResult(verdict, explanation, score, checks);

  lastReport = {
    rawNumber,
    normalised,
    claimedOrg,
    callTime,
    notes,
    verdict,
    score,
    checks,
    generatedAt: new Date().toISOString()
  };

  // Enable PDF button only after a valid report exists
  downloadBtn.disabled = false;
});

function renderResult(verdict, explanation, score, checks) {
  resultSection.classList.remove("hidden");
  verdictBadge.textContent = verdict;
  verdictBadge.className = "verdict-badge " + verdict.toLowerCase();
  verdictTitle.textContent = verdict === "AUTHENTIC"
    ? "Provenance Verified"
    : verdict === "SPURIOUS"
    ? "Provenance Failed — Treat as Fraud"
    : "Inconclusive — Do Not Trust";
  verdictExplanation.textContent = explanation;
  confidenceScore.textContent = score + " / 100";
  confidenceBar.style.width = score + "%";
  confidenceBar.style.background = verdict === "SPURIOUS"
    ? "#d64545"
    : verdict === "AUTHENTIC"
    ? "#2ea86b"
    : "#e0a32e";

  // EXPERT NOTE: textContent is used, not innerHTML, to prevent
  // XSS if a user pastes malicious text into the notes field.
  checksList.innerHTML = "";
  checks.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c;
    checksList.appendChild(li);
  });

  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * PDF GENERATION: Evidence preservation.
 * EXPERT NOTE: We generate a hash from the report content
 * using SHA-256. This provides tamper-evidence: if the PDF
 * is edited, the hash will no longer match.
 *
 * FIXED in v2: PDF previously overflowed off the page for long
 * checks. It now paginates correctly and wraps the SHA-256 hash.
 */
downloadBtn.addEventListener("click", async () => {
  if (!lastReport) return;

  // FIXED: Graceful failure if CDN is blocked or offline
  if (!window.jspdf) {
    alert("PDF library could not load. Please check your internet connection and try again.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Create tamper-evident hash
  const payload = JSON.stringify(lastReport);
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

  // Helper: Writes text and adds a new page if needed — prevents overflow
  let y = 18;
  const write = (text, size = 11, bold = false) => {
    if (y > 275) { doc.addPage(); y = 18; }
    doc.setFontSize(size);
    if (bold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 3;
  };

  write("ALETHEIA — Evidence Report", 18, true);
  write("Call Provenance Verifier", 11);
  write(`Verdict: ${lastReport.verdict}`, 12, true);
  write(`Confidence: ${lastReport.score} / 100`, 11);
  write(`Caller Number (as entered): ${lastReport.rawNumber}`, 11);
  write(`Normalised: ${lastReport.normalised}`, 11);
  write(`Claimed Organisation: ${lastReport.claimedOrg}`, 11);
  write(`Time of Call: ${lastReport.callTime}`, 11);
  write(`Generated: ${lastReport.generatedAt}`, 11);
  write("Checks:", 12, true);
  lastReport.checks.forEach(c => write(c, 10));
  write(`Notes: ${lastReport.notes || "None provided"}`, 11);
  write(`SHA-256 Hash:`, 11, true);
  write(hash, 9);
  write("This report was generated entirely in the browser. It is for evidence preservation and is not a legal determination.", 9);

  doc.save(`aletheia-report-${Date.now()}.pdf`);
});
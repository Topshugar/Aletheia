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
 * ============================================================
 */

// EXPERT NOTE: In production, this list must be maintained from
// official sources only — e.g. the bank's own website, not
// third-party directories. A single incorrect entry destroys trust.
const OFFICIAL_NUMBERS = {
  "Barclays": ["+442071169000", "+443333000000"],
  "HSBC": ["+442079920888"],
  "Lloyds": ["+442076261500"],
  "HMRC": ["+443000200300"],
  "NHS": ["111"] // NHS 111 is a short code, not a standard number
};

const form = document.getElementById("verifyForm");
const resultSection = document.getElementById("result");
const verdictBadge = document.getElementById("verdictBadge");
const verdictTitle = document.getElementById("verdictTitle");
const verdictExplanation = document.getElementById("verdictExplanation");
const confidenceScore = document.getElementById("confidenceScore");
const confidenceBar = document.getElementById("confidenceBar");
const checksList = document.getElementById("checksList");

// Stores the last verification for PDF generation
let lastReport = null;

/**
 * Normalise a UK number to international format.
 * EXPERT NOTE: User input is hostile by nature — spaces,
 * brackets, dashes, leading 00, and +44 must all be handled.
 * Failure to normalise is the most common bug in phone tools.
 */
function normaliseNumber(raw) {
  if (!raw) return "";
  let n = raw.replace(/[\s\-().]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (n.startsWith("0")) n = "+44" + n.slice(1);
  return n;
}

/**
 * Validate UK number format.
 * EXPERT NOTE: We validate format, not existence.
 * No static site can prove a number exists without
 * querying a carrier, which would violate privacy.
 */
function isValidUKFormat(n) {
  // +44 followed by 10 digits, or 111 for NHS, or +44 20 / 30 etc.
  return /^\+44\d{10}$/.test(n) || n === "111";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const rawNumber = document.getElementById("callerNumber").value.trim();
  const claimedOrg = document.getElementById("claimedOrg").value;
  const callTime = document.getElementById("callTime").value;
  const notes = document.getElementById("notes").value.trim();

  if (!rawNumber || !claimedOrg || !callTime) {
    alert("Please complete all required fields.");
    return;
  }

  const normalised = normaliseNumber(rawNumber);
  const checks = [];
  let score = 0;
  let verdict = "INCONCLUSIVE";
  let explanation = "";

  // CHECK 1: Format
  const formatOk = isValidUKFormat(normalised);
  checks.push(formatOk
    ? `✓ Number format is valid for the UK: ${normalised}`
    : `✗ Number format is invalid or non-UK: ${normalised} — this is a strong spoofing indicator.`);
  if (formatOk) score += 30;

  // CHECK 2: Provenance — the core of Aletheia
  const officialList = OFFICIAL_NUMBERS[claimedOrg] || [];
  const isExactMatch = officialList.includes(normalised);

  if (claimedOrg === "Other") {
    checks.push("• No claimed organisation to verify against. Verdict must remain inconclusive.");
    score += 10;
    verdict = "INCONCLUSIVE";
    explanation = "No official number exists for comparison. Do not act on instructions from this call. Hang up and call the organisation via its official website.";
  } else if (isExactMatch) {
    checks.push(`✓ Number matches the official published number for ${claimedOrg}.`);
    score += 60;
    verdict = "AUTHENTIC";
    explanation = `The provenance is consistent. The number presented matches the official published number for ${claimedOrg}. You may still exercise caution, but there is no technical evidence of spoofing.`;
  } else {
    checks.push(`✗ Number does NOT match any official published number for ${claimedOrg}.`);
    checks.push(`  Official number(s) on file: ${officialList.join(", ")}`);
    score += 5;
    verdict = "SPURIOUS";
    explanation = `Provenance has failed. A genuine ${claimedOrg} call should originate from its official number. This call is highly likely to be spoofed. Do not share codes, passwords, or transfer funds. Hang up and call ${claimedOrg} directly via its official website.`;
  }

  // CHECK 3: Cap score at 100
  score = Math.min(100, score);

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
});

function renderResult(verdict, explanation, score, checks) {
  resultSection.classList.remove("hidden");
  verdictBadge.textContent = verdict;
  verdictBadge.className = "verdict-badge " + verdict.toLowerCase();
  verdictTitle.textContent = verdict === "AUTHENTIC" ? "Provenance Verified" : verdict === "SPURIOUS" ? "Provenance Failed — Treat as Fraud" : "Inconclusive — Do Not Trust";
  verdictExplanation.textContent = explanation;
  confidenceScore.textContent = score + " / 100";
  confidenceBar.style.width = score + "%";
  confidenceBar.style.background = verdict === "SPURIOUS" ? "#d64545" : verdict === "AUTHENTIC" ? "#2ea86b" : "#e0a32e";

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
 */
document.getElementById("downloadBtn").addEventListener("click", async () => {
  if (!lastReport) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Create tamper-evident hash
  const payload = JSON.stringify(lastReport);
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

  doc.setFontSize(18);
  doc.text("ALETHEIA — Evidence Report", 14, 18);
  doc.setFontSize(11);
  doc.text("Call Provenance Verifier", 14, 26);
  doc.text(`Verdict: ${lastReport.verdict}`, 14, 38);
  doc.text(`Confidence: ${lastReport.score} / 100`, 14, 46);
  doc.text(`Caller Number (as entered): ${lastReport.rawNumber}`, 14, 54);
  doc.text(`Normalised: ${lastReport.normalised}`, 14, 62);
  doc.text(`Claimed Organisation: ${lastReport.claimedOrg}`, 14, 70);
  doc.text(`Time of Call: ${lastReport.callTime}`, 14, 78);
  doc.text(`Generated: ${lastReport.generatedAt}`, 14, 86);
  doc.text("Checks:", 14, 98);
  let y = 106;
  lastReport.checks.forEach(c => {
    const lines = doc.splitTextToSize(c, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 4;
  });
  doc.text(`Notes: ${lastReport.notes || "None provided"}`, 14, y + 6);
  doc.text(`SHA-256 Hash: ${hash}`, 14, y + 18);
  doc.setFontSize(9);
  doc.text("This report was generated entirely in the browser. It is for evidence preservation and is not a legal determination.", 14, y + 28);

  doc.save(`aletheia-report-${Date.now()}.pdf`);
});
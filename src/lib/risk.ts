import { maxLevel, levelRank } from "./types";
import { stripNegated } from "./text";
import type { RiskAssessment, RiskCategory, RiskFlag, UrgencyLevel, Vitals } from "./types";

export const SEVERITY_WEIGHT: Record<UrgencyLevel, number> = { CRITICAL: 70, HIGH: 40, MODERATE: 20, LOW: 5 };

const ok = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n);

function vitalFlags(v: Vitals): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const add = (category: RiskCategory, severity: UrgencyLevel, label: string, reason: string) =>
    flags.push({ category, severity, label, reason });
  const { hr, sbp, dbp, spo2, temp, wbc, lactate } = v;

  // SEPSIS: SIRS proxy (no respiratory rate available, so qSOFA is incomplete)
  const sirs: string[] = [];
  if (ok(temp) && (temp > 38.3 || temp < 36)) sirs.push(`Temp ${temp} °C`);
  if (ok(hr) && hr > 90) sirs.push(`HR ${hr} bpm > 90`);
  if (ok(wbc) && (wbc > 12 || wbc < 4)) sirs.push(`WBC ${wbc} ×10⁹/L`);
  let sepsisRaised = false;
  if (sirs.length >= 2) {
    const hypo: string[] = [];
    if (ok(sbp) && sbp <= 100) hypo.push(`SBP ${sbp} mmHg ≤ 100`);
    if (ok(lactate) && lactate >= 2) hypo.push(`Lactate ${lactate} mmol/L ≥ 2`);
    sepsisRaised = true;
    if (hypo.length) {
      const crit = (ok(lactate) && lactate >= 4) || (ok(sbp) && sbp < 90);
      add("SEPSIS", crit ? "CRITICAL" : "HIGH", "Sepsis risk", `SIRS proxy ${sirs.length}/3 (${sirs.join("; ")}) with hypoperfusion (${hypo.join("; ")})`);
    } else {
      add("SEPSIS", "MODERATE", "SIRS criteria met", `SIRS proxy ${sirs.length}/3 (${sirs.join("; ")})`);
    }
  }
  if (!sepsisRaised && ok(temp) && (temp >= 39.5 || temp < 35))
    add("SEPSIS", "MODERATE", "Temperature derangement", `Temp ${temp} °C outside 35–39.5`);

  // CARDIAC
  if (ok(hr)) {
    if (hr > 120) add("CARDIAC", "HIGH", "Tachycardia", `HR ${hr} bpm > 120`);
    else if (hr < 45) add("CARDIAC", "HIGH", "Bradycardia", `HR ${hr} bpm < 45`);
    else if (hr > 100) add("CARDIAC", "MODERATE", "Tachycardia", `HR ${hr} bpm > 100`);
  }
  if ((ok(sbp) && sbp >= 180) || (ok(dbp) && dbp >= 120))
    add("CARDIAC", "HIGH", "Hypertensive crisis range", `BP ${sbp ?? "?"}/${dbp ?? "?"} mmHg (SBP ≥ 180 or DBP ≥ 120)`);
  if (ok(sbp) && sbp < 90) add("CARDIAC", "HIGH", "Hypotension", `SBP ${sbp} mmHg < 90`);

  // RESPIRATORY
  if (ok(spo2)) {
    if (spo2 < 88) add("RESPIRATORY", "CRITICAL", "Respiratory distress / hypoxemia", `SpO2 ${spo2}% < 88`);
    else if (spo2 < 92) add("RESPIRATORY", "HIGH", "Respiratory distress / hypoxemia", `SpO2 ${spo2}% < 92`);
    else if (spo2 <= 94) add("RESPIRATORY", "MODERATE", "Borderline oxygenation", `SpO2 ${spo2}% in 92–94`);
  }

  // LAB
  if (ok(lactate)) {
    if (lactate >= 4) add("LAB", "CRITICAL", "Severe hyperlactatemia", `Lactate ${lactate} mmol/L ≥ 4`);
    else if (lactate >= 2) add("LAB", "HIGH", "Elevated lactate", `Lactate ${lactate} mmol/L ≥ 2`);
  }
  if (ok(wbc)) {
    if (wbc > 15 || wbc < 3) add("LAB", "HIGH", "Leukocyte abnormality", `WBC ${wbc} ×10⁹/L outside 3–15`);
    else if (wbc > 12) add("LAB", "MODERATE", "Leukocytosis", `WBC ${wbc} ×10⁹/L > 12`);
  }
  return flags;
}

// Findings are matched after stripNegated() ('no ST elevation' does not flag); see text.ts for its limits.
const FINDING_RULES: { category: RiskCategory; severity: UrgencyLevel; label: string; re: RegExp; skipIfCritImaging?: boolean }[] = [
  { category: "CARDIAC", severity: "CRITICAL", label: "Acute coronary syndrome marker", re: /st[- ]?elevation|\bstemi\b|troponin/i },
  { category: "CARDIAC", severity: "HIGH", label: "Arrhythmia / ischemic ECG change", re: /arrhythmia|atrial fibrillation|\bafib\b|st[- ]?depression|bundle branch block/i },
  { category: "IMAGING", severity: "CRITICAL", label: "Critical imaging finding", re: /pneumothorax|intracranial (hemorrhage|haemorrhage|bleed)|aortic dissection/i },
  { category: "IMAGING", severity: "HIGH", label: "Imaging red flag", re: /neovasculari[sz]ation|proliferative|retinal (hemorrhage|haemorrhage)|consolidation|pulmonary (nodule|mass)|infarct/i, skipIfCritImaging: true },
  { category: "LAB", severity: "MODERATE", label: "Poor glycaemic control", re: /hba1c\D{0,5}(\d+(?:\.\d+)?)/i },
  { category: "RESPIRATORY", severity: "HIGH", label: "Respiratory distress (reported)", re: /respiratory distress|accessory muscle|can'?t finish sentences|unable to (speak|complete sentences)/i },
];

function findingFlags(findings: string[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  for (const rule of FINDING_RULES) {
    for (const raw of findings) {
      if (typeof raw !== "string") continue;
      const text = stripNegated(raw);
      if (rule.skipIfCritImaging && FINDING_RULES[2].re.test(text)) continue;
      const m = rule.re.exec(text);
      if (!m) continue;
      if (rule.label === "Poor glycaemic control" && !(parseFloat(m[1]) >= 9)) continue;
      flags.push({ category: rule.category, severity: rule.severity, label: rule.label, reason: `Matched "${m[0]}"` });
      break; // one flag per rule
    }
  }
  return flags;
}

export function evaluateRisk(vitals: Vitals, findings: string[] = []): RiskAssessment {
  const flags = [...vitalFlags(vitals ?? {}), ...findingFlags(findings ?? [])].sort(
    (a, b) => levelRank(b.severity) - levelRank(a.severity),
  );
  if (!flags.length) return { score: 0, level: "LOW", flags };
  const worst = new Map<RiskCategory, number>();
  for (const f of flags) worst.set(f.category, Math.max(worst.get(f.category) ?? 0, SEVERITY_WEIGHT[f.severity]));
  const w = [...worst.values()].sort((a, b) => b - a);
  const rest = w.slice(1).reduce((s, x) => s + x, 0);
  return { score: Math.min(100, Math.round(w[0] + 0.5 * rest)), level: maxLevel(...flags.map((f) => f.severity)), flags };
}

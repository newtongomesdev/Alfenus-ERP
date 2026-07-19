/**
 * Deduplication logic for clients and leads.
 *
 * Pure logic — no database access. Handles:
 * - Name similarity scoring
 * - Document exact matching
 * - Email exact matching
 * - Phone normalization and matching
 * - Combined confidence scoring
 * - Merge strategy
 */

export interface DedupCandidate {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface DedupMatch {
  sourceId: string;
  targetId: string;
  confidence: number;
  reasons: string[];
}

export type DedupAction = "merge" | "skip" | "mark_as_duplicate";

export interface MergeStrategy {
  keepSourceFields: string[];
  preferTargetFields: string[];
}

// ---------------------------------------------------------------------------
// String normalization
// ---------------------------------------------------------------------------

export function normalizeForDedup(value: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDocument(doc: string | null): string {
  if (!doc) return "";
  return doc.replace(/[.\-\/\s]/g, "").trim();
}

export function normalizePhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "").trim();
}

// ---------------------------------------------------------------------------
// Similarity scoring
// ---------------------------------------------------------------------------

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeForDedup(a);
  const nb = normalizeForDedup(b);

  if (na === nb) return 1.0;
  if (na.length === 0 || nb.length === 0) return 0;

  // Jaro-Winkler similarity
  return jaroWinkler(na, nb);
}

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// ---------------------------------------------------------------------------
// Match detection
// ---------------------------------------------------------------------------

export function findMatches(
  source: DedupCandidate,
  candidates: DedupCandidate[],
  threshold = 0.8,
): DedupMatch[] {
  const matches: DedupMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;

    const reasons: string[] = [];
    let confidence = 0;

    // Document match (highest confidence)
    if (source.document && candidate.document) {
      if (normalizeDocument(source.document) === normalizeDocument(candidate.document)) {
        confidence = 1.0;
        reasons.push("documento_igual");
      }
    }

    // Email match (high confidence)
    if (source.email && candidate.email) {
      if (source.email.toLowerCase().trim() === candidate.email.toLowerCase().trim()) {
        confidence = Math.max(confidence, 0.95);
        reasons.push("email_igual");
      }
    }

    // Phone match (medium confidence)
    const srcPhone = normalizePhone(source.phone || source.whatsapp);
    const candPhone = normalizePhone(candidate.phone || candidate.whatsapp);
    if (srcPhone && candPhone) {
      if (srcPhone === candPhone) {
        confidence = Math.max(confidence, 0.85);
        reasons.push("telefone_igual");
      } else if (srcPhone.length >= 8 && candPhone.length >= 8) {
        // Check if one contains the other (different formatting)
        if (srcPhone.endsWith(candPhone) || candPhone.endsWith(srcPhone)) {
          confidence = Math.max(confidence, 0.7);
          reasons.push("telefone_parcial");
        }
      }
    }

    // Name similarity (contributes but doesn't alone reach threshold)
    const nameSim = nameSimilarity(source.name, candidate.name);
    if (nameSim >= 0.9) {
      confidence = Math.max(confidence, nameSim * 0.9);
      reasons.push(`nome_similar_${Math.round(nameSim * 100)}%`);
    }

    if (reasons.length > 0 && confidence >= threshold) {
      matches.push({
        sourceId: source.id,
        targetId: candidate.id,
        confidence,
        reasons,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

export function mergeRecords(
  source: DedupCandidate,
  target: DedupCandidate,
  strategy: MergeStrategy = {
    keepSourceFields: ["name", "document", "email", "phone", "whatsapp"],
    preferTargetFields: [],
  },
): DedupCandidate {
  const merged = { ...target };

  for (const field of strategy.keepSourceFields) {
    const srcVal = source[field as keyof DedupCandidate];
    const tgtVal = target[field as keyof DedupCandidate];
    if (srcVal && (!tgtVal || String(tgtVal).trim() === "")) {
      (merged as Record<string, unknown>)[field] = srcVal;
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Batch dedup
// ---------------------------------------------------------------------------

export function detectBatchDuplicates(
  records: DedupCandidate[],
  threshold = 0.8,
): DedupMatch[] {
  const allMatches: DedupMatch[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const pair = [records[i].id, records[j].id].sort().join(":");
      if (processed.has(pair)) continue;
      processed.add(pair);

      const matches = findMatches(records[i], [records[j]], threshold);
      allMatches.push(...matches);

      // Also check reverse
      const reverseMatches = findMatches(records[j], [records[i]], threshold);
      for (const rm of reverseMatches) {
        const reversePair = [rm.sourceId, rm.targetId].sort().join(":");
        if (!allMatches.some((m) => [m.sourceId, m.targetId].sort().join(":") === reversePair)) {
          allMatches.push(rm);
        }
      }
    }
  }

  return allMatches.sort((a, b) => b.confidence - a.confidence);
}

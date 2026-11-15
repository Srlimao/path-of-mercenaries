import type { AttributeAffinity, MercenaryLevelStatRow } from '../catalog-types/index.js';

const AFFINITY_WEIGHTS: Record<AttributeAffinity, { str: number; dex: number; int: number; lifeMul: number }> = {
  STR: { str: 0.7, dex: 0.15, int: 0.15, lifeMul: 1.12 },
  DEX: { str: 0.15, dex: 0.7, int: 0.15, lifeMul: 0.98 },
  INT: { str: 0.15, dex: 0.15, int: 0.7, lifeMul: 0.92 },
  STR_DEX: { str: 0.43, dex: 0.43, int: 0.14, lifeMul: 1.05 },
  STR_INT: { str: 0.43, dex: 0.14, int: 0.43, lifeMul: 1.02 },
  DEX_INT: { str: 0.14, dex: 0.43, int: 0.43, lifeMul: 0.95 },
  STR_DEX_INT: { str: 0.34, dex: 0.33, int: 0.33, lifeMul: 1.0 },
};

/** Maps Mercenary character level (1-85) to internal skill level (1-40). */
export function deriveMercSkillLevel(mercLevel: number): number {
  const lv = Math.max(1, Math.min(85, Math.round(mercLevel)));
  if (lv >= 84) return 27 + (lv - 84); // Lv 84 -> 27, Lv 85 -> 28
  if (lv >= 82) return 26;              // Lv 82-83 -> 26
  if (lv >= 79) return 25;
  if (lv >= 75) return 24;
  return Math.max(1, Math.min(23, Math.round(1 + (lv - 1) * 0.29)));
}

/**
 * Hidden Mercenary elemental resistance scaling (0% early -> +35% at level 80+).
 */
export function deriveHiddenElemResPct(mercLevel: number): number {
  if (mercLevel >= 80) return 35;
  if (mercLevel <= 30) return 0;
  return Math.round(((mercLevel - 30) / 50) * 35);
}

/**
 * Builds deterministic Level 1-85 base stat tables for a given attribute affinity.
 */
export function buildMercenaryLevelCurve(
  affinity: AttributeAffinity,
  infamousBonusMul = 1.0,
): Record<number, MercenaryLevelStatRow> {
  const weights = AFFINITY_WEIGHTS[affinity];
  const rows: Record<number, MercenaryLevelStatRow> = {};

  for (let level = 1; level <= 85; level += 1) {
    const totalAttrBudget = Math.round((42 + level * 4.4) * (infamousBonusMul > 1 ? 1.05 : 1));
    // Base life curve calibrated to ~2,450-2,850 base life at Lv 84 before gear/Str
    const rawLife = 54 + level * 19 + Math.pow(level, 1.53) * 1.15;
    const baseLife = Math.round(rawLife * weights.lifeMul * infamousBonusMul);
    const baseAccuracy = Math.round(60 + level * 14 + Math.pow(level, 1.38) * 1.1);
    const baseEvasion = Math.round(45 + level * 12 + (affinity.includes('DEX') ? level * 5.5 : 0));

    rows[level] = {
      level,
      baseLife,
      baseAccuracy,
      baseEvasion,
      baseStr: Math.round(totalAttrBudget * weights.str),
      baseDex: Math.round(totalAttrBudget * weights.dex),
      baseInt: Math.round(totalAttrBudget * weights.int),
      hiddenElemResPct: deriveHiddenElemResPct(level),
      defaultSkillLevel: deriveMercSkillLevel(level),
    };
  }

  return rows;
}

import {
  DAMAGE_TYPES,
  ModFlags,
  type DamageRange,
  type DamageType,
  type MercenaryBuildState,
  type MercenarySkillDefinition,
  type ParsedItem,
  type SkillPartDefinition,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';

export interface Stage2AddedDamageResult {
  effectiveSkillLevel: number;
  weaponDamageMultiplierPct: number;
  damageEffectiveness: number;
  queryFlags: number;
  evalContext: EvalContext;
  weaponBaseRanges: Record<DamageType, DamageRange>;
  addedAfterEffectivenessRanges: Record<DamageType, DamageRange>;
  baseRanges: Record<DamageType, DamageRange>;
  baseCritChancePct: number;
  baseActionTimeSec: number;
}

const WEAPON_CLASS_FLAG_MAP: Record<string, number> = {
  Wand: ModFlags.Wand,
  Bow: ModFlags.Bow,
  'One Hand Sword': ModFlags.Sword,
  'Thrusting One Hand Sword': ModFlags.Sword,
  'Two Hand Sword': ModFlags.Sword | ModFlags.TwoHanded,
  'One Hand Axe': ModFlags.Axe,
  'Two Hand Axe': ModFlags.Axe | ModFlags.TwoHanded,
  'One Hand Mace': ModFlags.Mace,
  'Two Hand Mace': ModFlags.Mace | ModFlags.TwoHanded,
  Sceptre: ModFlags.Mace,
  Staff: ModFlags.Staff | ModFlags.TwoHanded,
  Claw: ModFlags.Claw,
  Dagger: ModFlags.Dagger,
};

export function makeDamageRange(min: number, max: number): DamageRange {
  const safeMin = Math.max(0, min);
  const safeMax = Math.max(safeMin, max);
  return { min: safeMin, max: safeMax, avg: (safeMin + safeMax) / 2 };
}

/** Derives skill + weapon + delivery ModFlags bitmask for ModDB hit queries. */
export function buildSkillQueryFlags(
  part: SkillPartDefinition,
  weapon1?: ParsedItem,
  weapon2?: ParsedItem,
): number {
  let flags = part.skillModFlags;
  if (part.isAttack) flags |= ModFlags.Attack;
  if (part.isSpell) flags |= ModFlags.Spell;
  if (weapon1) {
    flags |= WEAPON_CLASS_FLAG_MAP[weapon1.itemClass] ?? 0;
    if (weapon2) {
      flags |= weapon2.itemClass === 'Shield' ? ModFlags.Shield : ModFlags.DualWield;
    }
  }
  return flags;
}

/** Builds EvalContext from current build combat configuration and skill tags. */
export function buildSkillEvalContext(
  buildState: MercenaryBuildState,
  skillTags: readonly string[],
): EvalContext {
  const c = buildState.partyConfig.combatConditions;
  return {
    skillTags: [...skillTags],
    conditions: {
      Onslaught: c.onslaught,
      Tailwind: c.tailwind,
      Adrenaline: c.adrenaline,
      HasPowerCharge: c.powerCharges > 0,
      HasFrenzyCharge: c.frenzyCharges > 0,
      HasEnduranceCharge: c.enduranceCharges > 0,
      HasFortify: c.fortifyStacks > 0,
      FullLife: true,
    },
    stats: {
      PowerCharges: c.powerCharges,
      FrenzyCharges: c.frenzyCharges,
      EnduranceCharges: c.enduranceCharges,
      FortifyStacks: c.fortifyStacks,
      ProjectileDistance: c.projectileDistance,
    },
  };
}

/** Linearly interpolates a numeric level curve table (e.g. weaponDamageMultiplierPctByLevel). */
export function interpolateNumericByLevel(
  table: Record<number, number>,
  targetLevel: number,
  fallback = 100,
): number {
  if (table[targetLevel] !== undefined) return table[targetLevel]!;
  const keys = Object.keys(table)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b);
  if (keys.length === 0) return fallback;
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (targetLevel <= first) return table[first]!;
  if (targetLevel >= last) return table[last]!;

  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i]!;
    const hi = keys[i + 1]!;
    if (targetLevel >= lo && targetLevel <= hi) {
      const t = (targetLevel - lo) / (hi - lo);
      return table[lo]! + (table[hi]! - table[lo]!) * t;
    }
  }
  return table[last]!;
}

/** Linearly interpolates [min, max] per-damage-type tables across skill levels. */
export function interpolateBaseAddedByLevel(
  table: Record<number, Partial<Record<DamageType, [number, number]>>>,
  targetLevel: number,
): Partial<Record<DamageType, [number, number]>> {
  if (table[targetLevel]) return table[targetLevel]!;
  const keys = Object.keys(table)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b);
  if (keys.length === 0) return {};
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (targetLevel <= first) return table[first]!;
  if (targetLevel >= last) return table[last]!;

  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i]!;
    const hi = keys[i + 1]!;
    if (targetLevel >= lo && targetLevel <= hi) {
      const t = (targetLevel - lo) / (hi - lo);
      const loRow = table[lo]!;
      const hiRow = table[hi]!;
      const out: Partial<Record<DamageType, [number, number]>> = {};
      for (const dt of DAMAGE_TYPES) {
        const a = loRow[dt];
        const b = hiRow[dt];
        if (!a && !b) continue;
        const [aMin, aMax] = a ?? [0, 0];
        const [bMin, bMax] = b ?? [aMin, aMax];
        out[dt] = [aMin + (bMin - aMin) * t, aMax + (bMax - aMax) * t];
      }
      return out;
    }
  }
  return table[last]!;
}

/**
 * Stage 2: Resolves weapon base damage, skill base added damage,
 * and external flat added damage scaled by Damage Effectiveness.
 */
export function computeStage2AddedDamage(
  skill: MercenarySkillDefinition,
  part: SkillPartDefinition,
  effectiveSkillLevel: number,
  skillModDb: ModDB,
  buildState: MercenaryBuildState,
): Stage2AddedDamageResult {
  const weapon1 = buildState.equippedItems.Weapon1;
  const weapon2 = buildState.equippedItems.Weapon2;
  const queryFlags = buildSkillQueryFlags(part, weapon1, weapon2) | ModFlags.Hit;
  const evalContext = buildSkillEvalContext(buildState, skill.tags);

  const weaponDamageMultiplierPct = part.isAttack
    ? interpolateNumericByLevel(part.weaponDamageMultiplierPctByLevel, effectiveSkillLevel, 100)
    : 0;
  const weaponScalar = part.isAttack ? Math.max(0, weaponDamageMultiplierPct / 100) : 0;
  const damageEffectiveness = Math.max(0, part.damageEffectiveness || weaponScalar || 1);
  const skillFlatByType = interpolateBaseAddedByLevel(part.baseAddedDamageByLevel, effectiveSkillLevel);

  const weaponBaseRanges = {} as Record<DamageType, DamageRange>;
  const addedAfterEffectivenessRanges = {} as Record<DamageType, DamageRange>;
  const baseRanges = {} as Record<DamageType, DamageRange>;

  for (const dt of DAMAGE_TYPES) {
    let wScaledMin = 0;
    let wScaledMax = 0;
    if (part.isAttack) {
      if (weapon1?.localWeaponStats) {
        const w = weapon1.localWeaponStats;
        const wMin = dt === 'Physical' ? w.physMin : (w.eleMin[dt] ?? 0);
        const wMax = dt === 'Physical' ? w.physMax : (w.eleMax[dt] ?? 0);
        wScaledMin = wMin * weaponScalar;
        wScaledMax = wMax * weaponScalar;
      } else if (dt === 'Physical') {
        wScaledMin = 10 * weaponScalar;
        wScaledMax = 20 * weaponScalar;
      }
    }

    const skillRange = skillFlatByType[dt];
    const gemMin = skillRange ? skillRange[0] : 0;
    const gemMax = skillRange ? skillRange[1] : 0;

    const extMin = skillModDb.sum('BASE', {
      names: [`${dt}Min`],
      flags: queryFlags,
      keywordFlags: 0,
      context: evalContext,
    });
    const extMax = skillModDb.sum('BASE', {
      names: [`${dt}Max`],
      flags: queryFlags,
      keywordFlags: 0,
      context: evalContext,
    });
    const effAddedMin = gemMin + extMin * damageEffectiveness;
    const effAddedMax = gemMax + extMax * damageEffectiveness;

    weaponBaseRanges[dt] = makeDamageRange(wScaledMin, wScaledMax);
    addedAfterEffectivenessRanges[dt] = makeDamageRange(effAddedMin, effAddedMax);
    baseRanges[dt] = makeDamageRange(wScaledMin + effAddedMin, wScaledMax + effAddedMax);
  }

  const dlCritOverride = part.isAttack
    ? skillModDb.override('DestructiveLinkMainHandCritOverride', {
        flags: queryFlags,
        keywordFlags: 0,
        context: evalContext,
      })
    : undefined;
  const baseCritChancePct = part.isAttack
    ? (dlCritOverride ?? weapon1?.localWeaponStats?.critChancePct ?? part.baseCritChancePct ?? 5)
    : (part.baseCritChancePct ?? 6);
  const baseActionTimeSec = part.isAttack
    ? part.baseAttackTimeOverrideSec ??
      (weapon1?.localWeaponStats?.aps ? 1 / weapon1.localWeaponStats.aps : 1 / 1.2)
    : (part.baseCastTimeSec ?? 0.75);

  return {
    effectiveSkillLevel,
    weaponDamageMultiplierPct,
    damageEffectiveness,
    queryFlags,
    evalContext,
    weaponBaseRanges,
    addedAfterEffectivenessRanges,
    baseRanges,
    baseCritChancePct,
    baseActionTimeSec: Math.max(0.05, baseActionTimeSec),
  };
}

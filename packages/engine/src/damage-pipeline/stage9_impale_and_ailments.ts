import {
  KeywordFlags,
  ModFlags,
  type EnemyConfigState,
} from '../catalog-types/index.js';
import type { ModDB } from '../mod-db/index.js';
import type { Stage2AddedDamageResult } from './stage2_added_damage.js';
import type { Stage3ConversionResult } from './stage3_conversion_dag.js';
import type { Stage4ScaledDamageResult } from './stage4_inc_more_buckets.js';
import { computeExpectedRangeRoll, type Stage5CritAndHitResult } from './stage5_crit_lucky_multihit.js';
import { computeStage7EnemyEffectiveResist } from './stage7_enemy_resistances.js';
import { computeStage8EnemyMitigationAndTaken } from './stage8_enemy_pdr_and_taken.js';

export interface Stage9AilmentsResult {
  impaleDps: number;
  igniteDps: number;
  bleedDps: number;
  poisonDps: number;
}

const DAMAGE_STAT_NAMES = [
  'Damage',
  'PhysicalDamage',
  'LightningDamage',
  'ColdDamage',
  'FireDamage',
  'ChaosDamage',
  'ElementalDamage',
];

const WEAPON_CLASS_MASK =
  ModFlags.Wand |
  ModFlags.Bow |
  ModFlags.Sword |
  ModFlags.Axe |
  ModFlags.Mace |
  ModFlags.Staff |
  ModFlags.Claw |
  ModFlags.Dagger |
  ModFlags.DualWield |
  ModFlags.TwoHanded |
  ModFlags.Shield;

function computeDotElementMitigation(
  damageType: 'Fire' | 'Chaos',
  skillModDb: ModDB,
  enemyConfig: EnemyConfigState,
  mercLightningUncappedResistPct: number,
  ailmentQueryFlags: number,
  context: Stage2AddedDamageResult['evalContext'],
): number {
  const resWithHitPen = computeStage7EnemyEffectiveResist(
    damageType,
    enemyConfig,
    skillModDb,
    mercLightningUncappedResistPct,
    ailmentQueryFlags,
    context,
  );
  // DoTs cannot penetrate resistances; restore hit penetration if any matched without Hit flags
  const hitPen =
    damageType === 'Fire'
      ? skillModDb.sum('BASE', {
          names: ['FirePenetration', 'ElementalPenetration'],
          flags: ailmentQueryFlags,
          keywordFlags: 0,
          context,
        })
      : 0;
  const dotRes = resWithHitPen + hitPen;
  return computeStage8EnemyMitigationAndTaken(
    damageType,
    0,
    dotRes,
    enemyConfig,
    ailmentQueryFlags,
    skillModDb,
    context,
  ).mitigationMultiplier;
}

/**
 * Stage 9: Computes Impale DPS and dedicated Base Ailment Damage (Ignite, Bleed, Poison)
 * using anti-double-dipping ModFlags.Ailment | ModFlags.Dot queries stripped of
 * Projectile, Area, Spell, Melee, and Hit flags.
 */
export function computeStage9ImpaleAndAilments(params: {
  stage2: Stage2AddedDamageResult;
  stage3: Stage3ConversionResult;
  stage4: Stage4ScaledDamageResult;
  stage5: Stage5CritAndHitResult;
  skillModDb: ModDB;
  enemyConfig: EnemyConfigState;
  mercLightningUncappedResistPct: number;
  hitChancePct: number;
  effectiveActionRate: number;
}): Stage9AilmentsResult {
  const {
    stage2,
    stage3,
    stage5,
    skillModDb,
    enemyConfig,
    mercLightningUncappedResistPct,
    hitChancePct,
    effectiveActionRate,
  } = params;
  const context = stage2.evalContext;
  const hitFactor = hitChancePct / 100;
  const impaleDps = Number((stage5.expectedImpalePerHit * hitFactor * effectiveActionRate).toFixed(1));

  const ailmentQueryFlags =
    (stage2.queryFlags & WEAPON_CLASS_MASK) | ModFlags.Ailment | ModFlags.Dot;
  const genericDotMulti = skillModDb.sum('BASE', {
    names: ['DotMultiplier'],
    flags: ailmentQueryFlags,
    keywordFlags: 0,
    context,
  });

  // Ignite (0.90x Base Fire Damage per second)
  let igniteDps = 0;
  const allDamageIgnites = skillModDb.flag('AllDamageCanIgnite', context, ailmentQueryFlags);
  const fireDotMit = computeDotElementMitigation(
    'Fire',
    skillModDb,
    enemyConfig,
    mercLightningUncappedResistPct,
    ailmentQueryFlags,
    context,
  );
  const fireDotMulti =
    genericDotMulti +
    skillModDb.sum('BASE', { names: ['FireDotMultiplier'], flags: ailmentQueryFlags, keywordFlags: 0, context });

  for (const chunk of stage3.chunks) {
    if (chunk.currentType !== 'Fire' && !allDamageIgnites) continue;
    const baseAvg = computeExpectedRangeRoll(chunk.range, stage5.isLuckyDamage);
    const kw = chunk.ancestralMask | KeywordFlags.Ignite;
    const incPct = skillModDb.sum('INC', { names: DAMAGE_STAT_NAMES, flags: ailmentQueryFlags, keywordFlags: kw, context });
    const moreMult = skillModDb.more({ names: DAMAGE_STAT_NAMES, flags: ailmentQueryFlags, keywordFlags: kw, context });
    igniteDps +=
      baseAvg *
      0.9 *
      Math.max(0, 1 + incPct / 100) *
      moreMult *
      Math.max(0, 1 + fireDotMulti / 100) *
      fireDotMit;
  }

  // Bleed (Attacks only; Armour does NOT mitigate DoT)
  let bleedDps = 0;
  if ((stage2.queryFlags & ModFlags.Attack) !== 0) {
    const physDotTakenMulti = computeStage8EnemyMitigationAndTaken(
      'Physical',
      0,
      0,
      enemyConfig,
      ailmentQueryFlags,
      skillModDb,
      context,
    ).takenMultiplier;
    const physDotMulti =
      genericDotMulti +
      skillModDb.sum('BASE', { names: ['PhysicalDotMultiplier'], flags: ailmentQueryFlags, keywordFlags: 0, context });
    const isCrimsonDance = skillModDb.flag('CrimsonDance', context, ailmentQueryFlags);
    const isMoving = skillModDb.flag('EnemyMoving', context, ailmentQueryFlags);
    const bleedScalar = isCrimsonDance
      ? 0.35 * Math.min(8, effectiveActionRate * hitFactor * 5)
      : isMoving
        ? 2.1
        : 0.7;

    for (const chunk of stage3.chunks) {
      if (chunk.currentType !== 'Physical') continue;
      const baseAvg = computeExpectedRangeRoll(chunk.range, stage5.isLuckyDamage);
      const kw = chunk.ancestralMask | KeywordFlags.Bleed;
      const incPct = skillModDb.sum('INC', { names: DAMAGE_STAT_NAMES, flags: ailmentQueryFlags, keywordFlags: kw, context });
      const moreMult = skillModDb.more({ names: DAMAGE_STAT_NAMES, flags: ailmentQueryFlags, keywordFlags: kw, context });
      bleedDps +=
        baseAvg *
        bleedScalar *
        Math.max(0, 1 + incPct / 100) *
        moreMult *
        Math.max(0, 1 + physDotMulti / 100) *
        physDotTakenMulti;
    }
  }

  // Poison (0.30x Base Phys + Chaos per stack * sustainable stacks)
  let poisonDps = 0;
  const chaosDotMit = computeDotElementMitigation(
    'Chaos',
    skillModDb,
    enemyConfig,
    mercLightningUncappedResistPct,
    ailmentQueryFlags,
    context,
  );
  const chaosDotMulti =
    genericDotMulti +
    skillModDb.sum('BASE', { names: ['ChaosDotMultiplier'], flags: ailmentQueryFlags, keywordFlags: 0, context });
  const durationIncPct = skillModDb.sum('INC', {
    names: ['PoisonDuration', 'AilmentDuration'],
    flags: ailmentQueryFlags,
    keywordFlags: 0,
    context,
  });
  const poisonDurationSec = 2.0 * Math.max(0.1, 1 + durationIncPct / 100);
  const rawPoisonChance = skillModDb.sum('BASE', {
    names: ['PoisonChance'],
    flags: stage2.queryFlags,
    keywordFlags: 0,
    context,
  });

  for (const chunk of stage3.chunks) {
    if (chunk.currentType !== 'Physical' && chunk.currentType !== 'Chaos') continue;
    const effectivePoisonChance =
      rawPoisonChance > 0 ? Math.min(1, rawPoisonChance / 100) : chunk.currentType === 'Chaos' ? 1 : 0;
    if (effectivePoisonChance <= 0) continue;
    const stacks =
      effectiveActionRate *
      hitFactor *
      effectivePoisonChance *
      poisonDurationSec *
      stage5.returningProjectileHitMultiplier;
    const baseAvg = computeExpectedRangeRoll(chunk.range, stage5.isLuckyDamage);
    const kw = chunk.ancestralMask | KeywordFlags.Poison;
    const incPct = skillModDb.sum('INC', { names: DAMAGE_STAT_NAMES, flags: ailmentQueryFlags, keywordFlags: kw, context });
    const moreMult = skillModDb.more({ names: DAMAGE_STAT_NAMES, flags: ailmentQueryFlags, keywordFlags: kw, context });
    poisonDps +=
      baseAvg *
      0.3 *
      Math.max(0, 1 + incPct / 100) *
      moreMult *
      Math.max(0, 1 + chaosDotMulti / 100) *
      chaosDotMit *
      stacks;
  }

  return {
    impaleDps,
    igniteDps: Number(igniteDps.toFixed(1)),
    bleedDps: Number(bleedDps.toFixed(1)),
    poisonDps: Number(poisonDps.toFixed(1)),
  };
}

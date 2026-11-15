import {
  DAMAGE_TYPES,
  ModFlags,
  type DamageRange,
  type DamageType,
  type EnemyConfigState,
  type PerTypeDamageBreakdown,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';
import type { Stage2AddedDamageResult } from './stage2_added_damage.js';
import type { Stage3ConversionResult } from './stage3_conversion_dag.js';
import type { Stage4ScaledDamageResult } from './stage4_inc_more_buckets.js';
import { CURSE_CATALOG, getCurseEffectivenessScalar } from './stage7_enemy_resistances.js';

export interface Stage5CritAndHitResult {
  effectiveCritChancePct: number;
  critMultiplierPct: number;
  isLuckyDamage: boolean;
  returningProjectileHitMultiplier: number;
  averageHit: number;
  expectedImpalePerHit: number;
  perTypeBreakdown: Record<DamageType, PerTypeDamageBreakdown>;
}

/** Computes expected roll on [min, max]: (min + max)/2 normally, or min + 2/3*(max - min) when Lucky. */
export function computeExpectedRangeRoll(
  range: Pick<DamageRange, 'min' | 'max'>,
  isLucky: boolean,
): number {
  if (range.max <= range.min) return range.min;
  return isLucky
    ? range.min + (2 / 3) * (range.max - range.min)
    : (range.min + range.max) / 2;
}

/**
 * Stage 5: Resolves effective crit chance & multiplier, Lucky hit rolls (Perquil's Toe),
 * Returning Projectiles hit factor, expected average hit, and Impale per-hit contribution.
 */
export function computeStage5CritAndHit(
  stage2: Stage2AddedDamageResult,
  stage3: Stage3ConversionResult,
  stage4: Stage4ScaledDamageResult,
  skillModDb: ModDB,
  enemyConfig: EnemyConfigState,
  queryFlags: number,
  context: EvalContext,
): Stage5CritAndHitResult {
  const flatAddedCritPct = skillModDb.sum('BASE', {
    names: ['CritChance'],
    flags: queryFlags,
    keywordFlags: 0,
    context,
  });
  const incCritPct = skillModDb.sum('INC', {
    names: ['CritChance'],
    flags: queryFlags,
    keywordFlags: 0,
    context,
  });
  const curseScalar = getCurseEffectivenessScalar(enemyConfig, skillModDb, context);
  let markBaseCrit = 0;
  let markCritMulti = 0;
  for (const cid of enemyConfig.activeCurses) {
    const def = CURSE_CATALOG.find((c) => c.id === cid);
    if (!def) continue;
    if (def.addedBaseCritPct) markBaseCrit += def.addedBaseCritPct * curseScalar;
    if (def.addedCritMultiPct) markCritMulti += def.addedCritMultiPct * curseScalar;
  }

  const brittlePct = Math.max(0, enemyConfig.brittlePct ?? 0);
  const rawCritPct =
    (stage2.baseCritChancePct + flatAddedCritPct + brittlePct + markBaseCrit) *
    Math.max(0, 1 + incCritPct / 100);
  const singleRollCritPct = Math.max(0, Math.min(100, rawCritPct));
  const luckyCrit = skillModDb.flag('LuckyCritChance', context, queryFlags);
  const effectiveCritChancePct = luckyCrit
    ? (1 - Math.pow(1 - singleRollCritPct / 100, 2)) * 100
    : singleRollCritPct;

  const addedCritMulti = skillModDb.sum('BASE', {
    names: ['CritMultiplier'],
    flags: queryFlags,
    keywordFlags: 0,
    context,
  });
  const critMultiplierPct = Math.max(100, 150 + addedCritMulti + markCritMulti);
  const critProb = effectiveCritChancePct / 100;
  const critFactor = (1 - critProb) + critProb * (critMultiplierPct / 100);

  const isLuckyDamage = skillModDb.flag('LuckyHitDamage', context, queryFlags);

  let returningProjectileHitMultiplier = 1;
  if ((queryFlags & ModFlags.Projectile) !== 0 && skillModDb.flag('ProjectilesReturn', context, queryFlags)) {
    const returnLessPct = Math.max(
      0,
      Math.min(
        100,
        skillModDb.sum('BASE', {
          names: ['ReturningProjectileLessDamage'],
          flags: queryFlags,
          keywordFlags: 0,
          context,
        }),
      ),
    );
    returningProjectileHitMultiplier = 1 + Math.max(0, 1 - returnLessPct / 100);
  }

  let averageHit = 0;
  const perTypeBreakdown = {} as Record<DamageType, PerTypeDamageBreakdown>;

  for (const dt of DAMAGE_TYPES) {
    const rawPreMit = stage4.rawRangesPostScale[dt];
    const scaled = stage4.scaledRanges[dt];
    const effectivePreMitAvg =
      computeExpectedRangeRoll(rawPreMit, isLuckyDamage) *
      critFactor *
      returningProjectileHitMultiplier;
    const finalAverageHit =
      computeExpectedRangeRoll(scaled, isLuckyDamage) *
      critFactor *
      returningProjectileHitMultiplier;
    averageHit += finalAverageHit;

    perTypeBreakdown[dt] = {
      damageType: dt,
      baseDamage: stage2.weaponBaseRanges[dt],
      addedAfterEffectiveness: stage2.addedAfterEffectivenessRanges[dt],
      convertedOutPct: stage3.convertedOutPctByType[dt],
      gainedAsExtra: stage3.gainedAsExtraByType[dt],
      totalIncreasedPct: stage4.totalIncreasedPctByType[dt],
      totalMoreMulti: stage4.totalMoreMultiByType[dt],
      preMitigationHit: rawPreMit,
      effectivePreMitigationAvg: Number(effectivePreMitAvg.toFixed(1)),
      enemyEffectiveResistPct: stage4.enemyEffectiveResistPct[dt],
      mitigationMulti: Number(stage4.mitigationMultiByType[dt].toFixed(3)),
      finalAverageHit: Number(finalAverageHit.toFixed(1)),
      hitDps: 0,
    };
  }

  let expectedImpalePerHit = 0;
  const rawPhysAvg = stage4.rawRangesPostScale.Physical.avg;
  if ((queryFlags & ModFlags.Attack) !== 0 && rawPhysAvg > 0) {
    const impaleChancePct = Math.min(
      100,
      Math.max(0, skillModDb.sum('BASE', { names: ['ImpaleChance'], flags: queryFlags, keywordFlags: 0, context })),
    );
    if (impaleChancePct > 0) {
      const impaleEffectIncPct = skillModDb.sum('INC', {
        names: ['ImpaleEffect'],
        flags: queryFlags,
        keywordFlags: 0,
        context,
      });
      const physHitWithCrit = rawPhysAvg * critFactor * returningProjectileHitMultiplier;
      const impaleReflectPerStack = physHitWithCrit * 0.1 * Math.max(0, 1 + impaleEffectIncPct / 100);
      const enemyPhysMit =
        Math.max(0.1, 1 - stage4.enemyPhysicalDrPct / 100) * stage4.takenMultipliers.Physical;
      expectedImpalePerHit = impaleReflectPerStack * 5 * (impaleChancePct / 100) * enemyPhysMit;
    }
  }

  return {
    effectiveCritChancePct: Number(effectiveCritChancePct.toFixed(2)),
    critMultiplierPct: Math.round(critMultiplierPct),
    isLuckyDamage,
    returningProjectileHitMultiplier,
    averageHit,
    expectedImpalePerHit,
    perTypeBreakdown,
  };
}

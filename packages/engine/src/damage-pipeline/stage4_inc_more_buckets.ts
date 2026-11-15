import {
  DAMAGE_TYPES,
  ModFlags,
  type DamageRange,
  type DamageType,
  type EnemyConfigState,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';
import { makeDamageRange } from './stage2_added_damage.js';
import type { DamageChunk } from './stage3_conversion_dag.js';
import { computeStage7EnemyEffectiveResist } from './stage7_enemy_resistances.js';
import { computeStage8EnemyMitigationAndTaken } from './stage8_enemy_pdr_and_taken.js';

export interface Stage4ScaledDamageResult {
  scaledRanges: Record<DamageType, DamageRange>;
  rawRangesPostScale: Record<DamageType, DamageRange>;
  totalIncreasedPctByType: Record<DamageType, number>;
  totalMoreMultiByType: Record<DamageType, number>;
  enemyEffectiveResistPct: Record<DamageType, number>;
  mitigationMultiByType: Record<DamageType, number>;
  enemyPhysicalDrPct: number;
  takenMultipliers: Record<DamageType, number>;
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

function computeEffectiveResistAndMitigation(
  damageType: DamageType,
  rawAverageHit: number,
  enemyConfig: EnemyConfigState,
  skillModDb: ModDB,
  mercLightningUncappedResistPct: number,
  queryFlags: number,
  context: EvalContext,
): { effectiveResistPct: number; mitigationMultiplier: number; takenMultiplier: number } {
  const stage7Resist = computeStage7EnemyEffectiveResist(
    damageType,
    enemyConfig,
    skillModDb,
    mercLightningUncappedResistPct,
    queryFlags,
    context,
  );
  return computeStage8EnemyMitigationAndTaken(
    damageType,
    rawAverageHit,
    stage7Resist,
    enemyConfig,
    queryFlags,
  );
}

/**
 * Stage 4: Applies additive % increased and multiplicative % more modifiers using
 * each chunk's ancestral KeywordFlags bitmask, Volatility min/max attack scaling,
 * and enemy resistance / penetration / Armour / taken damage multipliers.
 */
export function computeStage4IncMoreAndMitigation(
  chunks: readonly DamageChunk[],
  skillModDb: ModDB,
  enemyConfig: EnemyConfigState,
  mercLightningUncappedResistPct: number,
  queryFlags: number,
  context: EvalContext,
): Stage4ScaledDamageResult {
  const minAccum = {} as Record<DamageType, number>;
  const maxAccum = {} as Record<DamageType, number>;
  const incSumByType = {} as Record<DamageType, number>;
  const moreMultiByType = {} as Record<DamageType, number>;
  const chunkWeightByType = {} as Record<DamageType, number>;

  for (const dt of DAMAGE_TYPES) {
    minAccum[dt] = 0;
    maxAccum[dt] = 0;
    incSumByType[dt] = 0;
    moreMultiByType[dt] = 1;
    chunkWeightByType[dt] = 0;
  }

  const isAttack = (queryFlags & ModFlags.Attack) !== 0;

  for (const chunk of chunks) {
    const incPct = skillModDb.sum('INC', {
      names: DAMAGE_STAT_NAMES,
      flags: queryFlags,
      keywordFlags: chunk.ancestralMask,
      context,
    });
    const moreMult = skillModDb.more({
      names: DAMAGE_STAT_NAMES,
      flags: queryFlags,
      keywordFlags: chunk.ancestralMask,
      context,
    });
    const incMult = Math.max(0, 1 + incPct / 100);

    const minAttackMult = isAttack
      ? skillModDb.more({ names: ['MinAttackDamage'], flags: queryFlags, keywordFlags: chunk.ancestralMask, context })
      : 1;
    const maxAttackMult = isAttack
      ? skillModDb.more({ names: ['MaxAttackDamage'], flags: queryFlags, keywordFlags: chunk.ancestralMask, context })
      : 1;

    const scaledA = chunk.range.min * incMult * moreMult * minAttackMult;
    const scaledB = chunk.range.max * incMult * moreMult * maxAttackMult;
    minAccum[chunk.currentType] += Math.min(scaledA, scaledB);
    maxAccum[chunk.currentType] += Math.max(scaledA, scaledB);

    const chunkAvg = (chunk.range.min + chunk.range.max) / 2;
    if (chunkAvg > 0) {
      if (chunkWeightByType[chunk.currentType] === 0) {
        incSumByType[chunk.currentType] = incPct;
        moreMultiByType[chunk.currentType] = moreMult;
      }
      chunkWeightByType[chunk.currentType] += chunkAvg;
    }
  }

  const rawRangesPostScale = {} as Record<DamageType, DamageRange>;
  const scaledRanges = {} as Record<DamageType, DamageRange>;
  const enemyEffectiveResistPct = {} as Record<DamageType, number>;
  const mitigationMultiByType = {} as Record<DamageType, number>;
  const takenMultipliers = {} as Record<DamageType, number>;
  let enemyPhysicalDrPct = 0;

  for (const dt of DAMAGE_TYPES) {
    const raw = makeDamageRange(minAccum[dt], maxAccum[dt]);
    rawRangesPostScale[dt] = raw;

    const mit = computeEffectiveResistAndMitigation(
      dt,
      raw.avg,
      enemyConfig,
      skillModDb,
      mercLightningUncappedResistPct,
      queryFlags,
      context,
    );
    scaledRanges[dt] = makeDamageRange(
      raw.min * mit.mitigationMultiplier,
      raw.max * mit.mitigationMultiplier,
    );
    enemyEffectiveResistPct[dt] = mit.effectiveResistPct;
    mitigationMultiByType[dt] = mit.mitigationMultiplier;
    takenMultipliers[dt] = mit.takenMultiplier;
    if (dt === 'Physical') {
      enemyPhysicalDrPct = mit.effectiveResistPct;
    }
  }

  return {
    scaledRanges,
    rawRangesPostScale,
    totalIncreasedPctByType: incSumByType,
    totalMoreMultiByType: moreMultiByType,
    enemyEffectiveResistPct,
    mitigationMultiByType,
    enemyPhysicalDrPct,
    takenMultipliers,
  };
}

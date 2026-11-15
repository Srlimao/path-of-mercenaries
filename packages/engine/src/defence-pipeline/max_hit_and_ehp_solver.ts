import { KeywordFlags, ModFlags, type DamageType } from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';
import type { DamageTakenConversionResult } from './damage_taken_conversion.js';
import type { MitigationAndAvoidanceResult } from './mitigation_and_avoidance.js';
import type { PoolsAndResistancesResult } from './pools_and_resistances.js';

export interface MaxHitsAndEhpResult {
  maxHitTaken: Record<DamageType, number>;
  effectiveHitPool: number;
  netLifeRecoveryPerSec: number;
}

const EMPTY_CTX: EvalContext = { conditions: {}, stats: {} };

const q = (names: string[]) => ({
  names,
  flags: ModFlags.None,
  keywordFlags: KeywordFlags.None,
  context: EMPTY_CTX,
});

function binarySearchHitSize(
  poolTotal: number,
  computeDamageTaken: (hitSize: number) => number,
): number {
  if (poolTotal <= 0) return 0;
  let low = poolTotal * 0.1;
  let high = Math.max(poolTotal * 50, poolTotal + 100);
  while (computeDamageTaken(high) < poolTotal && high < poolTotal * 500) {
    high *= 2;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (computeDamageTaken(mid) >= poolTotal) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return Math.round((low + high) / 2);
}

/**
 * Solves non-linear Armour Physical Max Hit Taken (accounting for Endurance DR,
 * Fortify, and Phys-Taken-As-Elemental/Chaos), Elemental/Chaos Max Hits
 * (with Doryani's Prototype Armour-to-Lightning rule), EHP, and Net Recovery.
 */
export function computeMaxHitsAndEhp(params: {
  modDb: ModDB;
  pools: PoolsAndResistancesResult;
  conversion: DamageTakenConversionResult;
  mitigation: MitigationAndAvoidanceResult;
}): MaxHitsAndEhpResult {
  const { modDb, pools, conversion, mitigation } = params;
  const { resistances, maxLife, maxEnergyShield, maxWard } = pools;
  const { physTakenAsPct, coldTakenAsFirePct, lightningTakenAsFirePct } = conversion;
  const { armour, enduranceDrPct, fortifyMoreMult, evadeChancePct, attackBlockPct, spellSuppressionPct } =
    mitigation;

  const poolTotal = maxLife + maxEnergyShield + maxWard;
  const fireMitRatio = Math.max(0.05, 1 - resistances.Fire.capped / 100);
  const coldShiftFrac = coldTakenAsFirePct / 100;
  const coldMitRatio =
    (1 - coldShiftFrac) * Math.max(0.05, 1 - resistances.Cold.capped / 100) +
    coldShiftFrac * fireMitRatio;

  const doryaniArmourApplies =
    modDb.flag('DoryaniArmourAppliesToLightning', EMPTY_CTX, 0) ||
    modDb.flag('EnemyLightningResEqualsMerc', EMPTY_CTX, 0);
  const lightShiftFrac = lightningTakenAsFirePct / 100;
  const lightMitRatio = doryaniArmourApplies
    ? 1
    : (1 - lightShiftFrac) * Math.max(0.05, 1 - resistances.Lightning.capped / 100) +
      lightShiftFrac * fireMitRatio;
  const chaosMitRatio = Math.max(0.05, 1 - resistances.Chaos.capped / 100);

  const totalPhysShiftFrac = Math.min(
    1,
    (physTakenAsPct.Fire + physTakenAsPct.Cold + physTakenAsPct.Lightning + physTakenAsPct.Chaos) /
      100,
  );
  const shiftTakenPerUnit =
    (physTakenAsPct.Fire / 100) * fireMitRatio +
    (physTakenAsPct.Cold / 100) * coldMitRatio +
    (physTakenAsPct.Lightning / 100) * lightMitRatio +
    (physTakenAsPct.Chaos / 100) * chaosMitRatio;

  const physMaxHit = binarySearchHitSize(poolTotal, (h) => {
    const rawPhysRem = h * (1 - totalPhysShiftFrac);
    const armourPdr = rawPhysRem > 0 ? armour / (armour + 5 * rawPhysRem) : 0;
    const totalPhysDr = Math.min(0.9, Math.max(0, armourPdr + enduranceDrPct / 100));
    const physTaken = rawPhysRem * (1 - totalPhysDr);
    const convertedTaken = h * shiftTakenPerUnit;
    return (physTaken + convertedTaken) * fortifyMoreMult;
  });

  const fireMaxHit = Math.round(poolTotal / Math.max(0.02, fireMitRatio * fortifyMoreMult));
  const coldMaxHit = Math.round(poolTotal / Math.max(0.02, coldMitRatio * fortifyMoreMult));
  const lightningMaxHit = doryaniArmourApplies
    ? binarySearchHitSize(poolTotal, (h) => {
        const rawLightRem = h * (1 - lightShiftFrac);
        const armourPdr = rawLightRem > 0 ? armour / (armour + 5 * rawLightRem) : 0;
        const directLightTaken = rawLightRem * (1 - Math.min(0.9, armourPdr));
        const shiftedFireTaken = h * lightShiftFrac * fireMitRatio;
        return (directLightTaken + shiftedFireTaken) * fortifyMoreMult;
      })
    : Math.round(poolTotal / Math.max(0.02, lightMitRatio * fortifyMoreMult));
  const chaosMaxHit = Math.round(maxLife / Math.max(0.02, chaosMitRatio * fortifyMoreMult));

  const maxHitTaken: Record<DamageType, number> = {
    Physical: physMaxHit,
    Fire: fireMaxHit,
    Cold: coldMaxHit,
    Lightning: lightningMaxHit,
    Chaos: chaosMaxHit,
  };

  const weightedMaxHit =
    0.5 * maxHitTaken.Physical +
    0.15 * maxHitTaken.Fire +
    0.15 * maxHitTaken.Cold +
    0.15 * maxHitTaken.Lightning +
    0.05 * maxHitTaken.Chaos;
  const avoidDenom = Math.max(
    0.1,
    1 -
      0.5 * (evadeChancePct / 100) * (1 - attackBlockPct / 100) -
      0.5 * (attackBlockPct / 100),
  );
  const suppressionMult = 1 / Math.max(0.5, 1 - 0.25 * (spellSuppressionPct / 100));
  const effectiveHitPool = Math.round((weightedMaxHit / avoidDenom) * suppressionMult);

  const flatLifeRegen = modDb.sum('BASE', q(['LifeRegen']));
  const lifeRegenPct = modDb.sum('BASE', q(['LifeRegenPercent']));
  const netLifeRecoveryPerSec = Math.round(flatLifeRegen + (lifeRegenPct / 100) * maxLife);

  return { maxHitTaken, effectiveHitPool, netLifeRecoveryPerSec };
}

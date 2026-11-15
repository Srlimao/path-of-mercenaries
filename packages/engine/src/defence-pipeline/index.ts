import type { DefenceCalcResult, MercenaryBuildState } from '../catalog-types/index.js';
import type { ModDB } from '../mod-db/index.js';
import { computeDamageTakenConversion } from './damage_taken_conversion.js';
import { computeMaxHitsAndEhp } from './max_hit_and_ehp_solver.js';
import { computeMitigationAndAvoidance } from './mitigation_and_avoidance.js';
import { computePoolsAndResistances } from './pools_and_resistances.js';

/** Executes the full Phase 11 Defensive & Survivability Pipeline for a Mercenary build. */
export function computeDefences(
  buildState: MercenaryBuildState,
  modDb: ModDB,
  hiddenElemResPct: number,
): DefenceCalcResult {
  const pools = computePoolsAndResistances(modDb, hiddenElemResPct);
  const conversion = computeDamageTakenConversion(modDb);
  const mitigation = computeMitigationAndAvoidance(modDb, pools.dex, buildState.enemyConfig);
  const maxHits = computeMaxHitsAndEhp({
    modDb,
    pools,
    conversion,
    mitigation,
  });

  return {
    str: pools.str,
    dex: pools.dex,
    int: pools.int,
    accuracy: pools.accuracy,
    maxLife: pools.maxLife,
    maxEnergyShield: pools.maxEnergyShield,
    maxWard: pools.maxWard,
    armour: mitigation.armour,
    evasion: mitigation.evasion,
    evadeChancePct: mitigation.evadeChancePct,
    attackBlockPct: mitigation.attackBlockPct,
    spellBlockPct: mitigation.spellBlockPct,
    spellSuppressionPct: mitigation.spellSuppressionPct,
    physicalDamageReductionPct: mitigation.physicalDamageReductionPct,
    resistances: pools.resistances,
    physTakenAsPct: conversion.physTakenAsPct,
    maxHitTaken: maxHits.maxHitTaken,
    effectiveHitPool: maxHits.effectiveHitPool,
    netLifeRecoveryPerSec: maxHits.netLifeRecoveryPerSec,
  };
}

export { computePoolsAndResistances, type PoolsAndResistancesResult } from './pools_and_resistances.js';
export { computeDamageTakenConversion, type DamageTakenConversionResult } from './damage_taken_conversion.js';
export { computeMitigationAndAvoidance, type MitigationAndAvoidanceResult } from './mitigation_and_avoidance.js';
export { computeMaxHitsAndEhp, type MaxHitsAndEhpResult } from './max_hit_and_ehp_solver.js';

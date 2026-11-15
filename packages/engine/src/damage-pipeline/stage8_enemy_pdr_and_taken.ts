import {
  ModFlags,
  type DamageType,
  type EnemyConfigState,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';
import {
  CURSE_CATALOG,
  ENEMY_BOSS_PRESETS,
  getCurseEffectivenessScalar,
} from './stage7_enemy_resistances.js';

export interface Stage8MitigationResult {
  effectiveResistPct: number;
  mitigationMultiplier: number;
  takenMultiplier: number;
}

/**
 * Stage 8: Computes Enemy Armour Physical Damage Reduction, Increased Damage Taken
 * modifiers (Shock, Intimidate, Unnerve, Covered in Ash, Withered, Vulnerability,
 * Sniper's Mark, Punishment, Yoke of Suffering), and Uber Pinnacle Boss 0.30x multiplier.
 */
export function computeStage8EnemyMitigationAndTaken(
  damageType: DamageType,
  rawAverageHit: number,
  stage7ResistPct: number,
  enemyConfig: EnemyConfigState,
  queryFlags: number,
  skillModDb?: ModDB,
  context?: EvalContext,
): Stage8MitigationResult {
  const isAttack = (queryFlags & ModFlags.Attack) !== 0;
  const isSpell = (queryFlags & ModFlags.Spell) !== 0;
  const isProj = (queryFlags & ModFlags.Projectile) !== 0;
  const safeCtx: EvalContext = context ?? { conditions: {}, stats: {} };
  const curseScalar = getCurseEffectivenessScalar(enemyConfig, skillModDb, safeCtx);

  let takenIncPct =
    (enemyConfig.shockPct ?? 0) +
    (skillModDb?.sum('BASE', {
      names: ['EnemyDamageTaken'],
      flags: queryFlags,
      keywordFlags: 0,
      context: safeCtx,
    }) ?? 0);
  if (isAttack && enemyConfig.isIntimidated) takenIncPct += 10;
  if (isSpell && enemyConfig.isUnnerved) takenIncPct += 10;
  if (damageType === 'Fire' && enemyConfig.isCoveredInAsh) takenIncPct += 20;
  if (damageType === 'Chaos' && enemyConfig.witherStacks > 0) {
    takenIncPct += Math.min(15, enemyConfig.witherStacks) * 6;
  }

  for (const cid of enemyConfig.activeCurses) {
    const def = CURSE_CATALOG.find((c) => c.id === cid);
    if (!def) continue;
    if (damageType === 'Physical' && def.physTakenIncPct) {
      takenIncPct += def.physTakenIncPct * curseScalar;
    }
    if (isProj && def.projTakenIncPct) {
      takenIncPct += def.projTakenIncPct * curseScalar;
    }
    if (def.allTakenIncPct) {
      takenIncPct += def.allTakenIncPct * curseScalar;
    }
  }

  const preset = ENEMY_BOSS_PRESETS[enemyConfig.presetId] ?? ENEMY_BOSS_PRESETS.pinnacle;
  const takenMultiplier =
    Math.max(0.1, 1 + takenIncPct / 100) * preset.damageTakenMultiplier;

  if (damageType === 'Physical') {
    const enemyArmour = Math.max(0, enemyConfig.armour);
    const pdr =
      rawAverageHit > 0
        ? Math.min(0.9, enemyArmour / (enemyArmour + 5 * rawAverageHit))
        : 0;
    return {
      effectiveResistPct: Math.round(pdr * 100),
      mitigationMultiplier: (1 - pdr) * takenMultiplier,
      takenMultiplier,
    };
  }

  return {
    effectiveResistPct: stage7ResistPct,
    mitigationMultiplier: Math.max(0, 1 - stage7ResistPct / 100) * takenMultiplier,
    takenMultiplier,
  };
}

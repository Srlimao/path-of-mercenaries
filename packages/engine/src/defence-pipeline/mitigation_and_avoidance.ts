import { KeywordFlags, ModFlags, type EnemyConfigState } from '../catalog-types/index.js';
import { computeAttackHitChancePct } from '../damage-pipeline/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';

export interface MitigationAndAvoidanceResult {
  armour: number;
  evasion: number;
  evadeChancePct: number;
  attackBlockPct: number;
  spellBlockPct: number;
  spellSuppressionPct: number;
  enduranceDrPct: number;
  fortifyMoreMult: number;
  physicalDamageReductionPct: number;
}

const EMPTY_CTX: EvalContext = { conditions: {}, stats: {} };

const q = (names: string[]) => ({
  names,
  flags: ModFlags.None,
  keywordFlags: KeywordFlags.None,
  context: EMPTY_CTX,
});

/** Computes Armour PDR, Evasion/Evade%, Attack/Spell Block, Spell Suppression, and Fortify DR. */
export function computeMitigationAndAvoidance(
  modDb: ModDB,
  dex: number,
  enemyConfig: EnemyConfigState,
): MitigationAndAvoidanceResult {
  const armour = Math.round(
    modDb.sum('BASE', q(['Armour'])) * Math.max(0, 1 + modDb.sum('INC', q(['Armour'])) / 100),
  );
  const evasion = Math.round(
    modDb.sum('BASE', q(['Evasion'])) *
      Math.max(0, 1 + (modDb.sum('INC', q(['Evasion'])) + dex / 5) / 100),
  );
  const attackBlockPct = Math.min(75, Math.max(0, Math.round(modDb.sum('BASE', q(['AttackBlockChance'])))));
  const spellBlockPct = Math.min(75, Math.max(0, Math.round(modDb.sum('BASE', q(['SpellBlockChance'])))));
  const spellSuppressionPct = Math.min(
    100,
    Math.max(0, Math.round(modDb.sum('BASE', q(['SpellSuppressionChance'])))),
  );

  const enemyAcc = Math.round(200 + Math.pow(Math.max(1, enemyConfig.level), 1.85) * 0.45);
  const hitPct = computeAttackHitChancePct(enemyAcc, evasion, false);
  const evadeChancePct = Math.max(0, Math.min(95, 100 - hitPct));

  const enduranceDrPct = Math.round(modDb.sum('BASE', q(['PhysicalDamageReduction'])));
  const fortifyMoreMult = modDb.more(q(['DamageTakenFromHits']));

  const enemyPhysHit = Math.max(100, enemyConfig.physicalHitSize || 3500);
  const armourPdr = armour / (armour + 5 * enemyPhysHit);
  const totalPdr = Math.min(0.9, Math.max(0, armourPdr + enduranceDrPct / 100));

  return {
    armour,
    evasion,
    evadeChancePct,
    attackBlockPct,
    spellBlockPct,
    spellSuppressionPct,
    enduranceDrPct,
    fortifyMoreMult,
    physicalDamageReductionPct: Math.round(totalPdr * 100),
  };
}

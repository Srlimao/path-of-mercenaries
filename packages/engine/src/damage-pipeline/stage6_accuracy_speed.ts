import {
  DAMAGE_TYPES,
  ModFlags,
  type MercenaryBuildState,
  type MercenarySkillDefinition,
  type SkillPartCalcResult,
  type SkillPartDefinition,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';
import type { Stage2AddedDamageResult } from './stage2_added_damage.js';
import type { Stage5CritAndHitResult } from './stage5_crit_lucky_multihit.js';

/** Computes PoE Attack Hit Chance (5%-100%) from Mercenary Accuracy vs Enemy Evasion. */
export function computeAttackHitChancePct(
  accuracy: number,
  enemyEvasion: number,
  cantBeEvaded: boolean,
): number {
  if (cantBeEvaded) return 100;
  const safeAcc = Math.max(1, accuracy);
  const safeEva = Math.max(0, enemyEvasion);
  if (safeEva === 0) return 100;
  const denom = safeAcc + Math.pow(safeEva / 5, 0.9);
  const rawPct = denom > 0 ? ((1.25 * safeAcc) / denom) * 100 : 100;
  return Math.max(5, Math.min(100, Math.round(rawPct)));
}

/**
 * Stage 6: Combines Accuracy Hit Chance, Attack/Cast Speed modifiers, and
 * Stage 5 Expected Average Hit + Impale to produce a complete SkillPartCalcResult.
 */
export function computeStage6AccuracyAndSpeed(
  groupId: string,
  skill: MercenarySkillDefinition,
  part: SkillPartDefinition,
  stage2: Stage2AddedDamageResult,
  stage5: Stage5CritAndHitResult,
  skillModDb: ModDB,
  accuracy: number,
  buildState: MercenaryBuildState,
  queryFlags: number,
  context: EvalContext,
  includeInFullDps: boolean,
  hitCountMultiplier: number,
): SkillPartCalcResult {
  const cantBeEvaded = skillModDb.flag('HitsCantBeEvaded', context, queryFlags);
  const hitChancePct = part.isAttack
    ? computeAttackHitChancePct(accuracy, buildState.enemyConfig.evasion, cantBeEvaded)
    : 100;

  const speedFlag = part.isAttack ? ModFlags.Attack : ModFlags.Spell;
  const speedIncPct = skillModDb.sum('INC', {
    names: ['Speed'],
    flags: queryFlags | speedFlag,
    keywordFlags: 0,
    context,
  });
  const speedMoreMult = skillModDb.more({
    names: ['Speed'],
    flags: queryFlags | speedFlag,
    keywordFlags: 0,
    context,
  });

  const baseRate = 1 / stage2.baseActionTimeSec;
  const partSpeedMulti = part.isAttack ? (part.attackSpeedMulti ?? 1) : 1;
  const effectiveActionRate = Number(
    (baseRate * partSpeedMulti * Math.max(0.1, 1 + speedIncPct / 100) * speedMoreMult).toFixed(2),
  );

  const hitChanceFactor = hitChancePct / 100;
  const hitDps = stage5.averageHit * hitChanceFactor * effectiveActionRate;
  const impaleDps = stage5.expectedImpalePerHit * hitChanceFactor * effectiveActionRate;
  const partBaseDps = hitDps + impaleDps;
  const partFullDpsContribution = includeInFullDps
    ? partBaseDps * Math.max(0, hitCountMultiplier)
    : 0;

  const perTypeBreakdown = { ...stage5.perTypeBreakdown };
  for (const dt of DAMAGE_TYPES) {
    const entry = perTypeBreakdown[dt];
    perTypeBreakdown[dt] = {
      ...entry,
      hitDps: Number((entry.finalAverageHit * hitChanceFactor * effectiveActionRate).toFixed(1)),
    };
  }

  return {
    groupId,
    skillId: skill.id,
    skillName: skill.name,
    partId: part.id,
    partLabel: part.label,
    effectiveSkillLevel: stage2.effectiveSkillLevel,
    hitChancePct,
    effectiveCritChancePct: stage5.effectiveCritChancePct,
    critMultiplierPct: stage5.critMultiplierPct,
    effectiveActionRate,
    isLuckyDamage: stage5.isLuckyDamage,
    averageHit: Number(stage5.averageHit.toFixed(1)),
    hitDps: Number(hitDps.toFixed(1)),
    impaleDps: Number(impaleDps.toFixed(1)),
    igniteDps: 0,
    bleedDps: 0,
    poisonDps: 0,
    partFullDpsContribution: Number(partFullDpsContribution.toFixed(1)),
    perTypeBreakdown,
  };
}

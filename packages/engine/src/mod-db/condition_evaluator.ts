import type { EvalContext, ModCondition } from './mod_types.js';

export interface ConditionEvaluation {
  active: boolean;
  scalarMultiplier: number;
}

/**
 * Evaluates all conditions on a Mod against the current EvalContext.
 * Returns active=false if any predicate fails, plus any PerStat scalar factor.
 */
export function evaluateModConditions(
  conditions: ModCondition[] | undefined,
  context: EvalContext,
): ConditionEvaluation {
  if (!conditions || conditions.length === 0) {
    return { active: true, scalarMultiplier: 1 };
  }

  let scalarMultiplier = 1;

  for (const cond of conditions) {
    if (cond.type === 'Condition') {
      const flagVal = Boolean(context.conditions[cond.varName]);
      const matched = cond.negated ? !flagVal : flagVal;
      if (!matched) return { active: false, scalarMultiplier: 0 };
      continue;
    }

    if (cond.type === 'SkillTag') {
      const hasTag = (context.skillTags ?? []).includes(cond.varName);
      const matched = cond.negated ? !hasTag : hasTag;
      if (!matched) return { active: false, scalarMultiplier: 0 };
      continue;
    }

    if (cond.type === 'StatThreshold') {
      const statVal = context.stats[cond.varName] ?? 0;
      const aboveMin = cond.min === undefined || statVal >= cond.min;
      const belowMax = cond.max === undefined || statVal <= cond.max;
      const matched = cond.negated ? !(aboveMin && belowMax) : aboveMin && belowMax;
      if (!matched) return { active: false, scalarMultiplier: 0 };
      continue;
    }

    if (cond.type === 'PerStat') {
      const rawStat = context.stats[cond.varName] ?? 0;
      const clampedStat = cond.max !== undefined ? Math.min(rawStat, cond.max) : rawStat;
      const divisor = cond.divisor && cond.divisor > 0 ? cond.divisor : 1;
      const steps = Math.floor(Math.max(0, clampedStat) / divisor);
      if (steps <= 0) return { active: false, scalarMultiplier: 0 };
      scalarMultiplier *= steps;
    }
  }

  return { active: true, scalarMultiplier };
}

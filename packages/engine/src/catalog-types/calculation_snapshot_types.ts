import type { DamageType } from './damage_and_flag_types.js';

export interface DamageRange {
  min: number;
  max: number;
  avg: number;
}

export interface PerTypeDamageBreakdown {
  damageType: DamageType;
  baseDamage: DamageRange;
  addedAfterEffectiveness: DamageRange;
  convertedOutPct: number;
  gainedAsExtra: DamageRange;
  totalIncreasedPct: number;
  totalMoreMulti: number;
  preMitigationHit: DamageRange;
  effectivePreMitigationAvg: number;
  enemyEffectiveResistPct: number;
  mitigationMulti: number;
  finalAverageHit: number;
  hitDps: number;
}

export interface StatSourceAttribution {
  sourceLabel: string;
  sourceType: string;
  modType: 'BASE' | 'INC' | 'MORE' | 'OVERRIDE' | 'FLAG';
  resolvedValue: number;
  rawLine: string;
}

export interface CalcBreakdownRow {
  rowId: string;
  label: string;
  valuesByType: Partial<Record<DamageType | 'Total', string | number>>;
  tabulateQueryName?: string;
}

export interface SkillPartCalcResult {
  groupId: string;
  skillId: string;
  skillName: string;
  partId: string;
  partLabel: string;
  effectiveSkillLevel: number;
  hitChancePct: number;
  effectiveCritChancePct: number;
  critMultiplierPct: number;
  effectiveActionRate: number;
  isLuckyDamage: boolean;
  averageHit: number;
  hitDps: number;
  impaleDps: number;
  igniteDps: number;
  bleedDps: number;
  poisonDps: number;
  partFullDpsContribution: number;
  perTypeBreakdown: Record<DamageType, PerTypeDamageBreakdown>;
}

export interface DefenceCalcResult {
  str: number;
  dex: number;
  int: number;
  accuracy: number;
  maxLife: number;
  maxEnergyShield: number;
  maxWard: number;
  armour: number;
  evasion: number;
  evadeChancePct: number;
  attackBlockPct: number;
  spellBlockPct: number;
  spellSuppressionPct: number;
  physicalDamageReductionPct: number;
  resistances: Record<
    'Fire' | 'Cold' | 'Lightning' | 'Chaos',
    { capped: number; uncapped: number; maxCap: number; hiddenBaselinePct: number }
  >;
  physTakenAsPct: Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', number>;
  maxHitTaken: Record<DamageType, number>;
  effectiveHitPool: number;
  netLifeRecoveryPerSec: number;
}

export interface CalculationResultSnapshot {
  archetypeId: string;
  archetypeName: string;
  mercLevel: number;
  derivedSkillLevel: number;
  combinedFullDps: number;
  activeSkillDps: number;
  activePartResult: SkillPartCalcResult | null;
  skillResults: SkillPartCalcResult[];
  defences: DefenceCalcResult;
  calcsRows: CalcBreakdownRow[];
  warnings: string[];
}

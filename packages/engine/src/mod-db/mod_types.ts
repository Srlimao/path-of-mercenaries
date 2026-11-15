export type ModType = 'BASE' | 'INC' | 'MORE' | 'OVERRIDE' | 'FLAG';

export interface ModSource {
  sourceType:
    | 'Archetype'
    | 'Item'
    | 'Skill'
    | 'Support'
    | 'PartyLink'
    | 'PartyAura'
    | 'Config'
    | 'Enemy'
    | 'Custom';
  sourceId: string;
  sourceLabel: string;
  rawLine: string;
}

export interface ModCondition {
  type: 'Condition' | 'StatThreshold' | 'PerStat' | 'SkillTag';
  varName: string;
  negated?: boolean;
  min?: number;
  max?: number;
  divisor?: number;
}

export interface Mod {
  name: string;
  type: ModType;
  value: number | boolean;
  /** Every bit in mod.flags must be present in query.flags. */
  flags: number;
  /** If non-zero, at least one bit in mod.keywordFlags must be present in query.keywordFlags. */
  keywordFlags: number;
  conditions?: ModCondition[];
  source: ModSource;
}

export interface EvalContext {
  conditions: Record<string, boolean>;
  stats: Record<string, number>;
  skillTags?: string[];
}

export interface ModQuery {
  names: string[];
  flags: number;
  keywordFlags: number;
  context: EvalContext;
}

export interface TabulatedModEntry {
  sourceLabel: string;
  sourceType: ModSource['sourceType'];
  sourceId: string;
  rawLine: string;
  modType: ModType;
  resolvedValue: number;
}

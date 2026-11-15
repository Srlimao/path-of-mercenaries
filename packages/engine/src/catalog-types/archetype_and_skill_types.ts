import type { DamageType, EquipmentSlot } from './damage_and_flag_types.js';

export type AttributeAffinity =
  | 'STR'
  | 'DEX'
  | 'INT'
  | 'STR_DEX'
  | 'STR_INT'
  | 'DEX_INT'
  | 'STR_DEX_INT';

export interface MercenaryLevelStatRow {
  level: number;
  baseLife: number;
  baseAccuracy: number;
  baseEvasion: number;
  baseStr: number;
  baseDex: number;
  baseInt: number;
  /** Hidden Mercenary elemental resistance bonus (+35% at level 80+). */
  hiddenElemResPct: number;
  /** Mapped internal skill level (1-40) for this Mercenary level (1-85). */
  defaultSkillLevel: number;
}

export interface MercenaryArchetype {
  id: string;
  name: string;
  isInfamous: boolean;
  attributeAffinity: AttributeAffinity;
  allowedMainHandClasses: string[];
  allowedOffHandClasses: string[];
  canDualWield: boolean;
  statsByLevel: Record<number, MercenaryLevelStatRow>;
  innateMods: string[];
  skillPool: {
    primary: string[];
    secondary: string[];
    utility: string[];
  };
}

export type DamageRangeTuple = [number, number];

export interface SkillPartDefinition {
  id: string;
  label: string;
  defaultFullDpsCount: number;
  isSpell: boolean;
  isAttack: boolean;
  skillModFlags: number;
  skillKeywordFlags: number;
  damageEffectiveness: number;
  baseAttackTimeOverrideSec?: number;
  baseCastTimeSec?: number;
  attackSpeedMulti?: number;
  baseCritChancePct?: number;
  weaponDamageMultiplierPctByLevel: Record<number, number>;
  baseAddedDamageByLevel: Record<number, Partial<Record<DamageType, DamageRangeTuple>>>;
  inherentConversion?: Partial<Record<DamageType, Partial<Record<DamageType, number>>>>;
  partMods: string[];
}

export interface MercenarySkillDefinition {
  id: string;
  name: string;
  category: 'PRIMARY' | 'SECONDARY' | 'UTILITY';
  tags: string[];
  maxSupports: number;
  parts: SkillPartDefinition[];
}

export interface SupportGemDefinition {
  id: string;
  name: string;
  requiredSkillTags: string[];
  excludedSkillTags?: string[];
  manaMultiplierPct: number;
  modsByLevel: Record<number, string[]>;
}

export interface BaseItemDefinition {
  id: string;
  name: string;
  itemClass: string;
  validSlots: EquipmentSlot[];
  isTwoHanded?: boolean;
  weaponStats?: {
    physMin: number;
    physMax: number;
    aps: number;
    critChancePct: number;
  };
  armourStats?: {
    armour?: number;
    evasion?: number;
    energyShield?: number;
    ward?: number;
    blockPct?: number;
  };
  implicits: string[];
}

export interface UniqueItemDefinition {
  id: string;
  name: string;
  baseType: string;
  itemClass: string;
  validSlots: EquipmentSlot[];
  isMercMeta: boolean;
  uniqueHandlerId?: string;
  implicits: string[];
  explicits: string[];
  flavourText?: string;
}

import type { DamageType, EquipmentSlot, ItemRarity } from './damage_and_flag_types.js';

export type ItemModTierType = 'implicit' | 'explicit' | 'crafted' | 'fractured' | 'enchant';

export interface ItemModLine {
  rawText: string;
  tierType: ItemModTierType;
  isLocal?: boolean;
}

export interface WeaponLocalStats {
  physMin: number;
  physMax: number;
  eleMin: Partial<Record<DamageType, number>>;
  eleMax: Partial<Record<DamageType, number>>;
  aps: number;
  critChancePct: number;
  physDps: number;
  eleDps: number;
  totalDps: number;
}

export interface ArmourLocalStats {
  armour: number;
  evasion: number;
  energyShield: number;
  ward: number;
  blockPct: number;
}

export interface ParsedItem {
  id: string;
  name: string;
  baseType: string;
  itemClass: string;
  rarity: ItemRarity;
  validSlots: EquipmentSlot[];
  isTwoHanded?: boolean;
  qualityPct: number;
  catalystType?: 'Physical' | 'Elemental' | 'Caster' | 'Attack' | 'Defence';
  corrupted: boolean;
  uniqueId?: string;
  uniqueHandlerId?: string;
  modLines: ItemModLine[];
  rawClipboardText?: string;
  localWeaponStats?: WeaponLocalStats;
  localArmourStats?: ArmourLocalStats;
}

export interface EquippedSupportSlot {
  supportId: string;
  level: number;
  enabled: boolean;
}

export interface FullDpsPartEntry {
  partId: string;
  includeInFullDps: boolean;
  hitCountMultiplier: number;
}

export interface SkillGroupSetup {
  groupId: string;
  slotCategory: 'PRIMARY' | 'SECONDARY' | 'UTILITY';
  skillId: string;
  skillLevelOverride?: number;
  activePartId: string;
  enabled: boolean;
  supports: EquippedSupportSlot[];
  fullDpsParts: FullDpsPartEntry[];
}

export interface PartyLinkConfig {
  flameLink: { enabled: boolean; gemLevel: number; playerMaxLife: number; linkEffectPct: number };
  destructiveLink: { enabled: boolean; gemLevel: number; playerMainHandCritPct: number };
  intuitiveLink: { enabled: boolean; blockPct: number; spellBlockPct: number };
}

export interface PartyAuraEntry {
  enabled: boolean;
  level: number;
}

export interface PartyConfigState {
  links: PartyLinkConfig;
  globalPlayerAuraEffectPct: number;
  generositySupported: boolean;
  auras: Record<string, PartyAuraEntry>;
  pyroclastMineCount: number;
  smiteEnabled: boolean;
  combatConditions: {
    powerCharges: number;
    frenzyCharges: number;
    enduranceCharges: number;
    onslaught: boolean;
    tailwind: boolean;
    adrenaline: boolean;
    fortifyStacks: number;
    projectileDistance: number;
    crownSocketColor?: 'Red' | 'Green' | 'Blue' | 'White';
  };
  customModifierLines: string[];
}

export type EnemyPresetId = 'standard' | 'map_boss' | 'pinnacle' | 'uber_pinnacle';

export interface EnemyConfigState {
  presetId: EnemyPresetId;
  level: number;
  baseResistsPct: Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', number>;
  armour: number;
  evasion: number;
  physicalHitSize: number;
  curseEffectPct: number;
  activeCurses: string[];
  exposurePct: Partial<Record<'Fire' | 'Cold' | 'Lightning', number>>;
  witherStacks: number;
  shockPct: number;
  scorchPct: number;
  brittlePct: number;
  isChilled: boolean;
  isFrozen: boolean;
  isIgnited: boolean;
  isBleeding: boolean;
  isPoisoned: boolean;
  isIntimidated: boolean;
  isUnnerved: boolean;
  isCoveredInAsh: boolean;
}

export interface MercenaryBuildState {
  buildName: string;
  archetypeId: string;
  mercLevel: number;
  activeSkillGroupId: string;
  showAllSkillsSandbox: boolean;
  equippedItems: Partial<Record<EquipmentSlot, ParsedItem>>;
  skillGroups: SkillGroupSetup[];
  partyConfig: PartyConfigState;
  enemyConfig: EnemyConfigState;
}

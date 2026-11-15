/** Core Path of Exile damage types ordered by conversion DAG priority. */
export const DAMAGE_TYPES = ['Physical', 'Lightning', 'Cold', 'Fire', 'Chaos'] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

/**
 * Bitmask identifying skill delivery, weapon class, and hit/dot classification.
 * Used by ModDB to filter modifiers with exact PoB tag parity.
 */
export enum ModFlags {
  None       = 0,
  Attack     = 1 << 0,
  Spell      = 1 << 1,
  Melee      = 1 << 2,
  Projectile = 1 << 3,
  Area       = 1 << 4,
  Hit        = 1 << 5,
  Dot        = 1 << 6,
  Ailment    = 1 << 7,
  Wand       = 1 << 8,
  Bow        = 1 << 9,
  Sword      = 1 << 10,
  Axe        = 1 << 11,
  Mace       = 1 << 12,
  Staff      = 1 << 13,
  Claw       = 1 << 14,
  Dagger     = 1 << 15,
  DualWield  = 1 << 16,
  TwoHanded  = 1 << 17,
  Shield     = 1 << 18,
}

/**
 * Bitmask identifying elemental, physical, chaos, crit, and ailment keywords.
 * Converted damage chunks carry ancestral KeywordFlags across conversion steps.
 */
export enum KeywordFlags {
  None      = 0,
  Physical  = 1 << 0,
  Lightning = 1 << 1,
  Cold      = 1 << 2,
  Fire      = 1 << 3,
  Chaos     = 1 << 4,
  Elemental = (1 << 1) | (1 << 2) | (1 << 3),
  Crit      = 1 << 5,
  Impale    = 1 << 6,
  Bleed     = 1 << 7,
  Ignite    = 1 << 8,
  Poison    = 1 << 9,
  Aura      = 1 << 10,
  Curse     = 1 << 11,
}

/** Standard 10-slot Mercenary equipment paperdoll slots. */
export const EQUIPMENT_SLOTS = [
  'Weapon1',
  'Weapon2',
  'Helmet',
  'BodyArmour',
  'Gloves',
  'Boots',
  'Amulet',
  'Ring1',
  'Ring2',
  'Belt',
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export type ItemRarity = 'Normal' | 'Magic' | 'Rare' | 'Unique';

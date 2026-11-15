import type {
  AttributeAffinity,
  MercenaryArchetype,
  TrarthanHouse,
} from '../catalog-types/index.js';
import { buildMercenaryLevelCurve } from './level_stat_curve_builder.js';
import poedbDump from './poedb_mercenaries_dump.json';

const INNATE_MODS_BY_ID: Record<string, string[]> = {
  kineticist: ['20% increased Projectile Damage', '10% increased Attack Speed'],
  infamous_kineticist: [
    '35% increased Projectile Damage',
    '15% increased Attack Speed',
    '25% increased Critical Strike Chance',
  ],
  blademaster: ['20% increased Melee Physical Damage', '15% increased Attack Speed'],
  infamous_blademaster: [
    '35% increased Melee Physical Damage',
    '20% increased Attack Speed',
    '15% chance to Impale Enemies on Hit with Attacks',
  ],
  cruel_mistress: ['25% increased Chaos Damage', '15% increased Cast Speed'],
  infamous_cruel_mistress: [
    '40% increased Chaos Damage',
    '20% increased Cast Speed',
    '15% increased Effect of Withered',
  ],
  sniper: ['25% increased Projectile Damage', '20% increased Accuracy Rating'],
  infamous_sniper: [
    '40% increased Projectile Damage',
    '30% increased Accuracy Rating',
    '25% increased Critical Strike Multiplier',
  ],
  warpriest: ['25% increased Elemental Damage', '15% increased Area of Effect'],
  infamous_warpriest: [
    '40% increased Elemental Damage',
    '25% increased Area of Effect',
    '15% increased Effect of Non-Curse Auras',
  ],
  earthshaker: ['25% increased Physical Damage', '15% increased Maximum Life'],
  infamous_earthshaker: [
    '40% increased Physical Damage',
    '20% increased Maximum Life',
    '20% increased Stun Duration on Enemies',
  ],
};

function defaultInnateMods(affinity: AttributeAffinity, isInfamous: boolean): string[] {
  const boost = isInfamous ? 35 : 20;
  switch (affinity) {
    case 'STR':
      return [`${boost}% increased Physical Damage`, `${isInfamous ? 20 : 12}% increased Maximum Life`];
    case 'DEX':
      return [`${boost}% increased Projectile Damage`, `${isInfamous ? 18 : 10}% increased Attack Speed`];
    case 'INT':
      return [`${boost}% increased Spell Damage`, `${isInfamous ? 20 : 12}% increased Cast Speed`];
    case 'STR_DEX':
      return [`${boost}% increased Attack Damage`, `${isInfamous ? 18 : 10}% increased Attack Speed`];
    case 'STR_INT':
      return [`${boost}% increased Elemental Damage`, `${isInfamous ? 20 : 12}% increased Area of Effect`];
    case 'DEX_INT':
      return [`${boost}% increased Damage`, `${isInfamous ? 30 : 20}% increased Critical Strike Chance`];
    case 'STR_DEX_INT':
      return [`${boost}% increased Damage`, `${isInfamous ? 15 : 10}% increased Attack Speed`];
  }
}

const LEGACY_ARCHETYPES: MercenaryArchetype[] = [
  {
    id: 'blademaster',
    name: 'Blademaster (Legacy Preset)',
    isInfamous: false,
    trarthanHouse: 'Azadi',
    attributeAffinity: 'STR_DEX',
    allowedMainHandClasses: ['One Hand Sword', 'Thrusting One Hand Sword', 'Two Hand Sword'],
    allowedOffHandClasses: ['One Hand Sword', 'Thrusting One Hand Sword', 'Shield'],
    canDualWield: true,
    statsByLevel: buildMercenaryLevelCurve('STR_DEX', 1.0),
    innateMods: INNATE_MODS_BY_ID.blademaster!,
    skillPool: {
      primary: ['reave', 'double_strike_of_impaling'],
      secondary: ['double_strike_of_impaling', 'reave'],
      utility: ['grace_mercenary', 'haste_mercenary'],
    },
  },
  {
    id: 'infamous_blademaster',
    name: 'Infamous Blademaster (Legacy Preset)',
    isInfamous: true,
    trarthanHouse: 'Azadi',
    attributeAffinity: 'STR_DEX',
    allowedMainHandClasses: ['One Hand Sword', 'Thrusting One Hand Sword', 'Two Hand Sword'],
    allowedOffHandClasses: ['One Hand Sword', 'Thrusting One Hand Sword', 'Shield'],
    canDualWield: true,
    statsByLevel: buildMercenaryLevelCurve('STR_DEX', 1.12),
    innateMods: INNATE_MODS_BY_ID.infamous_blademaster!,
    skillPool: {
      primary: ['reave', 'double_strike_of_impaling'],
      secondary: ['double_strike_of_impaling', 'reave'],
      utility: ['grace_mercenary', 'haste_mercenary'],
    },
  },
];

const POEDB_ARCHETYPES: MercenaryArchetype[] = poedbDump.archetypes.map((raw) => {
  const affinity = raw.attributeAffinity as AttributeAffinity;
  return {
    id: raw.id,
    name: raw.name,
    isInfamous: raw.isInfamous,
    trarthanHouse: raw.trarthanHouse as TrarthanHouse | undefined,
    attributeAffinity: affinity,
    allowedMainHandClasses: raw.allowedMainHandClasses,
    allowedOffHandClasses: raw.allowedOffHandClasses,
    canDualWield: raw.canDualWield,
    statsByLevel: buildMercenaryLevelCurve(affinity, raw.isInfamous ? 1.12 : 1.0),
    innateMods: INNATE_MODS_BY_ID[raw.id] ?? defaultInnateMods(affinity, raw.isInfamous),
    skillPool: raw.skillPool,
  };
});

const POEDB_IDS = new Set(POEDB_ARCHETYPES.map((a) => a.id));

export const SEED_ARCHETYPES: MercenaryArchetype[] = [
  ...POEDB_ARCHETYPES,
  ...LEGACY_ARCHETYPES.filter((a) => !POEDB_IDS.has(a.id)),
];

import type { SupportGemDefinition } from '../catalog-types/index.js';

function buildScaledMods(
  lv1: number,
  lv20: number,
  lv40: number,
  formatter: (val: number) => string[],
): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  for (let lv = 1; lv <= 40; lv += 1) {
    const val =
      lv <= 20
        ? Math.round(lv1 + ((lv - 1) / 19) * (lv20 - lv1))
        : Math.round(lv20 + ((lv - 20) / 20) * (lv40 - lv20));
    map[lv] = formatter(val);
  }
  return map;
}

export const SEED_SUPPORT_GEMS: SupportGemDefinition[] = [
  {
    id: 'awakened_elemental_damage_with_attacks',
    name: 'Awakened Elemental Damage with Attacks',
    requiredSkillTags: ['Attack'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(25, 39, 54, (v) => [
      `Supported Skills deal ${v}% more Elemental Damage with Attack Skills`,
    ]),
  },
  {
    id: 'volatility',
    name: 'Volatility Support',
    requiredSkillTags: ['Attack'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(45, 79, 98, (v) => [
      `Supported Skills deal ${v}% more Maximum Attack Damage`,
      'Supported Skills deal 30% less Minimum Attack Damage',
    ]),
  },
  {
    id: 'inspiration',
    name: 'Inspiration Support',
    requiredSkillTags: ['Attack', 'Spell'],
    manaMultiplierPct: 120,
    modsByLevel: buildScaledMods(15, 25, 38, (v) => [
      `Supported Skills deal ${v}% more Elemental Damage`,
      'Supported Skills have 40% increased Critical Strike Chance',
    ]),
  },
  {
    id: 'increased_critical_damage',
    name: 'Increased Critical Damage Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(75, 138, 175, (v) => [
      `+${v}% to Critical Strike Multiplier`,
    ]),
  },
  {
    id: 'increased_critical_strikes',
    name: 'Increased Critical Strikes Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 120,
    modsByLevel: buildScaledMods(60, 118, 150, (v) => [
      '+2.0% to Critical Strike Chance',
      `Supported Skills have ${v}% increased Critical Strike Chance`,
    ]),
  },
  {
    id: 'returning_projectiles',
    name: 'Returning Projectiles Support',
    requiredSkillTags: ['Projectile'],
    manaMultiplierPct: 140,
    modsByLevel: buildScaledMods(65, 61, 51, (v) => [
      `Returning Projectiles deal ${v}% less Damage`,
    ]),
  },
  {
    id: 'added_lightning_damage',
    name: 'Added Lightning Damage Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(12, 340, 810, (maxVal) => [
      `Adds ${Math.max(1, Math.round(maxVal * 0.06))} to ${maxVal} Lightning Damage`,
    ]),
  },
  {
    id: 'added_cold_damage',
    name: 'Added Cold Damage Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(16, 225, 520, (maxVal) => [
      `Adds ${Math.round(maxVal * 0.67)} to ${maxVal} Cold Damage`,
    ]),
  },
  {
    id: 'added_fire_damage',
    name: 'Added Fire Damage Support',
    requiredSkillTags: ['Physical'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(25, 44, 62, (v) => [
      `Gain ${v}% of Physical Damage as Extra Fire Damage`,
    ]),
  },
  {
    id: 'damage_on_full_life',
    name: 'Damage on Full Life Support',
    requiredSkillTags: ['Attack'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(30, 49, 64, (v) => [
      `Supported Skills deal ${v}% more Damage with Attacks while on Full Life`,
    ]),
  },
  {
    id: 'multistrike',
    name: 'Multistrike Support',
    requiredSkillTags: ['Melee'],
    manaMultiplierPct: 150,
    modsByLevel: buildScaledMods(25, 44, 58, (v) => [
      `Supported Skills have ${v}% more Attack Speed`,
      'Supported Skills deal 10% less Attack Damage',
    ]),
  },
  {
    id: 'trinity',
    name: 'Trinity Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(18, 30, 42, (v) => [
      `Supported Skills deal ${v}% more Elemental Damage`,
      'Supported Skills Penetrate 16% Elemental Resistances',
    ]),
  },
  {
    id: 'lightning_penetration',
    name: 'Lightning Penetration Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(18, 37, 50, (v) => [
      `Damage Penetrates ${v}% Lightning Resistance`,
    ]),
  },
  {
    id: 'impale_support',
    name: 'Impale Support',
    requiredSkillTags: ['Attack'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(10, 19, 29, (v) => [
      '40% chance to Impale Enemies on Hit with Attacks',
      `${v}% more Physical Damage`,
      '59% increased Impale Effect',
    ]),
  },
  {
    id: 'brutality',
    name: 'Brutality Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(40, 59, 75, (v) => [
      `Supported Skills deal ${v}% more Physical Damage`,
      'Supported Skills deal no Elemental or Chaos Damage',
    ]),
  },
  {
    id: 'spell_echo',
    name: 'Spell Echo Support',
    requiredSkillTags: ['Spell'],
    manaMultiplierPct: 150,
    modsByLevel: buildScaledMods(35, 54, 69, (v) => [
      `Supported Skills have ${v}% more Cast Speed`,
      'Supported Skills deal 10% less Damage',
    ]),
  },
  {
    id: 'deadly_ailments',
    name: 'Deadly Ailments Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(45, 64, 82, (v) => [
      `Supported Skills deal ${v}% more Damage with Ailments`,
      'Supported Skills deal 80% less Damage with Hits',
    ]),
  },
  {
    id: 'unbound_ailments',
    name: 'Unbound Ailments Support',
    requiredSkillTags: ['Hit'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(30, 54, 72, (v) => [
      `Supported Skills deal ${v}% more Damage with Ailments`,
      '40% increased Duration of Ailments on Enemies',
    ]),
  },
  {
    id: 'vicious_projectiles',
    name: 'Vicious Projectiles Support',
    requiredSkillTags: ['Projectile'],
    manaMultiplierPct: 130,
    modsByLevel: buildScaledMods(30, 49, 64, (v) => [
      `Supported Skills deal ${v}% more Physical Projectile Attack Damage`,
      `Supported Skills deal ${v}% more Damage with Poison and Bleeding caused by Projectile Hits`,
      '10% less Attack Speed',
    ]),
  },
];

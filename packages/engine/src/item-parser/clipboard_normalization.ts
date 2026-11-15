import type { ItemModTierType } from '../catalog-types/index.js';

export const ITEM_CLASS_ALIASES: Record<string, string> = {
  wand: 'Wand',
  wands: 'Wand',
  'convoking wand': 'Wand',
  'one hand sword': 'One Hand Sword',
  'one hand swords': 'One Hand Sword',
  'one handed sword': 'One Hand Sword',
  'one handed swords': 'One Hand Sword',
  'thrusting one hand sword': 'Thrusting One Hand Sword',
  'thrusting one hand swords': 'Thrusting One Hand Sword',
  'two hand sword': 'Two Hand Sword',
  'two hand swords': 'Two Hand Sword',
  'two handed sword': 'Two Hand Sword',
  'two handed swords': 'Two Hand Sword',
  'one hand axe': 'One Hand Axe',
  'one hand axes': 'One Hand Axe',
  'one handed axe': 'One Hand Axe',
  'one handed axes': 'One Hand Axe',
  'two hand axe': 'Two Hand Axe',
  'two hand axes': 'Two Hand Axe',
  'two handed axe': 'Two Hand Axe',
  'two handed axes': 'Two Hand Axe',
  'one hand mace': 'One Hand Mace',
  'one hand maces': 'One Hand Mace',
  'one handed mace': 'One Hand Mace',
  'one handed maces': 'One Hand Mace',
  'two hand mace': 'Two Hand Mace',
  'two hand maces': 'Two Hand Mace',
  'two handed mace': 'Two Hand Mace',
  'two handed maces': 'Two Hand Mace',
  sceptre: 'Sceptre',
  sceptres: 'Sceptre',
  staff: 'Staff',
  staves: 'Staff',
  warstaff: 'Staff',
  warstaves: 'Staff',
  claw: 'Claw',
  claws: 'Claw',
  dagger: 'Dagger',
  daggers: 'Dagger',
  'rune dagger': 'Dagger',
  'rune daggers': 'Dagger',
  bow: 'Bow',
  bows: 'Bow',
  quiver: 'Quiver',
  quivers: 'Quiver',
  shield: 'Shield',
  shields: 'Shield',
  helmet: 'Helmet',
  helmets: 'Helmet',
  'body armour': 'Body Armour',
  'body armours': 'Body Armour',
  gloves: 'Gloves',
  glove: 'Gloves',
  boots: 'Boots',
  boot: 'Boots',
  amulet: 'Amulet',
  amulets: 'Amulet',
  ring: 'Ring',
  rings: 'Ring',
  belt: 'Belt',
  belts: 'Belt',
};

const STANDALONE_CLASS_AND_META_LABELS = new Set([
  'wand',
  'staff',
  'warstaff',
  'bow',
  'dagger',
  'rune dagger',
  'claw',
  'sceptre',
  'one handed sword',
  'two handed sword',
  'one handed axe',
  'two handed axe',
  'one handed mace',
  'two handed mace',
  'shield',
  'shaper item',
  'elder item',
  'crusader item',
  'hunter item',
  'redeemer item',
  'warlord item',
  'searing exarch item',
  'eater of worlds item',
  'synthesised item',
  'fractured item',
  'mirrored',
  'split',
  'unmodifiable',
]);

/**
 * Normalizes plural or variant PoE `Ctrl+C` Item Class names (e.g. `"Wands"`, `"Rings"`)
 * into canonical singular PoM item classes, with baseType suffix fallback.
 */
export function normalizePoeItemClass(rawClass: string, baseType?: string): string {
  const cleaned = rawClass.trim().toLowerCase();
  if (ITEM_CLASS_ALIASES[cleaned]) {
    return ITEM_CLASS_ALIASES[cleaned];
  }

  const base = (baseType ?? '').trim().toLowerCase();
  if (base) {
    if (/\bwand$/.test(base)) return 'Wand';
    if (/\bbow$/.test(base)) return 'Bow';
    if (/\bquiver$/.test(base)) return 'Quiver';
    if (/\b(shield|buckler|spirit shield|tower shield)$/.test(base)) return 'Shield';
    if (/\bsceptre$/.test(base)) return 'Sceptre';
    if (/\b(staff|warstaff|quarterstaff)$/.test(base)) return 'Staff';
    if (/\bdagger$/.test(base)) return 'Dagger';
    if (/\bclaw$/.test(base)) return 'Claw';
    if (/\bring$/.test(base)) return 'Ring';
    if (/\bamulet$/.test(base)) return 'Amulet';
    if (/\b(belt|sash|vise)$/.test(base)) return 'Belt';
  }

  return rawClass.trim() || 'Wand';
}

/** Returns true when a PoE clipboard line is header metadata, requirements, or sockets. */
export function isPropertyOrRequirementLine(line: string): boolean {
  const trimmed = line.trim();
  if (STANDALONE_CLASS_AND_META_LABELS.has(trimmed.toLowerCase())) {
    return true;
  }
  return (
    /^(Quality|Physical Damage|Elemental Damage|Chaos Damage|Critical Strike Chance|Attacks per Second|Weapon Range|Armour|Evasion Rating|Energy Shield|Ward|Chance to Block|Requirements|Requires|Level|Str|Dex|Int|Sockets|Item Level|Radius|Limited to|Talisman Tier|Memory Strands|Foil Variation):?/i.test(
      trimmed,
    ) || /^(R|G|B|W|-|\s)+$/.test(trimmed)
  );
}

/** Infers mod tier from a PoE `Alt+Ctrl+C` modifier header like `{ Implicit Modifier ... }`. */
export function inferModifierHeaderTier(line: string): ItemModTierType | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('implicit')) return 'implicit';
  if (lower.includes('enchant')) return 'enchant';
  if (lower.includes('crafted')) return 'crafted';
  if (lower.includes('fractured')) return 'fractured';
  return 'explicit';
}

/** Strips inline `Alt+Ctrl+C` roll range annotations such as `20(20-24)%` -> `20%`. */
export function stripAdvancedModRanges(line: string): string {
  return line
    .replace(/([+-]?\d+(?:\.\d+)?)\(\s*[+-]?\d+(?:\.\d+)?\s*[-–]\s*[+-]?\d+(?:\.\d+)?\s*\)/g, '$1')
    .replace(/\s*—\s*Unscalable Value/gi, '')
    .trim();
}

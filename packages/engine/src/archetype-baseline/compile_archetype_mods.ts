import {
  KeywordFlags,
  ModFlags,
  type EquipmentSlot,
  type MercenaryArchetype,
  type MercenaryLevelStatRow,
  type ParsedItem,
} from '../catalog-types/index.js';
import type { ModDB, ModSource } from '../mod-db/index.js';
import { parseModLineToMods } from '../mod-parser/index.js';
import { deriveHiddenElemResPct, deriveMercSkillLevel } from '../seed-catalog/index.js';

export interface CompiledArchetypeBaseline {
  clampedLevel: number;
  derivedSkillLevel: number;
  hiddenElemResPct: number;
  levelRow: MercenaryLevelStatRow;
}

function makeArchetypeSource(archetypeName: string, rawLine: string): ModSource {
  return {
    sourceType: 'Archetype',
    sourceId: `archetype:${archetypeName}`,
    sourceLabel: `${archetypeName} Baseline`,
    rawLine,
  };
}

/**
 * Compiles Level 1-85 Mercenary base attributes, Life, Accuracy, Evasion,
 * hidden elemental resistances (+35% at Lv 80+), and archetype innate modifiers into ModDB.
 */
export function compileArchetypeMods(
  archetype: MercenaryArchetype,
  mercLevel: number,
  modDb: ModDB,
): CompiledArchetypeBaseline {
  const clampedLevel = Math.max(1, Math.min(85, Math.round(mercLevel)));
  const fallbackRow: MercenaryLevelStatRow = {
    level: clampedLevel,
    baseLife: 1000,
    baseAccuracy: 500,
    baseEvasion: 300,
    baseStr: 50,
    baseDex: 50,
    baseInt: 50,
    hiddenElemResPct: deriveHiddenElemResPct(clampedLevel),
    defaultSkillLevel: deriveMercSkillLevel(clampedLevel),
  };

  const levelRow = archetype.statsByLevel[clampedLevel] ?? fallbackRow;
  const archName = archetype.name;

  modDb.addMods([
    { name: 'Str', type: 'BASE', value: levelRow.baseStr, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.baseStr} Base Strength (Lv ${clampedLevel})`) },
    { name: 'Dex', type: 'BASE', value: levelRow.baseDex, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.baseDex} Base Dexterity (Lv ${clampedLevel})`) },
    { name: 'Int', type: 'BASE', value: levelRow.baseInt, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.baseInt} Base Intelligence (Lv ${clampedLevel})`) },
    { name: 'Life', type: 'BASE', value: levelRow.baseLife, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.baseLife} Base Life (Lv ${clampedLevel})`) },
    { name: 'Accuracy', type: 'BASE', value: levelRow.baseAccuracy, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.baseAccuracy} Base Accuracy (Lv ${clampedLevel})`) },
    { name: 'Evasion', type: 'BASE', value: levelRow.baseEvasion, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.baseEvasion} Base Evasion (Lv ${clampedLevel})`) },
    { name: 'FireResist', type: 'BASE', value: levelRow.hiddenElemResPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.hiddenElemResPct}% Hidden Elemental Resistance`) },
    { name: 'ColdResist', type: 'BASE', value: levelRow.hiddenElemResPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.hiddenElemResPct}% Hidden Elemental Resistance`) },
    { name: 'LightningResist', type: 'BASE', value: levelRow.hiddenElemResPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeArchetypeSource(archName, `+${levelRow.hiddenElemResPct}% Hidden Elemental Resistance`) },
  ]);

  for (const rawLine of archetype.innateMods) {
    const source: ModSource = {
      sourceType: 'Archetype',
      sourceId: `archetype:${archetype.id}:innate`,
      sourceLabel: `${archName} (Innate)`,
      rawLine,
    };
    const mods = parseModLineToMods(rawLine, source);
    if (mods.length > 0) {
      modDb.addMods(mods);
    }
  }

  return {
    clampedLevel,
    derivedSkillLevel: levelRow.defaultSkillLevel,
    hiddenElemResPct: levelRow.hiddenElemResPct,
    levelRow,
  };
}

/**
 * Validates whether an item class is permitted in the specified equipment slot
 * for a given Mercenary archetype. Returns a warning string or null if valid.
 */
export function validateEquipmentForArchetype(
  archetype: MercenaryArchetype,
  slot: EquipmentSlot,
  item: ParsedItem,
  weapon1Item?: ParsedItem,
): string | null {
  if (slot === 'Weapon1') {
    if (!archetype.allowedMainHandClasses.includes(item.itemClass)) {
      return `${archetype.name} cannot equip ${item.itemClass} in Weapon 1 (Allowed: ${archetype.allowedMainHandClasses.join(', ')}).`;
    }
    return null;
  }

  if (slot === 'Weapon2') {
    if (weapon1Item?.isTwoHanded && item.itemClass !== 'Quiver') {
      return `Cannot equip ${item.name} in Weapon 2 while wielding a Two-Handed weapon (${weapon1Item.name}).`;
    }
    if (!archetype.allowedOffHandClasses.includes(item.itemClass)) {
      return `${archetype.name} cannot equip ${item.itemClass} in Weapon 2 (Allowed: ${archetype.allowedOffHandClasses.join(', ')}).`;
    }
    if (!archetype.canDualWield && item.localWeaponStats) {
      return `${archetype.name} cannot Dual Wield weapons in Weapon 2.`;
    }
  }

  return null;
}

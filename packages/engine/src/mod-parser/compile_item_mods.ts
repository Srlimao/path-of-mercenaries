import {
  EQUIPMENT_SLOTS,
  KeywordFlags,
  ModFlags,
  type EquipmentSlot,
  type ParsedItem,
} from '../catalog-types/index.js';
import type { Mod, ModDB, ModSource } from '../mod-db/index.js';
import { GLOBAL_MOD_PATTERNS } from './global_mod_patterns.js';

/** Parses a single PoE modifier text line into zero or more tagged Mod entries. */
export function parseModLineToMods(rawLine: string, source: ModSource): Mod[] {
  const cleaned = rawLine
    .replace(/\s*\((implicit|crafted|fractured|enchant)\)\s*$/i, '')
    .trim();
  if (!cleaned) return [];

  for (const pattern of GLOBAL_MOD_PATTERNS) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      return pattern.build(match, source);
    }
  }
  return [];
}

/**
 * Compiles local defensive properties and non-local modifiers from all equipped items into ModDB.
 * Returns any unrecognized non-local modifier lines for optional diagnostics.
 */
export function compileEquippedItemsMods(
  equippedItems: Partial<Record<EquipmentSlot, ParsedItem>>,
  modDb: ModDB,
): string[] {
  const unrecognizedLines: string[] = [];

  for (const slot of EQUIPMENT_SLOTS) {
    const item = equippedItems[slot];
    if (!item) continue;

    // Add computed local Armour / Evasion / ES / Ward / Block into ModDB
    if (item.localArmourStats) {
      const def = item.localArmourStats;
      const defSource: ModSource = {
        sourceType: 'Item',
        sourceId: `slot:${slot}`,
        sourceLabel: `${item.name} (${slot})`,
        rawLine: `${item.baseType} Local Defences`,
      };
      if (def.armour > 0) modDb.addMod({ name: 'Armour', type: 'BASE', value: def.armour, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: defSource });
      if (def.evasion > 0) modDb.addMod({ name: 'Evasion', type: 'BASE', value: def.evasion, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: defSource });
      if (def.energyShield > 0) modDb.addMod({ name: 'EnergyShield', type: 'BASE', value: def.energyShield, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: defSource });
      if (def.ward > 0) modDb.addMod({ name: 'Ward', type: 'BASE', value: def.ward, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: defSource });
      if (def.blockPct > 0) modDb.addMod({ name: 'AttackBlockChance', type: 'BASE', value: def.blockPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: defSource });
    }

    for (const line of item.modLines) {
      if (line.isLocal) continue;
      const source: ModSource = {
        sourceType: 'Item',
        sourceId: `slot:${slot}`,
        sourceLabel: `${item.name} (${slot})`,
        rawLine: line.rawText,
      };
      const mods = parseModLineToMods(line.rawText, source);
      if (mods.length > 0) {
        modDb.addMods(mods);
      } else {
        unrecognizedLines.push(`[${slot}] ${line.rawText}`);
      }
    }
  }

  return unrecognizedLines;
}

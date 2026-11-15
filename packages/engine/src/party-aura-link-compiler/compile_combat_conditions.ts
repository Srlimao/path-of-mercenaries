import {
  KeywordFlags,
  ModFlags,
  type MercenaryBuildState,
} from '../catalog-types/index.js';
import type { ModDB, ModSource } from '../mod-db/index.js';
import { parseModLineToMods } from '../mod-parser/index.js';

function condSrc(id: string, label: string, rawLine: string): ModSource {
  return {
    sourceType: 'Config',
    sourceId: id,
    sourceLabel: label,
    rawLine,
  };
}

/**
 * Compiles Mercenary Charges (including Ralakesh's Impatience max-charge floor),
 * Combat Conditions (Onslaught, Tailwind, Adrenaline, Fortify),
 * Crown of the Tyrant socket flat damage, and Custom Modifiers into ModDB.
 * Returns any unrecognized custom modifier lines.
 */
export function compileCombatConditionMods(
  buildState: MercenaryBuildState,
  modDb: ModDB,
): string[] {
  const { combatConditions, customModifierLines } = buildState.partyConfig;
  const hasRalakesh = buildState.equippedItems.Boots?.uniqueId === 'ralakeshs_impatience';

  const power = Math.max(0, hasRalakesh ? Math.max(3, combatConditions.powerCharges) : combatConditions.powerCharges);
  const frenzy = Math.max(0, hasRalakesh ? Math.max(3, combatConditions.frenzyCharges) : combatConditions.frenzyCharges);
  const endurance = Math.max(0, hasRalakesh ? Math.max(3, combatConditions.enduranceCharges) : combatConditions.enduranceCharges);

  if (power > 0) {
    modDb.addMod({
      name: 'CritChance',
      type: 'INC',
      value: power * 50,
      flags: ModFlags.None,
      keywordFlags: KeywordFlags.None,
      source: condSrc('power_charges', `Power Charges (${power})`, `${power * 50}% increased Critical Strike Chance`),
    });
  }

  if (frenzy > 0) {
    const label = `Frenzy Charges (${frenzy})`;
    modDb.addMods([
      {
        name: 'Damage',
        type: 'MORE',
        value: frenzy * 4,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: condSrc('frenzy_charges', label, `${frenzy * 4}% more Damage`),
      },
      {
        name: 'Speed',
        type: 'INC',
        value: frenzy * 4,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: condSrc('frenzy_charges', label, `${frenzy * 4}% increased Attack and Cast Speed`),
      },
    ]);
  }

  if (endurance > 0) {
    const res = endurance * 4;
    const src = condSrc('endurance_charges', `Endurance Charges (${endurance})`, `+${res}% to all Elemental Resistances`);
    modDb.addMods([
      { name: 'FireResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
      { name: 'ColdResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
      { name: 'LightningResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
    ]);
  }

  if (combatConditions.onslaught) {
    modDb.addMod({
      name: 'Speed',
      type: 'INC',
      value: 20,
      flags: ModFlags.None,
      keywordFlags: KeywordFlags.None,
      source: condSrc('onslaught', 'Onslaught', '20% increased Attack and Cast Speed'),
    });
  }

  if (combatConditions.tailwind) {
    modDb.addMod({
      name: 'Speed',
      type: 'MORE',
      value: 8,
      flags: ModFlags.None,
      keywordFlags: KeywordFlags.None,
      source: condSrc('tailwind', 'Tailwind', '8% more Action Speed'),
    });
  }

  if (combatConditions.adrenaline) {
    modDb.addMods([
      {
        name: 'Damage',
        type: 'INC',
        value: 100,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: condSrc('adrenaline', 'Adrenaline', '100% increased Damage'),
      },
      {
        name: 'Speed',
        type: 'INC',
        value: 25,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: condSrc('adrenaline', 'Adrenaline', '25% increased Attack and Cast Speed'),
      },
    ]);
  }

  const helmId = buildState.equippedItems.Helmet?.uniqueId;
  const socketColor = combatConditions.crownSocketColor;
  if (socketColor && helmId === 'crown_of_the_tyrant') {
    const colorMap: Record<'Red' | 'Green' | 'Blue' | 'White', { dt: 'Fire' | 'Cold' | 'Lightning' | 'Chaos'; min: number; max: number; kw: KeywordFlags }> = {
      Red: { dt: 'Fire', min: 64, max: 96, kw: KeywordFlags.Fire },
      Green: { dt: 'Cold', min: 56, max: 88, kw: KeywordFlags.Cold },
      Blue: { dt: 'Lightning', min: 13, max: 144, kw: KeywordFlags.Lightning },
      White: { dt: 'Chaos', min: 47, max: 61, kw: KeywordFlags.Chaos },
    };
    const c = colorMap[socketColor];
    const src = condSrc('crown_socket', `Crown of the Tyrant (${socketColor} Socket)`, `Adds ${c.min} to ${c.max} ${c.dt} Damage`);
    modDb.addMods([
      { name: `${c.dt}Min`, type: 'BASE', value: c.min, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
      { name: `${c.dt}Max`, type: 'BASE', value: c.max, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
    ]);
  }

  const unrecognized: string[] = [];
  for (const rawLine of customModifierLines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const mods = parseModLineToMods(trimmed, condSrc('custom_mod', 'Custom Config Modifier', trimmed));
    if (mods.length > 0) {
      modDb.addMods(mods);
    } else {
      unrecognized.push(trimmed);
    }
  }

  return unrecognized;
}

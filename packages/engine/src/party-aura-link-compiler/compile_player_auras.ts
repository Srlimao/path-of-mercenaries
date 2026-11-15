import {
  KeywordFlags,
  ModFlags,
  type PartyConfigState,
} from '../catalog-types/index.js';
import type { Mod, ModDB, ModSource } from '../mod-db/index.js';

export interface PlayerAuraCatalogEntry {
  id: string;
  name: string;
  defaultLevel: number;
  summary: string;
}

export const PLAYER_AURA_CATALOG: PlayerAuraCatalogEntry[] = [
  { id: 'wrath', name: 'Wrath', defaultLevel: 21, summary: 'Flat Attack Lightning + More Spell Lightning' },
  { id: 'anger', name: 'Anger', defaultLevel: 21, summary: 'Flat Attack & Spell Fire Damage' },
  { id: 'hatred', name: 'Hatred', defaultLevel: 21, summary: 'Phys as Extra Cold + More Cold Damage' },
  { id: 'zealotry', name: 'Zealotry', defaultLevel: 21, summary: 'More Spell Damage + Spell Crit Chance' },
  { id: 'haste', name: 'Haste', defaultLevel: 21, summary: 'Attack & Cast Speed' },
  { id: 'precision', name: 'Precision', defaultLevel: 21, summary: 'Flat Accuracy + Crit Chance' },
  { id: 'determination', name: 'Determination', defaultLevel: 21, summary: 'Flat & More Armour' },
  { id: 'grace', name: 'Grace', defaultLevel: 21, summary: 'Flat & More Evasion Rating' },
  { id: 'discipline', name: 'Discipline', defaultLevel: 21, summary: 'Flat Maximum Energy Shield' },
  { id: 'purity_of_elements', name: 'Purity of Elements', defaultLevel: 21, summary: 'All Elemental Resistances' },
  { id: 'purity_of_lightning', name: 'Purity of Lightning', defaultLevel: 21, summary: 'Lightning Resistance' },
];

function makeAuraSource(auraId: string, label: string, rawLine: string): ModSource {
  return {
    sourceType: 'PartyAura',
    sourceId: auraId,
    sourceLabel: label,
    rawLine,
  };
}

function lvScale(baseAt20: number, level: number, perLv = 0.045): number {
  const clamped = Math.max(1, Math.min(35, level));
  return baseAt20 * Math.max(0.25, 1 + (clamped - 20) * perLv);
}

function buildAuraMods(id: string, level: number, scalar: number): Mod[] {
  const s = (v: number, digits = 0) =>
    digits === 0 ? Math.round(v * scalar) : Number((v * scalar).toFixed(digits));
  const label = `Player ${PLAYER_AURA_CATALOG.find((a) => a.id === id)?.name ?? id} (Lv ${level})`;

  switch (id) {
    case 'wrath': {
      const min = s(lvScale(16, level));
      const max = s(lvScale(248, level));
      const spellMore = s(lvScale(21, level));
      return [
        { name: 'LightningMin', type: 'BASE', value: min, flags: ModFlags.Attack, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `Adds ${min} to ${max} Lightning Damage to Attacks`) },
        { name: 'LightningMax', type: 'BASE', value: max, flags: ModFlags.Attack, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `Adds ${min} to ${max} Lightning Damage to Attacks`) },
        { name: 'LightningDamage', type: 'MORE', value: spellMore, flags: ModFlags.Spell, keywordFlags: KeywordFlags.Lightning, source: makeAuraSource(id, label, `${spellMore}% more Spell Lightning Damage`) },
      ];
    }
    case 'anger': {
      const min = s(lvScale(109, level));
      const max = s(lvScale(155, level));
      return [
        { name: 'FireMin', type: 'BASE', value: min, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `Adds ${min} to ${max} Fire Damage`) },
        { name: 'FireMax', type: 'BASE', value: max, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `Adds ${min} to ${max} Fire Damage`) },
      ];
    }
    case 'hatred': {
      const extraCold = s(lvScale(39, level));
      return [
        { name: 'PhysicalAsExtraCold', type: 'BASE', value: extraCold, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `Gain ${extraCold}% of Physical Damage as Extra Cold Damage`) },
      ];
    }
    case 'zealotry': {
      const spellMore = s(lvScale(15, level));
      const spellCrit = s(lvScale(39, level));
      return [
        { name: 'Damage', type: 'MORE', value: spellMore, flags: ModFlags.Spell, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `${spellMore}% more Spell Damage`) },
        { name: 'CritChance', type: 'INC', value: spellCrit, flags: ModFlags.Spell, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `${spellCrit}% increased Spell Critical Strike Chance`) },
      ];
    }
    case 'haste': {
      const speed = s(lvScale(19, level));
      return [
        { name: 'Speed', type: 'INC', value: speed, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `${speed}% increased Attack and Cast Speed`) },
      ];
    }
    case 'precision': {
      const acc = s(lvScale(705, level));
      const crit = s(lvScale(59, level));
      return [
        { name: 'Accuracy', type: 'BASE', value: acc, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `+${acc} Accuracy Rating`) },
        { name: 'CritChance', type: 'INC', value: crit, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `${crit}% increased Critical Strike Chance`) },
      ];
    }
    case 'determination': {
      const armour = s(lvScale(2051, level));
      return [
        { name: 'Armour', type: 'BASE', value: armour, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `+${armour} to Armour`) },
      ];
    }
    case 'grace': {
      const eva = s(lvScale(2617, level));
      return [
        { name: 'Evasion', type: 'BASE', value: eva, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `+${eva} to Evasion Rating`) },
      ];
    }
    case 'discipline': {
      const es = s(lvScale(221, level));
      return [
        { name: 'EnergyShield', type: 'BASE', value: es, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `+${es} to maximum Energy Shield`) },
      ];
    }
    case 'purity_of_elements': {
      const res = s(lvScale(34, level));
      const src = makeAuraSource(id, label, `+${res}% to all Elemental Resistances`);
      return [
        { name: 'FireResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
        { name: 'ColdResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
        { name: 'LightningResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
      ];
    }
    case 'purity_of_lightning': {
      const res = s(lvScale(41, level));
      return [
        { name: 'LightningResist', type: 'BASE', value: res, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: makeAuraSource(id, label, `+${res}% to Lightning Resistance`) },
      ];
    }
    default:
      return [];
  }
}

/** Compiles Player / Aurabot auras, Smite, and Pyroclast Mines scaled by Aura Effect % + Generosity. */
export function compilePlayerAuraMods(
  partyConfig: PartyConfigState,
  modDb: ModDB,
): void {
  const genPct = partyConfig.generositySupported ? 39 : 0;
  const auraScalar = Math.max(
    0,
    1 + (partyConfig.globalPlayerAuraEffectPct + genPct) / 100,
  );

  for (const auraDef of PLAYER_AURA_CATALOG) {
    const entry = partyConfig.auras[auraDef.id];
    if (!entry?.enabled) continue;
    modDb.addMods(buildAuraMods(auraDef.id, entry.level || auraDef.defaultLevel, auraScalar));
  }

  if (partyConfig.smiteEnabled) {
    const min = Math.round(13 * auraScalar);
    const max = Math.round(244 * auraScalar);
    const src = makeAuraSource('smite', 'Player Smite Aura', `Adds ${min} to ${max} Lightning Damage`);
    modDb.addMods([
      { name: 'LightningMin', type: 'BASE', value: min, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
      { name: 'LightningMax', type: 'BASE', value: max, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
    ]);
  }

  const mines = Math.max(0, Math.min(25, Math.round(partyConfig.pyroclastMineCount)));
  if (mines > 0) {
    // Lv 20 Pyroclast Mine of Sabotage adds ~7 to 11 Fire Damage per active mine scaled by Aura Effect
    const min = Math.round(7 * mines * auraScalar);
    const max = Math.round(11 * mines * auraScalar);
    const src = makeAuraSource(
      'pyroclast_mine',
      `Pyroclast Mine of Sabotage (${mines} Mines)`,
      `Adds ${min} to ${max} Fire Damage`,
    );
    modDb.addMods([
      { name: 'FireMin', type: 'BASE', value: min, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
      { name: 'FireMax', type: 'BASE', value: max, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: src },
    ]);
  }
}

import { ModFlags } from '../catalog-types/index.js';
import type { Mod } from '../mod-db/index.js';
import {
  DAMAGE_MOD_PATTERNS,
  makeParsedMod,
  type ModPatternMatcher,
} from './damage_mod_patterns.js';

const capWord = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const GLOBAL_MOD_PATTERNS: ModPatternMatcher[] = [
  // Attributes
  {
    regex: /^([+-]?\d+)\s+to\s+(Strength|Dexterity|Intelligence)$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const attr = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1, 3).toLowerCase();
      return [makeParsedMod(s, attr, 'BASE', val)];
    },
  },
  {
    regex: /^([+-]?\d+)\s+to\s+all Attributes$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      return [makeParsedMod(s, 'Str', 'BASE', val), makeParsedMod(s, 'Dex', 'BASE', val), makeParsedMod(s, 'Int', 'BASE', val)];
    },
  },
  {
    regex: /^([+-]?\d+)\s+to\s+(Strength|Dexterity|Intelligence)\s+and\s+(Strength|Dexterity|Intelligence)$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const a1 = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1, 3).toLowerCase();
      const a2 = m[3]!.charAt(0).toUpperCase() + m[3]!.slice(1, 3).toLowerCase();
      return [makeParsedMod(s, a1, 'BASE', val), makeParsedMod(s, a2, 'BASE', val)];
    },
  },
  // Life, ES, Armour, Evasion, Block, Suppression
  {
    regex: /^([+-]?\d+)\s+to\s+maximum\s+(Life|Energy Shield)$/i,
    build: (m, s) => [makeParsedMod(s, m[2]!.toLowerCase() === 'life' ? 'Life' : 'EnergyShield', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+maximum\s+(Life|Energy Shield)$/i,
    build: (m, s) => [makeParsedMod(s, m[2]!.toLowerCase() === 'life' ? 'Life' : 'EnergyShield', 'INC', Number(m[1]))],
  },
  {
    regex: /^([+-]?\d+)\s+to\s+(Armour|Evasion Rating)$/i,
    build: (m, s) => [makeParsedMod(s, m[2]!.toLowerCase() === 'armour' ? 'Armour' : 'Evasion', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+(Armour|Evasion Rating)$/i,
    build: (m, s) => [makeParsedMod(s, m[2]!.toLowerCase() === 'armour' ? 'Armour' : 'Evasion', 'INC', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+(Armour and Energy Shield|Armour and Evasion|Evasion and Energy Shield)$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const target = m[2]!.toLowerCase();
      const mods: Mod[] = [];
      if (target.includes('armour')) mods.push(makeParsedMod(s, 'Armour', 'INC', val));
      if (target.includes('evasion')) mods.push(makeParsedMod(s, 'Evasion', 'INC', val));
      if (target.includes('energy shield')) mods.push(makeParsedMod(s, 'EnergyShield', 'INC', val));
      return mods;
    },
  },
  {
    regex: /^([+-]?\d+)%\s+Chance to Block(?:\s+(Attack|Spell) Damage)?$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const kind = m[2]?.toLowerCase() === 'spell' ? 'SpellBlockChance' : 'AttackBlockChance';
      return [makeParsedMod(s, kind, 'BASE', val)];
    },
  },
  {
    regex: /^([+-]?\d+)%\s+chance to Suppress Spell Damage$/i,
    build: (m, s) => [makeParsedMod(s, 'SpellSuppressionChance', 'BASE', Number(m[1]))],
  },
  // Resistances
  {
    regex: /^([+-]?\d+)%\s+to\s+(Fire|Cold|Lightning|Chaos)\s+Resistance$/i,
    build: (m, s) => [makeParsedMod(s, `${m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1).toLowerCase()}Resist`, 'BASE', Number(m[1]))],
  },
  {
    regex: /^([+-]?\d+)%\s+to\s+all\s+Elemental\s+Resistances$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      return [
        makeParsedMod(s, 'FireResist', 'BASE', val),
        makeParsedMod(s, 'ColdResist', 'BASE', val),
        makeParsedMod(s, 'LightningResist', 'BASE', val),
      ];
    },
  },
  {
    regex: /^([+-]?\d+)%\s+to\s+(Fire|Cold|Lightning)\s+and\s+(Fire|Cold|Lightning)\s+Resistances$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const r1 = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1).toLowerCase();
      const r2 = m[3]!.charAt(0).toUpperCase() + m[3]!.slice(1).toLowerCase();
      return [makeParsedMod(s, `${r1}Resist`, 'BASE', val), makeParsedMod(s, `${r2}Resist`, 'BASE', val)];
    },
  },
  {
    regex: /^Nearby Enemies have\s+([+-]?\d+)%\s+to all Resistances$/i,
    build: (m, s) => [makeParsedMod(s, 'EnemyAllResist', 'BASE', Number(m[1]))],
  },
  // Maximum Resistances
  {
    regex: /^([+-]?\d+)%\s+to\s+all\s+maximum\s+Elemental\s+Resistances$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      return [
        makeParsedMod(s, 'MaxFireResist', 'BASE', val),
        makeParsedMod(s, 'MaxColdResist', 'BASE', val),
        makeParsedMod(s, 'MaxLightningResist', 'BASE', val),
      ];
    },
  },
  {
    regex: /^([+-]?\d+)%\s+to\s+maximum\s+(Fire|Cold|Lightning|Chaos)\s+Resistance$/i,
    build: (m, s) => [makeParsedMod(s, `Max${capWord(m[2]!)}Resist`, 'BASE', Number(m[1]))],
  },
  // DoT Multiplier & Ailment Duration / Chance
  {
    regex: /^([+-]?\d+)%\s+to\s+(?:(Fire|Cold|Physical|Chaos)\s+)?Damage over Time Multiplier$/i,
    build: (m, s) => {
      const name = m[2] ? `${capWord(m[2])}DotMultiplier` : 'DotMultiplier';
      return [makeParsedMod(s, name, 'BASE', Number(m[1]), ModFlags.Dot)];
    },
  },
  {
    regex: /^(\d+)%\s+(increased|reduced)\s+(Ignite|Bleed|Bleeding|Poison|Ailment)\s+Duration(?:\s+on Enemies)?$/i,
    build: (m, s) => {
      const signed = m[2]!.toLowerCase() === 'reduced' ? -Number(m[1]) : Number(m[1]);
      const rawType = m[3]!.toLowerCase();
      const key = rawType.startsWith('bleed') ? 'Bleed' : capWord(rawType);
      return [makeParsedMod(s, `${key}Duration`, 'INC', signed)];
    },
  },
  {
    regex: /^(\d+)%\s+chance to\s+(Ignite|Poison|cause Bleeding)(?:\s+on Hit)?$/i,
    build: (m, s) => {
      const raw = m[2]!.toLowerCase();
      const key = raw.includes('bleed') ? 'BleedChance' : raw === 'ignite' ? 'IgniteChance' : 'PoisonChance';
      return [makeParsedMod(s, key, 'BASE', Number(m[1]))];
    },
  },
  // Life Regen & Additional Physical DR
  {
    regex: /^Regenerate\s+(\d+(?:\.\d+)?)\s+Life per second$/i,
    build: (m, s) => [makeParsedMod(s, 'LifeRegen', 'BASE', Number(m[1]))],
  },
  {
    regex: /^Regenerate\s+(\d+(?:\.\d+)?)%\s+of Life per second$/i,
    build: (m, s) => [makeParsedMod(s, 'LifeRegenPercent', 'BASE', Number(m[1]))],
  },
  {
    regex: /^([+-]?\d+)%\s+additional Physical Damage Reduction$/i,
    build: (m, s) => [makeParsedMod(s, 'PhysicalDamageReduction', 'BASE', Number(m[1]))],
  },
  ...DAMAGE_MOD_PATTERNS,
];

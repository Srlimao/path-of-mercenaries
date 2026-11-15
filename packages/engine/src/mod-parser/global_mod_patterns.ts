import type { Mod } from '../mod-db/index.js';
import {
  DAMAGE_MOD_PATTERNS,
  makeParsedMod,
  type ModPatternMatcher,
} from './damage_mod_patterns.js';

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
  ...DAMAGE_MOD_PATTERNS,
];

import { KeywordFlags, ModFlags, type DamageType } from '../catalog-types/index.js';
import type { Mod, ModSource } from '../mod-db/index.js';

interface PatternMatcher {
  regex: RegExp;
  build: (match: RegExpMatchArray, source: ModSource) => Mod[];
}

const ELEMENT_KEY_MAP: Record<string, KeywordFlags> = {
  Physical: KeywordFlags.Physical,
  Lightning: KeywordFlags.Lightning,
  Cold: KeywordFlags.Cold,
  Fire: KeywordFlags.Fire,
  Chaos: KeywordFlags.Chaos,
  Elemental: KeywordFlags.Elemental,
};

function makeMod(
  source: ModSource,
  name: string,
  type: Mod['type'],
  value: number | boolean,
  flags = ModFlags.None,
  keywordFlags = KeywordFlags.None,
): Mod {
  return { name, type, value, flags, keywordFlags, source };
}

function parseDamageScopeFlags(scopeText: string | undefined): {
  modName: string;
  flags: number;
  keywordFlags: number;
} {
  const s = (scopeText ?? '').trim();
  let flags = ModFlags.None;
  let keywordFlags = KeywordFlags.None;
  let modName = 'Damage';

  if (s.includes('Attack')) flags |= ModFlags.Attack;
  if (s.includes('Spell')) flags |= ModFlags.Spell;
  if (s.includes('Melee')) flags |= ModFlags.Melee;
  if (s.includes('Projectile')) flags |= ModFlags.Projectile;
  if (s.includes('Area')) flags |= ModFlags.Area;

  for (const typeName of ['Physical', 'Lightning', 'Cold', 'Fire', 'Chaos', 'Elemental'] as const) {
    if (s.includes(typeName)) {
      keywordFlags |= ELEMENT_KEY_MAP[typeName] ?? KeywordFlags.None;
      modName = `${typeName}Damage`;
    }
  }
  return { modName, flags, keywordFlags };
}

export const GLOBAL_MOD_PATTERNS: PatternMatcher[] = [
  // Attributes
  {
    regex: /^([+-]?\d+)\s+to\s+(Strength|Dexterity|Intelligence)$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const attr = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1, 3).toLowerCase();
      return [makeMod(s, attr, 'BASE', val)];
    },
  },
  {
    regex: /^([+-]?\d+)\s+to\s+all Attributes$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      return [makeMod(s, 'Str', 'BASE', val), makeMod(s, 'Dex', 'BASE', val), makeMod(s, 'Int', 'BASE', val)];
    },
  },
  {
    regex: /^([+-]?\d+)\s+to\s+(Strength|Dexterity|Intelligence)\s+and\s+(Strength|Dexterity|Intelligence)$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const a1 = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1, 3).toLowerCase();
      const a2 = m[3]!.charAt(0).toUpperCase() + m[3]!.slice(1, 3).toLowerCase();
      return [makeMod(s, a1, 'BASE', val), makeMod(s, a2, 'BASE', val)];
    },
  },
  // Life, ES, Armour, Evasion, Block, Suppression
  {
    regex: /^([+-]?\d+)\s+to\s+maximum\s+(Life|Energy Shield)$/i,
    build: (m, s) => [makeMod(s, m[2]!.toLowerCase() === 'life' ? 'Life' : 'EnergyShield', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+maximum\s+(Life|Energy Shield)$/i,
    build: (m, s) => [makeMod(s, m[2]!.toLowerCase() === 'life' ? 'Life' : 'EnergyShield', 'INC', Number(m[1]))],
  },
  {
    regex: /^([+-]?\d+)\s+to\s+(Armour|Evasion Rating)$/i,
    build: (m, s) => [makeMod(s, m[2]!.toLowerCase() === 'armour' ? 'Armour' : 'Evasion', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+(Armour|Evasion Rating)$/i,
    build: (m, s) => [makeMod(s, m[2]!.toLowerCase() === 'armour' ? 'Armour' : 'Evasion', 'INC', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+(Armour and Energy Shield|Armour and Evasion|Evasion and Energy Shield)$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const target = m[2]!.toLowerCase();
      const mods: Mod[] = [];
      if (target.includes('armour')) mods.push(makeMod(s, 'Armour', 'INC', val));
      if (target.includes('evasion')) mods.push(makeMod(s, 'Evasion', 'INC', val));
      if (target.includes('energy shield')) mods.push(makeMod(s, 'EnergyShield', 'INC', val));
      return mods;
    },
  },
  {
    regex: /^([+-]?\d+)%\s+Chance to Block(?:\s+(Attack|Spell) Damage)?$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const kind = m[2]?.toLowerCase() === 'spell' ? 'SpellBlockChance' : 'AttackBlockChance';
      return [makeMod(s, kind, 'BASE', val)];
    },
  },
  {
    regex: /^([+-]?\d+)%\s+chance to Suppress Spell Damage$/i,
    build: (m, s) => [makeMod(s, 'SpellSuppressionChance', 'BASE', Number(m[1]))],
  },
  // Resistances
  {
    regex: /^([+-]?\d+)%\s+to\s+(Fire|Cold|Lightning|Chaos)\s+Resistance$/i,
    build: (m, s) => [makeMod(s, `${m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1).toLowerCase()}Resist`, 'BASE', Number(m[1]))],
  },
  {
    regex: /^([+-]?\d+)%\s+to\s+all\s+Elemental\s+Resistances$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      return [
        makeMod(s, 'FireResist', 'BASE', val),
        makeMod(s, 'ColdResist', 'BASE', val),
        makeMod(s, 'LightningResist', 'BASE', val),
      ];
    },
  },
  {
    regex: /^([+-]?\d+)%\s+to\s+(Fire|Cold|Lightning)\s+and\s+(Fire|Cold|Lightning)\s+Resistances$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const r1 = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1).toLowerCase();
      const r2 = m[3]!.charAt(0).toUpperCase() + m[3]!.slice(1).toLowerCase();
      return [makeMod(s, `${r1}Resist`, 'BASE', val), makeMod(s, `${r2}Resist`, 'BASE', val)];
    },
  },
  {
    regex: /^Nearby Enemies have\s+([+-]?\d+)%\s+to all Resistances$/i,
    build: (m, s) => [makeMod(s, 'EnemyAllResist', 'BASE', Number(m[1]))],
  },
  // Global Flat Added Damage
  {
    regex: /^Adds\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage(?:\s+to\s+(Attack|Spell)s)?$/i,
    build: (m, s) => {
      const min = Number(m[1]);
      const max = Number(m[2]);
      const dt = (m[3]!.charAt(0).toUpperCase() + m[3]!.slice(1).toLowerCase()) as DamageType;
      const scope = m[4]?.toLowerCase();
      const flags = scope === 'attack' ? ModFlags.Attack : scope === 'spell' ? ModFlags.Spell : ModFlags.None;
      return [makeMod(s, `${dt}Min`, 'BASE', min, flags), makeMod(s, `${dt}Max`, 'BASE', max, flags)];
    },
  },
  // Increased / Reduced / More / Less Damage
  {
    regex: /^(?:Supported Skills deal\s+)?(\d+)%\s+(increased|reduced|more|less)\s+(?:([A-Za-z ]+?)\s+)?Damage(?:\s+with Attack Skills)?$/i,
    build: (m, s) => {
      const rawVal = Number(m[1]);
      const verb = m[2]!.toLowerCase();
      const modType = verb === 'increased' || verb === 'reduced' ? 'INC' : 'MORE';
      const signedVal = verb === 'reduced' || verb === 'less' ? -rawVal : rawVal;
      const withAttackFlag = m[0].toLowerCase().includes('with attack skills') ? ModFlags.Attack : ModFlags.None;
      const scope = parseDamageScopeFlags(m[3]);
      return [makeMod(s, scope.modName, modType, signedVal, scope.flags | withAttackFlag, scope.keywordFlags)];
    },
  },
  // Speed, Crit, Accuracy
  {
    regex: /^(?:Supported Skills have\s+)?(\d+)%\s+(increased|reduced|more|less)\s+(Attack Speed|Cast Speed|Attack and Cast Speed)$/i,
    build: (m, s) => {
      const rawVal = Number(m[1]);
      const verb = m[2]!.toLowerCase();
      const modType = verb === 'increased' || verb === 'reduced' ? 'INC' : 'MORE';
      const signedVal = verb === 'reduced' || verb === 'less' ? -rawVal : rawVal;
      const target = m[3]!.toLowerCase();
      let flags = ModFlags.None;
      if (target === 'attack speed') flags = ModFlags.Attack;
      else if (target === 'cast speed') flags = ModFlags.Spell;
      return [makeMod(s, 'Speed', modType, signedVal, flags)];
    },
  },
  {
    regex: /^(?:Supported Skills have\s+)?(\d+)%\s+(increased|reduced)\s+(?:Global\s+)?Critical Strike Chance$/i,
    build: (m, s) => {
      const signed = m[2]!.toLowerCase() === 'reduced' ? -Number(m[1]) : Number(m[1]);
      return [makeMod(s, 'CritChance', 'INC', signed)];
    },
  },
  {
    regex: /^([+-]?\d+(?:\.\d+)?)%\s+to\s+(?:Global\s+)?Critical Strike Chance$/i,
    build: (m, s) => [makeMod(s, 'CritChance', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(?:([+-]?\d+)%\s+to|(\d+)%\s+increased)\s+(?:Global\s+)?Critical Strike Multiplier$/i,
    build: (m, s) => [makeMod(s, 'CritMultiplier', 'BASE', Number(m[1] ?? m[2]))],
  },
  {
    regex: /^([+-]?\d+)\s+to\s+(?:Global\s+)?Accuracy Rating$/i,
    build: (m, s) => [makeMod(s, 'Accuracy', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+(?:Global\s+)?Accuracy Rating$/i,
    build: (m, s) => [makeMod(s, 'Accuracy', 'INC', Number(m[1]))],
  },
  // Conversion, Gain as Extra, Penetration, Impale, Phys Taken As
  {
    regex: /^(\d+)%\s+of\s+(Physical|Lightning|Cold|Fire|Elemental)\s+Damage\s+Converted\s+to\s+(Lightning|Cold|Fire|Chaos)\s+Damage$/i,
    build: (m, s) => [makeMod(s, `${m[2]}To${m[3]}`, 'BASE', Number(m[1]))],
  },
  {
    regex: /^Gain\s+(\d+)%\s+of\s+(Physical|Lightning|Cold|Fire)\s+Damage\s+as\s+Extra\s+(Lightning|Cold|Fire|Chaos)\s+Damage$/i,
    build: (m, s) => [makeMod(s, `${m[2]}AsExtra${m[3]}`, 'BASE', Number(m[1]))],
  },
  {
    regex: /(?:Damage|Attacks with this Weapon|Supported Skills)\s+Penetrates?\s+(\d+)%\s+(Fire|Cold|Lightning|Elemental)\s+Resistances?$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const elem = m[2]!.toLowerCase();
      if (elem === 'elemental') return [makeMod(s, 'ElementalPenetration', 'BASE', val)];
      return [makeMod(s, `${elem.charAt(0).toUpperCase() + elem.slice(1)}Penetration`, 'BASE', val)];
    },
  },
  {
    regex: /^(\d+)%\s+chance to Impale Enemies on Hit with Attacks$/i,
    build: (m, s) => [makeMod(s, 'ImpaleChance', 'BASE', Number(m[1]), ModFlags.Attack)],
  },
  {
    regex: /^(\d+)%\s+increased Impale Effect$/i,
    build: (m, s) => [makeMod(s, 'ImpaleEffect', 'INC', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+of\s+(Physical|Cold|Lightning)\s+Damage from Hits taken as\s+(Fire|Cold|Lightning|Chaos)\s+Damage$/i,
    build: (m, s) => [makeMod(s, `${m[2]}TakenAs${m[3]}`, 'BASE', Number(m[1]))],
  },
  // Build-around Unique Flags
  {
    regex: /^Nearby Allies' Damage with Hits is Lucky$/i,
    build: (_m, s) => [makeMod(s, 'LuckyHitDamage', 'FLAG', true)],
  },
  {
    regex: /^Nearby Enemies have Lightning Resistance equal to yours$/i,
    build: (_m, s) => [makeMod(s, 'EnemyLightningResEqualsMerc', 'FLAG', true)],
  },
  {
    regex: /^Treats Enemy Monster Elemental Resistance values as inverted$/i,
    build: (_m, s) => [makeMod(s, 'InvertEnemyElementalResistances', 'FLAG', true)],
  },
  {
    regex: /^Nearby Enemies' Chaos Resistance is 0%$/i,
    build: (_m, s) => [makeMod(s, 'EnemyChaosResZero', 'FLAG', true)],
  },
  {
    regex: /^Projectiles Return to you$/i,
    build: (_m, s) => [makeMod(s, 'ProjectilesReturn', 'FLAG', true)],
  },
];

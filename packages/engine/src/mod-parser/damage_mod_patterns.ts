import { KeywordFlags, ModFlags, type DamageType } from '../catalog-types/index.js';
import type { Mod, ModSource } from '../mod-db/index.js';

export interface ModPatternMatcher {
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

export function makeParsedMod(
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

  if (/\bAttacks?\b/i.test(s)) flags |= ModFlags.Attack;
  if (/\bSpells?\b/i.test(s)) flags |= ModFlags.Spell;
  if (/\bMelee\b/i.test(s)) flags |= ModFlags.Melee;
  if (/\bProjectiles?\b/i.test(s)) flags |= ModFlags.Projectile;
  if (/\bArea\b/i.test(s)) flags |= ModFlags.Area;
  if (/\bHits?\b/i.test(s) && !/\bAilments?\b/i.test(s)) flags |= ModFlags.Hit;
  if (/\bAilments?\b/i.test(s) && !/\bHits?\b/i.test(s)) flags |= ModFlags.Ailment;
  if (/\bover Time\b/i.test(s)) flags |= ModFlags.Dot;

  for (const typeName of ['Physical', 'Lightning', 'Cold', 'Fire', 'Chaos', 'Elemental'] as const) {
    if (new RegExp(`\\b${typeName}\\b`, 'i').test(s)) {
      keywordFlags |= ELEMENT_KEY_MAP[typeName] ?? KeywordFlags.None;
      modName = `${typeName}Damage`;
    }
  }
  return { modName, flags, keywordFlags };
}

export const DAMAGE_MOD_PATTERNS: ModPatternMatcher[] = [
  {
    regex: /^(?:Supported Skills (?:have|deal)\s+)?Adds\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage(?:\s+to\s+(Attack|Spell)s)?$/i,
    build: (m, s) => {
      const min = Number(m[1]);
      const max = Number(m[2]);
      const dt = (m[3]!.charAt(0).toUpperCase() + m[3]!.slice(1).toLowerCase()) as DamageType;
      const scope = m[4]?.toLowerCase();
      const flags = scope === 'attack' ? ModFlags.Attack : scope === 'spell' ? ModFlags.Spell : ModFlags.None;
      return [makeParsedMod(s, `${dt}Min`, 'BASE', min, flags), makeParsedMod(s, `${dt}Max`, 'BASE', max, flags)];
    },
  },
  {
    regex: /^(?:Supported Skills deal\s+)?(\d+)%\s+(increased|reduced|more|less)\s+(Minimum|Maximum)\s+(?:(Attack|Spell|Physical|Fire|Cold|Lightning|Chaos|Elemental)\s+)?Damage(?:\s+with Hits)?$/i,
    build: (m, s) => {
      const rawVal = Number(m[1]);
      const verb = m[2]!.toLowerCase();
      const modType = verb === 'increased' || verb === 'reduced' ? 'INC' : 'MORE';
      const signedVal = verb === 'reduced' || verb === 'less' ? -rawVal : rawVal;
      const bound = m[3]!.toLowerCase() === 'maximum' ? 'Max' : 'Min';
      const scope = (m[4] ?? '').toLowerCase();
      const isAttack = scope === 'attack';
      const name = `${bound}${isAttack ? 'Attack' : ''}Damage`;
      const flags = isAttack ? ModFlags.Attack : scope === 'spell' ? ModFlags.Spell : ModFlags.None;
      return [makeParsedMod(s, name, modType, signedVal, flags)];
    },
  },
  {
    regex: /^(?:Returning Projectiles deal\s+(\d+)%\s+less Damage|Supported Skills deal\s+(\d+)%\s+less Damage with Returning Projectiles)$/i,
    build: (m, s) => [
      makeParsedMod(s, 'ProjectilesReturn', 'FLAG', true, ModFlags.Projectile),
      makeParsedMod(s, 'ReturningProjectileLessDamage', 'BASE', Number(m[1] ?? m[2]), ModFlags.Projectile),
    ],
  },
  {
    regex: /^(?:(?:Supported Skills|Hits and Ailments)\s+deal\s+)?(\d+)%\s+(increased|reduced|more|less)\s+(?:([A-Za-z ]+?)\s+)?Damage(?:\s+(?:over Time|with\s+([A-Za-z ]+)))?$/i,
    build: (m, s) => {
      const rawVal = Number(m[1]);
      const verb = m[2]!.toLowerCase();
      const modType = verb === 'increased' || verb === 'reduced' ? 'INC' : 'MORE';
      const signedVal = verb === 'reduced' || verb === 'less' ? -rawVal : rawVal;
      const fullLower = m[0].toLowerCase();
      const prefixScope = fullLower.startsWith('hits and ailments') ? 'Hits and Ailments' : '';
      const combinedScope = `${prefixScope} ${m[3] ?? ''} ${m[4] ?? ''} ${fullLower.includes('over time') ? 'over Time' : ''}`.trim();
      const scope = parseDamageScopeFlags(combinedScope);
      if (/\bHits?\b/i.test(combinedScope) && /\bAilments?\b/i.test(combinedScope)) {
        return [
          makeParsedMod(s, scope.modName, modType, signedVal, scope.flags | ModFlags.Hit, scope.keywordFlags),
          makeParsedMod(s, scope.modName, modType, signedVal, scope.flags | ModFlags.Ailment, scope.keywordFlags),
        ];
      }
      return [makeParsedMod(s, scope.modName, modType, signedVal, scope.flags, scope.keywordFlags)];
    },
  },
  {
    regex: /^(?:Supported Skills have\s+)?(\d+)%\s+(increased|reduced|more|less)\s+(Attack Speed|Cast Speed|Attack and Cast Speed)$/i,
    build: (m, s) => {
      const rawVal = Number(m[1]);
      const verb = m[2]!.toLowerCase();
      const modType = verb === 'increased' || verb === 'reduced' ? 'INC' : 'MORE';
      const signedVal = verb === 'reduced' || verb === 'less' ? -rawVal : rawVal;
      const target = m[3]!.toLowerCase();
      const flags = target === 'attack speed' ? ModFlags.Attack : target === 'cast speed' ? ModFlags.Spell : ModFlags.None;
      return [makeParsedMod(s, 'Speed', modType, signedVal, flags)];
    },
  },
  {
    regex: /^(?:Supported Skills have\s+)?(\d+)%\s+(increased|reduced)\s+(?:Global\s+)?Critical Strike Chance$/i,
    build: (m, s) => {
      const signed = m[2]!.toLowerCase() === 'reduced' ? -Number(m[1]) : Number(m[1]);
      return [makeParsedMod(s, 'CritChance', 'INC', signed)];
    },
  },
  {
    regex: /^(?:Supported Skills have\s+)?([+-]?\d+(?:\.\d+)?)%\s+to\s+(?:Global\s+)?Critical Strike Chance$/i,
    build: (m, s) => [makeParsedMod(s, 'CritChance', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(?:Supported Skills have\s+)?(?:([+-]?\d+)%\s+to|(\d+)%\s+increased)\s+(?:Global\s+)?Critical Strike Multiplier$/i,
    build: (m, s) => [makeParsedMod(s, 'CritMultiplier', 'BASE', Number(m[1] ?? m[2]))],
  },
  {
    regex: /^([+-]?\d+)\s+to\s+(?:Global\s+)?Accuracy Rating$/i,
    build: (m, s) => [makeParsedMod(s, 'Accuracy', 'BASE', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+increased\s+(?:Global\s+)?Accuracy Rating$/i,
    build: (m, s) => [makeParsedMod(s, 'Accuracy', 'INC', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+of\s+(Physical|Lightning|Cold|Fire|Elemental)\s+Damage\s+Converted\s+to\s+(Lightning|Cold|Fire|Chaos)\s+Damage$/i,
    build: (m, s) => [makeParsedMod(s, `${m[2]}To${m[3]}`, 'BASE', Number(m[1]))],
  },
  {
    regex: /^Gain\s+(\d+)%\s+of\s+(Physical|Lightning|Cold|Fire)\s+Damage\s+as\s+Extra\s+(Lightning|Cold|Fire|Chaos)\s+Damage$/i,
    build: (m, s) => [makeParsedMod(s, `${m[2]}AsExtra${m[3]}`, 'BASE', Number(m[1]))],
  },
  {
    regex: /(?:Damage|Attacks with this Weapon|Supported Skills)\s+Penetrates?\s+(\d+)%\s+(Fire|Cold|Lightning|Elemental)\s+Resistances?$/i,
    build: (m, s) => {
      const val = Number(m[1]);
      const elem = m[2]!.toLowerCase();
      if (elem === 'elemental') return [makeParsedMod(s, 'ElementalPenetration', 'BASE', val)];
      return [makeParsedMod(s, `${elem.charAt(0).toUpperCase() + elem.slice(1)}Penetration`, 'BASE', val)];
    },
  },
  {
    regex: /^(?:Supported Skills have\s+)?(\d+)%\s+chance to Impale Enemies on Hit(?:\s+with Attacks)?$/i,
    build: (m, s) => [makeParsedMod(s, 'ImpaleChance', 'BASE', Number(m[1]), ModFlags.Attack)],
  },
  {
    regex: /^(\d+)%\s+increased Impale Effect$/i,
    build: (m, s) => [makeParsedMod(s, 'ImpaleEffect', 'INC', Number(m[1]))],
  },
  {
    regex: /^(\d+)%\s+of\s+(Physical|Cold|Lightning)\s+Damage from Hits taken as\s+(Fire|Cold|Lightning|Chaos)\s+Damage$/i,
    build: (m, s) => [makeParsedMod(s, `${m[2]}TakenAs${m[3]}`, 'BASE', Number(m[1]))],
  },
  {
    regex: /^(?:Supported Skills\s+)?[Dd]eal no\s+(Elemental or Chaos|Elemental|Chaos|Physical|Non-Physical)\s+Damage$/i,
    build: (m, s) => {
      const target = m[1]!.toLowerCase();
      if (target === 'elemental or chaos' || target === 'non-physical') {
        return [makeParsedMod(s, 'DealNoElementalDamage', 'FLAG', true), makeParsedMod(s, 'DealNoChaosDamage', 'FLAG', true)];
      }
      if (target === 'elemental') return [makeParsedMod(s, 'DealNoElementalDamage', 'FLAG', true)];
      if (target === 'chaos') return [makeParsedMod(s, 'DealNoChaosDamage', 'FLAG', true)];
      return [makeParsedMod(s, 'DealNoPhysicalDamage', 'FLAG', true)];
    },
  },
  {
    regex: /^Nearby Allies' Damage with Hits is Lucky$/i,
    build: (_m, s) => [makeParsedMod(s, 'LuckyHitDamage', 'FLAG', true)],
  },
  {
    regex: /^Nearby Enemies have Lightning Resistance equal to yours$/i,
    build: (_m, s) => [makeParsedMod(s, 'EnemyLightningResEqualsMerc', 'FLAG', true)],
  },
  {
    regex: /^Treats Enemy Monster Elemental Resistance values as inverted$/i,
    build: (_m, s) => [makeParsedMod(s, 'InvertEnemyElementalResistances', 'FLAG', true)],
  },
  {
    regex: /^Nearby Enemies' Chaos Resistance is 0%$/i,
    build: (_m, s) => [makeParsedMod(s, 'EnemyChaosResZero', 'FLAG', true)],
  },
  {
    regex: /^Projectiles(?:\s+from Supported Skills)?\s+Return to you$/i,
    build: (_m, s) => [makeParsedMod(s, 'ProjectilesReturn', 'FLAG', true)],
  },
];

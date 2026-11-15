import {
  KeywordFlags,
  ModFlags,
  type DamageRangeTuple,
  type DamageType,
  type MercenarySkillDefinition,
} from '../catalog-types/index.js';

export const EMPTY_ADDED: Record<number, Partial<Record<DamageType, DamageRangeTuple>>> = {};

/** Generates linear level 1-40 weapon damage % curve. */
export function buildWeaponMulCurve(
  lv1Pct: number,
  lv20Pct: number,
  lv40Pct: number,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (let lv = 1; lv <= 40; lv += 1) {
    if (lv <= 20) {
      out[lv] = Number((lv1Pct + ((lv - 1) / 19) * (lv20Pct - lv1Pct)).toFixed(1));
    } else {
      out[lv] = Number((lv20Pct + ((lv - 20) / 20) * (lv40Pct - lv20Pct)).toFixed(1));
    }
  }
  return out;
}

/** Generates smooth level 1-40 spell/added base damage tuples. */
export function buildFlatDamageCurve(
  type: DamageType,
  lv1: DamageRangeTuple,
  lv20: DamageRangeTuple,
  lv40: DamageRangeTuple,
): Record<number, Partial<Record<DamageType, DamageRangeTuple>>> {
  const out: Record<number, Partial<Record<DamageType, DamageRangeTuple>>> = {};
  for (let lv = 1; lv <= 40; lv += 1) {
    const t = lv <= 20 ? (lv - 1) / 19 : (lv - 20) / 20;
    const [aMin, aMax] = lv <= 20 ? lv1 : lv20;
    const [bMin, bMax] = lv <= 20 ? lv20 : lv40;
    const factor = lv <= 20 ? 1 : 1 + t * 1.15;
    out[lv] = {
      [type]: [
        Math.round((aMin + (bMin - aMin) * t) * factor),
        Math.round((aMax + (bMax - aMax) * t) * factor),
      ],
    };
  }
  return out;
}

function inferPrimaryDamageType(name: string): { dmgType: DamageType; keywordFlags: number } {
  if (/(fire|flame|ignite|magma|pyro|erupt|volcanic|ashen|inciner|scorch|molten|burn)/i.test(name)) {
    return { dmgType: 'Fire', keywordFlags: KeywordFlags.Fire | KeywordFlags.Elemental };
  }
  if (/(cold|frost|ice|glacial|freeze|winter|frigid|icicle|vortex|chill|shatter)/i.test(name)) {
    return { dmgType: 'Cold', keywordFlags: KeywordFlags.Cold | KeywordFlags.Elemental };
  }
  if (/(lightning|storm|spark|arc|shock|volt|thunder|plasma|static)/i.test(name)) {
    return { dmgType: 'Lightning', keywordFlags: KeywordFlags.Lightning | KeywordFlags.Elemental };
  }
  if (/(chaos|blight|bane|wither|despair|toxic|poison|soulrend|caustic|venom|dark|void|hex|forbidden)/i.test(name)) {
    return { dmgType: 'Chaos', keywordFlags: KeywordFlags.Chaos };
  }
  return { dmgType: 'Physical', keywordFlags: KeywordFlags.Physical };
}

/** Synthesizes a playable `MercenarySkillDefinition` from an imported PoEDB skill stub. */
export function synthesizePoedbSkill(entry: {
  id: string;
  name: string;
  category: 'PRIMARY' | 'SECONDARY' | 'UTILITY';
  isSpellHint?: boolean;
}): MercenarySkillDefinition {
  if (entry.category === 'UTILITY') {
    return {
      id: entry.id,
      name: entry.name,
      category: 'UTILITY',
      tags: ['Utility'],
      maxSupports: 3,
      parts: [],
    };
  }

  const { dmgType, keywordFlags } = inferPrimaryDamageType(entry.name);
  if (entry.isSpellHint) {
    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      tags: ['Spell', dmgType],
      maxSupports: 5,
      parts: [
        {
          id: 'spell_hit',
          label: `${entry.name} Hit`,
          defaultFullDpsCount: 1,
          isSpell: true,
          isAttack: false,
          skillModFlags: ModFlags.Spell | ModFlags.Hit,
          skillKeywordFlags: keywordFlags,
          damageEffectiveness: 1.85,
          baseCastTimeSec: 0.7,
          baseCritChancePct: 6.0,
          weaponDamageMultiplierPctByLevel: {},
          baseAddedDamageByLevel: buildFlatDamageCurve(dmgType, [8, 18], [320, 640], [1150, 2100]),
          partMods: [],
        },
      ],
    };
  }

  return {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    tags: ['Attack', dmgType],
    maxSupports: 5,
    parts: [
      {
        id: 'attack_hit',
        label: `${entry.name} Hit`,
        defaultFullDpsCount: 1,
        isSpell: false,
        isAttack: true,
        skillModFlags: ModFlags.Attack | ModFlags.Hit,
        skillKeywordFlags: keywordFlags,
        damageEffectiveness: 2.0,
        attackSpeedMulti: 1.0,
        weaponDamageMultiplierPctByLevel: buildWeaponMulCurve(130, 205, 300),
        baseAddedDamageByLevel: EMPTY_ADDED,
        partMods: [],
      },
    ],
  };
}

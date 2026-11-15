import { describe, expect, it } from 'vitest';
import { KeywordFlags, ModFlags } from '../catalog-types/index.js';
import { ModDB } from './mod_db_store.js';
import type { ModSource } from './mod_types.js';

const testSource = (label: string, rawLine: string): ModSource => ({
  sourceType: 'Item',
  sourceId: `test:${label}`,
  sourceLabel: label,
  rawLine,
});

describe('ModDB', () => {
  it('sums matching INC modifiers additively and multiplies MORE modifiers', () => {
    const db = new ModDB();
    db.addMods([
      {
        name: 'Damage',
        type: 'INC',
        value: 30,
        flags: ModFlags.Projectile,
        keywordFlags: KeywordFlags.None,
        source: testSource('Wand', '30% increased Projectile Damage'),
      },
      {
        name: 'ElementalDamage',
        type: 'INC',
        value: 50,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.Elemental,
        source: testSource('Belt', '50% increased Elemental Damage with Attack Skills'),
      },
      {
        name: 'Damage',
        type: 'MORE',
        value: 39,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.Elemental,
        source: testSource('Support 1', '39% more Elemental Damage with Attack Skills'),
      },
      {
        name: 'Damage',
        type: 'MORE',
        value: 25,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.Elemental,
        source: testSource('Support 2', '25% more Elemental Damage'),
      },
    ]);

    const query = {
      names: ['Damage', 'ElementalDamage', 'LightningDamage'],
      flags: ModFlags.Attack | ModFlags.Projectile | ModFlags.Hit,
      keywordFlags: KeywordFlags.Physical | KeywordFlags.Lightning,
      context: { conditions: {}, stats: {} },
    };

    expect(db.sum('INC', query)).toBe(80);
    expect(db.more(query)).toBeCloseTo(1.39 * 1.25, 6);
  });

  it('matches ancestral conversion KeywordFlags once without double counting ElementalDamage', () => {
    const db = new ModDB();
    db.addMod({
      name: 'ElementalDamage',
      type: 'INC',
      value: 45,
      flags: ModFlags.None,
      keywordFlags: KeywordFlags.Elemental,
      source: testSource('Opal Ring', '45% increased Elemental Damage'),
    });

    // Chunk converted Lightning -> Cold carries both Lightning and Cold ancestral bits.
    const convertedQuery = {
      names: ['Damage', 'ElementalDamage', 'ColdDamage'],
      flags: ModFlags.Attack | ModFlags.Hit,
      keywordFlags: KeywordFlags.Physical | KeywordFlags.Lightning | KeywordFlags.Cold,
      context: { conditions: {}, stats: {} },
    };

    expect(db.sum('INC', convertedQuery)).toBe(45);
  });

  it('evaluates Condition, StatThreshold, and PerStat modifiers accurately', () => {
    const db = new ModDB();
    db.addMods([
      {
        name: 'Damage',
        type: 'INC',
        value: 1,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        conditions: [{ type: 'PerStat', varName: 'Intelligence', divisor: 16 }],
        source: testSource('Wand', '1% increased Damage per 16 Intelligence'),
      },
      {
        name: 'Damage',
        type: 'MORE',
        value: 4,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        conditions: [{ type: 'PerStat', varName: 'FrenzyCharges', divisor: 1 }],
        source: testSource('Charges', '4% more Damage per Frenzy Charge'),
      },
      {
        name: 'Damage',
        type: 'MORE',
        value: 49,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.None,
        conditions: [{ type: 'Condition', varName: 'OnFullLife' }],
        source: testSource('Support', '49% more Damage with Attacks while on Full Life'),
      },
    ]);

    const query = {
      names: ['Damage'],
      flags: ModFlags.Attack | ModFlags.Hit,
      keywordFlags: KeywordFlags.Physical,
      context: {
        conditions: { OnFullLife: true },
        stats: { Intelligence: 320, FrenzyCharges: 3 },
      },
    };

    expect(db.sum('INC', query)).toBe(20);
    expect(db.more(query)).toBeCloseTo(1.12 * 1.49, 6);
  });

  it('supports FLAG, OVERRIDE, and source-attributed tabulate() inspection', () => {
    const db = new ModDB();
    db.addMods([
      {
        name: 'LuckyHitDamage',
        type: 'FLAG',
        value: true,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: testSource("Perquil's Toe", "Nearby Allies' Damage with Hits is Lucky"),
      },
      {
        name: 'BaseCritOverride',
        type: 'OVERRIDE',
        value: 11.5,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.None,
        source: testSource('Destructive Link', 'Override Base Crit to 11.5%'),
      },
    ]);

    expect(db.flag('LuckyHitDamage')).toBe(true);
    expect(db.override('BaseCritOverride', { flags: ModFlags.Attack })).toBe(11.5);

    const rows = db.tabulate('FLAG', {
      names: ['LuckyHitDamage'],
      flags: ModFlags.None,
      keywordFlags: KeywordFlags.None,
      context: { conditions: {}, stats: {} },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceLabel).toBe("Perquil's Toe");
  });
});

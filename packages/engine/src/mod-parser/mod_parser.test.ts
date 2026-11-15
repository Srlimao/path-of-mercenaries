import { describe, expect, it } from 'vitest';
import { KeywordFlags, ModFlags } from '../catalog-types/index.js';
import { ModDB, type ModSource } from '../mod-db/index.js';
import { parseModLineToMods } from './compile_item_mods.js';

const itemSource = (line: string): ModSource => ({
  sourceType: 'Item',
  sourceId: 'slot:Ring1',
  sourceLabel: 'Test Ring',
  rawLine: line,
});

describe('mod-parser', () => {
  it('compiles attributes, life, and negative/dual resistances cleanly', () => {
    const db = new ModDB();
    const lines = [
      '+42 to Intelligence',
      '+78 to maximum Life',
      '-60% to Lightning Resistance',
      '+16% to Fire and Cold Resistances',
      '+12% to all Elemental Resistances',
    ];
    for (const line of lines) {
      db.addMods(parseModLineToMods(line, itemSource(line)));
    }

    const q = (name: string) => ({
      names: [name],
      flags: ModFlags.None,
      keywordFlags: KeywordFlags.None,
      context: { conditions: {}, stats: {} },
    });

    expect(db.sum('BASE', q('Int'))).toBe(42);
    expect(db.sum('BASE', q('Life'))).toBe(78);
    expect(db.sum('BASE', q('LightningResist'))).toBe(-48);
    expect(db.sum('BASE', q('FireResist'))).toBe(28);
    expect(db.sum('BASE', q('ColdResist'))).toBe(28);
  });

  it('compiles flat added damage, elemental attack scaling, crit multi, and unique flags', () => {
    const db = new ModDB();
    const lines = [
      'Adds 12 to 180 Lightning Damage to Attacks',
      '45% increased Elemental Damage with Attack Skills',
      '+38% to Global Critical Strike Multiplier',
      "Nearby Allies' Damage with Hits is Lucky",
    ];
    for (const line of lines) {
      db.addMods(parseModLineToMods(line, itemSource(line)));
    }

    const attackQuery = {
      names: ['Damage', 'ElementalDamage', 'LightningDamage'],
      flags: ModFlags.Attack | ModFlags.Hit,
      keywordFlags: KeywordFlags.Lightning,
      context: { conditions: {}, stats: {} },
    };

    expect(db.sum('INC', attackQuery)).toBe(45);
    expect(db.sum('BASE', { ...attackQuery, names: ['LightningMin'] })).toBe(12);
    expect(db.sum('BASE', { ...attackQuery, names: ['LightningMax'] })).toBe(180);
    expect(db.sum('BASE', { ...attackQuery, names: ['CritMultiplier'] })).toBe(38);
    expect(db.flag('LuckyHitDamage')).toBe(true);
  });
});

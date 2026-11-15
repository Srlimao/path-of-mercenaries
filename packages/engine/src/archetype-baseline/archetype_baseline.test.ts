import { describe, expect, it } from 'vitest';
import { KeywordFlags, ModFlags, type ParsedItem } from '../catalog-types/index.js';
import { ModDB } from '../mod-db/index.js';
import { SEED_CATALOGS, findArchetypeById, findSkillById } from '../seed-catalog/index.js';
import { compileArchetypeMods, validateEquipmentForArchetype } from './compile_archetype_mods.js';

describe('archetype-baseline compiler', () => {
  it('compiles Lv 84 Infamous Kineticist attributes, hidden +35% res, and innate projectile/crit mods', () => {
    const archetype = findArchetypeById('infamous_kineticist')!;
    const db = new ModDB();
    const result = compileArchetypeMods(archetype, 84, db);

    expect(result.derivedSkillLevel).toBe(27);
    expect(result.hiddenElemResPct).toBe(35);

    const projQuery = {
      names: ['Damage', 'ProjectileDamage'],
      flags: ModFlags.Attack | ModFlags.Projectile,
      keywordFlags: KeywordFlags.Physical,
      context: { conditions: {}, stats: {} },
    };
    expect(db.sum('INC', projQuery)).toBe(35);
    expect(
      db.sum('INC', { ...projQuery, names: ['Speed'], flags: ModFlags.Attack }),
    ).toBe(15);
    expect(
      db.sum('INC', { ...projQuery, names: ['CritChance'], flags: ModFlags.None }),
    ).toBe(25);
  });

  it('scales Level 1 vs Level 85 base Life and hidden elemental resistances accurately', () => {
    const earthshaker = findArchetypeById('earthshaker')!;
    const lv1Db = new ModDB();
    const lv85Db = new ModDB();

    const lv1 = compileArchetypeMods(earthshaker, 1, lv1Db);
    const lv85 = compileArchetypeMods(earthshaker, 85, lv85Db);

    expect(lv1.hiddenElemResPct).toBe(0);
    expect(lv85.hiddenElemResPct).toBe(35);
    expect(lv85.derivedSkillLevel).toBe(28);
    expect(lv85.levelRow.baseLife).toBeGreaterThan(lv1.levelRow.baseLife * 10);
  });

  it('validates allowed main-hand and off-hand weapon classes per archetype', () => {
    const kineticist = findArchetypeById('kineticist')!;
    const bowMock: ParsedItem = {
      id: 'bow-1',
      name: 'Test Bow',
      baseType: 'Imperial Bow',
      itemClass: 'Bow',
      rarity: 'Rare',
      validSlots: ['Weapon1'],
      isTwoHanded: true,
      qualityPct: 20,
      corrupted: false,
      modLines: [],
    };
    const wandMock: ParsedItem = {
      ...bowMock,
      id: 'wand-1',
      name: 'Test Wand',
      baseType: 'Imbued Wand',
      itemClass: 'Wand',
      validSlots: ['Weapon1', 'Weapon2'],
      isTwoHanded: false,
    };

    expect(validateEquipmentForArchetype(kineticist, 'Weapon1', bowMock)).toContain('cannot equip Bow');
    expect(validateEquipmentForArchetype(kineticist, 'Weapon1', wandMock)).toBeNull();
    expect(validateEquipmentForArchetype(kineticist, 'Weapon2', wandMock)).toBeNull();
  });

  it('hydrates all 66+ PoEDB archetypes with Trarthan houses and resolvable skill pools', () => {
    expect(SEED_CATALOGS.archetypes.length).toBeGreaterThanOrEqual(66);

    const expectedHouses: Record<string, string> = {
      stormhand: 'Cyaxan',
      infamous_stormhand: 'Cyaxan',
      manyshot: 'Cyaxan',
      eruptor: 'Keita',
      blade_ambusher: 'Azadi',
      sanguimancer: 'Bardiya',
      mysterious_diver: 'Azadi',
    };

    for (const [id, house] of Object.entries(expectedHouses)) {
      const arch = findArchetypeById(id);
      expect(arch, `Expected archetype ${id}`).toBeDefined();
      expect(arch?.trarthanHouse).toBe(house);
    }

    for (const arch of SEED_CATALOGS.archetypes) {
      const allSkills = [
        ...arch.skillPool.primary,
        ...arch.skillPool.secondary,
        ...arch.skillPool.utility,
      ];
      for (const skillId of allSkills) {
        expect(findSkillById(skillId), `Missing skill ${skillId} for ${arch.id}`).toBeDefined();
      }
    }
  });
});

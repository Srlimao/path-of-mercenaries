import { describe, expect, it } from 'vitest';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { findSkillById, findSupportById, SEED_CATALOGS } from '../seed-catalog/index.js';
import {
  isSupportCompatibleWithSkill,
  rankSupportGemsForSkillGroup,
} from './rank_support_gems.js';

function createLightningWandBuild() {
  const build = createDefaultBuildState();
  build.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Thunder Rod
Prophecy Wand
--------
Physical Damage: 35-70
Critical Strike Chance: 9.00%
Attacks per Second: 1.55
--------
Adds 40 to 160 Lightning Damage`);
  return build;
}

describe('Mercenary Support Gem Optimizer (Tier I/II/III & Gilded)', () => {
  it('filters incompatible Spell and Melee supports on Attack Projectile skills', () => {
    const kb = findSkillById('kinetic_blast_of_clustering', SEED_CATALOGS)!;
    const fasterCasting = findSupportById('faster_casting', SEED_CATALOGS)!;
    const meleePhys = findSupportById('melee_physical_damage', SEED_CATALOGS)!;
    const wed = findSupportById('elemental_damage_with_attacks', SEED_CATALOGS)!;
    const gildedHeft = findSupportById('gilded_heft', SEED_CATALOGS)!;
    const returning = findSupportById('returning_projectiles', SEED_CATALOGS)!;

    expect(isSupportCompatibleWithSkill(kb, fasterCasting)).toBe(false);
    expect(isSupportCompatibleWithSkill(kb, meleePhys)).toBe(false);
    expect(isSupportCompatibleWithSkill(kb, wed)).toBe(true);
    expect(isSupportCompatibleWithSkill(kb, gildedHeft)).toBe(true);
    expect(isSupportCompatibleWithSkill(kb, returning)).toBe(true);
  });

  it('ranks compatible Mercenary supports descending by Tier III +DPS delta', () => {
    const build = createLightningWandBuild();
    const { modDb, snapshot } = calculateBuild(build, SEED_CATALOGS);
    const ranked = rankSupportGemsForSkillGroup({
      buildState: build,
      baseModDb: modDb,
      groupId: 'primary-1',
      slotIndex: 0,
      derivedSkillLevel: snapshot.derivedSkillLevel,
      accuracy: snapshot.defences.accuracy,
      mercLightningUncappedResistPct: snapshot.defences.resistances.Lightning.uncapped,
      catalogs: SEED_CATALOGS,
    });

    expect(ranked.length).toBeGreaterThan(8);
    expect(ranked[0]!.deltaFullDps).toBeGreaterThan(0);

    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.deltaFullDps).toBeGreaterThanOrEqual(ranked[i]!.deltaFullDps);
    }

    expect(ranked.some((r) => r.support.id === 'faster_casting')).toBe(false);
    expect(ranked.some((r) => r.support.id === 'melee_physical_damage')).toBe(false);

    // Gilded supports appear and provide measurable DPS gains
    const gildedCull = ranked.find((r) => r.support.id === 'gilded_cull');
    const gildedJolt = ranked.find((r) => r.support.id === 'gilded_jolt');
    const gildedHeft = ranked.find((r) => r.support.id === 'gilded_heft');
    expect(gildedCull).toBeDefined();
    expect(gildedCull!.deltaFullDps).toBeGreaterThan(0);
    expect(gildedJolt).toBeDefined();
    expect(gildedJolt!.deltaFullDps).toBeGreaterThan(0);
    expect(gildedHeft).toBeDefined();
    expect(gildedHeft!.deltaFullDps).toBeGreaterThan(0);

    // Return III applies the projectile penalty (-30% less Projectile Damage)
    const ret = ranked.find((r) => r.support.id === 'returning_projectiles');
    expect(ret).toBeDefined();
    expect(ret!.deltaDps).toBeLessThan(0);
  });

  it('scales DPS strictly across Mercenary Tier I < Tier II < Tier III', () => {
    const dpsByTier: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    for (const tier of [1, 2, 3] as const) {
      const build = createLightningWandBuild();
      build.skillGroups[0]!.supports = [
        { supportId: 'elemental_damage_with_attacks', level: tier, enabled: true },
      ];
      const { snapshot } = calculateBuild(build, SEED_CATALOGS);
      dpsByTier[tier] = snapshot.combinedFullDps;
    }

    expect(dpsByTier[1]).toBeLessThan(dpsByTier[2]);
    expect(dpsByTier[2]).toBeLessThan(dpsByTier[3]);
  });

  it('resolves legacy level 20 save slots cleanly to Tier III', () => {
    const buildLegacy = createLightningWandBuild();
    buildLegacy.skillGroups[0]!.supports = [
      { supportId: 'elemental_damage_with_attacks', level: 20, enabled: true },
    ];
    const buildTier3 = createLightningWandBuild();
    buildTier3.skillGroups[0]!.supports = [
      { supportId: 'elemental_damage_with_attacks', level: 3, enabled: true },
    ];

    const resLegacy = calculateBuild(buildLegacy, SEED_CATALOGS).snapshot;
    const resTier3 = calculateBuild(buildTier3, SEED_CATALOGS).snapshot;
    expect(resLegacy.combinedFullDps).toBe(resTier3.combinedFullDps);
  });
});

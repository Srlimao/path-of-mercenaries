import { describe, expect, it } from 'vitest';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { findSkillById, findSupportById, SEED_CATALOGS } from '../seed-catalog/index.js';
import {
  isSupportCompatibleWithSkill,
  rankSupportGemsForSkillGroup,
} from './rank_support_gems.js';

describe('Support Gem Optimizer & +DPS Sorter', () => {
  it('filters incompatible Spell/Melee supports on Attack Projectile skills', () => {
    const kb = findSkillById('kinetic_blast_of_clustering', SEED_CATALOGS)!;
    const spellEcho = findSupportById('spell_echo', SEED_CATALOGS)!;
    const wed = findSupportById('awakened_elemental_damage_with_attacks', SEED_CATALOGS)!;
    const returning = findSupportById('returning_projectiles', SEED_CATALOGS)!;

    expect(isSupportCompatibleWithSkill(kb, spellEcho)).toBe(false);
    expect(isSupportCompatibleWithSkill(kb, wed)).toBe(true);
    expect(isSupportCompatibleWithSkill(kb, returning)).toBe(true);
  });

  it('ranks compatible Support Gems descending by live +DPS delta', () => {
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

    expect(ranked.length).toBeGreaterThan(5);
    expect(ranked[0]!.deltaFullDps).toBeGreaterThan(0);

    // Strictly non-increasing order across non-duplicate compatible supports
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.deltaFullDps).toBeGreaterThanOrEqual(ranked[i]!.deltaFullDps);
    }

    // Spell Echo must not appear among compatible supports
    expect(ranked.some((r) => r.support.id === 'spell_echo')).toBe(false);

    // Deadly Ailments lowers hit DPS (80% less Damage with Hits)
    const deadly = ranked.find((r) => r.support.id === 'deadly_ailments');
    if (deadly) {
      expect(deadly.deltaDps).toBeLessThan(0);
    }

    // Returning Projectiles boosts Projectile skill Full DPS
    const ret = ranked.find((r) => r.support.id === 'returning_projectiles');
    expect(ret).toBeDefined();
    expect(ret!.deltaFullDps).toBeGreaterThan(0);
  });
});

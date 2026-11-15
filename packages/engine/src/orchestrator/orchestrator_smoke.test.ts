import { describe, expect, it } from 'vitest';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild } from './calculate_build.js';
import { createDefaultBuildState } from './create_default_build_state.js';

const SAMPLE_WAND = `Item Class: Wand
Rarity: Rare
Storm Bite
Imbued Wand
--------
Quality: +20% (augmented)
--------
120% increased Physical Damage
Adds 10 to 150 Lightning Damage
20% increased Attack Speed
+30% to Global Critical Strike Multiplier`;

describe('calculateBuild baseline & Phase 3/4 integration tests', () => {
  it('computes Level 84 Kineticist baseline stats, hidden +35% elemental res, and Skill Lv 27', () => {
    const start = performance.now();
    const state = createDefaultBuildState();
    const { snapshot, modDb } = calculateBuild(state);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(20);
    expect(snapshot.archetypeId).toBe('kineticist');
    expect(snapshot.mercLevel).toBe(84);
    expect(snapshot.derivedSkillLevel).toBe(27);
    expect(snapshot.defences.maxLife).toBeGreaterThan(2000);
    expect(snapshot.defences.int).toBeGreaterThan(snapshot.defences.str);
    expect(snapshot.defences.resistances.Fire.hiddenBaselinePct).toBe(35);
    expect(snapshot.defences.resistances.Cold.capped).toBe(35);
    expect(snapshot.defences.resistances.Lightning.uncapped).toBe(35);
    expect(snapshot.activePartResult?.skillId).toBe('kinetic_blast_of_clustering');
    expect(snapshot.activePartResult?.effectiveSkillLevel).toBe(27);
    expect(modDb.getAllMods().length).toBeGreaterThan(0);
  });

  it('recalculates DPS, Crit, and weapon warnings when items are equipped', () => {
    const state = createDefaultBuildState();
    const baseline = calculateBuild(state);

    state.equippedItems.Weapon1 = parsePoeItemClipboard(SAMPLE_WAND);
    const withWand = calculateBuild(state);

    expect(withWand.snapshot.warnings).toHaveLength(0);
    expect(withWand.snapshot.activeSkillDps).toBeGreaterThan(baseline.snapshot.activeSkillDps);
    expect(withWand.snapshot.activePartResult?.effectiveActionRate).toBeGreaterThan(1.8);
    expect(withWand.snapshot.activePartResult?.critMultiplierPct).toBe(180);
  });
});

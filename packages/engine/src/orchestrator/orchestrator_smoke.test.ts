import { describe, expect, it } from 'vitest';
import { calculateBuild } from './calculate_build.js';
import { createDefaultBuildState } from './create_default_build_state.js';

describe('calculateBuild baseline smoke tests', () => {
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
});

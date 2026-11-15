import { describe, expect, it } from 'vitest';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { SEED_CATALOGS } from '../seed-catalog/index.js';

describe('Damage Pipeline Stage 9: Impale & Anti-Double-Dipping Ailments', () => {
  it('prevents Projectile and Area Hit modifiers from double-dipping onto Ignite, Bleed, or Poison DPS', () => {
    const base = createDefaultBuildState();
    base.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Blight Spine
Prophecy Wand
--------
Physical Damage: 80-140
Critical Strike Chance: 8.50%
Attacks per Second: 1.50
--------
Adds 50 to 90 Fire Damage
Adds 40 to 80 Chaos Damage`);

    const before = calculateBuild(base, SEED_CATALOGS).snapshot;
    const beforeProj = before.skillResults.find((r) => r.partId === 'projectile')!;
    const beforeExp = before.skillResults.find((r) => r.partId === 'clustering_explosion')!;

    expect(beforeProj.igniteDps).toBeGreaterThan(0);
    expect(beforeProj.bleedDps).toBeGreaterThan(0);
    expect(beforeProj.poisonDps).toBeGreaterThan(0);

    const boosted = structuredClone(base);
    boosted.partyConfig.customModifierLines = [
      '40% increased Projectile Damage',
      '40% increased Area Damage',
    ];
    const after = calculateBuild(boosted, SEED_CATALOGS).snapshot;
    const afterProj = after.skillResults.find((r) => r.partId === 'projectile')!;
    const afterExp = after.skillResults.find((r) => r.partId === 'clustering_explosion')!;

    expect(afterProj.hitDps).toBeGreaterThan(beforeProj.hitDps);
    expect(afterExp.hitDps).toBeGreaterThan(beforeExp.hitDps);

    expect(afterProj.igniteDps).toBeCloseTo(beforeProj.igniteDps, 4);
    expect(afterProj.bleedDps).toBeCloseTo(beforeProj.bleedDps, 4);
    expect(afterProj.poisonDps).toBeCloseTo(beforeProj.poisonDps, 4);
    expect(afterExp.igniteDps).toBeCloseTo(beforeExp.igniteDps, 4);
  });

  it('scales Ignite/Bleed/Poison cleanly with DoT Multi, Ailment Damage, and Poison Duration', () => {
    const base = createDefaultBuildState();
    base.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Viper Rod
Prophecy Wand
--------
Physical Damage: 80-140
Critical Strike Chance: 8.00%
Attacks per Second: 1.50
--------
Adds 60 to 100 Fire Damage
Adds 40 to 80 Chaos Damage`);

    const before = calculateBuild(base, SEED_CATALOGS).snapshot.activePartResult!;

    const dotScaled = structuredClone(base);
    dotScaled.partyConfig.customModifierLines = [
      '+50% to Damage over Time Multiplier',
      '40% increased Damage with Ailments',
      '50% increased Poison Duration on Enemies',
    ];
    const after = calculateBuild(dotScaled, SEED_CATALOGS).snapshot.activePartResult!;

    expect(after.hitDps).toBeCloseTo(before.hitDps, 4);
    expect(after.igniteDps).toBeCloseTo(before.igniteDps * 1.5 * 1.4, 0);
    expect(after.bleedDps).toBeCloseTo(before.bleedDps * 1.5 * 1.4, 0);
    expect(after.poisonDps).toBeCloseTo(before.poisonDps * 1.5 * 1.4 * 1.5, 0);
  });

  it('computes Impale DPS scaled by Impale Chance and Impale Effect on Physical attacks', () => {
    const build = createDefaultBuildState();
    build.archetypeId = 'blademaster';
    build.skillGroups[0]!.skillId = 'reave';
    build.skillGroups[0]!.activePartId = 'reave_hit';
    build.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: One Hand Sword
Rarity: Rare
Impale Edge
Jewelled Foil
--------
Physical Damage: 120-200
Critical Strike Chance: 6.00%
Attacks per Second: 1.60`);

    build.partyConfig.customModifierLines = ['50% chance to Impale Enemies on Hit'];
    const baseImpale = calculateBuild(build, SEED_CATALOGS).snapshot.activePartResult!.impaleDps;
    expect(baseImpale).toBeGreaterThan(0);

    build.partyConfig.customModifierLines = [
      '50% chance to Impale Enemies on Hit',
      '40% increased Impale Effect',
    ];
    const scaledImpale = calculateBuild(build, SEED_CATALOGS).snapshot.activePartResult!.impaleDps;
    expect(scaledImpale).toBeCloseTo(baseImpale * 1.4, 1);
  });
});

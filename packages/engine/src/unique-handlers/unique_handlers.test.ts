import { describe, expect, it } from 'vitest';
import { createParsedItemFromUnique, parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { ENEMY_BOSS_PRESETS } from '../damage-pipeline/index.js';
import { SEED_CATALOGS, SEED_UNIQUES } from '../seed-catalog/index.js';

function equipUnique(id: string) {
  const def = SEED_UNIQUES.find((u) => u.id === id);
  if (!def) throw new Error(`Missing unique '${id}' in SEED_UNIQUES`);
  return createParsedItemFromUnique(def, SEED_CATALOGS);
}

describe('Phase 10.1 Build-Around Unique Handlers', () => {
  it("Kineticist golden fixture: KB + Flame Link + Perquil's Toe + Doryani's Prototype (-188% Light Res)", () => {
    const build = createDefaultBuildState();
    build.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Storm Bite
Prophecy Wand
--------
Physical Damage: 35-70
Critical Strike Chance: 9.00%
Attacks per Second: 1.50
--------
Adds 20 to 220 Lightning Damage`);
    build.partyConfig.links.flameLink = {
      enabled: true,
      gemLevel: 20,
      playerMaxLife: 9000,
      linkEffectPct: 0,
    };

    const baseline = calculateBuild(build, SEED_CATALOGS);
    expect(baseline.snapshot.activePartResult?.isLuckyDamage).toBe(false);

    build.equippedItems.Amulet = equipUnique('perquils_toe');
    build.equippedItems.BodyArmour = equipUnique('doryanis_prototype');
    build.partyConfig.customModifierLines = ['-223% to Lightning Resistance'];

    const combo = calculateBuild(build, SEED_CATALOGS);
    expect(combo.snapshot.defences.resistances.Lightning.uncapped).toBe(-188);
    expect(combo.snapshot.activePartResult?.isLuckyDamage).toBe(true);
    expect(combo.snapshot.activePartResult?.perTypeBreakdown.Lightning.enemyEffectiveResistPct).toBe(-188);
    expect(combo.snapshot.combinedFullDps).toBeGreaterThan(baseline.snapshot.combinedFullDps * 2.5);
  });

  it("Rakiata's Dance inverts Pinnacle Boss elemental resistances from +50% to -50%", () => {
    const build = createDefaultBuildState();
    build.archetypeId = 'blademaster';
    build.activeSkillGroupId = 'primary-1';
    build.skillGroups[0]!.skillId = 'reave';
    build.skillGroups[0]!.activePartId = 'reave_hit';
    build.equippedItems.Weapon1 = equipUnique('rakiatas_dance');

    const { snapshot } = calculateBuild(build, SEED_CATALOGS);
    const bd = snapshot.activePartResult?.perTypeBreakdown;
    expect(snapshot.warnings).toHaveLength(0);
    expect(bd?.Fire.enemyEffectiveResistPct).toBe(-50);
    expect(bd?.Cold.enemyEffectiveResistPct).toBe(-50);
    expect(bd?.Lightning.enemyEffectiveResistPct).toBe(-50);
  });

  it('Heatshiver + Yoke of Suffering + The Taming scale Cold->Fire, Taken, and Hit/Ailment Damage', () => {
    const build = createDefaultBuildState();
    build.enemyConfig.baseResistsPct = { ...ENEMY_BOSS_PRESETS.pinnacle.baseResistsPct };
    build.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Glacier Wand
Imbued Wand
--------
Physical Damage: 30-60
Critical Strike Chance: 8.50%
Attacks per Second: 1.50
--------
Adds 120 to 200 Cold Damage`);
    build.equippedItems.Helmet = equipUnique('heatshiver');
    build.equippedItems.Amulet = equipUnique('yoke_of_suffering');
    build.equippedItems.Ring1 = equipUnique('the_taming');

    const coldNoAilments = calculateBuild(build, SEED_CATALOGS);

    build.enemyConfig.isChilled = true;
    build.enemyConfig.isFrozen = true;
    build.enemyConfig.isIgnited = true;
    build.enemyConfig.shockPct = 20;

    const withAilments = calculateBuild(build, SEED_CATALOGS);
    expect(
      withAilments.snapshot.activePartResult?.perTypeBreakdown.Fire.gainedAsExtra.avg ?? 0,
    ).toBeGreaterThan(0);
    expect(withAilments.snapshot.activeSkillDps).toBeGreaterThan(
      coldNoAilments.snapshot.activeSkillDps * 2,
    );
  });

  it('Voidforge (700% random ele + no non-ele) and Original Sin (ele->chaos + 0% enemy chaos res)', () => {
    const build = createDefaultBuildState();
    build.archetypeId = 'blademaster';
    build.skillGroups[0]!.skillId = 'reave';
    build.skillGroups[0]!.activePartId = 'reave_hit';
    build.equippedItems.Weapon1 = equipUnique('voidforge');

    const voidOut = calculateBuild(build, SEED_CATALOGS);
    const voidBd = voidOut.snapshot.activePartResult?.perTypeBreakdown;
    expect(voidBd?.Physical.finalAverageHit).toBe(0);
    expect(voidBd?.Fire.finalAverageHit).toBeGreaterThan(0);
    expect(voidBd?.Cold.finalAverageHit).toBeGreaterThan(0);
    expect(voidBd?.Lightning.finalAverageHit).toBeGreaterThan(0);

    const sinBuild = createDefaultBuildState();
    sinBuild.archetypeId = 'blademaster';
    sinBuild.skillGroups[0]!.skillId = 'reave';
    sinBuild.skillGroups[0]!.activePartId = 'reave_hit';
    sinBuild.equippedItems.Weapon1 = equipUnique('rakiatas_dance');
    sinBuild.equippedItems.Ring1 = equipUnique('original_sin');
    const sinOut = calculateBuild(sinBuild, SEED_CATALOGS);
    const sinBd = sinOut.snapshot.activePartResult?.perTypeBreakdown;
    expect(sinBd?.Fire.finalAverageHit).toBe(0);
    expect(sinBd?.Cold.finalAverageHit).toBe(0);
    expect(sinBd?.Lightning.finalAverageHit).toBe(0);
    expect(sinBd?.Chaos.enemyEffectiveResistPct).toBe(0);
    expect(sinBd?.Chaos.finalAverageHit).toBeGreaterThan(0);

    // Voidforge ("Deal no Non-Elemental") + Original Sin ("Ele -> Chaos") results in 0 damage
    build.equippedItems.Ring1 = equipUnique('original_sin');
    const trapOut = calculateBuild(build, SEED_CATALOGS);
    expect(trapOut.snapshot.activePartResult?.averageHit).toBe(0);
  });
});

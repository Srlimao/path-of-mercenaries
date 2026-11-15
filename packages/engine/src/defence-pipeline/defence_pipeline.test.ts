import { describe, expect, it } from 'vitest';
import { createParsedItemFromUnique } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { SEED_CATALOGS, SEED_UNIQUES } from '../seed-catalog/index.js';

function equipUnique(id: string) {
  const def = SEED_UNIQUES.find((u) => u.id === id)!;
  return createParsedItemFromUnique(def, SEED_CATALOGS);
}

describe('Phase 11.1 Full Defensive & EHP Pipeline', () => {
  it('verifies Level 84 +35% hidden res baseline and raised Maximum Resistance cap', () => {
    const build = createDefaultBuildState();
    build.partyConfig.customModifierLines = [
      '+60% to all Elemental Resistances',
      '+3% to all maximum Elemental Resistances',
    ];
    const { snapshot } = calculateBuild(build, SEED_CATALOGS);
    expect(snapshot.defences.resistances.Fire.hiddenBaselinePct).toBe(35);
    expect(snapshot.defences.resistances.Fire.maxCap).toBe(78);
    expect(snapshot.defences.resistances.Fire.capped).toBe(78);
    expect(snapshot.defences.resistances.Fire.uncapped).toBe(95);
  });

  it("raises Physical Max Hit Taken via quadratic Armour + Cloak of Flame + Dawnbreaker shift", () => {
    const bare = createDefaultBuildState();
    bare.partyConfig.customModifierLines = [
      '+20000 to Armour',
      '+40% to Fire Resistance',
    ];
    const bareDef = calculateBuild(bare, SEED_CATALOGS).snapshot.defences;

    const shifted = structuredClone(bare);
    shifted.equippedItems.BodyArmour = equipUnique('cloak_of_flame');
    shifted.equippedItems.Weapon2 = equipUnique('dawnbreaker');
    const shiftedDef = calculateBuild(shifted, SEED_CATALOGS).snapshot.defences;

    expect(shiftedDef.physTakenAsPct.Fire).toBe(60);
    expect(shiftedDef.maxHitTaken.Physical).toBeGreaterThan(bareDef.maxHitTaken.Physical);
  });

  it("applies Armour to Lightning Max Hit when wearing Doryani's Prototype at -188% Lightning Res", () => {
    const noDoryani = createDefaultBuildState();
    noDoryani.partyConfig.customModifierLines = [
      '+30000 to Armour',
      '-223% to Lightning Resistance',
    ];
    const noDorDef = calculateBuild(noDoryani, SEED_CATALOGS).snapshot.defences;

    const withDoryani = structuredClone(noDoryani);
    withDoryani.equippedItems.BodyArmour = equipUnique('doryanis_prototype');
    const dorDef = calculateBuild(withDoryani, SEED_CATALOGS).snapshot.defences;

    expect(dorDef.resistances.Lightning.uncapped).toBe(-188);
    expect(dorDef.maxHitTaken.Lightning).toBeGreaterThan(noDorDef.maxHitTaken.Lightning * 2);
  });

  it('computes Evasion, Intuitive Link Block, Spell Suppression, EHP, and Net Life Recovery/s', () => {
    const base = createDefaultBuildState();
    const baseDef = calculateBuild(base, SEED_CATALOGS).snapshot.defences;

    const tank = structuredClone(base);
    tank.partyConfig.links.intuitiveLink = {
      enabled: true,
      blockPct: 60,
      spellBlockPct: 60,
    };
    tank.partyConfig.customModifierLines = [
      '+40000 to Evasion Rating',
      '+100% chance to Suppress Spell Damage',
      'Regenerate 150 Life per second',
      'Regenerate 2% of Life per second',
    ];
    const tankDef = calculateBuild(tank, SEED_CATALOGS).snapshot.defences;

    expect(tankDef.evadeChancePct).toBeGreaterThan(50);
    expect(tankDef.attackBlockPct).toBe(60);
    expect(tankDef.spellBlockPct).toBe(60);
    expect(tankDef.spellSuppressionPct).toBe(100);
    expect(tankDef.effectiveHitPool).toBeGreaterThan(baseDef.effectiveHitPool * 2);
    expect(tankDef.netLifeRecoveryPerSec).toBe(
      Math.round(150 + 0.02 * tankDef.maxLife),
    );
  });
});

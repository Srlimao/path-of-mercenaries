import { describe, expect, it } from 'vitest';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { computeItemSlotDiff } from './compute_item_slot_diff.js';
import {
  extractScalableModMeta,
  rebuildEditedItem,
  scaleModLineByRollPct,
} from './item_roll_scaler.js';

const CANDIDATE_WAND = `Item Class: Wand
Rarity: Rare
Storm Bite
Tornado Wand
--------
Quality: +20%
--------
100% increased Physical Damage
Adds 20 to 220 Lightning Damage
18% increased Attack Speed`;

const CANDIDATE_RING = `Item Class: Ring
Rarity: Rare
Blight Gyre
Opal Ring
--------
24% increased Elemental Damage with Attack Skills (implicit)
--------
+80 to maximum Life
+42% to Fire Resistance
+36% to Cold Resistance`;

describe('item-diff-calculator', () => {
  it('computes exact slot diffs identical to manual equip + calculateBuild', () => {
    const state = createDefaultBuildState();
    const wand = parsePoeItemClipboard(CANDIDATE_WAND);
    const wandDiff = computeItemSlotDiff(state, 'Weapon1', wand);

    const manualState = {
      ...state,
      equippedItems: { ...state.equippedItems, Weapon1: wand },
    };
    const manualSnapshot = calculateBuild(manualState).snapshot;

    expect(wandDiff.candidateSnapshot.combinedFullDps).toBeCloseTo(
      manualSnapshot.combinedFullDps,
      6,
    );
    expect(wandDiff.deltaFullDps).toBeCloseTo(
      manualSnapshot.combinedFullDps - wandDiff.baselineSnapshot.combinedFullDps,
      6,
    );
    expect(wandDiff.deltaFullDps).toBeGreaterThan(0);

    const ring = parsePoeItemClipboard(CANDIDATE_RING);
    const ringDiff = computeItemSlotDiff(manualState, 'Ring1', ring, undefined, manualSnapshot);

    const manualAfterRing = calculateBuild({
      ...manualState,
      equippedItems: { ...manualState.equippedItems, Ring1: ring },
    }).snapshot;

    expect(ringDiff.deltaLife).toBe(
      manualAfterRing.defences.maxLife - manualSnapshot.defences.maxLife,
    );
    expect(ringDiff.deltaEhp).toBeCloseTo(
      manualAfterRing.defences.effectiveHitPool - manualSnapshot.defences.effectiveHitPool,
      6,
    );
    expect(ringDiff.deltaResistances.Fire).toBe(42);
    expect(ringDiff.deltaResistances.Cold).toBe(36);
  });

  it('scales mod rolls across 0%-100% and rebuilds quality + Stage 1 local weapon DPS', () => {
    const line = 'Adds 20 to 220 Lightning Damage';
    const meta = extractScalableModMeta(line);
    expect(meta.hasNumbers).toBe(true);
    expect(scaleModLineByRollPct(line, 50)).toBe(line);

    const minRoll = scaleModLineByRollPct(line, 0);
    const maxRoll = scaleModLineByRollPct(line, 100);
    expect(minRoll).toBe('Adds 15 to 165 Lightning Damage');
    expect(maxRoll).toBe('Adds 25 to 275 Lightning Damage');

    const baseWand = parsePoeItemClipboard(CANDIDATE_WAND);
    const upgraded = rebuildEditedItem(baseWand, {
      qualityPct: 30,
      catalystType: 'Elemental',
      explicitModLines: ['125% increased Physical Damage', maxRoll, '18% increased Attack Speed'],
    });

    expect(upgraded.qualityPct).toBe(30);
    expect(upgraded.catalystType).toBe('Elemental');
    expect(upgraded.localWeaponStats?.totalDps).toBeGreaterThan(
      baseWand.localWeaponStats?.totalDps ?? 0,
    );
  });
});

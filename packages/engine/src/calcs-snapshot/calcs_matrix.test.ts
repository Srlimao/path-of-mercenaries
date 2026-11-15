import { describe, expect, it } from 'vitest';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { calculateBuild, createDefaultBuildState } from '../orchestrator/index.js';
import { SEED_CATALOGS } from '../seed-catalog/index.js';
import { inspectCalcsRowModifiers } from './build_calcs_matrix.js';

describe('Phase 12 Calcs Breakdown Matrix & Source Attribution', () => {
  it('populates OFFENCE and DEFENCE 6-column rows and attributes item/aura sources', () => {
    const build = createDefaultBuildState();
    build.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Arcane Spike
Imbued Wand
--------
Physical Damage: 30-60
Critical Strike Chance: 8.50%
Attacks per Second: 1.50
--------
Adds 25 to 180 Lightning Damage`);
    build.equippedItems.Ring1 = parsePoeItemClipboard(`Item Class: Rings
Rarity: Rare
Storm Loop
Opal Ring
--------
Adds 12 to 48 Lightning Damage to Attacks`);
    build.partyConfig.auras.wrath = { enabled: true, level: 20 };

    const { snapshot, modDb } = calculateBuild(build, SEED_CATALOGS);
    const offenceRows = snapshot.calcsRows.filter((r) => r.section === 'OFFENCE');
    const defenceRows = snapshot.calcsRows.filter((r) => r.section === 'DEFENCE');

    expect(offenceRows.length).toBeGreaterThanOrEqual(10);
    expect(defenceRows.length).toBeGreaterThanOrEqual(4);

    const addedRow = offenceRows.find((r) => r.rowId === 'added_damage');
    expect(addedRow).toBeDefined();
    expect(String(addedRow!.valuesByType.Lightning)).not.toBe('—');

    const sources = inspectCalcsRowModifiers(addedRow!, modDb);
    expect(sources.some((s) => s.sourceLabel.includes('Storm Loop'))).toBe(true);
    expect(sources.some((s) => s.sourceLabel.includes('Wrath'))).toBe(true);
  });
});

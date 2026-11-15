import { describe, expect, it } from 'vitest';
import { SEED_CATALOGS } from '../seed-catalog/index.js';
import {
  createParsedItemFromUnique,
  parsePoeItemClipboard,
  serializeItemToClipboard,
} from './poe_clipboard_parser.js';

const SAMPLE_RARE_WAND = `Item Class: Wand
Rarity: Rare
Havoc Spiker
Imbued Wand
--------
Quality: +20% (augmented)
--------
33% increased Spell Damage (implicit)
--------
140% increased Physical Damage
Adds 18 to 35 Physical Damage
Adds 10 to 160 Lightning Damage
22% increased Attack Speed
25% increased Critical Strike Chance
+34% to Global Critical Strike Multiplier (crafted)`;

describe('item-parser & Stage 1 local weapon math', () => {
  it('parses a Rare Imbued Wand Ctrl+C block and calculates exact local pDPS, eDPS, APS, and Crit', () => {
    const item = parsePoeItemClipboard(SAMPLE_RARE_WAND);

    expect(item.rarity).toBe('Rare');
    expect(item.itemClass).toBe('Wand');
    expect(item.validSlots).toEqual(['Weapon1', 'Weapon2']);
    expect(item.qualityPct).toBe(20);

    // Base Imbued Wand: 27-50 phys, 1.50 APS, 8.0% crit
    // + (18-35) flat phys -> 45-85 * (1 + 1.40 + 0.20 = 2.60) -> 117 to 221 phys
    expect(item.localWeaponStats?.physMin).toBe(117);
    expect(item.localWeaponStats?.physMax).toBe(221);
    expect(item.localWeaponStats?.aps).toBe(1.83); // 1.5 * 1.22 = 1.83
    expect(item.localWeaponStats?.critChancePct).toBe(10); // 8.0 * 1.25 = 10.0

    const expectedPhysDps = Number((((117 + 221) / 2) * 1.83).toFixed(1));
    const expectedEleDps = Number((((10 + 160) / 2) * 1.83).toFixed(1));
    expect(item.localWeaponStats?.physDps).toBe(expectedPhysDps);
    expect(item.localWeaponStats?.eleDps).toBe(expectedEleDps);

    // Local weapon mods must be marked isLocal=true; global crit multi stays non-local
    const craftedMulti = item.modLines.find((m) => m.rawText.includes('Multiplier'));
    const localAs = item.modLines.find((m) => m.rawText.includes('Attack Speed'));
    expect(localAs?.isLocal).toBe(true);
    expect(craftedMulti?.isLocal).toBeUndefined();
  });

  it("materializes Piscator's Vigil with 0 local physical damage and Doryani's Prototype with Armour/ES", () => {
    const piscators = SEED_CATALOGS.uniques.find((u) => u.id === 'piscators_vigil')!;
    const doryanis = SEED_CATALOGS.uniques.find((u) => u.id === 'doryanis_prototype')!;

    const wand = createParsedItemFromUnique(piscators);
    const armour = createParsedItemFromUnique(doryanis, SEED_CATALOGS, 20);

    expect(wand.localWeaponStats?.physMin).toBe(0);
    expect(wand.localWeaponStats?.physMax).toBe(0);
    expect(wand.localWeaponStats?.aps).toBe(1.53); // 1.3 * 1.18 = 1.534 -> 1.53

    // Saint's Hauberk base: 492 Armour, 96 ES; +180% inc + 20% qual = 3.0x
    expect(armour.localArmourStats?.armour).toBe(1476);
    expect(armour.localArmourStats?.energyShield).toBe(288);

    // Round-trip clipboard serialization preserves name & rarity
    const roundTripped = parsePoeItemClipboard(serializeItemToClipboard(armour));
    expect(roundTripped.name).toBe("Doryani's Prototype");
    expect(roundTripped.rarity).toBe('Unique');
  });
});

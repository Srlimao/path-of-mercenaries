import { describe, expect, it } from 'vitest';
import { ModFlags } from '../catalog-types/index.js';
import { ModDB } from '../mod-db/index.js';
import { createParsedItemFromUnique } from '../item-parser/index.js';
import { SEED_CATALOGS } from '../seed-catalog/index.js';
import { createDefaultBuildState } from '../orchestrator/create_default_build_state.js';
import { calculateBuild } from '../orchestrator/calculate_build.js';
import { compilePlayerLinkMods, computeFlameLinkAddedFire } from './compile_player_links.js';
import { compilePlayerAuraMods } from './compile_player_auras.js';
import { compileCombatConditionMods } from './compile_combat_conditions.js';
import { exportMercenaryAsPobParty } from './export_mercenary_party_pob.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeStoredZlibPobCode(code: string): string {
  const std = code.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const bytes: number[] = [];
  for (let i = 0; i < std.length; i += 4) {
    const c0 = B64.indexOf(std[i]!);
    const c1 = B64.indexOf(std[i + 1]!);
    const c2 = i + 2 < std.length ? B64.indexOf(std[i + 2]!) : 0;
    const c3 = i + 3 < std.length ? B64.indexOf(std[i + 3]!) : 0;
    const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    bytes.push((n >> 16) & 0xff);
    if (i + 2 < std.length) bytes.push((n >> 8) & 0xff);
    if (i + 3 < std.length) bytes.push(n & 0xff);
  }
  const u8 = new Uint8Array(bytes);
  expect((u8[0]! * 256 + u8[1]!) % 31).toBe(0);
  const payloadChunks: number[] = [];
  let pos = 2;
  let isFinal = 0;
  while (!isFinal) {
    const hdr = u8[pos++]!;
    isFinal = hdr & 0x01;
    expect((hdr >> 1) & 0x03).toBe(0);
    const len = u8[pos]! | (u8[pos + 1]! << 8);
    const nlen = u8[pos + 2]! | (u8[pos + 3]! << 8);
    pos += 4;
    expect((len ^ 0xffff) & 0xffff).toBe(nlen);
    for (let j = 0; j < len; j++) {
      payloadChunks.push(u8[pos++]!);
    }
  }
  const raw = new Uint8Array(payloadChunks);
  let s1 = 1;
  let s2 = 0;
  for (const b of raw) {
    s1 = (s1 + b) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const expectedAdler = (((s2 << 16) | s1) >>> 0);
  const actualAdler =
    (((u8[pos]! << 24) | (u8[pos + 1]! << 16) | (u8[pos + 2]! << 8) | u8[pos + 3]!) >>> 0);
  expect(actualAdler).toBe(expectedAdler);
  return new TextDecoder().decode(raw);
}

describe('Party Links, Player Auras, Conditions & Mercenary->PoB Party Export', () => {
  it('computes Flame Link with 9,000 Player Max Life and Destructive Link base crit override', () => {
    const fire = computeFlameLinkAddedFire(20, 9000, 0);
    expect(fire.min).toBeGreaterThan(485);
    expect(fire.max).toBeGreaterThan(505);

    const build = createDefaultBuildState();
    build.partyConfig.links.flameLink = {
      enabled: true,
      gemLevel: 20,
      playerMaxLife: 9000,
      linkEffectPct: 20,
    };
    build.partyConfig.links.destructiveLink = {
      enabled: true,
      gemLevel: 20,
      playerMainHandCritPct: 11.5,
    };

    const modDb = new ModDB();
    compilePlayerLinkMods(build.partyConfig, modDb);
    const ctx = { conditions: {}, stats: {} };
    expect(modDb.sum('BASE', { names: ['FireMin'], flags: ModFlags.Attack, keywordFlags: 0, context: ctx })).toBeGreaterThan(580);
    expect(modDb.override('DestructiveLinkMainHandCritOverride', { flags: ModFlags.Attack, context: ctx })).toBeCloseTo(11.5, 2);
  });

  it('scales Player Auras and Pyroclast Mines by Global Aura Effect % + Generosity', () => {
    const baseCfg = createDefaultBuildState().partyConfig;
    baseCfg.auras.anger = { enabled: true, level: 20 };
    baseCfg.pyroclastMineCount = 10;
    baseCfg.globalPlayerAuraEffectPct = 0;

    const db0 = new ModDB();
    compilePlayerAuraMods(baseCfg, db0);
    const baseFireMin = db0.sum('BASE', { names: ['FireMin'], flags: ModFlags.Attack, keywordFlags: 0, context: { conditions: {}, stats: {} } });

    baseCfg.globalPlayerAuraEffectPct = 150;
    baseCfg.generositySupported = true;
    const dbScaled = new ModDB();
    compilePlayerAuraMods(baseCfg, dbScaled);
    const scaledFireMin = dbScaled.sum('BASE', { names: ['FireMin'], flags: ModFlags.Attack, keywordFlags: 0, context: { conditions: {}, stats: {} } });

    expect(scaledFireMin).toBeGreaterThan(baseFireMin * 2.7);
  });

  it('compiles Ralakesh charges and custom modifiers, returning unrecognized lines', () => {
    const build = createDefaultBuildState();
    const ralakesh = SEED_CATALOGS.uniques.find((u) => u.id === 'ralakeshs_impatience')!;
    build.equippedItems.Boots = createParsedItemFromUnique(ralakesh, SEED_CATALOGS);
    build.partyConfig.customModifierLines = [
      '+40 to maximum Life',
      'Some completely unknown fake stat line',
    ];

    const modDb = new ModDB();
    const unrecognized = compileCombatConditionMods(build, modDb);
    expect(unrecognized).toEqual(['Some completely unknown fake stat line']);
    const ctx = { conditions: {}, stats: {} };
    expect(modDb.sum('BASE', { names: ['FireResist'], flags: 0, keywordFlags: 0, context: ctx })).toBe(12);
    expect(modDb.more({ names: ['Damage'], flags: 0, keywordFlags: 0, context: ctx })).toBeCloseTo(1.12, 2);
  });

  it('exports Mercenary Aurabot buffs to valid zlib+base64url PoB <Party> XML', () => {
    const build = createDefaultBuildState();
    const perquil = SEED_CATALOGS.uniques.find((u) => u.id === 'perquils_toe')!;
    const kingmaker = SEED_CATALOGS.uniques.find((u) => u.id === 'kingmaker')!;
    const doryani = SEED_CATALOGS.uniques.find((u) => u.id === 'doryanis_prototype')!;
    build.equippedItems.Amulet = createParsedItemFromUnique(perquil, SEED_CATALOGS);
    build.equippedItems.Weapon1 = createParsedItemFromUnique(kingmaker, SEED_CATALOGS);
    build.equippedItems.BodyArmour = createParsedItemFromUnique(doryani, SEED_CATALOGS);

    const { snapshot } = calculateBuild(build, SEED_CATALOGS);
    const exported = exportMercenaryAsPobParty(build, snapshot, SEED_CATALOGS);

    expect(exported.partyMemberStatsLines).toContain('Your Damage with Hits is Lucky');
    expect(exported.partyMemberStatsLines).toContain('+50% to Critical Strike Multiplier');
    expect(exported.enemyModLines.some((l) => l.includes("Doryani's Prototype"))).toBe(true);

    const decodedXml = decodeStoredZlibPobCode(exported.pobPartyCode);
    expect(decodedXml).toContain('<PathOfBuilding>');
    expect(decodedXml).toContain('<ExportedBuffs name="PartyMemberStats">');
    expect(decodedXml).toContain('Your Damage with Hits is Lucky');
  });
});

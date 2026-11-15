import {
  SEED_CATALOGS,
  createDefaultBuildState,
  parsePoeItemClipboard,
  type EquipmentSlot,
  type MercenaryBuildState,
} from '@pom/engine';
import type { Context } from 'hono';
import type { WorkerBindings } from './index.js';

export interface GggItemJson {
  name?: string;
  typeLine?: string;
  baseType?: string;
  rarity?: string;
  frameType?: number;
  inventoryId?: string;
  implicitMods?: string[];
  explicitMods?: string[];
  craftedMods?: string[];
  enchantMods?: string[];
}

export interface GggCharacterWindowResponse {
  character?: {
    name?: string;
    level?: number;
    class?: string;
  };
  items?: GggItemJson[];
}

const INVENTORY_SLOT_MAP: Record<string, EquipmentSlot> = {
  Weapon: 'Weapon1',
  Offhand: 'Weapon2',
  Helm: 'Helmet',
  BodyArmour: 'BodyArmour',
  Gloves: 'Gloves',
  Boots: 'Boots',
  Amulet: 'Amulet',
  Ring: 'Ring1',
  Ring2: 'Ring2',
  Belt: 'Belt',
  MercenaryWeapon: 'Weapon1',
  MercenaryOffhand: 'Weapon2',
  MercenaryHelm: 'Helmet',
  MercenaryBodyArmour: 'BodyArmour',
  MercenaryGloves: 'Gloves',
  MercenaryBoots: 'Boots',
  MercenaryAmulet: 'Amulet',
  MercenaryRing: 'Ring1',
  MercenaryRing2: 'Ring2',
  MercenaryBelt: 'Belt',
};

function rarityFromFrameType(frameType?: number): string {
  if (frameType === 3) return 'Unique';
  if (frameType === 2) return 'Rare';
  if (frameType === 1) return 'Magic';
  return 'Normal';
}

function serializeGggItemToClipboard(item: GggItemJson): string {
  const rarity = item.rarity || rarityFromFrameType(item.frameType);
  const name = (item.name ?? '').trim();
  const base = (item.baseType || item.typeLine || 'Unknown Base').trim();
  const lines = [`Rarity: ${rarity}`];
  if (name) lines.push(name);
  lines.push(base);
  const implicits = [...(item.enchantMods ?? []), ...(item.implicitMods ?? [])];
  if (implicits.length > 0) {
    lines.push('--------', ...implicits.map((m) => `${m} (implicit)`));
  }
  const explicits = [
    ...(item.explicitMods ?? []),
    ...(item.craftedMods ?? []).map((m) => `${m} (crafted)`),
  ];
  if (explicits.length > 0) {
    lines.push('--------', ...explicits);
  }
  return lines.join('\n');
}

function buildPresetFallback(account: string, character: string): MercenaryBuildState {
  const build = createDefaultBuildState();
  build.buildName = `${character || account} — Imported Kineticist`;
  build.equippedItems.Weapon1 = parsePoeItemClipboard(
    `Item Class: Wands
Rarity: Rare
Imported Spark Wand
Imbued Wand
--------
Adds 22 to 365 Lightning Damage
19% increased Attack Speed
25% increased Critical Strike Chance
+32% to Global Critical Strike Multiplier (crafted)`,
    SEED_CATALOGS,
  );
  return build;
}

export async function handleGggMercenaryImport(
  c: Context<{ Bindings: WorkerBindings }>,
) {
  const account = (c.req.param('account') ?? '').trim();
  const character = (c.req.param('character') ?? '').trim();
  if (!account || !character) {
    return c.json({ ok: false, error: 'Account and character names are required.' }, 400);
  }

  const cacheKey = `ggg:v1:${account.toLowerCase()}:${character.toLowerCase()}`;
  if (c.env.POM_CACHE_KV) {
    const cached = await c.env.POM_CACHE_KV.get(cacheKey, 'json');
    if (cached) return c.json(cached);
  }

  let resultPayload: {
    ok: true;
    source: 'ggg' | 'preset_fallback';
    account: string;
    character: string;
    note?: string;
    buildState: MercenaryBuildState;
  };

  if (account.toLowerCase() === 'demo') {
    resultPayload = {
      ok: true,
      source: 'preset_fallback',
      account,
      character,
      note: 'Demo account resolved to Kineticist preset.',
      buildState: buildPresetFallback(account, character),
    };
  } else {
    try {
      const url =
        `https://www.pathofexile.com/character-window/get-items?accountName=${encodeURIComponent(account)}` +
        `&character=${encodeURIComponent(character)}`;
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'PathOfMercenaries/0.1 (OAuth-free Character Importer)' },
      });
      if (!upstream.ok) {
        resultPayload = {
          ok: true,
          source: 'preset_fallback',
          account,
          character,
          note: `GGG API returned HTTP ${upstream.status} (profile private or rate-limited); loaded Kineticist starter shell.`,
          buildState: buildPresetFallback(account, character),
        };
      } else {
        const data = (await upstream.json()) as GggCharacterWindowResponse;
        const build = createDefaultBuildState();
        build.buildName = `${data.character?.name || character} (${account})`;
        build.mercLevel = Math.max(1, Math.min(85, data.character?.level ?? 84));
        let importedCount = 0;
        for (const item of data.items ?? []) {
          const slot = item.inventoryId ? INVENTORY_SLOT_MAP[item.inventoryId] : undefined;
          if (!slot) continue;
          build.equippedItems[slot] = parsePoeItemClipboard(
            serializeGggItemToClipboard(item),
            SEED_CATALOGS,
          );
          importedCount += 1;
        }
        resultPayload = {
          ok: true,
          source: 'ggg',
          account,
          character,
          note: `Parsed ${importedCount} equipped item(s) from GGG character window.`,
          buildState: build,
        };
      }
    } catch {
      resultPayload = {
        ok: true,
        source: 'preset_fallback',
        account,
        character,
        note: 'GGG API unavailable from worker runtime; loaded Kineticist starter shell.',
        buildState: buildPresetFallback(account, character),
      };
    }
  }

  if (c.env.POM_CACHE_KV) {
    await c.env.POM_CACHE_KV.put(cacheKey, JSON.stringify(resultPayload), {
      expirationTtl: 300,
    });
  }
  return c.json(resultPayload);
}

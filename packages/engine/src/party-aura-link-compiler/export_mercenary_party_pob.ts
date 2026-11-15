import {
  EQUIPMENT_SLOTS,
  type CalculationResultSnapshot,
  type MercenaryBuildState,
} from '../catalog-types/index.js';
import { findSkillById, SEED_CATALOGS, type GameCatalogBundle } from '../seed-catalog/index.js';

export interface MercenaryPartyExportResult {
  partyMemberStatsLines: string[];
  auraLines: string[];
  curseLines: string[];
  enemyModLines: string[];
  xml: string;
  pobPartyCode: string;
  plainTextSummary: string;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? (bytes[i + 1] ?? 0) : 0;
    const b2 = hasB2 ? (bytes[i + 2] ?? 0) : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += B64_CHARS[(triple >> 18) & 0x3f];
    out += B64_CHARS[(triple >> 12) & 0x3f];
    out += hasB1 ? B64_CHARS[(triple >> 6) & 0x3f] : '=';
    out += hasB2 ? B64_CHARS[triple & 0x3f] : '=';
  }
  return out;
}

/**
 * Pure-TS RFC 1950/1951 Zlib stored-block encoder + PoB base64url wrapper.
 * Decodes natively with standard zlib.inflate / PoB Common.Inflate in both Browser & Node.
 */
export function encodePobCode(xml: string): string {
  const payload = new TextEncoder().encode(xml);
  const maxBlock = 65535;
  const blockCount = Math.max(1, Math.ceil(payload.length / maxBlock));
  const totalLen = 2 + payload.length + blockCount * 5 + 4;
  const out = new Uint8Array(totalLen);

  // Zlib header: CMF=0x78 (Deflate, 32K window), FLG=0x01 (check bits valid: 0x7801 % 31 === 0)
  out[0] = 0x78;
  out[1] = 0x01;

  let writePos = 2;
  let readPos = 0;
  for (let b = 0; b < blockCount; b++) {
    const remaining = payload.length - readPos;
    const chunkLen = Math.min(maxBlock, remaining);
    const isFinal = b === blockCount - 1 ? 1 : 0;
    const nlen = (~chunkLen) & 0xffff;

    out[writePos++] = isFinal;
    out[writePos++] = chunkLen & 0xff;
    out[writePos++] = (chunkLen >> 8) & 0xff;
    out[writePos++] = nlen & 0xff;
    out[writePos++] = (nlen >> 8) & 0xff;

    if (chunkLen > 0) {
      out.set(payload.subarray(readPos, readPos + chunkLen), writePos);
      writePos += chunkLen;
      readPos += chunkLen;
    }
  }

  let s1 = 1;
  let s2 = 0;
  const MOD = 65521;
  for (let i = 0; i < payload.length; i++) {
    s1 = (s1 + (payload[i] ?? 0)) % MOD;
    s2 = (s2 + s1) % MOD;
  }
  out[writePos++] = (s2 >> 8) & 0xff;
  out[writePos++] = s2 & 0xff;
  out[writePos++] = (s1 >> 8) & 0xff;
  out[writePos++] = s1 & 0xff;

  return encodeBase64(out).replace(/\+/g, '-').replace(/\//g, '_');
}

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Generates an outbound PoB `<Party>` XML & share code representing all buffs,
 * auras, curses, and enemy overrides that this Mercenary grants to a nearby Player.
 */
export function exportMercenaryAsPobParty(
  buildState: MercenaryBuildState,
  snapshot: CalculationResultSnapshot,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): MercenaryPartyExportResult {
  const partyStats: string[] = [];
  const auraLines: string[] = [];
  const curseLines: string[] = [];
  const enemyMods: string[] = [];

  const equippedUniqueIds = new Set<string>();
  for (const slot of EQUIPMENT_SLOTS) {
    const item = buildState.equippedItems[slot];
    if (!item) continue;
    if (item.uniqueId) equippedUniqueIds.add(item.uniqueId);

    for (const line of item.modLines) {
      const txt = line.rawText.trim();
      if (/^Nearby Allies/i.test(txt) && !item.uniqueId) {
        partyStats.push(txt.replace(/^Nearby Allies(?:'| have)?\s*/i, ''));
      } else if (/^Nearby Enemies/i.test(txt) && !item.uniqueId) {
        enemyMods.push(txt);
      }
    }
  }

  if (equippedUniqueIds.has('perquils_toe')) {
    partyStats.push('Your Damage with Hits is Lucky');
  }
  if (equippedUniqueIds.has('leer_cast')) {
    partyStats.push('50% increased Damage');
  }
  if (equippedUniqueIds.has('dying_breath')) {
    partyStats.push('18% increased Damage');
    partyStats.push('18% increased Effect of Non-Curse Auras from your Skills');
    enemyMods.push('18% increased Effect of Curses on Enemies');
  }
  if (equippedUniqueIds.has('kingmaker')) {
    partyStats.push('+50% to Critical Strike Multiplier');
    partyStats.push('Culling Strike');
    partyStats.push('You have 10 Fortification');
  }
  if (equippedUniqueIds.has('garb_of_the_ephemeral')) {
    partyStats.push('Action Speed cannot be modified to below Base Value');
    enemyMods.push('Enemies cannot deal Critical Strikes');
  }
  if (equippedUniqueIds.has('crown_of_the_tyrant')) {
    enemyMods.push('Nearby Enemies have -10% to all Resistances');
    const col = buildState.partyConfig.combatConditions.crownSocketColor ?? 'Red';
    const flatByColor: Record<string, string> = {
      Red: 'Adds 64 to 96 Fire Damage',
      Green: 'Adds 56 to 88 Cold Damage',
      Blue: 'Adds 13 to 144 Lightning Damage',
      White: 'Adds 47 to 61 Chaos Damage',
    };
    partyStats.push(flatByColor[col]!);
  }
  if (equippedUniqueIds.has('doryanis_prototype')) {
    const mercLightRes = Math.max(
      -200,
      Math.min(75, snapshot.defences.resistances.Lightning.uncapped),
    );
    enemyMods.push(`# Doryani's Prototype: Enemy Lightning Resistance locked to ${mercLightRes}%`);
    enemyMods.push(`${mercLightRes}% Enemy Lightning Resistance Override`);
  }
  if (equippedUniqueIds.has('original_sin')) {
    enemyMods.push("Nearby Enemies' Chaos Resistance is 0%");
  }
  if (equippedUniqueIds.has('sign_of_the_sin_eater')) {
    auraLines.push('Smite Level 30 (Adds 17 to 326 Lightning Damage)');
  }

  for (const group of buildState.skillGroups) {
    if (!group.enabled) continue;
    const skill = findSkillById(group.skillId, catalogs);
    if (!skill) continue;
    const tagsLower = skill.tags.map((t) => t.toLowerCase());
    const effLv = group.skillLevelOverride ?? snapshot.derivedSkillLevel;
    if (tagsLower.includes('aura') || /purity|grace|determination|hatred|wrath|anger|haste|zealotry|discipline/i.test(skill.name)) {
      auraLines.push(`${skill.name} ${effLv} 0`);
    }
    if (tagsLower.includes('curse') || tagsLower.includes('mark')) {
      curseLines.push(`${skill.name} ${effLv} 0`);
    }
  }

  const sections: string[] = [];
  if (partyStats.length > 0) {
    sections.push(`    <ExportedBuffs name="PartyMemberStats">${escapeXmlText(partyStats.join('\n'))}</ExportedBuffs>`);
  }
  if (auraLines.length > 0) {
    sections.push(`    <ExportedBuffs name="Aura">${escapeXmlText(auraLines.join('\n'))}</ExportedBuffs>`);
  }
  if (curseLines.length > 0) {
    sections.push(`    <ExportedBuffs name="Curse">${escapeXmlText(curseLines.join('\n'))}</ExportedBuffs>`);
  }
  if (enemyMods.length > 0) {
    sections.push(`    <ExportedBuffs name="EnemyMods">${escapeXmlText(enemyMods.join('\n'))}</ExportedBuffs>`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<PathOfBuilding>',
    `  <!-- Exported from Path of Mercenaries: ${escapeXmlText(buildState.buildName)} (${escapeXmlText(snapshot.archetypeName)} Lv ${snapshot.mercLevel}) -->`,
    '  <Party destination="All" append="true" ShowAdvanceTools="false">',
    ...sections,
    '  </Party>',
    '</PathOfBuilding>',
  ].join('\n');

  const pobPartyCode = encodePobCode(xml);

  const plainTextSummary = [
    `=== Mercenary -> Player Party Buffs (${snapshot.archetypeName} Lv ${snapshot.mercLevel}) ===`,
    ...(partyStats.length > 0 ? ['[Player / Party Stats]', ...partyStats.map((l) => `  ${l}`)] : []),
    ...(auraLines.length > 0 ? ['[Mercenary Auras]', ...auraLines.map((l) => `  ${l}`)] : []),
    ...(curseLines.length > 0 ? ['[Mercenary Curses]', ...curseLines.map((l) => `  ${l}`)] : []),
    ...(enemyMods.length > 0 ? ['[Enemy Debuffs]', ...enemyMods.map((l) => `  ${l}`)] : []),
  ].join('\n');

  return {
    partyMemberStatsLines: partyStats,
    auraLines,
    curseLines,
    enemyModLines: enemyMods,
    xml,
    pobPartyCode,
    plainTextSummary,
  };
}

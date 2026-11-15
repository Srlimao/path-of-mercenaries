import type {
  EquipmentSlot,
  ItemModLine,
  ItemModTierType,
  ItemRarity,
  ParsedItem,
  UniqueItemDefinition,
} from '../catalog-types/index.js';
import { SEED_CATALOGS, type GameCatalogBundle } from '../seed-catalog/index.js';
import {
  computeLocalItemStats,
  type HeaderFallbackStats,
} from './local_weapon_defence_calc.js';

const CLASS_TO_SLOTS: Record<string, EquipmentSlot[]> = {
  Wand: ['Weapon1', 'Weapon2'],
  'One Hand Sword': ['Weapon1', 'Weapon2'],
  'Thrusting One Hand Sword': ['Weapon1', 'Weapon2'],
  'Two Hand Sword': ['Weapon1'],
  'One Hand Axe': ['Weapon1', 'Weapon2'],
  'Two Hand Axe': ['Weapon1'],
  'One Hand Mace': ['Weapon1', 'Weapon2'],
  'Two Hand Mace': ['Weapon1'],
  Sceptre: ['Weapon1', 'Weapon2'],
  Staff: ['Weapon1'],
  Claw: ['Weapon1', 'Weapon2'],
  Dagger: ['Weapon1', 'Weapon2'],
  Bow: ['Weapon1'],
  Shield: ['Weapon2'],
  Quiver: ['Weapon2'],
  Helmet: ['Helmet'],
  'Body Armour': ['BodyArmour'],
  Gloves: ['Gloves'],
  Boots: ['Boots'],
  Amulet: ['Amulet'],
  Ring: ['Ring1', 'Ring2'],
  Belt: ['Belt'],
};

const TWO_HANDED_CLASSES = new Set([
  'Bow',
  'Staff',
  'Two Hand Sword',
  'Two Hand Axe',
  'Two Hand Mace',
]);

function inferTierType(rawLine: string): ItemModTierType {
  const lower = rawLine.toLowerCase();
  if (lower.includes('(implicit)')) return 'implicit';
  if (lower.includes('(crafted)')) return 'crafted';
  if (lower.includes('(fractured)')) return 'fractured';
  if (lower.includes('(enchant)')) return 'enchant';
  return 'explicit';
}

function isPropertyOrRequirementLine(line: string): boolean {
  return (
    /^(Quality|Physical Damage|Elemental Damage|Critical Strike Chance|Attacks per Second|Weapon Range|Armour|Evasion Rating|Energy Shield|Ward|Chance to Block|Requires|Level|Str|Dex|Int|Sockets|Item Level):?/i.test(
      line,
    ) || /^(R|G|B|W|-|\s)+$/.test(line)
  );
}

/** Parses raw PoE `Ctrl+C` clipboard item text into a structured `ParsedItem`. */
export function parsePoeItemClipboard(
  rawText: string,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): ParsedItem {
  const sections = rawText
    .trim()
    .split(/\r?\n-{4,}\r?\n/)
    .map((sec) => sec.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    .filter((sec) => sec.length > 0);

  const headerLines = sections[0] ?? [];
  let itemClass = 'Wand';
  let rarity: ItemRarity = 'Rare';
  const nameLines: string[] = [];

  for (const line of headerLines) {
    if (line.startsWith('Item Class:')) {
      itemClass = line.slice('Item Class:'.length).trim();
    } else if (line.startsWith('Rarity:')) {
      const r = line.slice('Rarity:'.length).trim();
      if (r === 'Normal' || r === 'Magic' || r === 'Rare' || r === 'Unique') {
        rarity = r;
      }
    } else {
      nameLines.push(line);
    }
  }

  const name = nameLines[0] ?? 'Unnamed Item';
  const baseType = nameLines[1] ?? nameLines[0] ?? 'Unknown Base';

  let qualityPct = 0;
  let corrupted = false;
  const fallback: HeaderFallbackStats = {};
  const modLines: ItemModLine[] = [];

  for (let i = 1; i < sections.length; i += 1) {
    const sec = sections[i]!;
    if (sec.length === 1 && sec[0] === 'Corrupted') {
      corrupted = true;
      continue;
    }

    let isExplicitPropertySection = false;
    for (const line of sec) {
      if (line.startsWith('Quality:')) {
        const qm = line.match(/([+-]?\d+)%/);
        if (qm) qualityPct = Number(qm[1]);
        isExplicitPropertySection = true;
      } else if (line.startsWith('Physical Damage:')) {
        const pm = line.match(/(\d+)-(\d+)/);
        if (pm) {
          fallback.physMin = Number(pm[1]);
          fallback.physMax = Number(pm[2]);
        }
        isExplicitPropertySection = true;
      } else if (line.startsWith('Attacks per Second:')) {
        const am = line.match(/(\d+(?:\.\d+)?)/);
        if (am) fallback.aps = Number(am[1]);
        isExplicitPropertySection = true;
      } else if (line.startsWith('Critical Strike Chance:')) {
        const cm = line.match(/(\d+(?:\.\d+)?)%/);
        if (cm) fallback.critChancePct = Number(cm[1]);
        isExplicitPropertySection = true;
      } else if (line.startsWith('Armour:')) {
        const m = line.match(/(\d+)/);
        if (m) fallback.armour = Number(m[1]);
        isExplicitPropertySection = true;
      } else if (line.startsWith('Evasion Rating:')) {
        const m = line.match(/(\d+)/);
        if (m) fallback.evasion = Number(m[1]);
        isExplicitPropertySection = true;
      } else if (line.startsWith('Energy Shield:')) {
        const m = line.match(/(\d+)/);
        if (m) fallback.energyShield = Number(m[1]);
        isExplicitPropertySection = true;
      } else if (line.startsWith('Chance to Block:')) {
        const m = line.match(/(\d+)%/);
        if (m) fallback.blockPct = Number(m[1]);
        isExplicitPropertySection = true;
      }
    }

    if (isExplicitPropertySection || sec.every((l) => isPropertyOrRequirementLine(l))) {
      continue;
    }

    for (const line of sec) {
      if (line === 'Corrupted') {
        corrupted = true;
        continue;
      }
      if (isPropertyOrRequirementLine(line)) continue;
      if (line.startsWith('Note:') || line.startsWith('Unidentified')) continue;
      modLines.push({ rawText: line, tierType: inferTierType(line) });
    }
  }

  const baseMatch = catalogs.baseItems.find(
    (b) => b.name.toLowerCase() === baseType.toLowerCase(),
  );
  const uniqueMatch = catalogs.uniques.find(
    (u) => u.name.toLowerCase() === name.toLowerCase(),
  );

  const validSlots =
    uniqueMatch?.validSlots ?? baseMatch?.validSlots ?? CLASS_TO_SLOTS[itemClass] ?? ['Weapon1'];
  const isTwoHanded = baseMatch?.isTwoHanded ?? TWO_HANDED_CLASSES.has(itemClass);
  const localStats = computeLocalItemStats(itemClass, qualityPct, modLines, baseMatch, fallback);

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    baseType,
    itemClass,
    rarity,
    validSlots,
    isTwoHanded,
    qualityPct,
    corrupted,
    uniqueId: uniqueMatch?.id,
    uniqueHandlerId: uniqueMatch?.uniqueHandlerId,
    modLines,
    rawClipboardText: rawText,
    ...localStats,
  };
}

/** Materializes a `ParsedItem` directly from a catalog `UniqueItemDefinition`. */
export function createParsedItemFromUnique(
  uniqueDef: UniqueItemDefinition,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
  qualityPct = 20,
): ParsedItem {
  const modLines: ItemModLine[] = [
    ...uniqueDef.implicits.map((t) => ({ rawText: `${t} (implicit)`, tierType: 'implicit' as const })),
    ...uniqueDef.explicits.map((t) => ({ rawText: t, tierType: 'explicit' as const })),
  ];

  const baseMatch = catalogs.baseItems.find(
    (b) => b.name.toLowerCase() === uniqueDef.baseType.toLowerCase(),
  );
  const localStats = computeLocalItemStats(uniqueDef.itemClass, qualityPct, modLines, baseMatch);

  return {
    id: `unique_${uniqueDef.id}`,
    name: uniqueDef.name,
    baseType: uniqueDef.baseType,
    itemClass: uniqueDef.itemClass,
    rarity: 'Unique',
    validSlots: uniqueDef.validSlots,
    isTwoHanded: baseMatch?.isTwoHanded ?? TWO_HANDED_CLASSES.has(uniqueDef.itemClass),
    qualityPct,
    corrupted: false,
    uniqueId: uniqueDef.id,
    uniqueHandlerId: uniqueDef.uniqueHandlerId,
    modLines,
    ...localStats,
  };
}

/** Serializes a `ParsedItem` back into standard PoE `Ctrl+C` clipboard format. */
export function serializeItemToClipboard(item: ParsedItem): string {
  const lines: string[] = [
    `Item Class: ${item.itemClass}`,
    `Rarity: ${item.rarity}`,
    item.name,
  ];
  if (item.baseType && item.baseType !== item.name) {
    lines.push(item.baseType);
  }
  lines.push('--------');
  if (item.qualityPct > 0) {
    lines.push(`Quality: +${item.qualityPct}%`);
    lines.push('--------');
  }
  const implicits = item.modLines.filter((m) => m.tierType === 'implicit');
  const others = item.modLines.filter((m) => m.tierType !== 'implicit');
  if (implicits.length > 0) {
    for (const imp of implicits) lines.push(imp.rawText);
    lines.push('--------');
  }
  for (const mod of others) lines.push(mod.rawText);
  if (item.corrupted) {
    lines.push('--------');
    lines.push('Corrupted');
  }
  return lines.join('\n');
}

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const POEDB_URL = 'https://poedb.tw/us/Mercenaries';
const POEWIKI_URL =
  'https://www.poewiki.net/w/api.php?action=parse&page=List_of_mercenary_classes&prop=wikitext&format=json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(
  __dirname,
  '../packages/engine/src/seed-catalog/poedb_mercenaries_dump.json',
);

const WIKI_TO_ITEM_CLASS = {
  '2H Mace': 'Two Hand Mace',
  '2H Axe': 'Two Hand Axe',
  '2H Sword': 'Two Hand Sword',
  '1H Axe': 'One Hand Axe',
  '1H Sword': 'One Hand Sword',
  '1H Thrusting Sword': 'Thrusting One Hand Sword',
  '1H Mace': 'One Hand Mace',
  Bow: 'Bow',
  Quiver: 'Quiver',
  Staff: 'Staff',
  Warstaff: 'Staff',
  Wand: 'Wand',
  'Rune Dagger': 'Dagger',
  Dagger: 'Dagger',
  Sceptre: 'Sceptre',
  Claw: 'Claw',
};

const TWO_HANDED_ITEM_CLASSES = new Set([
  'Bow',
  'Staff',
  'Two Hand Mace',
  'Two Hand Axe',
  'Two Hand Sword',
]);

const ATTR_MAP = {
  Str: 'STR',
  Dex: 'DEX',
  Int: 'INT',
  'Str / Dex': 'STR_DEX',
  'Str / Int': 'STR_INT',
  'Dex / Int': 'DEX_INT',
  'Str / Dex / Int': 'STR_DEX_INT',
};

const SKILL_NAME_TO_ID = {
  'Kinetic Blast of Clustering': 'kinetic_blast_of_clustering',
  'Kinetic Bolt of Fragmentation': 'kinetic_bolt_of_fragmentation',
  'Power Siphon': 'power_siphon',
  Reave: 'reave',
  'Double Strike of Impaling': 'double_strike_of_impaling',
  'Lightning Arrow': 'lightning_arrow',
  'Split Arrow': 'split_arrow',
  Spark: 'spark',
  Sunder: 'sunder',
  'Sunder of Trarthus': 'sunder',
  Haste: 'haste_mercenary',
  Grace: 'grace_mercenary',
  Conductivity: 'conductivity_mercenary',
};

const FALLBACK_WEAPON_RULES = {
  bladereach: {
    allowedMainHandClasses: ['One Hand Sword', 'Thrusting One Hand Sword', 'Dagger', 'Claw'],
    allowedOffHandClasses: [
      'One Hand Sword',
      'Thrusting One Hand Sword',
      'Dagger',
      'Claw',
      'Shield',
    ],
    canDualWield: true,
  },
  chaplain_of_the_well: {
    allowedMainHandClasses: ['Sceptre', 'One Hand Mace', 'Staff'],
    allowedOffHandClasses: ['Shield'],
    canDualWield: false,
  },
  warpriest_of_the_ruckus: null, // resolved dynamically to warpriest
};

function toSnakeId(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function decodeHtml(str) {
  return str
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function inferWeaponRulesFromTokens(rawTokens, baseKey) {
  let hasOptionalShield = false;
  let hasRequiredShield = false;
  let hasQuiver = false;
  const weaponClasses = [];

  for (const token of rawTokens) {
    const clean = token.trim();
    if (!clean) continue;
    if (clean === '(Shield)') {
      hasOptionalShield = true;
    } else if (clean === 'Shield') {
      hasRequiredShield = true;
    } else if (clean === 'Quiver') {
      hasQuiver = true;
    } else if (WIKI_TO_ITEM_CLASS[clean]) {
      const mapped = WIKI_TO_ITEM_CLASS[clean];
      if (!weaponClasses.includes(mapped)) {
        weaponClasses.push(mapped);
      }
    }
  }

  if (baseKey === 'kineticist') {
    return {
      allowedMainHandClasses: ['Wand'],
      allowedOffHandClasses: ['Shield', 'Wand'],
      canDualWield: true,
    };
  }

  if (weaponClasses.includes('Bow') || hasQuiver) {
    return {
      allowedMainHandClasses: ['Bow'],
      allowedOffHandClasses: ['Quiver'],
      canDualWield: false,
    };
  }

  const onlyTwoHand =
    weaponClasses.length > 0 && weaponClasses.every((cls) => TWO_HANDED_ITEM_CLASSES.has(cls));
  if (onlyTwoHand) {
    return {
      allowedMainHandClasses: weaponClasses,
      allowedOffHandClasses: [],
      canDualWield: false,
    };
  }

  const oneHandClasses = weaponClasses.filter((cls) => !TWO_HANDED_ITEM_CLASSES.has(cls));
  if (hasOptionalShield) {
    return {
      allowedMainHandClasses: weaponClasses,
      allowedOffHandClasses: ['Shield', ...oneHandClasses],
      canDualWield: oneHandClasses.length > 0,
    };
  }

  if (hasRequiredShield) {
    return {
      allowedMainHandClasses: weaponClasses,
      allowedOffHandClasses: ['Shield'],
      canDualWield: false,
    };
  }

  return {
    allowedMainHandClasses: weaponClasses,
    allowedOffHandClasses: oneHandClasses,
    canDualWield: oneHandClasses.length > 0,
  };
}

function parseWikiWeaponMap(wikitext) {
  const map = new Map();
  const rows = wikitext.split(/\r?\n\|-\r?\n/);

  for (const row of rows) {
    const rawCells = row.split(/\r?\n\|/).map((c) => c.replace(/^\|/, '').trim());
    // Rows with a leading House colspan cell shift cells right by 1; find first cell naming a class
    const nameIdx = rawCells.findIndex(
      (cell) =>
        /\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/.test(cell) &&
        !cell.includes('File:') &&
        !cell.includes('style='),
    );
    if (nameIdx === -1) continue;

    const nameMatch = rawCells[nameIdx].match(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/);
    if (!nameMatch) continue;
    const baseName = nameMatch[1].replace(/\s*\(Mercenary\)/i, '').trim();
    const baseKey = toSnakeId(baseName);

    // Weapon cell is usually nameIdx + 3, or find cell containing weapon keywords
    const candidateCells = rawCells.slice(nameIdx + 1, nameIdx + 5);
    const weaponCell =
      candidateCells.find((c) =>
        /(2H |1H |Bow|Wand|Staff|Sceptre|Claw|Dagger|Shield)/i.test(c),
      ) ?? rawCells[nameIdx + 3] ?? '';

    const tokens = weaponCell
      .split(/<br\s*\/?>/i)
      .map((s) => s.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);

    map.set(baseKey, inferWeaponRulesFromTokens(tokens, baseKey));
  }

  // Apply PoEDB-only archetype fallbacks
  for (const [key, fallback] of Object.entries(FALLBACK_WEAPON_RULES)) {
    if (!map.has(key)) {
      if (fallback) {
        map.set(key, fallback);
      } else if (key === 'warpriest_of_the_ruckus' && map.has('warpriest')) {
        map.set(key, map.get('warpriest'));
      }
    }
  }

  return map;
}

function isLikelySpellSkill(name, category, affinity) {
  if (category === 'UTILITY') return true;
  if (
    /(spark|arc|ball lightning|stormcall|storm call|shock nova|orb of storms|frost|ice|winter|glacial|vortex|creeping frost|fireball|rolling magma|flame|scorching ray|purifying flame|wave of conviction|divine|penance|exsanguinate|reap|soulrend|bane|essence drain|contagion|blight|dark pact|forbidden rite|voltaxic|hexblast|doom|tempest|summon|raise|unearth|desecrate|detonate|cremation|volatile dead|bladefall|blade blast|blade vortex|ethereal knives|absolution|sigil|brand|nova|totem|curse|hex|mark|cry|aura|herald|vitality|determination|grace|haste|wrath|anger|hatred|zealotry|malevolence|pride|discipline|clarity|precision|purity)/i.test(
      name,
    ) &&
    !/lightning arrow|ice shot|frost blades|glacial hammer|molten strike|volcanic fissure|consecrated path|tectonic slam|infernal blow|flicker strike|splitting steel|lancing steel|shattering steel|spectral/i.test(
      name,
    )
  ) {
    return true;
  }
  return affinity === 'INT' && !/wand|attack/i.test(name);
}

function resolveSkillId(skillName) {
  return SKILL_NAME_TO_ID[skillName] ?? toSnakeId(skillName);
}

function parsePoedbBuilds(html, wikiWeaponMap) {
  const startIdx = html.indexOf('id="Builds"');
  const endIdx = html.indexOf('id="MercenariesUnique"');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('Could not locate #Builds section on PoEDB Mercenaries page.');
  }

  const buildsSection = html.slice(startIdx, endIdx);
  const cards = buildsSection
    .split('<div class="col"><div class="d-flex border-top rounded">')
    .slice(1);

  if (cards.length === 0) {
    throw new Error('Parsed 0 Mercenary cards from PoEDB #Builds.');
  }

  const archetypes = [];
  const skillsById = new Map();

  for (const card of cards) {
    const headerMatch = card.match(
      /<strong><a href="[^"]+">([^<]+)<\/a><\/strong>\s*<small>([^<]+)<\/small>/,
    );
    if (!headerMatch) continue;

    const name = decodeHtml(headerMatch[1]);
    const attrRaw = decodeHtml(headerMatch[2]);
    const affinity = ATTR_MAP[attrRaw] ?? 'STR';
    const isInfamous = name.startsWith('Infamous ');
    const id = toSnakeId(name);
    const baseKey = toSnakeId(name.replace(/^Infamous\s+/, ''));

    const houseMatch = card.match(/House(Keita|Cyaxan|Azadi|Bardiya)\.webp/);
    const trarthanHouse = houseMatch ? houseMatch[1] : undefined;

    const weaponRules =
      wikiWeaponMap.get(baseKey) ??
      wikiWeaponMap.get(id) ?? {
        allowedMainHandClasses: ['One Hand Sword', 'Wand', 'Sceptre'],
        allowedOffHandClasses: ['Shield'],
        canDualWield: false,
      };

    const pool = { primary: [], secondary: [], utility: [] };
    const skillRe = /class="col MercenarySkill(Primary|Secondary|Utility)">([\s\S]*?)<\/div>/g;
    let skillMatch;
    while ((skillMatch = skillRe.exec(card)) !== null) {
      const cat = skillMatch[1].toUpperCase();
      const rawLabel = decodeHtml(skillMatch[2].replace(/<[^>]+>/g, ''));
      if (!rawLabel || rawLabel.includes('[DNT]') || /unused/i.test(rawLabel)) {
        continue;
      }

      const skillId = resolveSkillId(rawLabel);
      const bucket = cat.toLowerCase();
      if (!pool[bucket].includes(skillId)) {
        pool[bucket].push(skillId);
      }

      if (!skillsById.has(skillId)) {
        skillsById.set(skillId, {
          id: skillId,
          name: rawLabel,
          category: cat,
          isSpellHint: isLikelySpellSkill(rawLabel, cat, affinity),
        });
      }
    }

    if (id === 'kineticist' || id === 'infamous_kineticist') {
      for (const requiredId of ['kinetic_bolt_of_fragmentation', 'kinetic_blast_of_clustering']) {
        if (!pool.primary.includes(requiredId)) {
          pool.primary.unshift(requiredId);
        }
      }
    }

    archetypes.push({
      id,
      name,
      isInfamous,
      trarthanHouse,
      attributeAffinity: affinity,
      allowedMainHandClasses: weaponRules.allowedMainHandClasses,
      allowedOffHandClasses: weaponRules.allowedOffHandClasses,
      canDualWield: weaponRules.canDualWield,
      skillPool: pool,
    });
  }

  return { archetypes, skills: Array.from(skillsById.values()) };
}

async function main() {
  console.log('Fetching PoEDB Mercenaries & PoE Wiki List_of_mercenary_classes...');
  const [poedbRes, wikiRes] = await Promise.all([fetch(POEDB_URL), fetch(POEWIKI_URL)]);

  if (!poedbRes.ok) {
    throw new Error(`PoEDB fetch failed: ${poedbRes.status} ${poedbRes.statusText}`);
  }
  if (!wikiRes.ok) {
    throw new Error(`PoE Wiki fetch failed: ${wikiRes.status} ${wikiRes.statusText}`);
  }

  const [poedbHtml, wikiJson] = await Promise.all([poedbRes.text(), wikiRes.json()]);
  const wikitext = wikiJson?.parse?.wikitext?.['*'];
  if (!wikitext) {
    throw new Error('PoE Wiki API response missing parse.wikitext');
  }

  const wikiWeaponMap = parseWikiWeaponMap(wikitext);
  const { archetypes, skills } = parsePoedbBuilds(poedbHtml, wikiWeaponMap);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceUrls: { poedb: POEDB_URL, poewiki: POEWIKI_URL },
    archetypes,
    skills,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(
    `Imported ${archetypes.length} archetypes and ${skills.length} skills -> ${OUTPUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

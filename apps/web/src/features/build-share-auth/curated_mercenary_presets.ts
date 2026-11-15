import {
  SEED_CATALOGS,
  createDefaultBuildState,
  createParsedItemFromUnique,
  findSkillById,
  parsePoeItemClipboard,
  type MercenaryBuildState,
  type SkillGroupSetup,
} from '@pom/engine';

export interface CuratedPresetInfo {
  id: string;
  title: string;
  description: string;
  build: () => MercenaryBuildState;
}

function equipUniqueById(
  build: MercenaryBuildState,
  slot: keyof MercenaryBuildState['equippedItems'],
  uniqueId: string,
) {
  const def = SEED_CATALOGS.uniques.find((u) => u.id === uniqueId);
  if (def) {
    build.equippedItems[slot] = createParsedItemFromUnique(def, SEED_CATALOGS);
  }
}

function makeSkillGroup(
  groupId: string,
  slotCategory: SkillGroupSetup['slotCategory'],
  skillId: string,
  supportIds: string[],
  preferredPartId?: string,
): SkillGroupSetup {
  const skillDef = findSkillById(skillId, SEED_CATALOGS);
  const activePartId = preferredPartId ?? skillDef?.parts[0]?.id ?? '';
  return {
    groupId,
    slotCategory,
    skillId,
    activePartId,
    enabled: true,
    supports: supportIds.map((supportId) => ({ supportId, level: 3, enabled: true })),
    fullDpsParts: (skillDef?.parts ?? []).map((p) => ({
      partId: p.id,
      includeInFullDps: true,
      hitCountMultiplier: p.defaultFullDpsCount,
    })),
  };
}

export const CURATED_MERCENARY_PRESETS: CuratedPresetInfo[] = [
  {
    id: 'doryani_kineticist',
    title: "Doryani's Kineticist Carry (Lv 84)",
    description:
      "Imbued Wand + Doryani's Prototype (-188% Light Res) + Perquil's Toe + Crown of the Tyrant + Flame Link + Wrath.",
    build: () => {
      const b = createDefaultBuildState();
      b.buildName = "Doryani's Kineticist Carry (Lv 84)";
      b.equippedItems.Weapon1 = parsePoeItemClipboard(
        `Item Class: Wand
Rarity: Rare
Storm Spiker
Imbued Wand
--------
Adds 24 to 390 Lightning Damage
21% increased Attack Speed
28% increased Critical Strike Chance
+35% to Global Critical Strike Multiplier (crafted)`,
        SEED_CATALOGS,
      );
      equipUniqueById(b, 'Weapon2', 'dawnbreaker');
      equipUniqueById(b, 'Helmet', 'crown_of_the_tyrant');
      equipUniqueById(b, 'BodyArmour', 'doryanis_prototype');
      equipUniqueById(b, 'Gloves', 'gravebind');
      equipUniqueById(b, 'Boots', 'ralakeshs_impatience');
      equipUniqueById(b, 'Amulet', 'perquils_toe');
      b.equippedItems.Ring1 = parsePoeItemClipboard(
        `Item Class: Ring
Rarity: Rare
Blight Coil
Opal Ring
--------
+78 to maximum Life
-94% to Lightning Resistance
34% increased Elemental Damage with Attack Skills`,
        SEED_CATALOGS,
      );
      b.equippedItems.Ring2 = parsePoeItemClipboard(
        `Item Class: Ring
Rarity: Rare
Dusk Band
Two-Stone Ring
--------
+72 to maximum Life
-94% to Lightning Resistance
32% increased Elemental Damage with Attack Skills`,
        SEED_CATALOGS,
      );
      b.skillGroups = [
        makeSkillGroup(
          'primary-1',
          'PRIMARY',
          'kinetic_blast_of_clustering',
          [
            'elemental_damage_with_attacks',
            'increased_critical_damage',
            'gilded_jolt',
            'gilded_cull',
            'added_lightning_damage',
          ],
          'clustering_explosion',
        ),
      ];
      b.partyConfig.links.flameLink = {
        enabled: true,
        gemLevel: 21,
        playerMaxLife: 8500,
        linkEffectPct: 25,
      };
      b.partyConfig.globalPlayerAuraEffectPct = 120;
      b.partyConfig.auras.wrath = { enabled: true, level: 21 };
      return b;
    },
  },
  {
    id: 'earthshaker_kingmaker_aurabot',
    title: 'Earthshaker Kingmaker Aurabot (Lv 84)',
    description:
      'Kingmaker (Fortify / +50% Crit Multi / Culling) + Garb of the Ephemeral + Leer Cast + Gravebind + Determination.',
    build: () => {
      const b = createDefaultBuildState();
      b.buildName = 'Earthshaker Kingmaker Aurabot (Lv 84)';
      b.archetypeId = 'earthshaker';
      equipUniqueById(b, 'Weapon1', 'kingmaker');
      equipUniqueById(b, 'Helmet', 'leer_cast');
      equipUniqueById(b, 'BodyArmour', 'garb_of_the_ephemeral');
      equipUniqueById(b, 'Gloves', 'gravebind');
      equipUniqueById(b, 'Boots', 'ralakeshs_impatience');
      equipUniqueById(b, 'Amulet', 'perquils_toe');
      b.skillGroups = [
        makeSkillGroup('primary-1', 'PRIMARY', 'sunder', [
          'brutality',
          'melee_physical_damage',
          'pulverise',
          'concentrated_effect',
          'gilded_heft',
        ]),
        makeSkillGroup('utility-1', 'UTILITY', 'determination', ['cooldown_recovery']),
      ];
      return b;
    },
  },
  {
    id: 'swiftblade_rakiata_slayer',
    title: "Rakiata's Dance Swiftblade (Lv 84)",
    description:
      "Rakiata's Dance (Invert Enemy Ele Res) + Heatshiver + Yoke of Suffering + Cyclone of the Empire.",
    build: () => {
      const b = createDefaultBuildState();
      b.buildName = "Rakiata's Dance Swiftblade (Lv 84)";
      b.archetypeId = 'swiftblade';
      equipUniqueById(b, 'Weapon1', 'rakiatas_dance');
      equipUniqueById(b, 'Helmet', 'heatshiver');
      equipUniqueById(b, 'Amulet', 'yoke_of_suffering');
      equipUniqueById(b, 'Ring1', 'the_taming');
      b.enemyConfig.isChilled = true;
      b.enemyConfig.isFrozen = true;
      b.enemyConfig.isIgnited = true;
      b.skillGroups = [
        makeSkillGroup('primary-1', 'PRIMARY', 'cyclone_of_the_empire', [
          'elemental_damage_with_attacks',
          'elemental_focus',
          'hypothermia',
          'gilded_freezer_burn',
          'gilded_cull',
        ]),
      ];
      return b;
    },
  },
];

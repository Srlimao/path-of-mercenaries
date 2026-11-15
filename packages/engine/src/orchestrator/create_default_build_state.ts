import type { MercenaryBuildState } from '../catalog-types/index.js';

/** Creates a valid Level 84 Kineticist baseline Mercenary build state. */
export function createDefaultBuildState(): MercenaryBuildState {
  return {
    buildName: 'Level 84 Kineticist Baseline',
    archetypeId: 'kineticist',
    mercLevel: 84,
    activeSkillGroupId: 'primary-1',
    showAllSkillsSandbox: false,
    equippedItems: {},
    skillGroups: [
      {
        groupId: 'primary-1',
        slotCategory: 'PRIMARY',
        skillId: 'kinetic_blast_of_clustering',
        activePartId: 'clustering_explosion',
        enabled: true,
        supports: [],
        fullDpsParts: [
          { partId: 'projectile', includeInFullDps: true, hitCountMultiplier: 1 },
          { partId: 'clustering_explosion', includeInFullDps: true, hitCountMultiplier: 5 },
        ],
      },
    ],
    partyConfig: {
      links: {
        flameLink: { enabled: false, gemLevel: 20, playerMaxLife: 7000, linkEffectPct: 0 },
        destructiveLink: { enabled: false, gemLevel: 20, playerMainHandCritPct: 8.5 },
        intuitiveLink: { enabled: false, blockPct: 0, spellBlockPct: 0 },
      },
      globalPlayerAuraEffectPct: 0,
      generositySupported: false,
      auras: {},
      pyroclastMineCount: 0,
      smiteEnabled: false,
      combatConditions: {
        powerCharges: 0,
        frenzyCharges: 0,
        enduranceCharges: 0,
        onslaught: false,
        tailwind: false,
        adrenaline: false,
        fortifyStacks: 0,
        projectileDistance: 20,
      },
      customModifierLines: [],
    },
    enemyConfig: {
      presetId: 'pinnacle',
      level: 84,
      baseResistsPct: { Fire: 50, Cold: 50, Lightning: 50, Chaos: 30 },
      armour: 24500,
      evasion: 11200,
      physicalHitSize: 3500,
      curseEffectPct: 0,
      activeCurses: [],
      exposurePct: {},
      witherStacks: 0,
      shockPct: 0,
      scorchPct: 0,
      brittlePct: 0,
      isChilled: false,
      isFrozen: false,
      isIgnited: false,
      isBleeding: false,
      isPoisoned: false,
      isIntimidated: false,
      isUnnerved: false,
      isCoveredInAsh: false,
    },
  };
}

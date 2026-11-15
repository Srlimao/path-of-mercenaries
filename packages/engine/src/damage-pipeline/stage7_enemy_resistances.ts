import type {
  DamageType,
  EnemyConfigState,
  EnemyPresetId,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';

export interface EnemyBossPresetDefinition {
  id: EnemyPresetId;
  label: string;
  level: number;
  baseResistsPct: Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', number>;
  armour: number;
  evasion: number;
  physicalHitSize: number;
  bossCursePenalty: number;
  damageTakenMultiplier: number;
}

export const ENEMY_BOSS_PRESETS: Record<EnemyPresetId, EnemyBossPresetDefinition> = {
  standard: {
    id: 'standard',
    label: 'Standard Monster (Lv 83)',
    level: 83,
    baseResistsPct: { Fire: 40, Cold: 40, Lightning: 40, Chaos: 25 },
    armour: 12000,
    evasion: 6500,
    physicalHitSize: 2200,
    bossCursePenalty: 1.0,
    damageTakenMultiplier: 1.0,
  },
  map_boss: {
    id: 'map_boss',
    label: 'Map Boss (Tier 16)',
    level: 83,
    baseResistsPct: { Fire: 40, Cold: 40, Lightning: 40, Chaos: 25 },
    armour: 18500,
    evasion: 9200,
    physicalHitSize: 3000,
    bossCursePenalty: 0.67,
    damageTakenMultiplier: 1.0,
  },
  pinnacle: {
    id: 'pinnacle',
    label: 'Guardian / Pinnacle Boss',
    level: 84,
    baseResistsPct: { Fire: 50, Cold: 50, Lightning: 50, Chaos: 30 },
    armour: 24500,
    evasion: 11200,
    physicalHitSize: 3500,
    bossCursePenalty: 0.67,
    damageTakenMultiplier: 1.0,
  },
  uber_pinnacle: {
    id: 'uber_pinnacle',
    label: 'Uber Pinnacle Boss (0.30x)',
    level: 85,
    baseResistsPct: { Fire: 50, Cold: 50, Lightning: 50, Chaos: 30 },
    armour: 32000,
    evasion: 13500,
    physicalHitSize: 5500,
    bossCursePenalty: 0.67,
    damageTakenMultiplier: 0.3,
  },
};

export interface CurseDefinition {
  id: string;
  name: string;
  summary: string;
  resistDeltaPct?: Partial<Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', number>>;
  physTakenIncPct?: number;
  projTakenIncPct?: number;
  allTakenIncPct?: number;
  addedBaseCritPct?: number;
  addedCritMultiPct?: number;
}

export const CURSE_CATALOG: CurseDefinition[] = [
  { id: 'conductivity', name: 'Conductivity', summary: '-36% Lightning Res', resistDeltaPct: { Lightning: -36 } },
  { id: 'flammability', name: 'Flammability', summary: '-36% Fire Res', resistDeltaPct: { Fire: -36 } },
  { id: 'frostbite', name: 'Frostbite', summary: '-36% Cold Res', resistDeltaPct: { Cold: -36 } },
  {
    id: 'elemental_weakness',
    name: 'Elemental Weakness',
    summary: '-30% All Elemental Res',
    resistDeltaPct: { Fire: -30, Cold: -30, Lightning: -30 },
  },
  { id: 'despair', name: 'Despair', summary: '-30% Chaos Res', resistDeltaPct: { Chaos: -30 } },
  { id: 'vulnerability', name: 'Vulnerability', summary: '+25% Phys Taken', physTakenIncPct: 25 },
  { id: 'punishment', name: 'Punishment', summary: '+29% Avg Taken (on Low Life)', allTakenIncPct: 29 },
  {
    id: 'assassins_mark',
    name: "Assassin's Mark",
    summary: '+1.5% Base Crit, +49% Crit Multi',
    addedBaseCritPct: 1.5,
    addedCritMultiPct: 49,
  },
  { id: 'snipers_mark', name: "Sniper's Mark", summary: '+35% Projectile Taken', projTakenIncPct: 35 },
];

export function getCurseEffectivenessScalar(enemyConfig: EnemyConfigState): number {
  const preset = ENEMY_BOSS_PRESETS[enemyConfig.presetId] ?? ENEMY_BOSS_PRESETS.pinnacle;
  return Math.max(0, 1 + (enemyConfig.curseEffectPct ?? 0) / 100) * preset.bossCursePenalty;
}

/**
 * Stage 7: Computes Enemy Effective Resistance for a DamageType after Curses
 * (with Boss hex penalty), Exposure, Scorch, Doryani's / Original Sin overrides,
 * Rakiata's Inversion, and Penetration.
 */
export function computeStage7EnemyEffectiveResist(
  damageType: DamageType,
  enemyConfig: EnemyConfigState,
  skillModDb: ModDB,
  mercLightningUncappedResistPct: number,
  queryFlags: number,
  context: EvalContext,
): number {
  if (damageType === 'Physical') return 0;

  if (damageType === 'Chaos') {
    if (skillModDb.flag('EnemyChaosResZero', context, queryFlags)) {
      return 0;
    }
    const curseScalar = getCurseEffectivenessScalar(enemyConfig);
    let curseDelta = 0;
    for (const cid of enemyConfig.activeCurses) {
      const def = CURSE_CATALOG.find((c) => c.id === cid);
      if (def?.resistDeltaPct?.Chaos) curseDelta += def.resistDeltaPct.Chaos * curseScalar;
    }
    const allResMod = skillModDb.sum('BASE', {
      names: ['EnemyAllResist'],
      flags: queryFlags,
      keywordFlags: 0,
      context,
    });
    return Math.round(enemyConfig.baseResistsPct.Chaos + allResMod + curseDelta);
  }

  // Doryani's Prototype locks Enemy Lightning Res to Mercenary Lightning Res ([-200, 75])
  if (
    damageType === 'Lightning' &&
    skillModDb.flag('EnemyLightningResEqualsMerc', context, queryFlags)
  ) {
    return Math.max(-200, Math.min(75, mercLightningUncappedResistPct));
  }

  const curseScalar = getCurseEffectivenessScalar(enemyConfig);
  let curseDelta = 0;
  for (const cid of enemyConfig.activeCurses) {
    const def = CURSE_CATALOG.find((c) => c.id === cid);
    const d = def?.resistDeltaPct?.[damageType];
    if (d) curseDelta += d * curseScalar;
  }

  const exposure = enemyConfig.exposurePct[damageType] ?? 0;
  const scorch = enemyConfig.scorchPct ?? 0;
  const allResMod = skillModDb.sum('BASE', {
    names: ['EnemyAllResist'],
    flags: queryFlags,
    keywordFlags: 0,
    context,
  });

  let enemyRes =
    enemyConfig.baseResistsPct[damageType] +
    allResMod +
    curseDelta -
    Math.abs(exposure) -
    Math.abs(scorch);

  if (skillModDb.flag('InvertEnemyElementalResistances', context, queryFlags)) {
    enemyRes = -enemyRes;
  }

  const elePen = skillModDb.sum('BASE', {
    names: [`${damageType}Penetration`, 'ElementalPenetration'],
    flags: queryFlags,
    keywordFlags: 0,
    context,
  });
  return Number((enemyRes - elePen).toFixed(1));
}

import {
  DAMAGE_TYPES,
  EQUIPMENT_SLOTS,
  KeywordFlags,
  ModFlags,
  type CalculationResultSnapshot,
  type DamageType,
  type DefenceCalcResult,
  type MercenaryBuildState,
  type PerTypeDamageBreakdown,
  type SkillPartCalcResult,
} from '../catalog-types/index.js';
import { compileArchetypeMods, validateEquipmentForArchetype } from '../archetype-baseline/index.js';
import { ModDB, type EvalContext } from '../mod-db/index.js';
import { compileEquippedItemsMods } from '../mod-parser/index.js';
import {
  SEED_CATALOGS,
  findArchetypeById,
  findSkillById,
  type GameCatalogBundle,
} from '../seed-catalog/index.js';

export interface EngineCalculationOutput {
  snapshot: CalculationResultSnapshot;
  modDb: ModDB;
}

function emptyBreakdown(damageType: DamageType): PerTypeDamageBreakdown {
  const zeroRange = { min: 0, max: 0, avg: 0 };
  return {
    damageType,
    baseDamage: zeroRange,
    addedAfterEffectiveness: zeroRange,
    convertedOutPct: 0,
    gainedAsExtra: zeroRange,
    totalIncreasedPct: 0,
    totalMoreMulti: 1,
    preMitigationHit: zeroRange,
    effectivePreMitigationAvg: 0,
    enemyEffectiveResistPct: 0,
    mitigationMulti: 1,
    finalAverageHit: 0,
    hitDps: 0,
  };
}

/**
 * Compiles Archetype baseline (Phase 3) and Equipped Items (Phase 4) into ModDB,
 * computing attributes, pools, resistances, and Stage 1 weapon/skill preview metrics.
 */
export function calculateBuild(
  buildState: MercenaryBuildState,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): EngineCalculationOutput {
  const modDb = new ModDB();
  const warnings: string[] = [];

  const archetype = findArchetypeById(buildState.archetypeId, catalogs) ?? catalogs.archetypes[0]!;
  const baseline = compileArchetypeMods(archetype, buildState.mercLevel, modDb);

  const weapon1 = buildState.equippedItems.Weapon1;
  for (const slot of EQUIPMENT_SLOTS) {
    const item = buildState.equippedItems[slot];
    if (!item) continue;
    const warning = validateEquipmentForArchetype(archetype, slot, item, weapon1);
    if (warning) warnings.push(warning);
  }
  compileEquippedItemsMods(buildState.equippedItems, modDb);

  const emptyCtx: EvalContext = { conditions: {}, stats: {} };
  const q = (names: string[], flags = ModFlags.None, keywordFlags = KeywordFlags.None) => ({
    names,
    flags,
    keywordFlags,
    context: emptyCtx,
  });

  const str = Math.round(modDb.sum('BASE', q(['Str'])));
  const dex = Math.round(modDb.sum('BASE', q(['Dex'])));
  const int = Math.round(modDb.sum('BASE', q(['Int'])));

  const maxLife = Math.round(
    (modDb.sum('BASE', q(['Life'])) + str / 2) * (1 + modDb.sum('INC', q(['Life'])) / 100),
  );
  const maxEnergyShield = Math.round(
    modDb.sum('BASE', q(['EnergyShield'])) *
      (1 + (modDb.sum('INC', q(['EnergyShield'])) + int / 5) / 100),
  );
  const maxWard = Math.round(
    modDb.sum('BASE', q(['Ward'])) * (1 + modDb.sum('INC', q(['Ward'])) / 100),
  );
  const armour = Math.round(
    modDb.sum('BASE', q(['Armour'])) * (1 + modDb.sum('INC', q(['Armour'])) / 100),
  );
  const evasion = Math.round(
    modDb.sum('BASE', q(['Evasion'])) * (1 + (modDb.sum('INC', q(['Evasion'])) + dex / 5) / 100),
  );
  const accuracy = Math.round(
    (modDb.sum('BASE', q(['Accuracy'])) + dex * 2) * (1 + modDb.sum('INC', q(['Accuracy'])) / 100),
  );

  const attackBlockPct = Math.min(75, Math.round(modDb.sum('BASE', q(['AttackBlockChance']))));
  const spellBlockPct = Math.min(75, Math.round(modDb.sum('BASE', q(['SpellBlockChance']))));
  const spellSuppressionPct = Math.min(100, Math.round(modDb.sum('BASE', q(['SpellSuppressionChance']))));

  const fireUncapped = modDb.sum('BASE', q(['FireResist']));
  const coldUncapped = modDb.sum('BASE', q(['ColdResist']));
  const lightUncapped = modDb.sum('BASE', q(['LightningResist']));
  const chaosUncapped = modDb.sum('BASE', q(['ChaosResist']));

  const enemyPhysHit = Math.max(100, buildState.enemyConfig.physicalHitSize || 3500);
  const armourPdr = Math.min(0.9, armour / (armour + 5 * enemyPhysHit));
  const poolTotal = maxLife + maxEnergyShield + maxWard;

  const defences: DefenceCalcResult = {
    str,
    dex,
    int,
    accuracy,
    maxLife,
    maxEnergyShield,
    maxWard,
    armour,
    evasion,
    evadeChancePct: 0,
    attackBlockPct,
    spellBlockPct,
    spellSuppressionPct,
    physicalDamageReductionPct: Math.round(armourPdr * 100),
    resistances: {
      Fire: { capped: Math.min(75, fireUncapped), uncapped: fireUncapped, maxCap: 75, hiddenBaselinePct: baseline.hiddenElemResPct },
      Cold: { capped: Math.min(75, coldUncapped), uncapped: coldUncapped, maxCap: 75, hiddenBaselinePct: baseline.hiddenElemResPct },
      Lightning: { capped: Math.min(75, lightUncapped), uncapped: lightUncapped, maxCap: 75, hiddenBaselinePct: baseline.hiddenElemResPct },
      Chaos: { capped: Math.min(75, chaosUncapped), uncapped: chaosUncapped, maxCap: 75, hiddenBaselinePct: 0 },
    },
    physTakenAsPct: { Fire: 0, Cold: 0, Lightning: 0, Chaos: 0 },
    maxHitTaken: {
      Physical: Math.round(poolTotal / Math.max(0.1, 1 - armourPdr)),
      Fire: Math.round(poolTotal / Math.max(0.05, 1 - Math.min(75, fireUncapped) / 100)),
      Cold: Math.round(poolTotal / Math.max(0.05, 1 - Math.min(75, coldUncapped) / 100)),
      Lightning: Math.round(poolTotal / Math.max(0.05, 1 - Math.min(75, lightUncapped) / 100)),
      Chaos: Math.round(maxLife / Math.max(0.05, 1 - Math.min(75, chaosUncapped) / 100)),
    },
    effectiveHitPool: Math.round(poolTotal / Math.max(0.1, 1 - armourPdr * 0.5)),
    netLifeRecoveryPerSec: 0,
  };

  const activeGroup =
    buildState.skillGroups.find((g) => g.groupId === buildState.activeSkillGroupId) ??
    buildState.skillGroups[0];
  const activeSkillDef = activeGroup ? findSkillById(activeGroup.skillId, catalogs) : undefined;
  const activePartDef =
    activeSkillDef?.parts.find((p) => p.id === activeGroup?.activePartId) ??
    activeSkillDef?.parts[0];

  const perTypeRecord = Object.fromEntries(
    DAMAGE_TYPES.map((dt) => [dt, emptyBreakdown(dt)]),
  ) as Record<DamageType, PerTypeDamageBreakdown>;

  let activePartResult: SkillPartCalcResult | null = null;
  let activeSkillDps = 0;

  if (activeSkillDef && activePartDef) {
    const effSkillLv = activeGroup?.skillLevelOverride ?? baseline.derivedSkillLevel;
    const clampedLv = Math.max(1, Math.min(40, effSkillLv));
    const weaponStats = weapon1?.localWeaponStats;
    const skillFlags = activePartDef.skillModFlags;

    let baseAvg = 0;
    if (activePartDef.isAttack) {
      const mul = (activePartDef.weaponDamageMultiplierPctByLevel[clampedLv] ?? 100) / 100;
      const wPhys = weaponStats ? (weaponStats.physMin + weaponStats.physMax) / 2 : 12;
      let wEle = 0;
      if (weaponStats) {
        for (const dt of ['Fire', 'Cold', 'Lightning', 'Chaos'] as const) {
          wEle += ((weaponStats.eleMin[dt] ?? 0) + (weaponStats.eleMax[dt] ?? 0)) / 2;
        }
      }
      baseAvg = (wPhys + wEle) * mul;
    } else {
      const spellBase = activePartDef.baseAddedDamageByLevel[clampedLv];
      if (spellBase) {
        for (const dt of DAMAGE_TYPES) {
          const range = spellBase[dt];
          if (range) baseAvg += (range[0] + range[1]) / 2;
        }
      }
    }

    const baseCritPct = activePartDef.isAttack
      ? (weaponStats?.critChancePct ?? 5)
      : (activePartDef.baseCritChancePct ?? 6);
    const incCritPct = modDb.sum('INC', q(['CritChance'], skillFlags));
    const effCrit = Math.min(100, baseCritPct * (1 + incCritPct / 100));
    const critMulti = 150 + modDb.sum('BASE', q(['CritMultiplier'], skillFlags));
    const critFactor = 1 + (effCrit / 100) * ((critMulti - 100) / 100);

    const baseRate = activePartDef.isAttack
      ? (weaponStats?.aps ?? 1.2) * (activePartDef.attackSpeedMulti ?? 1)
      : 1 / (activePartDef.baseCastTimeSec ?? 0.7);
    const incSpeed = modDb.sum('INC', q(['Speed'], skillFlags));
    const effRate = Number((baseRate * (1 + incSpeed / 100)).toFixed(2));

    const incDmg = modDb.sum('INC', q(['Damage', 'ProjectileDamage', 'ElementalDamage', 'PhysicalDamage'], skillFlags, activePartDef.skillKeywordFlags));
    const avgHit = Math.round(baseAvg * (1 + incDmg / 100) * critFactor);
    activeSkillDps = Math.round(avgHit * effRate);

    activePartResult = {
      groupId: activeGroup?.groupId ?? 'primary-1',
      skillId: activeSkillDef.id,
      skillName: activeSkillDef.name,
      partId: activePartDef.id,
      partLabel: activePartDef.label,
      effectiveSkillLevel: clampedLv,
      hitChancePct: 100,
      effectiveCritChancePct: Number(effCrit.toFixed(2)),
      critMultiplierPct: Math.round(critMulti),
      effectiveActionRate: effRate,
      isLuckyDamage: modDb.flag('LuckyHitDamage', emptyCtx),
      averageHit: avgHit,
      hitDps: activeSkillDps,
      impaleDps: 0,
      igniteDps: 0,
      bleedDps: 0,
      poisonDps: 0,
      partFullDpsContribution: activeSkillDps,
      perTypeBreakdown: perTypeRecord,
    };
  }

  return {
    modDb,
    snapshot: {
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      mercLevel: baseline.clampedLevel,
      derivedSkillLevel: baseline.derivedSkillLevel,
      combinedFullDps: activeSkillDps,
      activeSkillDps,
      activePartResult,
      skillResults: activePartResult ? [activePartResult] : [],
      defences,
      calcsRows: [],
      warnings,
    },
  };
}

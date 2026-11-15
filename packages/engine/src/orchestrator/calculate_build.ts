import {
  EQUIPMENT_SLOTS,
  KeywordFlags,
  ModFlags,
  type CalculationResultSnapshot,
  type DefenceCalcResult,
  type MercenaryBuildState,
} from '../catalog-types/index.js';
import { compileArchetypeMods, validateEquipmentForArchetype } from '../archetype-baseline/index.js';
import { computeStage10FullDps } from '../damage-pipeline/index.js';
import { ModDB, type EvalContext } from '../mod-db/index.js';
import { compileEquippedItemsMods } from '../mod-parser/index.js';
import {
  SEED_CATALOGS,
  findArchetypeById,
  type GameCatalogBundle,
} from '../seed-catalog/index.js';

export interface EngineCalculationOutput {
  snapshot: CalculationResultSnapshot;
  modDb: ModDB;
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

  const fullDpsOutput = computeStage10FullDps(
    buildState,
    modDb,
    baseline.derivedSkillLevel,
    accuracy,
    lightUncapped,
    catalogs,
  );
  warnings.push(...fullDpsOutput.warnings);

  return {
    modDb,
    snapshot: {
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      mercLevel: baseline.clampedLevel,
      derivedSkillLevel: baseline.derivedSkillLevel,
      combinedFullDps: fullDpsOutput.combinedFullDps,
      activeSkillDps: fullDpsOutput.activeSkillDps,
      activePartResult: fullDpsOutput.activePartResult,
      skillResults: fullDpsOutput.skillResults,
      defences,
      calcsRows: [],
      warnings,
    },
  };
}

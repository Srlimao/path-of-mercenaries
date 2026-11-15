import {
  DAMAGE_TYPES,
  KeywordFlags,
  ModFlags,
  type CalculationResultSnapshot,
  type DamageType,
  type DefenceCalcResult,
  type MercenaryBuildState,
  type PerTypeDamageBreakdown,
  type SkillPartCalcResult,
} from '../catalog-types/index.js';
import { ModDB, type EvalContext, type ModSource } from '../mod-db/index.js';
import {
  SEED_CATALOGS,
  deriveHiddenElemResPct,
  deriveMercSkillLevel,
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

function archetypeSource(archetypeName: string, rawLine: string): ModSource {
  return {
    sourceType: 'Archetype',
    sourceId: `archetype:${archetypeName}`,
    sourceLabel: `${archetypeName} Baseline`,
    rawLine,
  };
}

/**
 * Baseline Phase 1 calculation orchestrator.
 * Compiles Archetype Level 1-85 baseline stats into ModDB and returns a full snapshot DTO.
 */
export function calculateBuild(
  buildState: MercenaryBuildState,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): EngineCalculationOutput {
  const modDb = new ModDB();
  const warnings: string[] = [];

  const archetype = findArchetypeById(buildState.archetypeId, catalogs) ?? catalogs.archetypes[0];
  const clampedLevel = Math.max(1, Math.min(85, Math.round(buildState.mercLevel)));
  const levelRow = archetype?.statsByLevel[clampedLevel];

  const baseStr = levelRow?.baseStr ?? 50;
  const baseDex = levelRow?.baseDex ?? 50;
  const baseInt = levelRow?.baseInt ?? 50;
  const baseLife = levelRow?.baseLife ?? 1000;
  const baseAccuracy = levelRow?.baseAccuracy ?? 500;
  const baseEvasion = levelRow?.baseEvasion ?? 300;
  const hiddenElemResPct = levelRow?.hiddenElemResPct ?? deriveHiddenElemResPct(clampedLevel);
  const derivedSkillLevel = levelRow?.defaultSkillLevel ?? deriveMercSkillLevel(clampedLevel);
  const archName = archetype?.name ?? 'Unknown Archetype';

  modDb.addMods([
    { name: 'Str', type: 'BASE', value: baseStr, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${baseStr} Strength`) },
    { name: 'Dex', type: 'BASE', value: baseDex, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${baseDex} Dexterity`) },
    { name: 'Int', type: 'BASE', value: baseInt, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${baseInt} Intelligence`) },
    { name: 'Life', type: 'BASE', value: baseLife, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${baseLife} Base Life`) },
    { name: 'Accuracy', type: 'BASE', value: baseAccuracy, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${baseAccuracy} Base Accuracy`) },
    { name: 'Evasion', type: 'BASE', value: baseEvasion, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${baseEvasion} Base Evasion`) },
    { name: 'FireResist', type: 'BASE', value: hiddenElemResPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${hiddenElemResPct}% Hidden Elemental Resistances`) },
    { name: 'ColdResist', type: 'BASE', value: hiddenElemResPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${hiddenElemResPct}% Hidden Elemental Resistances`) },
    { name: 'LightningResist', type: 'BASE', value: hiddenElemResPct, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: archetypeSource(archName, `+${hiddenElemResPct}% Hidden Elemental Resistances`) },
  ]);

  const emptyContext: EvalContext = { conditions: {}, stats: {} };
  const queryBase = (name: string) => ({
    names: [name],
    flags: ModFlags.None,
    keywordFlags: KeywordFlags.None,
    context: emptyContext,
  });

  const str = modDb.sum('BASE', queryBase('Str'));
  const dex = modDb.sum('BASE', queryBase('Dex'));
  const int = modDb.sum('BASE', queryBase('Int'));
  const maxLife = Math.round(modDb.sum('BASE', queryBase('Life')) + str / 2);
  const accuracy = Math.round(modDb.sum('BASE', queryBase('Accuracy')) + dex * 2);
  const evasion = Math.round(modDb.sum('BASE', queryBase('Evasion')));

  const fireUncapped = modDb.sum('BASE', queryBase('FireResist'));
  const coldUncapped = modDb.sum('BASE', queryBase('ColdResist'));
  const lightUncapped = modDb.sum('BASE', queryBase('LightningResist'));
  const chaosUncapped = modDb.sum('BASE', queryBase('ChaosResist'));

  const defences: DefenceCalcResult = {
    str,
    dex,
    int,
    accuracy,
    maxLife,
    maxEnergyShield: 0,
    maxWard: 0,
    armour: 0,
    evasion,
    evadeChancePct: 0,
    attackBlockPct: 0,
    spellBlockPct: 0,
    spellSuppressionPct: 0,
    physicalDamageReductionPct: 0,
    resistances: {
      Fire: { capped: Math.min(75, fireUncapped), uncapped: fireUncapped, maxCap: 75, hiddenBaselinePct: hiddenElemResPct },
      Cold: { capped: Math.min(75, coldUncapped), uncapped: coldUncapped, maxCap: 75, hiddenBaselinePct: hiddenElemResPct },
      Lightning: { capped: Math.min(75, lightUncapped), uncapped: lightUncapped, maxCap: 75, hiddenBaselinePct: hiddenElemResPct },
      Chaos: { capped: Math.min(75, chaosUncapped), uncapped: chaosUncapped, maxCap: 75, hiddenBaselinePct: 0 },
    },
    physTakenAsPct: { Fire: 0, Cold: 0, Lightning: 0, Chaos: 0 },
    maxHitTaken: {
      Physical: maxLife,
      Fire: Math.round(maxLife / Math.max(0.1, 1 - Math.min(75, fireUncapped) / 100)),
      Cold: Math.round(maxLife / Math.max(0.1, 1 - Math.min(75, coldUncapped) / 100)),
      Lightning: Math.round(maxLife / Math.max(0.1, 1 - Math.min(75, lightUncapped) / 100)),
      Chaos: maxLife,
    },
    effectiveHitPool: maxLife,
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

  const activePartResult: SkillPartCalcResult | null = activeSkillDef && activePartDef
    ? {
        groupId: activeGroup?.groupId ?? 'primary-1',
        skillId: activeSkillDef.id,
        skillName: activeSkillDef.name,
        partId: activePartDef.id,
        partLabel: activePartDef.label,
        effectiveSkillLevel: activeGroup?.skillLevelOverride ?? derivedSkillLevel,
        hitChancePct: 100,
        effectiveCritChancePct: 0,
        critMultiplierPct: 150,
        effectiveActionRate: 1,
        isLuckyDamage: false,
        averageHit: 0,
        hitDps: 0,
        impaleDps: 0,
        igniteDps: 0,
        bleedDps: 0,
        poisonDps: 0,
        partFullDpsContribution: 0,
        perTypeBreakdown: perTypeRecord,
      }
    : null;

  return {
    modDb,
    snapshot: {
      archetypeId: archetype?.id ?? buildState.archetypeId,
      archetypeName: archName,
      mercLevel: clampedLevel,
      derivedSkillLevel,
      combinedFullDps: 0,
      activeSkillDps: 0,
      activePartResult,
      skillResults: activePartResult ? [activePartResult] : [],
      defences,
      calcsRows: [],
      warnings,
    },
  };
}

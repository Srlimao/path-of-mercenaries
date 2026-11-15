import {
  EQUIPMENT_SLOTS,
  type CalculationResultSnapshot,
  type MercenaryBuildState,
} from '../catalog-types/index.js';
import { compileArchetypeMods, validateEquipmentForArchetype } from '../archetype-baseline/index.js';
import { computeStage10FullDps } from '../damage-pipeline/index.js';
import { computeDefences } from '../defence-pipeline/index.js';
import { ModDB } from '../mod-db/index.js';
import { compileEquippedItemsMods } from '../mod-parser/index.js';
import {
  compileCombatConditionMods,
  compilePlayerAuraMods,
  compilePlayerLinkMods,
} from '../party-aura-link-compiler/index.js';
import {
  SEED_CATALOGS,
  findArchetypeById,
  type GameCatalogBundle,
} from '../seed-catalog/index.js';
import { compileUniqueHandlerMods } from '../unique-handlers/index.js';

export interface EngineCalculationOutput {
  snapshot: CalculationResultSnapshot;
  modDb: ModDB;
}

/**
 * Compiles Archetype baseline, Equipped Items, Party/Conditions, and Unique Handlers
 * into ModDB, then runs the Full Defence & EHP Pipeline (Phase 11) and Stage 2-10
 * Offence & Ailment Pipeline (Phase 10).
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
  compilePlayerLinkMods(buildState.partyConfig, modDb);
  compilePlayerAuraMods(buildState.partyConfig, modDb);
  const unrecognizedCustomLines = compileCombatConditionMods(buildState, modDb);
  compileUniqueHandlerMods(buildState, modDb);
  if (unrecognizedCustomLines.length > 0) {
    warnings.push(
      `Unrecognized custom mod line(s): ${unrecognizedCustomLines.slice(0, 3).join('; ')}${unrecognizedCustomLines.length > 3 ? ` (+${unrecognizedCustomLines.length - 3} more)` : ''}`,
    );
  }

  const defences = computeDefences(buildState, modDb, baseline.hiddenElemResPct);

  const fullDpsOutput = computeStage10FullDps(
    buildState,
    modDb,
    baseline.derivedSkillLevel,
    defences.accuracy,
    defences.resistances.Lightning.uncapped,
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

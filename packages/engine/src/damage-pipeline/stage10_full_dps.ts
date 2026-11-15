import type {
  MercenaryBuildState,
  MercenarySkillDefinition,
  SkillGroupSetup,
  SkillPartCalcResult,
  SkillPartDefinition,
} from '../catalog-types/index.js';
import type { ModDB, ModSource } from '../mod-db/index.js';
import { parseModLineToMods } from '../mod-parser/index.js';
import {
  findSkillById,
  findSupportById,
  SEED_CATALOGS,
  type GameCatalogBundle,
} from '../seed-catalog/index.js';
import { computeStage2AddedDamage } from './stage2_added_damage.js';
import { computeStage3ConversionDag } from './stage3_conversion_dag.js';
import { computeStage4IncMoreAndMitigation } from './stage4_inc_more_buckets.js';
import { computeStage5CritAndHit } from './stage5_crit_lucky_multihit.js';
import { computeStage6AccuracyAndSpeed } from './stage6_accuracy_speed.js';

export interface Stage10FullDpsOutput {
  combinedFullDps: number;
  activeSkillDps: number;
  activePartResult: SkillPartCalcResult | null;
  skillResults: SkillPartCalcResult[];
  warnings: string[];
}

function lookupSupportLinesByLevel(
  modsByLevel: Record<number, string[]>,
  gemLevel: number,
): string[] {
  if (modsByLevel[gemLevel]) return modsByLevel[gemLevel]!;
  const levels = Object.keys(modsByLevel)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (levels.length === 0) return [];
  let chosen = levels[0]!;
  for (const lv of levels) {
    if (lv <= gemLevel) chosen = lv;
  }
  return modsByLevel[chosen] ?? [];
}

/**
 * Clones the build-wide ModDB and compiles skill part modifiers plus
 * all enabled Support Gem modifiers for one SkillGroupSetup + SkillPart.
 */
export function compileSkillGroupModDb(
  baseModDb: ModDB,
  skill: MercenarySkillDefinition,
  part: SkillPartDefinition,
  group: SkillGroupSetup,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): ModDB {
  const skillModDb = baseModDb.clone();

  for (const rawLine of part.partMods) {
    const source: ModSource = {
      sourceType: 'Skill',
      sourceId: `${skill.id}:${part.id}`,
      sourceLabel: `${skill.name} (${part.label})`,
      rawLine,
    };
    const mods = parseModLineToMods(rawLine, source);
    if (mods.length > 0) skillModDb.addMods(mods);
  }

  for (const supSlot of group.supports) {
    if (!supSlot.enabled) continue;
    const supDef = findSupportById(supSlot.supportId, catalogs);
    if (!supDef) continue;
    const lines = lookupSupportLinesByLevel(supDef.modsByLevel, supSlot.level);
    for (const rawLine of lines) {
      const source: ModSource = {
        sourceType: 'Support',
        sourceId: supDef.id,
        sourceLabel: `${supDef.name} (Lv ${supSlot.level})`,
        rawLine,
      };
      const mods = parseModLineToMods(rawLine, source);
      if (mods.length > 0) skillModDb.addMods(mods);
    }
  }

  return skillModDb;
}

/** Runs Stages 2 -> 3 -> 4 -> 5 -> 6 for a single SkillGroup + SkillPart. */
export function calculateSingleSkillPart(
  buildState: MercenaryBuildState,
  baseModDb: ModDB,
  skill: MercenarySkillDefinition,
  part: SkillPartDefinition,
  group: SkillGroupSetup,
  effectiveSkillLevel: number,
  accuracy: number,
  mercLightningUncappedResistPct: number,
  includeInFullDps: boolean,
  hitCountMultiplier: number,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): SkillPartCalcResult {
  const skillModDb = compileSkillGroupModDb(baseModDb, skill, part, group, catalogs);
  const stage2 = computeStage2AddedDamage(
    skill,
    part,
    effectiveSkillLevel,
    skillModDb,
    buildState,
  );
  const stage3 = computeStage3ConversionDag(
    stage2.baseRanges,
    part,
    skillModDb,
    stage2.queryFlags,
    stage2.evalContext,
  );
  const stage4 = computeStage4IncMoreAndMitigation(
    stage3.chunks,
    skillModDb,
    buildState.enemyConfig,
    mercLightningUncappedResistPct,
    stage2.queryFlags,
    stage2.evalContext,
  );
  const stage5 = computeStage5CritAndHit(
    stage2,
    stage3,
    stage4,
    skillModDb,
    buildState.enemyConfig,
    stage2.queryFlags,
    stage2.evalContext,
  );

  return computeStage6AccuracyAndSpeed(
    group.groupId,
    skill,
    part,
    stage2,
    stage5,
    skillModDb,
    accuracy,
    buildState,
    stage2.queryFlags,
    stage2.evalContext,
    includeInFullDps,
    hitCountMultiplier,
  );
}

/**
 * Stage 10: Evaluates every enabled SkillGroupSetup and its multi-part hit configs,
 * aggregating partFullDpsContribution into Combined Full DPS while isolating activeSkillDps.
 */
export function computeStage10FullDps(
  buildState: MercenaryBuildState,
  baseModDb: ModDB,
  derivedSkillLevel: number,
  accuracy: number,
  mercLightningUncappedResistPct: number,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): Stage10FullDpsOutput {
  const skillResults: SkillPartCalcResult[] = [];
  const warnings: string[] = [];
  let combinedFullDps = 0;

  const activeGroupId =
    buildState.skillGroups.find((g) => g.groupId === buildState.activeSkillGroupId)?.groupId ??
    buildState.skillGroups[0]?.groupId;

  let activePartResult: SkillPartCalcResult | null = null;

  for (const group of buildState.skillGroups) {
    if (!group.enabled) continue;
    const skill = findSkillById(group.skillId, catalogs);
    if (!skill || skill.parts.length === 0) {
      warnings.push(`Skill '${group.skillId}' has no calculable skill parts.`);
      continue;
    }

    const effectiveSkillLevel = Math.max(1, group.skillLevelOverride ?? derivedSkillLevel);

    for (const part of skill.parts) {
      const entry = group.fullDpsParts.find((p) => p.partId === part.id);
      const includeInFullDps = entry ? entry.includeInFullDps : part.defaultFullDpsCount > 0;
      const hitCountMultiplier = entry ? entry.hitCountMultiplier : part.defaultFullDpsCount;

      const partResult = calculateSingleSkillPart(
        buildState,
        baseModDb,
        skill,
        part,
        group,
        effectiveSkillLevel,
        accuracy,
        mercLightningUncappedResistPct,
        includeInFullDps,
        hitCountMultiplier,
        catalogs,
      );

      skillResults.push(partResult);
      combinedFullDps += partResult.partFullDpsContribution;

      if (
        group.groupId === activeGroupId &&
        (part.id === group.activePartId || (!activePartResult && part.id === skill.parts[0]!.id))
      ) {
        activePartResult = partResult;
      }
    }
  }

  const activeSkillDps = activePartResult
    ? Number((activePartResult.hitDps + activePartResult.impaleDps).toFixed(1))
    : 0;

  return {
    combinedFullDps: Number(combinedFullDps.toFixed(1)),
    activeSkillDps,
    activePartResult,
    skillResults,
    warnings,
  };
}

import {
  KeywordFlags,
  ModFlags,
  type EquippedSupportSlot,
  type MercenaryBuildState,
  type MercenarySkillDefinition,
  type SkillGroupSetup,
  type SupportGemDefinition,
} from '../catalog-types/index.js';
import { calculateSingleSkillPart } from '../damage-pipeline/index.js';
import type { ModDB } from '../mod-db/index.js';
import {
  findSkillById,
  SEED_CATALOGS,
  type GameCatalogBundle,
} from '../seed-catalog/index.js';

export interface SupportGemRankingEntry {
  support: SupportGemDefinition;
  compatible: boolean;
  alreadyEquippedElsewhere: boolean;
  baselineDps: number;
  candidateDps: number;
  deltaDps: number;
  deltaDpsPct: number;
  baselineFullDps: number;
  candidateFullDps: number;
  deltaFullDps: number;
  deltaFullDpsPct: number;
}

export interface RankSupportGemsOptions {
  buildState: MercenaryBuildState;
  baseModDb: ModDB;
  groupId: string;
  slotIndex: number;
  derivedSkillLevel: number;
  accuracy: number;
  mercLightningUncappedResistPct: number;
  supportLevel?: number;
  catalogs?: GameCatalogBundle;
  includeIncompatible?: boolean;
}

/** Collects explicit tags plus implicit ModFlags/KeywordFlags tags across skill parts. */
export function deriveEffectiveSkillTags(skill: MercenarySkillDefinition): Set<string> {
  const tags = new Set(skill.tags.map((t) => t.toLowerCase()));
  for (const part of skill.parts) {
    if (part.isAttack) {
      tags.add('attack');
      tags.add('hit');
    }
    if (part.isSpell) {
      tags.add('spell');
      tags.add('hit');
    }
    if ((part.skillModFlags & ModFlags.Projectile) !== 0) tags.add('projectile');
    if ((part.skillModFlags & ModFlags.Area) !== 0) tags.add('area');
    if ((part.skillModFlags & ModFlags.Melee) !== 0) tags.add('melee');
    if ((part.skillKeywordFlags & KeywordFlags.Physical) !== 0) tags.add('physical');
    if ((part.skillKeywordFlags & KeywordFlags.Lightning) !== 0) tags.add('lightning');
    if ((part.skillKeywordFlags & KeywordFlags.Cold) !== 0) tags.add('cold');
    if ((part.skillKeywordFlags & KeywordFlags.Fire) !== 0) tags.add('fire');
    if ((part.skillKeywordFlags & KeywordFlags.Chaos) !== 0) tags.add('chaos');
    if ((part.skillKeywordFlags & KeywordFlags.Elemental) !== 0) tags.add('elemental');
  }
  return tags;
}

/** Returns true if a Support Gem's required/excluded tags permit linking to `skill`. */
export function isSupportCompatibleWithSkill(
  skill: MercenarySkillDefinition,
  support: SupportGemDefinition,
): boolean {
  const effectiveTags = deriveEffectiveSkillTags(skill);
  for (const req of support.requiredSkillTags) {
    if (!effectiveTags.has(req.toLowerCase())) return false;
  }
  for (const excl of support.excludedSkillTags ?? []) {
    if (effectiveTags.has(excl.toLowerCase())) return false;
  }
  return true;
}

function evaluateGroupActiveAndFullDps(
  buildState: MercenaryBuildState,
  baseModDb: ModDB,
  skill: MercenarySkillDefinition,
  group: SkillGroupSetup,
  derivedSkillLevel: number,
  accuracy: number,
  mercLightningUncappedResistPct: number,
  catalogs: GameCatalogBundle,
): { activeDps: number; fullDps: number } {
  const effectiveLevel = Math.max(1, group.skillLevelOverride ?? derivedSkillLevel);
  let activeDps = 0;
  let fullDps = 0;
  let foundActive = false;

  for (const part of skill.parts) {
    const entry = group.fullDpsParts.find((p) => p.partId === part.id);
    const include = entry ? entry.includeInFullDps : part.defaultFullDpsCount > 0;
    const hitCount = entry ? entry.hitCountMultiplier : part.defaultFullDpsCount;
    const res = calculateSingleSkillPart(
      buildState,
      baseModDb,
      skill,
      part,
      group,
      effectiveLevel,
      accuracy,
      mercLightningUncappedResistPct,
      include,
      hitCount,
      catalogs,
    );
    fullDps += res.partFullDpsContribution;
    if (part.id === group.activePartId || (!foundActive && part.id === skill.parts[0]!.id)) {
      activeDps = res.hitDps + res.impaleDps;
      if (part.id === group.activePartId) foundActive = true;
    }
  }
  return { activeDps, fullDps };
}

function swapSupportIntoSlot(
  supports: EquippedSupportSlot[],
  slotIndex: number,
  supportId: string,
  level: number,
): EquippedSupportSlot[] {
  const next = supports.map((s) => ({ ...s }));
  const replacement: EquippedSupportSlot = { supportId, level, enabled: true };
  if (slotIndex >= 0 && slotIndex < next.length) {
    next[slotIndex] = replacement;
  } else {
    next.push(replacement);
  }
  return next;
}

/**
 * Evaluates every Support Gem in the catalog swapped into `slotIndex` of `groupId`
 * and returns results sorted descending by Full DPS / Active Hit DPS gain.
 */
export function rankSupportGemsForSkillGroup(
  options: RankSupportGemsOptions,
): SupportGemRankingEntry[] {
  const catalogs = options.catalogs ?? SEED_CATALOGS;
  const group = options.buildState.skillGroups.find((g) => g.groupId === options.groupId);
  if (!group) return [];
  const skill = findSkillById(group.skillId, catalogs);
  if (!skill || skill.parts.length === 0) return [];

  const rawTargetLevel =
    options.supportLevel ?? group.supports[options.slotIndex]?.level ?? 3;
  const targetLevel = Math.min(3, Math.max(1, rawTargetLevel > 3 ? 3 : Math.round(rawTargetLevel)));

  const baseline = evaluateGroupActiveAndFullDps(
    options.buildState,
    options.baseModDb,
    skill,
    group,
    options.derivedSkillLevel,
    options.accuracy,
    options.mercLightningUncappedResistPct,
    catalogs,
  );

  const otherEquippedIds = new Set(
    group.supports
      .filter((_, idx) => idx !== options.slotIndex)
      .map((s) => s.supportId),
  );

  const entries: SupportGemRankingEntry[] = [];
  for (const support of catalogs.supports) {
    const compatible = isSupportCompatibleWithSkill(skill, support);
    if (!compatible && !options.includeIncompatible) continue;

    const alreadyEquippedElsewhere = otherEquippedIds.has(support.id);
    if (!compatible) {
      entries.push({
        support,
        compatible: false,
        alreadyEquippedElsewhere,
        baselineDps: baseline.activeDps,
        candidateDps: baseline.activeDps,
        deltaDps: 0,
        deltaDpsPct: 0,
        baselineFullDps: baseline.fullDps,
        candidateFullDps: baseline.fullDps,
        deltaFullDps: 0,
        deltaFullDpsPct: 0,
      });
      continue;
    }

    const candidateGroup: SkillGroupSetup = {
      ...group,
      supports: swapSupportIntoSlot(group.supports, options.slotIndex, support.id, targetLevel),
    };
    const cand = evaluateGroupActiveAndFullDps(
      options.buildState,
      options.baseModDb,
      skill,
      candidateGroup,
      options.derivedSkillLevel,
      options.accuracy,
      options.mercLightningUncappedResistPct,
      catalogs,
    );

    const deltaDps = cand.activeDps - baseline.activeDps;
    const deltaDpsPct = baseline.activeDps > 0 ? (deltaDps / baseline.activeDps) * 100 : 0;
    const deltaFullDps = cand.fullDps - baseline.fullDps;
    const deltaFullDpsPct = baseline.fullDps > 0 ? (deltaFullDps / baseline.fullDps) * 100 : 0;

    entries.push({
      support,
      compatible: true,
      alreadyEquippedElsewhere,
      baselineDps: Number(baseline.activeDps.toFixed(1)),
      candidateDps: Number(cand.activeDps.toFixed(1)),
      deltaDps: Number(deltaDps.toFixed(1)),
      deltaDpsPct: Number(deltaDpsPct.toFixed(1)),
      baselineFullDps: Number(baseline.fullDps.toFixed(1)),
      candidateFullDps: Number(cand.fullDps.toFixed(1)),
      deltaFullDps: Number(deltaFullDps.toFixed(1)),
      deltaFullDpsPct: Number(deltaFullDpsPct.toFixed(1)),
    });
  }

  entries.sort((a, b) => {
    if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
    if (a.alreadyEquippedElsewhere !== b.alreadyEquippedElsewhere) {
      return a.alreadyEquippedElsewhere ? 1 : -1;
    }
    if (b.deltaFullDps !== a.deltaFullDps) return b.deltaFullDps - a.deltaFullDps;
    return b.deltaDps - a.deltaDps;
  });

  return entries;
}

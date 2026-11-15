import {
  SEED_CATALOGS,
  findSkillById,
  type FullDpsPartEntry,
  type GameCatalogBundle,
  type MercenaryBuildState,
  type SkillGroupSetup,
} from '@pom/engine';

function buildDefaultFullDpsParts(
  skillId: string,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): FullDpsPartEntry[] {
  const skillDef = findSkillById(skillId, catalogs);
  if (!skillDef) return [];
  return skillDef.parts.map((part) => ({
    partId: part.id,
    includeInFullDps: part.defaultFullDpsCount > 0,
    hitCountMultiplier: part.defaultFullDpsCount,
  }));
}

export function addSkillGroupInState(
  prev: MercenaryBuildState,
  skillId: string,
  slotCategory: SkillGroupSetup['slotCategory'] = 'SECONDARY',
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): MercenaryBuildState {
  const skillDef = findSkillById(skillId, catalogs) ?? catalogs.skills[0];
  if (!skillDef) return prev;
  const newGroupId = `group-${Date.now()}-${prev.skillGroups.length + 1}`;
  const newGroup: SkillGroupSetup = {
    groupId: newGroupId,
    slotCategory,
    skillId: skillDef.id,
    activePartId: skillDef.parts[0]?.id ?? '',
    enabled: true,
    supports: [],
    fullDpsParts: buildDefaultFullDpsParts(skillDef.id, catalogs),
  };
  return {
    ...prev,
    activeSkillGroupId: prev.skillGroups.length === 0 ? newGroupId : prev.activeSkillGroupId,
    skillGroups: [...prev.skillGroups, newGroup],
  };
}

export function removeSkillGroupInState(
  prev: MercenaryBuildState,
  groupId: string,
): MercenaryBuildState {
  if (prev.skillGroups.length <= 1) return prev;
  const nextGroups = prev.skillGroups.filter((g) => g.groupId !== groupId);
  const nextActiveId =
    prev.activeSkillGroupId === groupId ? (nextGroups[0]?.groupId ?? '') : prev.activeSkillGroupId;
  return {
    ...prev,
    activeSkillGroupId: nextActiveId,
    skillGroups: nextGroups,
  };
}

export function toggleSkillGroupEnabledInState(
  prev: MercenaryBuildState,
  groupId: string,
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) =>
      g.groupId === groupId ? { ...g, enabled: !g.enabled } : g,
    ),
  };
}

export function setSkillGroupCategoryInState(
  prev: MercenaryBuildState,
  groupId: string,
  slotCategory: SkillGroupSetup['slotCategory'],
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) =>
      g.groupId === groupId ? { ...g, slotCategory } : g,
    ),
  };
}

export function setSkillGroupLevelOverrideInState(
  prev: MercenaryBuildState,
  groupId: string,
  skillLevelOverride?: number,
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) => {
      if (g.groupId !== groupId) return g;
      if (skillLevelOverride === undefined) {
        const next = { ...g };
        delete next.skillLevelOverride;
        return next;
      }
      return {
        ...g,
        skillLevelOverride: Math.max(1, Math.min(40, Math.round(skillLevelOverride))),
      };
    }),
  };
}

export function setSupportGemSlotInState(
  prev: MercenaryBuildState,
  groupId: string,
  slotIndex: number,
  supportId: string,
  level = 20,
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) => {
      if (g.groupId !== groupId) return g;
      const nextSupports = g.supports.map((s) => ({ ...s }));
      const nextEntry = { supportId, level, enabled: true };
      if (slotIndex >= 0 && slotIndex < nextSupports.length) {
        nextSupports[slotIndex] = nextEntry;
      } else {
        nextSupports.push(nextEntry);
      }
      return { ...g, supports: nextSupports };
    }),
  };
}

export function removeSupportGemSlotInState(
  prev: MercenaryBuildState,
  groupId: string,
  slotIndex: number,
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) =>
      g.groupId === groupId
        ? { ...g, supports: g.supports.filter((_, idx) => idx !== slotIndex) }
        : g,
    ),
  };
}

export function toggleSupportGemSlotInState(
  prev: MercenaryBuildState,
  groupId: string,
  slotIndex: number,
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) =>
      g.groupId === groupId
        ? {
            ...g,
            supports: g.supports.map((s, idx) =>
              idx === slotIndex ? { ...s, enabled: !s.enabled } : s,
            ),
          }
        : g,
    ),
  };
}

export function setSupportGemLevelInState(
  prev: MercenaryBuildState,
  groupId: string,
  slotIndex: number,
  level: number,
): MercenaryBuildState {
  const clamped = Math.max(1, Math.min(25, Math.round(level)));
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) =>
      g.groupId === groupId
        ? {
            ...g,
            supports: g.supports.map((s, idx) =>
              idx === slotIndex ? { ...s, level: clamped } : s,
            ),
          }
        : g,
    ),
  };
}

export function updateFullDpsPartInState(
  prev: MercenaryBuildState,
  groupId: string,
  partId: string,
  patch: Partial<FullDpsPartEntry>,
): MercenaryBuildState {
  return {
    ...prev,
    skillGroups: prev.skillGroups.map((g) => {
      if (g.groupId !== groupId) return g;
      const existing = g.fullDpsParts.find((p) => p.partId === partId);
      const nextParts = existing
        ? g.fullDpsParts.map((p) => (p.partId === partId ? { ...p, ...patch } : p))
        : [
            ...g.fullDpsParts,
            {
              partId,
              includeInFullDps: patch.includeInFullDps ?? true,
              hitCountMultiplier: patch.hitCountMultiplier ?? 1,
            },
          ];
      return { ...g, fullDpsParts: nextParts };
    }),
  };
}

export function setShowAllSkillsSandboxInState(
  prev: MercenaryBuildState,
  showAllSkillsSandbox: boolean,
): MercenaryBuildState {
  return { ...prev, showAllSkillsSandbox };
}

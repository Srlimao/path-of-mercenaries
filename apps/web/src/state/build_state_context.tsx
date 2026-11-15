import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  SEED_CATALOGS,
  calculateBuild,
  createDefaultBuildState,
  findArchetypeById,
  findSkillById,
  type EngineCalculationOutput,
  type MercenaryBuildState,
} from '@pom/engine';

export type WorkspaceTabId = 'items' | 'skills' | 'config' | 'calcs';

export interface BuildStateContextValue {
  buildState: MercenaryBuildState;
  activeTab: WorkspaceTabId;
  engineOutput: EngineCalculationOutput;
  setActiveTab: (tab: WorkspaceTabId) => void;
  setBuildName: (name: string) => void;
  setArchetypeId: (archetypeId: string) => void;
  setMercLevel: (level: number) => void;
  setActiveSkillGroup: (groupId: string) => void;
  setActiveSkillId: (groupId: string, skillId: string) => void;
  setActiveSkillPart: (groupId: string, partId: string) => void;
  updateBuildState: (updater: (prev: MercenaryBuildState) => MercenaryBuildState) => void;
  resetBuildState: () => void;
}

export const BuildStateContext = createContext<BuildStateContextValue | null>(null);

export function BuildStateProvider({ children }: PropsWithChildren) {
  const [buildState, setBuildState] = useState<MercenaryBuildState>(() =>
    createDefaultBuildState(),
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('items');

  const engineOutput = useMemo(
    () => calculateBuild(buildState, SEED_CATALOGS),
    [buildState],
  );

  const setBuildName = useCallback((name: string) => {
    setBuildState((prev) => ({ ...prev, buildName: name }));
  }, []);

  const setArchetypeId = useCallback((archetypeId: string) => {
    setBuildState((prev) => {
      const nextArch = findArchetypeById(archetypeId, SEED_CATALOGS);
      if (!nextArch) return { ...prev, archetypeId };

      const validPool = new Set([
        ...nextArch.skillPool.primary,
        ...nextArch.skillPool.secondary,
        ...nextArch.skillPool.utility,
      ]);

      const nextGroups = prev.skillGroups.map((group) => {
        if (
          group.groupId === prev.activeSkillGroupId &&
          !prev.showAllSkillsSandbox &&
          !validPool.has(group.skillId)
        ) {
          const fallbackSkillId = nextArch.skillPool.primary[0] ?? group.skillId;
          const skillDef = findSkillById(fallbackSkillId, SEED_CATALOGS);
          const firstPartId = skillDef?.parts[0]?.id ?? '';
          return {
            ...group,
            skillId: fallbackSkillId,
            activePartId: firstPartId,
            fullDpsParts: (skillDef?.parts ?? []).map((p) => ({
              partId: p.id,
              includeInFullDps: true,
              hitCountMultiplier: p.defaultFullDpsCount,
            })),
          };
        }
        return group;
      });

      return { ...prev, archetypeId, skillGroups: nextGroups };
    });
  }, []);

  const setMercLevel = useCallback((level: number) => {
    const clamped = Math.max(1, Math.min(85, Math.round(level || 1)));
    setBuildState((prev) => ({ ...prev, mercLevel: clamped }));
  }, []);

  const setActiveSkillGroup = useCallback((groupId: string) => {
    setBuildState((prev) => ({ ...prev, activeSkillGroupId: groupId }));
  }, []);

  const setActiveSkillId = useCallback((groupId: string, skillId: string) => {
    setBuildState((prev) => {
      const skillDef = findSkillById(skillId, SEED_CATALOGS);
      const firstPartId = skillDef?.parts[0]?.id ?? '';
      return {
        ...prev,
        skillGroups: prev.skillGroups.map((g) =>
          g.groupId === groupId
            ? {
                ...g,
                skillId,
                activePartId: firstPartId,
                fullDpsParts: (skillDef?.parts ?? []).map((p) => ({
                  partId: p.id,
                  includeInFullDps: true,
                  hitCountMultiplier: p.defaultFullDpsCount,
                })),
              }
            : g,
        ),
      };
    });
  }, []);

  const setActiveSkillPart = useCallback((groupId: string, partId: string) => {
    setBuildState((prev) => ({
      ...prev,
      skillGroups: prev.skillGroups.map((g) =>
        g.groupId === groupId ? { ...g, activePartId: partId } : g,
      ),
    }));
  }, []);

  const updateBuildState = useCallback(
    (updater: (prev: MercenaryBuildState) => MercenaryBuildState) => {
      setBuildState((prev) => updater(prev));
    },
    [],
  );

  const resetBuildState = useCallback(() => {
    setBuildState(createDefaultBuildState());
  }, []);

  const value = useMemo<BuildStateContextValue>(
    () => ({
      buildState,
      activeTab,
      engineOutput,
      setActiveTab,
      setBuildName,
      setArchetypeId,
      setMercLevel,
      setActiveSkillGroup,
      setActiveSkillId,
      setActiveSkillPart,
      updateBuildState,
      resetBuildState,
    }),
    [
      buildState,
      activeTab,
      engineOutput,
      setBuildName,
      setArchetypeId,
      setMercLevel,
      setActiveSkillGroup,
      setActiveSkillId,
      setActiveSkillPart,
      updateBuildState,
      resetBuildState,
    ],
  );

  return <BuildStateContext.Provider value={value}>{children}</BuildStateContext.Provider>;
}

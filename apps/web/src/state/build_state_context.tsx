import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  captureDunhasRedirectToken,
  loadSharedBuild,
} from '../features/build-share-auth/dunhas_auth_client.js';
import {
  loadAutosaveBuild,
  readBuildFromWindowHash,
  readSharedSlugFromUrl,
  saveAutosaveBuild,
} from '../features/build-share-auth/url_hash_serializer.js';
import {
  SEED_CATALOGS,
  calculateBuild,
  createDefaultBuildState,
  createParsedItemFromUnique,
  findArchetypeById,
  findSkillById,
  parsePoeItemClipboard,
  type EngineCalculationOutput,
  type EquipmentSlot,
  type MercenaryBuildState,
  type ParsedItem,
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
  equipItem: (slot: EquipmentSlot, item: ParsedItem) => void;
  unequipItem: (slot: EquipmentSlot) => void;
  equipStarterLoadout: () => void;
  updateBuildState: (updater: (prev: MercenaryBuildState) => MercenaryBuildState) => void;
  loadBuildState: (nextState: MercenaryBuildState) => void;
  resetBuildState: () => void;
}

const STARTER_RARE_WAND = `Item Class: Wand
Rarity: Rare
Storm Spiker
Imbued Wand
--------
Quality: +20% (augmented)
--------
33% increased Spell Damage (implicit)
--------
Adds 24 to 390 Lightning Damage
21% increased Attack Speed
28% increased Critical Strike Chance
+35% to Global Critical Strike Multiplier (crafted)`;

const STARTER_RARE_RING = `Item Class: Ring
Rarity: Rare
Blight Band
Opal Ring
--------
25% increased Elemental Damage (implicit)
--------
+78 to maximum Life
+42 to Intelligence
+45% to Fire Resistance
-38% to Lightning Resistance
34% increased Elemental Damage with Attack Skills`;

export const BuildStateContext = createContext<BuildStateContextValue | null>(null);

export function BuildStateProvider({ children }: PropsWithChildren) {
  const [buildState, setBuildState] = useState<MercenaryBuildState>(() => {
    captureDunhasRedirectToken();
    return readBuildFromWindowHash() ?? loadAutosaveBuild() ?? createDefaultBuildState();
  });
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('items');

  useEffect(() => {
    saveAutosaveBuild(buildState);
  }, [buildState]);

  useEffect(() => {
    const slug = readSharedSlugFromUrl();
    if (!slug) return;
    void loadSharedBuild(slug).then((shared) => {
      if (shared) setBuildState(shared);
    });
  }, []);

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
          const orderedCandidates = [
            ...nextArch.skillPool.primary,
            ...nextArch.skillPool.secondary,
          ];
          const fallbackSkillId =
            orderedCandidates.find(
              (id) => (findSkillById(id, SEED_CATALOGS)?.parts.length ?? 0) > 0,
            ) ??
            nextArch.skillPool.primary[0] ??
            group.skillId;
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

  const equipItem = useCallback((slot: EquipmentSlot, item: ParsedItem) => {
    setBuildState((prev) => ({
      ...prev,
      equippedItems: { ...prev.equippedItems, [slot]: item },
    }));
  }, []);

  const unequipItem = useCallback((slot: EquipmentSlot) => {
    setBuildState((prev) => {
      const next = { ...prev.equippedItems };
      delete next[slot];
      return { ...prev, equippedItems: next };
    });
  }, []);

  const equipStarterLoadout = useCallback(() => {
    setBuildState((prev) => {
      const findU = (id: string) => SEED_CATALOGS.uniques.find((u) => u.id === id);
      const nextEquipped = { ...prev.equippedItems };
      nextEquipped.Weapon1 = parsePoeItemClipboard(STARTER_RARE_WAND, SEED_CATALOGS);
      const dawn = findU('dawnbreaker');
      if (dawn) nextEquipped.Weapon2 = createParsedItemFromUnique(dawn, SEED_CATALOGS);
      const crown = findU('crown_of_the_tyrant');
      if (crown) nextEquipped.Helmet = createParsedItemFromUnique(crown, SEED_CATALOGS);
      const doryani = findU('doryanis_prototype');
      if (doryani) nextEquipped.BodyArmour = createParsedItemFromUnique(doryani, SEED_CATALOGS);
      const grave = findU('gravebind');
      if (grave) nextEquipped.Gloves = createParsedItemFromUnique(grave, SEED_CATALOGS);
      const rala = findU('ralakeshs_impatience');
      if (rala) nextEquipped.Boots = createParsedItemFromUnique(rala, SEED_CATALOGS);
      const perquil = findU('perquils_toe');
      if (perquil) nextEquipped.Amulet = createParsedItemFromUnique(perquil, SEED_CATALOGS);
      nextEquipped.Ring1 = parsePoeItemClipboard(STARTER_RARE_RING, SEED_CATALOGS);
      return { ...prev, equippedItems: nextEquipped };
    });
  }, []);

  const updateBuildState = useCallback(
    (updater: (prev: MercenaryBuildState) => MercenaryBuildState) => {
      setBuildState((prev) => updater(prev));
    },
    [],
  );

  const loadBuildState = useCallback((nextState: MercenaryBuildState) => {
    setBuildState(nextState);
  }, []);

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
      equipItem,
      unequipItem,
      equipStarterLoadout,
      updateBuildState,
      loadBuildState,
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
      equipItem,
      unequipItem,
      equipStarterLoadout,
      updateBuildState,
      loadBuildState,
      resetBuildState,
    ],
  );

  return <BuildStateContext.Provider value={value}>{children}</BuildStateContext.Provider>;
}

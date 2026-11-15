import { useContext } from 'react';
import { SEED_CATALOGS, findArchetypeById, findSkillById } from '@pom/engine';
import { BuildStateContext } from './build_state_context.js';

/**
 * Primary reactive bridge between React UI components and @pom/engine.
 */
export function useMercenaryCalculator() {
  const ctx = useContext(BuildStateContext);
  if (!ctx) {
    throw new Error('useMercenaryCalculator must be used inside <BuildStateProvider>.');
  }

  const { buildState, engineOutput } = ctx;
  const activeArchetype =
    findArchetypeById(buildState.archetypeId, SEED_CATALOGS) ?? SEED_CATALOGS.archetypes[0];
  const activeSkillGroup =
    buildState.skillGroups.find((g) => g.groupId === buildState.activeSkillGroupId) ??
    buildState.skillGroups[0];
  const activeSkillDef = activeSkillGroup
    ? findSkillById(activeSkillGroup.skillId, SEED_CATALOGS)
    : undefined;

  return {
    ...ctx,
    snapshot: engineOutput.snapshot,
    modDb: engineOutput.modDb,
    catalogs: SEED_CATALOGS,
    activeArchetype,
    activeSkillGroup,
    activeSkillDef,
  };
}

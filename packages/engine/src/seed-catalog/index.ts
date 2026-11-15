import type {
  BaseItemDefinition,
  MercenaryArchetype,
  MercenarySkillDefinition,
  SupportGemDefinition,
  UniqueItemDefinition,
} from '../catalog-types/index.js';
import { SEED_ARCHETYPES } from './seed_archetypes.js';
import { SEED_MERCENARY_SKILLS } from './seed_mercenary_skills.js';
import { SEED_SUPPORT_GEMS } from './seed_support_gems.js';
import { SEED_BASE_ITEMS } from './seed_base_items.js';
import { SEED_UNIQUES_OFFENCE } from './seed_uniques_offence.js';
import { SEED_UNIQUES_DEFENCE_SUPPORT } from './seed_uniques_defence_support.js';

export const SEED_UNIQUES: UniqueItemDefinition[] = [
  ...SEED_UNIQUES_OFFENCE,
  ...SEED_UNIQUES_DEFENCE_SUPPORT,
];

export interface GameCatalogBundle {
  archetypes: MercenaryArchetype[];
  skills: MercenarySkillDefinition[];
  supports: SupportGemDefinition[];
  baseItems: BaseItemDefinition[];
  uniques: UniqueItemDefinition[];
}

export const SEED_CATALOGS: GameCatalogBundle = {
  archetypes: SEED_ARCHETYPES,
  skills: SEED_MERCENARY_SKILLS,
  supports: SEED_SUPPORT_GEMS,
  baseItems: SEED_BASE_ITEMS,
  uniques: SEED_UNIQUES,
};

export function findArchetypeById(
  archetypeId: string,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): MercenaryArchetype | undefined {
  return catalogs.archetypes.find((entry) => entry.id === archetypeId);
}

export function findSkillById(
  skillId: string,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): MercenarySkillDefinition | undefined {
  return catalogs.skills.find((entry) => entry.id === skillId);
}

export function findSupportById(
  supportId: string,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): SupportGemDefinition | undefined {
  return catalogs.supports.find((entry) => entry.id === supportId);
}

export {
  SEED_ARCHETYPES,
  SEED_MERCENARY_SKILLS,
  SEED_SUPPORT_GEMS,
  SEED_BASE_ITEMS,
  SEED_UNIQUES_OFFENCE,
  SEED_UNIQUES_DEFENCE_SUPPORT,
};
export { buildMercenaryLevelCurve, deriveHiddenElemResPct, deriveMercSkillLevel } from './level_stat_curve_builder.js';

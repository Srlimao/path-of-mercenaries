import { parseModLineToMods } from '../mod-parser/index.js';
import type { ModSource } from '../mod-db/index.js';
import { SEED_CATALOGS, findSkillById, type GameCatalogBundle } from './index.js';

export interface CatalogIntegrityReport {
  ok: boolean;
  archetypeCount: number;
  skillCount: number;
  supportCount: number;
  baseItemCount: number;
  uniqueCount: number;
  errors: string[];
}

const VALID_AFFINITIES = new Set([
  'STR',
  'DEX',
  'INT',
  'STR_DEX',
  'STR_INT',
  'DEX_INT',
  'STR_DEX_INT',
]);

/**
 * Validates full catalog referential integrity, archetype restrictions,
 * item/unique slot metadata, and Tier 1-3 Mercenary support mod parsing.
 */
export function validateCatalogIntegrity(
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): CatalogIntegrityReport {
  const errors: string[] = [];

  if (catalogs.archetypes.length < 36) {
    errors.push(`Expected >= 36 Mercenary archetypes, found ${catalogs.archetypes.length}.`);
  }

  for (const arch of catalogs.archetypes) {
    if (!VALID_AFFINITIES.has(arch.attributeAffinity)) {
      errors.push(`Archetype '${arch.id}' has invalid affinity '${arch.attributeAffinity}'.`);
    }
    if (arch.allowedMainHandClasses.length === 0) {
      errors.push(`Archetype '${arch.id}' has empty allowedMainHandClasses.`);
    }
    const allPoolIds = [
      ...arch.skillPool.primary,
      ...arch.skillPool.secondary,
      ...arch.skillPool.utility,
    ];
    if (arch.skillPool.primary.length + arch.skillPool.secondary.length === 0) {
      errors.push(`Archetype '${arch.id}' has no primary/secondary offence skills.`);
    }
    for (const skillId of allPoolIds) {
      if (!findSkillById(skillId, catalogs)) {
        errors.push(`Archetype '${arch.id}' references missing skill '${skillId}'.`);
      }
    }
  }

  for (const support of catalogs.supports) {
    for (const tier of [1, 2, 3] as const) {
      const lines = support.modsByLevel[tier];
      if (!lines || lines.length === 0) {
        errors.push(`Support '${support.id}' is missing modsByLevel[${tier}].`);
        continue;
      }
      for (const rawLine of lines) {
        const source: ModSource = {
          sourceType: 'Support',
          sourceId: support.id,
          sourceLabel: `${support.name} (Tier ${tier})`,
          rawLine,
        };
        const parsed = parseModLineToMods(rawLine, source);
        if (parsed.length === 0) {
          errors.push(`Support '${support.id}' Tier ${tier} failed to parse mod: "${rawLine}"`);
        }
      }
    }
  }

  for (const base of catalogs.baseItems) {
    if (base.validSlots.length === 0 || !base.itemClass) {
      errors.push(`Base item '${base.id}' has missing slot/class metadata.`);
    }
  }

  if (catalogs.uniques.length < 22) {
    errors.push(`Expected >= 22 Unique items, found ${catalogs.uniques.length}.`);
  }
  for (const uniq of catalogs.uniques) {
    if (uniq.validSlots.length === 0 || !uniq.itemClass) {
      errors.push(`Unique item '${uniq.id}' has missing slot/class metadata.`);
    }
  }

  return {
    ok: errors.length === 0,
    archetypeCount: catalogs.archetypes.length,
    skillCount: catalogs.skills.length,
    supportCount: catalogs.supports.length,
    baseItemCount: catalogs.baseItems.length,
    uniqueCount: catalogs.uniques.length,
    errors,
  };
}

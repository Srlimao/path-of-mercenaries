import { SEED_CATALOGS, validateCatalogIntegrity } from '@pom/engine';

const report = validateCatalogIntegrity(SEED_CATALOGS);

console.log(
  `[data-pipeline] Archetypes=${report.archetypeCount} Skills=${report.skillCount} Supports=${report.supportCount} BaseItems=${report.baseItemCount} Uniques=${report.uniqueCount}`,
);

if (!report.ok) {
  for (const err of report.errors) {
    console.error(`  - ${err}`);
  }
  throw new Error(`Catalog integrity check failed with ${report.errors.length} error(s).`);
}

console.log('[data-pipeline] Catalog integrity check PASSED (0 errors).');

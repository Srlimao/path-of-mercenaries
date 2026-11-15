import { describe, expect, it } from 'vitest';
import { validateCatalogIntegrity } from './catalog_integrity.js';
import { SEED_CATALOGS } from './index.js';

describe('Seed Catalog & Mercenary Support Integrity', () => {
  it('validates all 36 archetypes, skills, uniques, and Tier I-III support gem mod lines', () => {
    const report = validateCatalogIntegrity(SEED_CATALOGS);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.archetypeCount).toBeGreaterThanOrEqual(36);
    expect(report.uniqueCount).toBeGreaterThanOrEqual(22);
    expect(report.supportCount).toBeGreaterThanOrEqual(30);
  });
});

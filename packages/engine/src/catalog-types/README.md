# `catalog-types` Domain

Canonical TypeScript types shared across `@pom/engine`, `apps/web`, `apps/worker`, and `packages/data-pipeline`.

- `damage_and_flag_types.ts`: `DamageType`, `ModFlags`, `KeywordFlags`, `EquipmentSlot`, `ItemRarity`.
- `archetype_and_skill_types.ts`: Game catalog schemas for archetypes, skills, supports, base items, and uniques.
- `item_and_build_state_types.ts`: Mutable user build state (`MercenaryBuildState`) and parsed item schemas.
- `calculation_snapshot_types.ts`: Output DTOs returned by `calculateBuild()` and consumed by UI views.

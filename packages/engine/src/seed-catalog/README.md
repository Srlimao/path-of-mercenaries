# `seed-catalog` Domain

Curated starter datasets powering Phase 1 engine tests and offline client startup prior to full RePoE / PoEDB ingestion in `packages/data-pipeline`.

- `level_stat_curve_builder.ts`: Level 1-85 Mercenary base stat curves, `+35%` hidden elemental resistances at Lv 80+, and Level 1-40 skill level mapping.
- `seed_archetypes.ts`: 12 Standard & Infamous Mercenary archetypes.
- `seed_mercenary_skills.ts`: Primary/Secondary/Utility skills with multi-part definitions (e.g., *Kinetic Blast of Clustering* at 235% effectiveness).
- `seed_support_gems.ts`: 19 core Attack/Spell Support Gems with tag constraints and level 1-40 scaling.
- `seed_base_items.ts`: Base weapon, shield, armour, and jewellery definitions.
- `seed_uniques_offence.ts` & `seed_uniques_defence_support.ts`: All 20 signature build-around Mercenary uniques.

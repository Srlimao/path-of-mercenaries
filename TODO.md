# Path of Mercenaries (`PoM`) — Phased Development TODO Roadmap

> **Development Philosophy:** Build **foundation-first**, then stand up a **component-ready Base PoB UI Shell** wired directly to `@pom/engine`, and then deliver **one complete vertical feature slice at a time** (engine calculation logic + UI component + Vitest golden unit test).
>
> **Architecture Rules:**
> - **Vertical Slicing:** Group code by feature/domain (`packages/engine/src/<domain>/`, `apps/web/src/features/<feature>/`), never horizontal `utils/` or `services/` buckets.
> - **Strict `<300` LOC Limit:** No `.ts`, `.tsx`, or `.css` file may exceed 300 lines of code.
> - **Zero-Tailwind Desktop PoB UI:** Use CSS Modules + CSS Custom Properties (`tokens.css`, `primitives.css`, `poe-tooltip.css`).
> - **Reference Spec:** [path_of_mercenaries_technical_specification.md](./path_of_mercenaries_technical_specification.md)

---

## Phase 1: Monorepo & Engine Foundation (`packages/engine` Core + Seed Data)

*Goal: Establish git version control, Cloudflare infrastructure bindings, workspace tooling, strict file-size/vertical-slice guardrails, typed contracts, curated starter datasets, the tagged `ModDB`, and a runnable baseline `calculateBuild()` entry point.*

- [x] **1.0 Git Initialization & Cloudflare Infrastructure Setup**
  - [x] Initialize Git repository (`git init -b main`), create `.gitignore` (`node_modules/`, `dist/`, `.wrangler/`, `.dev.vars`, `.env*`, `coverage/`), and make the baseline spec commit.
  - [x] Create `wrangler.toml` for Cloudflare Workers (`apps/worker`) + Pages (`apps/web`): configure D1 binding (`general-db`, UUID `e5a10825-7799-438a-926d-1b296afcccdd`) and KV namespace template (`POM_CACHE_KV`) for GGG API caching/catalogs.
  - [x] Scaffold minimal `apps/worker/src/index.ts` Hono health/CORS entry point (`GET /api/health`, `GET /api/catalog/summary`) and add `dev:worker`, `deploy:worker`, and `deploy:web` scripts in root `package.json` (`wrangler deploy --dry-run` verified).
  - [ ] Provision remote Cloudflare Pages project (`path-of-mercenaries`) & live KV namespace `POM_CACHE_KV` (requires `npx wrangler login`).

- [x] **1.1 Workspace & Tooling Setup**
  - [x] Initialize root `package.json`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), and `tsconfig.base.json` (`strict: true`, `@pom/engine` source exports).
  - [x] Configure `vitest` workspace runner in `packages/engine/vitest.config.ts`.
  - [x] Add automated `<300` LOC guardrail script (`scripts/check_max_file_lines.mjs`) runnable via `pnpm check:loc`.
  - [x] Initialize `packages/engine/package.json` and `packages/engine/src/index.ts`.

- [x] **1.2 Domain Schemas & Build State Contract (`packages/engine/src/catalog-types/`)**
  - [x] `damage_and_flag_types.ts`: Define `DamageType`, `ModFlags` bitmask, `KeywordFlags` bitmask, `EquipmentSlot` (`Weapon1` through `Belt`), and `ItemRarity`.
  - [x] `archetype_and_skill_types.ts`: Define `MercenaryLevelStatRow`, `MercenaryArchetype`, `SkillPartDefinition`, `MercenarySkillDefinition`, and `SupportGemDefinition`.
  - [x] `item_and_build_state_types.ts`: Define `ParsedItem`, `ItemModLine`, `SkillGroupSetup`, `PartyConfigState`, `EnemyConfigState`, and `MercenaryBuildState`.
  - [x] `calculation_snapshot_types.ts`: Define `CalculationResultSnapshot`, `SkillPartCalcResult`, `DefenceCalcResult`, `CalcBreakdownRow`, and `StatSourceAttribution`.

- [x] **1.3 Curated Seed Catalogs (`packages/engine/src/seed-catalog/`)**
  - [x] `seed_archetypes.ts`: Starter Mercenary archetypes (12 Standard & Infamous variants) with Level `1–85` curves (`baseLife`, `baseAccuracy`, `baseEvasion`, `Str/Dex/Int`, `+35%` hidden elemental res at Lv 80+, `defaultSkillLevel`).
  - [x] `seed_mercenary_skills.ts`: Starter Primary/Secondary/Utility skills with Level `1–40` scaling curves and multi-part definitions (including *Kinetic Blast of Clustering* at `235%` effectiveness + `Projectile` / `Clustering Explosion` parts, *Kinetic Bolt*, *Split Arrow*, *Reave*, *Spark*).
  - [x] `seed_support_gems.ts`: Core Attack & Spell Support Gems (`Awakened Elemental Damage with Attacks`, `Volatility`, `Inspiration`, `Increased Critical Damage`, `Increased Critical Strikes`, `Returning Projectiles`, `Added Lightning/Cold/Fire`, `Damage on Full Life`, `Multistrike`, `Trinity`, etc.) with tag constraints and level tables.
  - [x] `seed_base_items.ts`, `seed_uniques_offence.ts` & `seed_uniques_defence_support.ts`: Base weapons/armour items + all 20 signature build-around Mercenary uniques.

- [x] **1.4 `ModDB` & Source Attribution Engine (`packages/engine/src/mod-db/`)**
  - [x] `mod_types.ts`: Define `Mod`, `ModType` (`BASE`, `INC`, `MORE`, `OVERRIDE`, `FLAG`), `ModSource`, `ModCondition`, `EvalContext`, and `TabulatedModEntry`.
  - [x] `condition_evaluator.ts`: Evaluate `Condition`, `StatThreshold`, `PerStat`, and `SkillTag` predicates against `EvalContext`.
  - [x] `mod_db_store.ts`: Implement `ModDB` class with `addMod()`, `sum('BASE'|'INC', query)`, `more(query)`, `override(name, query)`, `flag(name, ctx)`, and `tabulate(type, query)` for source-attributed breakdown inspection.
  - [x] `mod_db.test.ts`: Unit tests verifying bitmask matching, additive `INC` pooling, multiplicative `MORE` chaining, `PerStat` scaling, and `tabulate()` attribution.

- [x] **1.5 Baseline Engine Orchestrator (`packages/engine/src/orchestrator/`)**
  - [x] `create_default_build_state.ts`: Factory returning a valid default Level 84 *Kineticist* `MercenaryBuildState`.
  - [x] `calculate_build.ts`: Pure `calculateBuild(buildState, catalogs)` entry point returning baseline archetype stats + structured snapshot DTOs.
  - [x] `orchestrator_smoke.test.ts`: Verify `calculateBuild(createDefaultBuildState())` passes assertions in `<20ms`.

---

## Phase 2: Base PoB Desktop UI Shell (`apps/web` Skeleton Ready for Feature Slices)

*Goal: Build the runnable, high-density PoB desktop shell with Zero-Tailwind CSS styling, persistent Left Stat Sidebar, 4-tab switcher (`Items` | `Skills` | `Config` | `Calcs`), and live reactive binding to `@pom/engine`.*

- [x] **2.1 Vite + React + TypeScript App Setup (`apps/web/`)**
  - [x] Initialize `apps/web/package.json`, `vite.config.ts`, `tsconfig.json` (workspace linked to `@pom/engine`), and `index.html` (loading `Cinzel` and `JetBrains Mono`).
  - [x] Verify `pnpm --filter @pom/web build` (`tsc --noEmit && vite build`) compiles cleanly with zero errors.

- [x] **2.2 Zero-Tailwind Desktop PoB Design System (`apps/web/src/styles/`)**
  - [x] `tokens.css`: Surface palette (`#0b0c0e`, `#121418`, `#181b21`, `#2b303a`, `#c8aa6e`), PoE item/mod rarity colors (`#c8c8c8`, `#8888ff`, `#ffff77`, `#af6025`, `#b4b4ff`, `#a29162`, `#d20000`), positive/negative diff greens/reds, and `tabular-nums` font rules.
  - [x] `primitives.css`: Crisp `2px`-radius `.pom-button`, `.pom-panel-header`, `.pom-fieldset`, `.pom-input`, `.pom-select`, `.pom-table`, and thin dark scrollbars.
  - [x] `poe-tooltip.css`: Rarity-graded tooltip header banners, ornamental radial horizontal dividers, and centered PoE mod line styling.

- [x] **2.3 Reactive State & Engine Bridge (`apps/web/src/state/`)**
  - [x] `build_state_context.tsx`: React Context storing `MercenaryBuildState`, active workspace tab (`'items' | 'skills' | 'config' | 'calcs'`), memoized `calculateBuild()` output, and typed dispatch updaters.
  - [x] `use_mercenary_calculator.ts`: Memoized hook exposing `snapshot`, `modDb`, `catalogs`, `activeArchetype`, `activeSkillGroup`, and `activeSkillDef`.

- [x] **2.4 Top Application Header & 4-Tab Workspace Shell (`apps/web/src/features/workspace-shell/`)**
  - [x] `TopActionHeader.tsx` & `TopActionHeader.module.css`: PoM branding, editable build name input, archetype/level badges, and Reset + Phase 13 cloud/share/import controls.
  - [x] `WorkspaceTabBar.tsx`: PoB top mode tabs (`Items` | `Skills` | `Config` | `Calcs`) with `#c8aa6e` active highlight, `F1`–`F4` hotkeys, and live `FeatureSlotPlaceholder.tsx` views.

- [x] **2.5 Persistent Left Stat Sidebar Shell (`apps/web/src/features/left-stat-sidebar/`)**
  - [x] `LeftStatSidebar.tsx` & `LeftStatSidebar.module.css`: Fixed-width (`296px`) PoB summary column rendering Archetype/Level selector, Main Skill & Part selector, Offence block (`Combined Full DPS`, `Active Skill DPS`, `Average Hit`, `Rate`, `Crit`, `Hit Chance`), Attributes/Pools (`STR/DEX/INT`, `Life/ES/Ward`, `EHP`), and Defences/Resistances (`Armour`, `Evasion`, `Capped (Uncapped)` Res, Per-Type `Max Hit Taken`).

---

## Phase 3: Feature Slice 1 — Archetype Selection, Level Scaling & Base Character Stats

*Goal: Make the Mercenary Archetype and Level (`1–85`) controls fully functional end-to-end across engine and Left Sidebar.*

- [x] **3.1 Engine: Archetype Baseline Compiler (`packages/engine/src/archetype-baseline/`)**
  - [x] `compile_archetype_mods.ts`: Inject Level `1–85` base Life, Str/Dex/Int, Base Accuracy, Base Evasion, hidden elemental resistance curve (`+35%` at Lv 80+), and archetype innate modifiers into `ModDB` with `sourceType: 'Archetype'`.
  - [x] `archetype_baseline.test.ts`: Assert exact base Life, Attributes, Accuracy, Evasion, and `+35%` hidden elemental res at Lv 80–85 against PoB datamine fixtures.

- [x] **3.2 UI: Archetype & Level Selector (`apps/web/src/features/left-stat-sidebar/`)**
  - [x] `ArchetypeSelector.tsx`: Grouped dropdown (Standard vs Infamous) displaying attribute affinity badge and allowed weapon classes.
  - [x] `MercLevelControl.tsx`: Level `1–85` input/stepper displaying the auto-derived Skill Level badge (e.g., `Lv 84 → Skill Lv 27`).
  - [x] Update `LeftStatSidebar.tsx` to display live Attributes (`STR / DEX / INT`), Base Life/Mana, Accuracy, Evasion, and Hidden Resistance baseline.

---

## Phase 4: Feature Slice 2 — `Items` Tab Part A: 10-Slot Paperdoll, `Ctrl+V` Parser & Stage 1 Local Weapon Math

*Goal: Enable pasting real PoE items (`Ctrl+C` -> `Ctrl+V`), equipping them into the 10-slot paperdoll, viewing authentic tooltips, and calculating exact Stage 1 local weapon DPS/APS/Crit.*

- [x] **4.1 Engine: PoE Clipboard Parser & Stage 1 Local Weapon Calculator (`packages/engine/src/item-parser/`)**
  - [x] `poe_clipboard_parser.ts`: Parse `Item Class`, `Rarity`, `Name`, `Base Type`, `Quality`, `--------` sections, `(implicit)`, `(crafted)`, `(fractured)`, `(enchant)`, `Corrupted` flags, and catalyst quality tags into `ParsedItem`.
  - [x] `local_weapon_defence_calc.ts`: Implement **Stage 1 Local Weapon Math** (`LocalPhys`, `LocalEle`, `WeaponAPS`, `WeaponCrit`, `pDPS`, `eDPS`, `TotalWeaponDPS`) and local Armour/Evasion/ES scaling from quality + local mods.
  - [x] `item_parser.test.ts`: Unit tests covering Normal/Magic/Rare/Unique/Fractured/Crafted/Corrupted weapons, shields, jewellery, and exact local pDPS/APS/Crit math.

- [x] **4.2 Engine: Text-to-`Mod` Line Compiler (`packages/engine/src/mod-parser/`)**
  - [x] `global_mod_patterns.ts`: Pattern registry matching PoE mod lines (flat damage, `% increased`, `% more`, attack/cast speed, crit chance/multi, penetration, attributes, life, ES, armour, evasion, resistances, conversion, gain as extra, block, spell suppression).
  - [x] `compile_item_mods.ts`: Compile all non-local implicit/explicit/enchant mods on equipped items into tagged `Mod` objects attributed to `sourceId: slot`.
  - [x] `mod_parser.test.ts`: Verify accurate tag assignment (`ModFlags` / `KeywordFlags`) and graceful tracking of unrecognized lines.

- [x] **4.3 UI: 10-Slot Paperdoll, Tooltip & `Ctrl+V` Paste Modal (`apps/web/src/features/items-paperdoll-inspector/`)**
  - [x] `EquipmentPaperdoll.tsx` & `EquipmentPaperdoll.module.css`: 10-slot equipment list (`Weapon 1` to `Belt`) enforcing archetype allowed weapon/offhand rules (with clear inline warning if incompatible) and `Unequip` / `Copy PoE Text` actions.
  - [x] `PoeItemTooltip.tsx`: Pixel-accurate PoE tooltip preview rendering rarity header bars, weapon DPS stats, implicit/crafted/fractured/corrupted colors, and flavour text.
  - [x] `PasteItemModal.tsx` & global `Ctrl+V` listener: Auto-detect clipboard PoE item blocks outside text inputs, preview parsed tooltip + target slot selector, and equip in 1 click.

---

## Phase 5: Feature Slice 3 — `Items` Tab Part B: Uniques Browser, In-Place Item Editor & Live Hover Diffs

*Goal: Deliver PoB's signature gearing workflow: search Uniques, hover any item for live `+Full DPS%` / `+EHP%` / resistance deltas, and edit item rolls or raw mod text in-place.*

- [x] **5.1 Engine: Slot Replacement Diff Calculator (`packages/engine/src/item-diff-calculator/`)**
  - [x] `compute_item_slot_diff.ts`: Clone build state with candidate item in target slot, execute fast calculation pass, and return `{ deltaFullDps, deltaFullDpsPct, deltaSkillDps, deltaEhp, deltaEhpPct, deltaMaxHitPhys, deltaResistances }`.
  - [x] `item_diff_calculator.test.ts`: Assert diff output matches manual equip + full recalculation identically.

- [x] **5.2 UI: Uniques Browser, Hover Comparison Tooltip & Roll/Text Editor (`apps/web/src/features/items-paperdoll-inspector/`)**
  - [x] `UniquesBrowserPanel.tsx`: Instant search by name, slot filter pills, mod keyword search (e.g., `"Lucky"`, `"Lightning Resistance"`), `Merc Meta` badge filter, and 1-click equip.
  - [x] `HoverDiffComparison.tsx`: Side-by-side *Equipped* vs *Hovered Candidate* PoE tooltips with green/red `+Full DPS` / `+EHP` / `Res` delta footer.
  - [x] `ItemRollAndTextEditor.tsx`: In-place editor modal with `0%–100%` explicit roll sliders, `0%–30%` quality + catalyst selector, and editable raw PoE item text area with live re-parse preview.

---

## Phase 6: Feature Slice 4 — `Skills` Tab Part A: Skill Pool, Multi-Part Setup & Core Hit DPS (Stages 2–6)

*Goal: Implement Stages 2–6 of the PoB damage pipeline and build the `Skills` tab for configuring Primary/Secondary/Utility skills and multi-part hit components.*

- [x] **6.1 Engine: Damage Pipeline Stages 2–6 (`packages/engine/src/damage-pipeline/`)**
  - [x] `stage2_added_damage.ts`: Combine Stage 1 weapon/skill base damage with global flat added damage scaled by `SkillPartDefinition.damageEffectiveness` (e.g., `235%`).
  - [x] `stage3_conversion_dag.ts`: Implement `Phys -> Lightning -> Cold -> Fire -> Chaos` DAG conversion, `>100%` skill-priority proportional normalization, `"Gain as Extra"`, and **ancestral `KeywordFlags` bitmask inheritance**.
  - [x] `stage4_inc_more_buckets.ts`: Query `ModDB` per damage chunk `(currentType, ancestralTypes)` for additive `INC` and multiplicative `MORE` scalars.
  - [x] `stage5_crit_lucky_multihit.ts`: Compute effective Crit Chance (incl. accuracy confirmation for attacks + Lucky Crit), Crit Multi, Normal vs **Lucky Hit expectation** ($\frac{\min + 2\max}{3}$), and Double/Triple Damage.
  - [x] `stage6_accuracy_speed.ts`: Compute Attack Hit Chance vs Enemy Evasion + Effective Attack/Cast/Action Speed (including Dual Wield handling).
  - [x] `stages_2_to_6.test.ts`: Golden unit tests verifying conversion tag inheritance without double-counting, `235%` effectiveness, and Lucky roll math.

- [x] **6.2 UI: Skill Groups & Multi-Part Selector (`apps/web/src/features/skills-support-planner/`)**
  - [x] `SkillGroupCard.tsx`: Configure `Primary`, `Secondary`, and `Utility` skills; filter dropdown to Archetype pool by default with `"Show All Skills (Sandbox)"` toggle; auto-derive Skill Level from Merc Level with manual override.
  - [x] `SkillPartSelector.tsx`: Switch between sub-parts (e.g., `Projectile Hit`, `Clustering Area Explosion`) and sync active skill selection with Left Sidebar.
  - [x] Connect Left Sidebar Offence readouts (`Active Skill DPS`, `Average Hit`, `Attack/Cast Rate`, `Crit Chance / Multi`, `Hit Chance`).

---

## Phase 7: Feature Slice 5 — `Skills` Tab Part B: Support Gem `+DPS` Sorter & `Full DPS` Aggregator (Stage 10)

*Goal: Add PoB's 5-link Support Gem dropdown sorted by live `+DPS` gain and multi-part `Combined Full DPS` aggregation.*

- [x] **7.1 Engine: Support Gem Optimizer & Stage 10 Full DPS (`packages/engine/src/support-optimizer/` & `damage-pipeline/`)**
  - [x] `rank_support_gems.ts`: Filter candidate Support Gems by `requiredSkillTags` / `excludedSkillTags`, evaluate each candidate against the active skill group, and return sorted descending by marginal `+DPS` and `+DPS%`.
  - [x] `stage10_full_dps.ts`: Aggregate `CombinedFullDPS` across all enabled skill groups and enabled parts multiplied by `PartCount` (e.g., `1x Projectile` + `5x Clustering Explosions`).
  - [x] `support_optimizer.test.ts`: Verify tag filtering and exact `+DPS` ranking order matches manual equip recalculations.

- [x] **7.2 UI: Support Gem `+DPS` Dropdown & Full DPS Parts Table (`apps/web/src/features/skills-support-planner/`)**
  - [x] `SupportSlotSelector.tsx`: Up to 5 support gem slots per skill group; dropdown renders sorted `+41.2% (+482k DPS)` delta badges next to each gem.
  - [x] `FullDpsPartsTable.tsx`: Per-skill/part `"Include in Full DPS"` toggle and Hit/Overlap Count numeric input (`1x`, `5x`, etc.) driving the top-line `Combined Full DPS` banner in the Left Sidebar.

---

## Phase 8: Feature Slice 6 — `Config` Tab Part A: Player-Given Buffs, Aurabot PoB Export & Combat Conditions

*Goal: Support both Luminary / Support Player → Carry Mercenary buffs (Links, Auras/Mines, Combat Conditions) and Mercenary-as-Aurabot → Player PoB `<Party>` export.*

- [x] **8.1 Engine: Party Link, Aura, Condition & PoB Export Compiler (`packages/engine/src/party-aura-link-compiler/`)**
  - [x] `compile_player_links.ts`: Compute *Flame Link* flat fire from Gem Lv `1–30` + `PlayerMaxLife` + `LinkEffect%`, *Destructive Link* main-hand Base Crit override, and *Intuitive Link* block sharing buffs.
  - [x] `compile_player_auras.ts`: Scale *Wrath*, *Anger*, *Hatred*, *Zealotry*, *Pride*, *Haste*, *Precision*, *Determination*, *Grace*, *Purities*, *Smite*, and *Pyroclast Mine of Sabotage* (`ActiveMines`) by `(1 + GlobalPlayerAuraEffect% + GenerosityEffect%)`.
  - [x] `compile_combat_conditions.ts`: Inject Power/Frenzy/Endurance Charge bonuses (respecting *Ralakesh's Impatience* minimum floor), Onslaught, Tailwind, Adrenaline, Fortify, *Crown of the Tyrant* socket flat, Custom Modifiers, and `EvalContext` flags into `ModDB`.
  - [x] `export_mercenary_party_pob.ts`: Compile Mercenary aurabot gear (*Kingmaker*, *Garb of the Ephemeral*, etc.), mercenary auras, and curses into official PoB `<Party><ExportedBuffs>` XML + RFC 1950 Zlib/Base64URL share code.
  - [x] `party_aura_link.test.ts`: Verify *Flame Link* scaling, *Destructive Link* crit override, `150%+` Aura Effect scaling, and PoB `<Party>` XML/code export round-trip (4 tests).

- [x] **8.2 UI: Player Buffs, Combat Conditions & Aurabot Export (`apps/web/src/features/party-enemy-config/`)**
  - [x] `PlayerLinksAndAurasPanel.tsx` & `PlayerAurasSection.tsx`: Parameterized inputs for *Flame Link*, *Destructive Link*, *Intuitive Link*, `Global Aura Effect %` slider (`0%–300%`), *Generosity* toggle, *Smite*, *Pyroclast Mines*, and Player Aura levels.
  - [x] `CombatConditionsAndCustomModsPanel.tsx`: Charges, Onslaught, Tailwind, Adrenaline, Fortify, *Crown of the Tyrant* socket color, and multi-line Custom Modifiers box with live parsed/unrecognized indicator.
  - [x] `MercenaryPartyExportPanel.tsx` & `QuickBuffsWidget.tsx`: Mercenary → PoB `<Party>` XML & share code copy panel plus Quick Buff Toggles widget in `LeftStatSidebar`.

---

## Phase 9: Feature Slice 7 — `Config` Tab Part B: Enemy Boss Presets, Debuffs & Mitigation Math (Stages 7–8)

*Goal: Implement Stage 7 (Enemy Resistances, Curses, Exposure, Penetration) & Stage 8 (Enemy Armour PDR, Damage Taken Multipliers, Uber Boss `0.30x`) along with Enemy Config UI.*

- [x] **9.1 Engine: Damage Pipeline Stages 7 & 8 (`packages/engine/src/damage-pipeline/`)**
  - [x] `stage7_enemy_resistances.ts`: Compute Enemy Effective Resistance after Curse reductions (with Curse Effect % and `0.67x` boss hex penalty), *Doryani's Prototype* lock, Exposure, Scorch, and Penetration.
  - [x] `stage8_enemy_pdr_and_taken.ts`: Compute non-linear Enemy Armour PDR against raw physical hit + Overwhelm, Enemy Increased/More Damage Taken (`Shock`, `Intimidate`, `Unnerve`, `Covered in Ash`, `Withered`, `Vulnerability`, `Punishment`, `Sniper's Mark`, `Assassin's Mark`), and Uber Pinnacle `0.30x` (`70% less Damage Taken`).
  - [x] `stages_7_to_8.test.ts`: Verify Standard vs Pinnacle vs Uber Pinnacle mitigation ratios and curse/penetration math (2 tests).

- [x] **9.2 UI: Enemy Boss Presets & Debuffs (`apps/web/src/features/party-enemy-config/`)**
  - [x] `EnemyBossConfigPanel.tsx` & `ConfigTabView.tsx`: Preset switcher (`standard_rare`, `pinnacle`, `uber_pinnacle`), manual enemy Res/Armour/Level overrides, Curse/Mark toggles, and debuff inputs integrated into `ConfigTabView` and wired into `FeatureSlotPlaceholder.tsx`.

---

## Phase 10: Feature Slice 8 — Build-Around Unique Handlers & Impale / Damaging Ailments (Stage 9)

*Goal: Implement special Unique mechanical rules and complete Stage 9 Impale + anti-double-dipping Damaging Ailment (Ignite, Bleed, Poison) calculations.*

- [x] **10.1 Engine: Build-Around Unique Handlers (`packages/engine/src/unique-handlers/`)**
  - [x] `unique_registry.ts` (all 22 `SEED_UNIQUES` registered, non-duplicating explicit-parser integration):
    - Resistance & Mitigation overrides: *Doryani's Prototype* (lock enemy lightning res to Merc lightning res $\ge -200\%$, disable light pen/exposure/curses), *Rakiata's Dance* (invert enemy base ele res), *Original Sin* (ele->chaos + 0% chaos res).
    - Damage & Crit mechanics: *Perquil's Toe* (Lucky hit damage), *Heatshiver* (Chill/Freeze extra fire), *Yoke of Suffering* (damage taken per ailment), *Voidforge* (700% random ele), *Ephemeral Edge* (flat light per ES), *Crown of the Tyrant* (socket color flat + `-10%` res), *Nimis* (return hits), *The Taming*, *Piscator's Vigil*.
    - Charges, Party & Phys-Taken-As: *Ralakesh's Impatience*, *Sign of the Sin Eater*, *Leer Cast*, *Dying Breath*, *Gravebind*, *Dawnbreaker*, *Cloak of Flame*, *Lightning Coil*, *Kingmaker*, *Garb of the Ephemeral*.
  - [x] `unique_handlers.test.ts`: Golden fixtures for *Kineticist* (*KB of Clustering* + *Flame Link* + *Perquil's Toe* + *Doryani's Prototype* `-188%` res), *Rakiata's Dance*, *Heatshiver* + *Yoke* + *The Taming*, and *Voidforge* / *Original Sin* (4 tests).

- [x] **10.2 Engine: Stage 9 Impale & Ailments (`packages/engine/src/damage-pipeline/`)**
  - [x] `stage9_impale_and_ailments.ts`: Compute Impale DPS (pre-mitigation Phys × 10% × Impale Effect × stacks × rate) and dedicated **Base Ailment Damage** branch (Ignite `0.90x`, Bleed `0.70x` / Moving `2.10x` / Crimson Dance, Poison `0.30x` × stack uptime) isolating `Hit`-only modifiers from `Ailment | Dot` modifiers.
  - [x] `stage9_ailments.test.ts`: Verify `Projectile`/`Area` modifiers do not double-dip on Ignite/Bleed/Poison while `DoT Multi`, `Ailment Damage`, `Poison Duration`, and `Impale` scale accurately (3 tests).

- [x] **10.3 UI Integrations**
  - [x] Display Hit DPS, Impale DPS, and Ignite / Bleed / Poison DPS breakdown rows in `LeftStatSidebar.tsx`.
  - [x] Expose Unique-specific config controls (*Crown of the Tyrant* socket color selector in `CombatConditionsAndCustomModsPanel.tsx`; Ignite/Bleed/Poison + Chill/Freeze toggles for *Yoke*/*Heatshiver*/*The Taming* in `EnemyBossConfigPanel.tsx`).

---

## Phase 11: Feature Slice 9 — Full PoB Defensive & Survivability Suite (`packages/engine/src/defence-pipeline`)

*Goal: Deliver complete defensive math: Life/ES/Ward pools, capped/uncapped resistances, `Phys Taken As`, Armour curve, Evasion, Block, Spell Suppression, binary-search Physical Max Hit solver, EHP, and Recovery.*

- [x] **11.1 Engine: Defensive Pipeline (`packages/engine/src/defence-pipeline/`)**
  - [x] `pools_and_resistances.ts`: Compute Max Life, Max ES, Ward, and Capped / Uncapped Resistances (tracking negative Lightning Res down to `-200%` for *Doryani's* and raised max res caps).
  - [x] `damage_taken_conversion.ts`: Normalize `PhysTakenAsFire/Cold/Lightning/Chaos` proportions (*Cloak of Flame*, *Lightning Coil*, *Dawnbreaker*) and Elemental-taken-as-Fire shifts.
  - [x] `mitigation_and_avoidance.ts`: Non-linear Armour PDR vs Enemy Physical Hit Size, Evade Chance, Attack/Spell Block (*Intuitive Link*), Spell Suppression, Endurance/Additional PDR, and Fortify DR.
  - [x] `max_hit_and_ehp_solver.ts`: Iterative Physical Max Hit Taken solver, Elemental/Chaos Max Hit Taken (*Doryani's Prototype* Armour-to-Lightning rule), weighted **Effective Hit Pool (`EHP`)**, and Net Life Recovery/s.
  - [x] `defence_pipeline.test.ts`: Golden unit tests for Lv 84 hidden `+35%` res, *Cloak of Flame* + *Dawnbreaker* + Armour Max Hit, *Doryani's* Lightning Max Hit, and Evasion/Block/Suppression EHP (4 tests).

- [x] **11.2 UI: Full Defences Readout (`apps/web/src/features/left-stat-sidebar/`)**
  - [x] Expand Defences readout via `SidebarDefencesPanel.tsx` rendered inside `LeftStatSidebar.tsx` with `EHP`, per-type `Max Hit Taken (Phys / Fire / Cold / Light / Chaos)`, `Life / ES / Ward`, `Armour (PDR%) / Evade% / Block% / Suppress%`, `Phys Taken As`, `Capped (Uncapped)` Resistances, and `Net Life Recovery/s`.

---

## Phase 12: Feature Slice 10 — `Calcs` Tab: Per-Type Breakdown Matrix & Source Attribution Inspector

*Goal: Expose desktop PoB's transparent `Calcs` tab so every single number in the planner can be inspected down to its exact item, skill, support, link, or aura source.*

- [ ] **12.1 Engine: `Calcs` Matrix Snapshot Builder (`packages/engine/src/calcs-snapshot/`)**
  - [ ] `build_calcs_matrix.ts`: Emit per-element (`Physical | Lightning | Cold | Fire | Chaos | Total`) rows for every pipeline stage (`Base`, `Added × Eff`, `Converted In/Out`, `Gained as Extra`, `Total Inc%`, `Total More Multi`, `Pre-Mit Hit`, `Crit`, `Rate`, `Enemy Res/PDR`, `Final Hit/DPS`, `Impale/Ailments`) paired with `ModQuery` descriptors for `ModDB.tabulate()`, plus a Defences Breakdown Matrix.

- [ ] **12.2 UI: `Calcs` Tab & Source Attribution Drawer (`apps/web/src/features/calcs-breakdown-matrix/`)**
  - [ ] `CalcsTabView.tsx` & `CalcsTabView.module.css`: Skill & Skill Part selector, 6-column Offence Breakdown Matrix table, and Defences Breakdown Matrix table.
  - [ ] `SourceAttributionDrawer.tsx`: Click or hover any matrix cell to query `ModDB.tabulate()` and inspect the exact modifier list (`Source`, `Type`, `Value`, `Raw Mod Line`).

---

## Phase 13: Feature Slice 11 — Sharing, Cloud Persistence (`auth.dunhas.com`), PoB XML & GGG Importer

*Goal: Complete persistence, interoperability, and full-catalog datamine ingestion.*

- [ ] **13.1 Stateless Sharing & PoB Party XML (`apps/web/src/features/build-share-auth/`)**
  - [ ] `url_hash_serializer.ts`: Encode/decode `MercenaryBuildState` via `lz-string` into `#b=<payload>` URL fragments on share/load.
  - [ ] `pob_party_xml_exporter.ts`: Serialize equipped Mercenary gear, skills, and aura/support stats into zlib+Base64 XML compatible with desktop PoB's **Party** tab.

- [ ] **13.2 Dunhas Auth Hub & Cloud D1 Storage (`apps/web/src/features/build-share-auth/`)**
  - [ ] `dunhas_auth_client.ts`: Wrap `https://auth.dunhas.com/sdk.mjs` (`appId: 'path-of-mercenaries'`) for Google Sign-In / Sign-Out and session state.
  - [ ] `CloudBuildsModal.tsx`: Save/Load/Delete personal builds in `hub.db` (`'builds'` collection) and generate public short links (`/b/:slug`) via `hub.shared` (`'shared_builds'` collection).

- [ ] **13.3 Edge Importer & Full Datamine Pipeline (`apps/worker/` & `packages/data-pipeline/`)**
  - [ ] `packages/data-pipeline/`: CLI ingestion scripts parsing full PoEDB Mercenaries (all 36 archetypes + Level 1–40 skill curves) and RePoE (`base_items`, `gems`, `uniques`) into immutable versioned JSON bundles + automated PoB parity fixture runner.
  - [ ] `apps/worker/src/features/ggg-mercenary-importer/`: Hono worker endpoint `GET /api/import/ggg/:account/:character` fetching live `active_mercenary_index` equipment/skills with Cloudflare KV caching (`TTL: 300s`).
  - [ ] `apps/web/src/features/build-share-auth/GggImportModal.tsx`: Account/Character input UI importing live Mercenaries directly into the planner.

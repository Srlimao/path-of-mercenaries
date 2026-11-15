# Skills & Support Planner (`skills-support-planner`)

Implements the Path of Mercenaries **Skills** tab (Phases 6 & 7):
- Multi-group socket management (`SkillsTabView`, `SkillGroupCard`) with Archetype Pool filtering and `All-Skills Sandbox Mode`.
- Multi-part skill selector (`SkillPartSelector`) displaying weapon damage multipliers & Added Damage Effectiveness.
- 5-link Support Gem slot selector (`SupportSlotSelector`) ranked dynamically by live `+Full DPS / +DPS%` using `@pom/engine` `rankSupportGemsForSkillGroup`.
- Stage 10 `Full DPS` breakdown table (`FullDpsPartsTable`) with per-part inclusion checkboxes and hit/overlap multipliers (`1x`, `5x`, etc.).

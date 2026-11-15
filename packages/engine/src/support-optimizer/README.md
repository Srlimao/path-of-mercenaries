# Support Optimizer (`support-optimizer`)

Ranks compatible Support Gems for any Mercenary `SkillGroupSetup` slot (`rankSupportGemsForSkillGroup`) by simulating each candidate gem through Stages 2–6 and Stage 10 and sorting descending by `+Full DPS` / `+Hit DPS`.

- Validates `requiredSkillTags` and `excludedSkillTags` against explicit + part-inferred tags (`isSupportCompatibleWithSkill`).
- Exposes `deltaDps`, `deltaDpsPct`, `deltaFullDps`, `deltaFullDpsPct`, and duplicate-link status (`alreadyEquippedElsewhere`) for the UI selector dropdown.

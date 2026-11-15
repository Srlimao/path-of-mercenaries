# `mod-db` Domain

Path of Building-style tagged modifier store with source attribution.

- `mod_types.ts`: `Mod`, `ModType`, `ModSource`, `ModCondition`, `EvalContext`, `ModQuery`, and `TabulatedModEntry`.
- `condition_evaluator.ts`: Evaluates `Condition`, `StatThreshold`, `PerStat`, and `SkillTag` predicates.
- `mod_db_store.ts`: `ModDB` with additive `INC`, multiplicative `MORE`, `OVERRIDE`, `FLAG`, and `tabulate()`.
- `mod_db.test.ts`: Unit tests for tag matching, ancestral conversion keywords, and condition scaling.

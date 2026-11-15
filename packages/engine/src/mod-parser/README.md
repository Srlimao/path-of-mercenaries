# `mod-parser` Domain

Regex-based compiler translating Path of Exile modifier strings into tagged `Mod` AST entries.

- `global_mod_patterns.ts`: Pattern table mapping attributes, pools, resistances, flat damage, `INC`/`MORE` damage, crit, speed, conversion, penetration, and unique flags.
- `compile_item_mods.ts`: `parseModLineToMods()` and `compileEquippedItemsMods()`.

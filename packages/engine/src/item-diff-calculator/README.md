# item-diff-calculator

Phase 5 slot-replacement what-if calculator and item roll scaler:
- `compute_item_slot_diff.ts`: Compares a candidate `ParsedItem` (or unequip) in a target `EquipmentSlot` against the active build baseline, returning `deltaFullDps`, `deltaSkillDps`, `deltaEhp`, `deltaLife`, `deltaMaxHitPhys`, and resistance deltas.
- `item_roll_scaler.ts`: Scales item mod lines (`0%–100%`), updates quality (`0%–30%`) and catalysts, and rebuilds `ParsedItem` with fresh Stage 1 local weapon/defence stats.

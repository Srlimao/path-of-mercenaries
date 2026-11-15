# Defence Pipeline (`defence-pipeline`)

Full Path of Building defensive and survivability math for Path of Mercenaries (`packages/engine/src/defence-pipeline/`):

1. `pools_and_resistances.ts`: Primary attributes (`STR`/`DEX`/`INT`), Accuracy, Life / Energy Shield / Ward pools, and Capped / Uncapped Fire, Cold, Lightning, and Chaos resistances (supporting raised Max Res caps and negative Lightning Res for *Doryani's Prototype*).
2. `damage_taken_conversion.ts`: Normalized `PhysicalTakenAsFire/Cold/Lightning/Chaos` proportions plus *Dawnbreaker* `ColdTakenAsFire` / `LightningTakenAsFire` shifts.
3. `mitigation_and_avoidance.ts`: Armour PDR against Enemy Physical Hit Size, Evasion / Evade %, Attack & Spell Block (including *Intuitive Link*), Spell Suppression %, Endurance / Additional Phys DR, and Fortify Hit DR.
4. `max_hit_and_ehp_solver.ts`: 40-iteration binary-search Physical Max Hit solver, Elemental & Chaos Max Hit Taken (with *Doryani's Prototype* Armour-to-Lightning mitigation), weighted Effective Hit Pool (`EHP`), and Net Life Recovery per second.

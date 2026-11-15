# Damage Pipeline (`damage-pipeline`)

Implements Path of Building Stages 2–6 and Stage 10 multi-part Full DPS aggregation for Path of Mercenaries (`@pom/engine`).

- **Stage 2 (`stage2_added_damage.ts`)**: Weapon local base damage * `weaponDamageMultiplierPct`, skill intrinsic base added damage, and external flat added damage scaled by Added Damage Effectiveness.
- **Stage 3 (`stage3_conversion_dag.ts`)**: Strict forward PoE conversion DAG (`Physical -> Lightning -> Cold -> Fire -> Chaos`), Gain-as-Extra, ancestral `KeywordFlags` bitmask inheritance without double-counting, and `DealNo*Damage` filtering (*Brutality*).
- **Stage 4 (`stage4_inc_more_buckets.ts`)**: Additive `% increased` and multiplicative `% more` scaling keyed by ancestral `KeywordFlags`, *Volatility* min/max attack scaling, Doryani's Prototype / Rakiata's Dance resistance overrides, Penetration, Armour DR, and Enemy Taken multipliers.
- **Stage 5 (`stage5_crit_lucky_multihit.ts`)**: Crit chance/multi, *Perquil's Toe* Lucky damage roll expectation (`min + 2/3*(max - min)`), *Returning Projectiles* hit multiplier, and Impale contribution.
- **Stage 6 (`stage6_accuracy_speed.ts`)**: PoE Evasion/Accuracy hit chance, Attack/Cast speed action rate, and hit/impale DPS.
- **Stage 10 (`stage10_full_dps.ts`)**: Evaluates all enabled skill groups & multi-part hit counts into `combinedFullDps`.

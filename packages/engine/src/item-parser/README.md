# `item-parser` Domain

PoE `Ctrl+C` clipboard parser and Stage 1 local weapon/defence calculation.

- `local_weapon_defence_calc.ts`: Calculates local weapon DPS/APS/Crit and local Armour/ES/Evasion/Block while flagging local mod lines (`isLocal = true`) to prevent global double-counting.
- `poe_clipboard_parser.ts`: Parses raw PoE clipboard blocks, materializes catalog Uniques, and round-trips items back to clipboard format.

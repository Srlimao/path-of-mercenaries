# Party, Aura, Link & Outbound PoB Exporter (`party-aura-link-compiler`)

Supports both co-op Mercenary playstyles:
- **Player-Given Buffs (Luminary / Support Player → Carry Mercenary)**:
  - `compile_player_links.ts`: *Flame Link* flat fire scaled by Player Max Life, *Destructive Link* Main-Hand Base Crit override + Crit Multi, *Intuitive Link* Block.
  - `compile_player_auras.ts`: *Wrath*, *Anger*, *Hatred*, *Zealotry*, *Haste*, *Precision*, *Determination*, *Grace*, *Discipline*, *Purities*, *Smite*, and *Pyroclast Mine of Sabotage* scaled by `GlobalPlayerAuraEffect% + Generosity%`.
  - `compile_combat_conditions.ts`: Charges (including *Ralakesh's Impatience*), *Onslaught*, *Tailwind*, *Adrenaline*, *Crown of the Tyrant* socket flat damage, and live Custom Modifiers.
- **Mercenary as Aurabot → Player PoB `<Party>` Exporter** (`export_mercenary_party_pob.ts`):
  - Compiles *Kingmaker*, *Garb of the Ephemeral*, *Perquil's Toe*, *Doryani's Prototype*, *Crown of the Tyrant*, *Leer Cast*, *Dying Breath*, and active Mercenary Auras/Curses into an official PoB `<Party><ExportedBuffs>` XML payload & shareable zlib+base64url import code.

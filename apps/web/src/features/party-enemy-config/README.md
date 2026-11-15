# Party & Enemy Config (`party-enemy-config`)

Feature slice powering the **Config** tab and Left Sidebar quick toggles for Phases 8 & 9:

- **Playstyle A — Player-Given Buffs (`PlayerLinksAndAurasPanel`):** Luminary / Support Player scaling into a Carry Mercenary via *Flame Link*, *Destructive Link*, *Intuitive Link*, Player Auras, *Smite*, and *Pyroclast Mine of Sabotage* scaled by `100% + GlobalPlayerAuraEffect% + Generosity%`.
- **Combat Conditions & Custom Modifiers (`CombatConditionsAndCustomModsPanel`):** Mercenary charge counts (respecting *Ralakesh's Impatience* minimum floor), combat state toggles, *Crown of the Tyrant* socket color, and multi-line PoE custom modifiers.
- **Enemy Boss Presets & Stages 7–8 (`EnemyBossConfigPanel`):** Target presets (`standard_rare`, `pinnacle`, `uber_pinnacle`), active Hex/Mark curses with boss `0.67x` effectiveness scaling, exposure, scorch, penetration, *Doryani's Prototype*, and damage-taken debuffs.
- **Playstyle B — Mercenary as Aurabot (`MercenaryPartyExportPanel`):** Compiles the Mercenary's active support gear (*Kingmaker*, *Garb of the Ephemeral*, *Crown of the Tyrant*, etc.), mercenary auras, and curses into an official Path of Building `<Party>` Base64URL/Zlib share code and pasteable `<Party><ExportedBuffs>` text.
- **Sidebar Integration (`QuickBuffsWidget`):** Always-accessible quick buff toggles inside `LeftStatSidebar`.

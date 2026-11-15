# Unique Handlers (`unique-handlers`)

Modular registry of all 22 build-around and support Unique item mechanics in Path of Mercenaries (`packages/engine/src/unique-handlers/`):

- **Explicit-Parser Integrated (non-duplicating):** *Perquil's Toe*, *Rakiata's Dance*, *Original Sin*, *Crown of the Tyrant*, *Nimis*, *Piscator's Vigil*, *Ralakesh's Impatience*, *Gravebind*, *Dawnbreaker*, *Cloak of Flame*, *Lightning Coil*.
- **Active Mechanical Handlers:**
  - *Doryani's Prototype* (`DoryaniLightningResIgnoredForTaken`, `DoryaniArmourAppliesToLightning`)
  - *Heatshiver* (`ColdAsExtraFire` +30% vs Chilled, +70% vs Frozen)
  - *Yoke of Suffering* (+10% `EnemyDamageTaken` per active enemy ailment)
  - *The Taming* (+40% Hit & Ailment `Damage` per Freeze/Shock/Ignite)
  - *Voidforge* (Deal no Phys/Chaos; +233.3% expected Phys as Extra each Element)
  - *Ephemeral Edge* (+20% of current Mercenary ES as flat Attack `LightningMax`)
  - *Sign of the Sin Eater* (Level 30 Smite flat Lightning fallback)
  - *Leer Cast*, *Dying Breath*, *Kingmaker*, and *Garb of the Ephemeral*.

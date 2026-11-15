import type { EquipmentSlot, ItemRarity } from '@pom/engine';

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  Weapon1: 'Weapon 1',
  Weapon2: 'Weapon 2',
  Helmet: 'Helmet',
  BodyArmour: 'Body Armour',
  Gloves: 'Gloves',
  Boots: 'Boots',
  Amulet: 'Amulet',
  Ring1: 'Ring 1',
  Ring2: 'Ring 2',
  Belt: 'Belt',
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  Normal: 'var(--poe-normal)',
  Magic: 'var(--poe-magic)',
  Rare: 'var(--poe-rare)',
  Unique: 'var(--poe-unique)',
};

export interface SampleClipboardPreset {
  id: string;
  label: string;
  rawText: string;
}

export const SAMPLE_CLIPBOARD_PRESETS: readonly SampleClipboardPreset[] = [
  {
    id: 'high-edps-wand',
    label: 'High eDPS Wand',
    rawText: [
      'Item Class: Wand',
      'Rarity: Rare',
      'Doom Spire',
      'Tornado Wand',
      '--------',
      'Quality: +20%',
      '--------',
      '38% increased Spell Damage (implicit)',
      '--------',
      'Adds 18 to 312 Lightning Damage',
      'Adds 45 to 82 Fire Damage',
      '15% increased Attack Speed',
      '32% increased Critical Strike Chance',
      '+34% to Global Critical Strike Multiplier',
    ].join('\n'),
  },
  {
    id: 'life-res-opal-ring',
    label: 'Life/Res Opal Ring',
    rawText: [
      'Item Class: Ring',
      'Rarity: Rare',
      'Pandemonium Band',
      'Opal Ring',
      '--------',
      '24% increased Elemental Damage with Attack Skills (implicit)',
      '--------',
      '+78 to maximum Life',
      '+45% to Fire Resistance',
      '+42% to Cold Resistance',
      '+38% to Lightning Resistance',
      '+44 to Strength',
    ].join('\n'),
  },
  {
    id: 'doryanis-prototype',
    label: "Doryani's Prototype",
    rawText: [
      'Item Class: Body Armour',
      'Rarity: Unique',
      "Doryani's Prototype",
      "Saint's Hauberk",
      '--------',
      'Quality: +20%',
      '--------',
      '+180% increased Armour and Energy Shield',
      '+85 to maximum Life',
      '+10% to all Elemental Resistances',
      '-180% to Lightning Resistance',
      'Nearby Enemies have Lightning Resistance equal to yours',
    ].join('\n'),
  },
];

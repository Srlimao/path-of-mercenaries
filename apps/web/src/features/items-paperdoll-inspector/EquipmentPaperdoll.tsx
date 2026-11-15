import {
  EQUIPMENT_SLOTS,
  serializeItemToClipboard,
  validateEquipmentForArchetype,
  type EquipmentSlot,
  type ItemRarity,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './EquipmentPaperdoll.module.css';

interface EquipmentPaperdollProps {
  selectedSlot: EquipmentSlot;
  onSelectSlot: (slot: EquipmentSlot) => void;
  onOpenPasteModal: (slot?: EquipmentSlot) => void;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
  Normal: 'var(--poe-normal)',
  Magic: 'var(--poe-magic)',
  Rare: 'var(--poe-rare)',
  Unique: 'var(--poe-unique)',
};

const SLOT_LABELS: Record<EquipmentSlot, string> = {
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

export function EquipmentPaperdoll({
  selectedSlot,
  onSelectSlot,
  onOpenPasteModal,
}: EquipmentPaperdollProps) {
  const { buildState, activeArchetype, unequipItem, equipStarterLoadout } =
    useMercenaryCalculator();
  const weapon1 = buildState.equippedItems.Weapon1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className="pom-button pom-button-gold"
          onClick={() => onOpenPasteModal(selectedSlot)}
        >
          Paste Item (Ctrl+V)
        </button>
        <button type="button" className="pom-button" onClick={equipStarterLoadout}>
          Load Starter Gear
        </button>
      </div>

      <div className={styles.slotList}>
        {EQUIPMENT_SLOTS.map((slot) => {
          const item = buildState.equippedItems[slot];
          const isSelected = slot === selectedSlot;
          const warning =
            item && activeArchetype
              ? validateEquipmentForArchetype(activeArchetype, slot, item, weapon1)
              : null;

          return (
            <div
              key={slot}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSlot(slot)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectSlot(slot);
              }}
              className={`${styles.slotRow} ${isSelected ? styles.slotRowSelected : ''} ${
                warning ? styles.slotRowInvalid : ''
              }`}
              title={warning ?? undefined}
            >
              <div className={styles.slotLeft}>
                <span className={styles.slotLabel}>{SLOT_LABELS[slot]}</span>
                {item ? (
                  <span
                    className={styles.itemName}
                    style={{ color: RARITY_COLORS[item.rarity] }}
                  >
                    {item.name}
                  </span>
                ) : (
                  <span style={{ color: 'var(--pom-text-muted)', fontStyle: 'italic' }}>
                    (Empty)
                  </span>
                )}
              </div>

              <div className={styles.slotActions} onClick={(e) => e.stopPropagation()}>
                {item?.localWeaponStats && (
                  <span className="pom-badge pom-badge-gold">
                    {item.localWeaponStats.totalDps} DPS
                  </span>
                )}
                {item && (
                  <>
                    <button
                      type="button"
                      className="pom-button"
                      style={{ height: 20, padding: '0 5px', fontSize: 10 }}
                      onClick={() => navigator.clipboard?.writeText(serializeItemToClipboard(item))}
                      title="Copy PoE item text to clipboard"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="pom-button"
                      style={{ height: 20, padding: '0 5px', fontSize: 10 }}
                      onClick={() => unequipItem(slot)}
                      title="Unequip item"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

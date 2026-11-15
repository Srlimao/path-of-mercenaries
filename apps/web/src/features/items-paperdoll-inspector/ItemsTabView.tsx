import { useCallback, useState } from 'react';
import {
  EQUIPMENT_SLOTS,
  createParsedItemFromUnique,
  serializeItemToClipboard,
  validateEquipmentForArchetype,
  type EquipmentSlot,
  type UniqueItemDefinition,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import { EquipmentPaperdoll } from './EquipmentPaperdoll.js';
import { PasteItemModal } from './PasteItemModal.js';
import { PoeItemTooltip } from './PoeItemTooltip.js';
import { SLOT_LABELS } from './slot_display_metadata.js';
import styles from './ItemsTabView.module.css';

export function ItemsTabView() {
  const {
    buildState,
    catalogs,
    activeArchetype,
    equipItem,
    unequipItem,
    equipStarterLoadout,
  } = useMercenaryCalculator();

  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('Weapon1');
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteSlot, setPasteSlot] = useState<EquipmentSlot>('Weapon1');
  const [pasteText, setPasteText] = useState('');
  const [uniqueFilter, setUniqueFilter] = useState('');
  const [copiedFlag, setCopiedFlag] = useState(false);

  const equippedCount = EQUIPMENT_SLOTS.filter((slot) => Boolean(buildState.equippedItems[slot])).length;
  const selectedItem = buildState.equippedItems[selectedSlot];
  const weapon1 = buildState.equippedItems.Weapon1;

  const selectedWarning =
    selectedItem && activeArchetype
      ? validateEquipmentForArchetype(activeArchetype, selectedSlot, selectedItem, weapon1)
      : null;

  const handleOpenPasteModal = useCallback(
    (slot?: EquipmentSlot) => {
      setPasteSlot(slot ?? selectedSlot);
      setPasteText('');
      setIsPasteOpen(true);
    },
    [selectedSlot],
  );

  const handleGlobalPasteText = useCallback(
    (rawText: string) => {
      setPasteSlot(selectedSlot);
      setPasteText(rawText);
      setIsPasteOpen(true);
    },
    [selectedSlot],
  );

  async function handleCopySelected() {
    if (!selectedItem) return;
    try {
      await navigator.clipboard.writeText(serializeItemToClipboard(selectedItem));
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 1500);
    } catch {
      // Clipboard permissions vary by browser context
    }
  }

  function handleQuickEquipUnique(uniqueDef: UniqueItemDefinition) {
    const parsed = createParsedItemFromUnique(uniqueDef, catalogs);
    const targetSlot = uniqueDef.validSlots[0] ?? selectedSlot;
    equipItem(targetSlot, parsed);
    setSelectedSlot(targetSlot);
  }

  const normalizedFilter = uniqueFilter.trim().toLowerCase();
  const filteredUniques = catalogs.uniques.filter((u) => {
    if (!normalizedFilter) return true;
    return (
      u.name.toLowerCase().includes(normalizedFilter) ||
      u.baseType.toLowerCase().includes(normalizedFilter) ||
      u.itemClass.toLowerCase().includes(normalizedFilter)
    );
  });

  function getEmptySlotRestrictionHint(): string {
    if (!activeArchetype) return 'Select an archetype to see weapon restrictions.';
    if (selectedSlot === 'Weapon1') {
      return `Allowed Main-Hand: ${activeArchetype.allowedMainHandClasses.join(', ')}`;
    }
    if (selectedSlot === 'Weapon2') {
      const dw = activeArchetype.canDualWield ? 'Dual Wield enabled' : 'No Dual Wield';
      return `Allowed Off-Hand: ${activeArchetype.allowedOffHandClasses.join(', ')} (${dw})`;
    }
    return `Standard ${SLOT_LABELS[selectedSlot]} slot — paste a PoE item (Ctrl+V) or equip a Seed Unique.`;
  }

  return (
    <div className={styles.layout}>
      <section className="pom-panel">
        <div className="pom-panel-header">
          <span>Equipment Paperdoll</span>
          <span className="pom-badge tabular-nums">{equippedCount} / 10</span>
        </div>
        <div className={styles.panelBody}>
          <EquipmentPaperdoll
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onOpenPasteModal={handleOpenPasteModal}
          />
        </div>
      </section>

      <section className="pom-panel">
        <div className="pom-panel-header">
          <span>Inspector — {SLOT_LABELS[selectedSlot]}</span>
          <span className="pom-badge">{selectedItem ? selectedItem.rarity : 'Empty'}</span>
        </div>
        <div className={styles.panelBody}>
          {selectedItem ? (
            <>
              <div className={styles.inspectorActions}>
                <button
                  type="button"
                  className="pom-button pom-button-gold"
                  onClick={() => handleOpenPasteModal(selectedSlot)}
                >
                  Replace via Paste (Ctrl+V)
                </button>
                <button type="button" className="pom-button" onClick={handleCopySelected}>
                  {copiedFlag ? 'Copied!' : 'Copy PoE Text'}
                </button>
                <button
                  type="button"
                  className="pom-button"
                  onClick={() => unequipItem(selectedSlot)}
                >
                  Unequip
                </button>
              </div>
              {selectedWarning && <div className={styles.warningBanner}>{selectedWarning}</div>}
              <PoeItemTooltip item={selectedItem} />
            </>
          ) : (
            <div className={styles.emptySlotBox}>
              <div className={styles.emptyTitle}>{SLOT_LABELS[selectedSlot]} is Empty</div>
              <div className={styles.emptyHint}>{getEmptySlotRestrictionHint()}</div>
              <div className={styles.inspectorActions}>
                <button
                  type="button"
                  className="pom-button pom-button-gold"
                  onClick={() => handleOpenPasteModal(selectedSlot)}
                >
                  Paste Item into {SLOT_LABELS[selectedSlot]}
                </button>
                <button type="button" className="pom-button" onClick={equipStarterLoadout}>
                  Load Starter Gear
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="pom-panel">
        <div className="pom-panel-header">
          <span>Quick-Equip Seed Uniques</span>
          <span className="pom-badge pom-badge-gold">{catalogs.uniques.length} Uniques</span>
        </div>
        <div className={styles.panelBody}>
          <input
            type="search"
            className={`pom-input ${styles.searchInput}`}
            value={uniqueFilter}
            onChange={(e) => setUniqueFilter(e.target.value)}
            placeholder="Filter uniques by name, base, or class..."
            aria-label="Filter Seed Uniques"
          />
          <div className={styles.uniqueList}>
            {filteredUniques.map((u) => {
              const targetSlot = u.validSlots[0] ?? 'BodyArmour';
              return (
                <div key={u.id} className={styles.uniqueCard}>
                  <div className={styles.uniqueTop}>
                    <div className={styles.uniqueTitleWrap}>
                      <span className={styles.uniqueName}>{u.name}</span>
                      <span className={styles.uniqueBase}>
                        {u.baseType} · {SLOT_LABELS[targetSlot]}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="pom-button"
                      onClick={() => handleQuickEquipUnique(u)}
                    >
                      Equip
                    </button>
                  </div>
                  {u.explicits.length > 0 && (
                    <div className={styles.uniqueModPreview}>{u.explicits[0]}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PasteItemModal
        isOpen={isPasteOpen}
        initialSlot={pasteSlot}
        initialText={pasteText}
        onOpenWithText={handleGlobalPasteText}
        onClose={() => setIsPasteOpen(false)}
        onEquipped={(slot) => setSelectedSlot(slot)}
      />
    </div>
  );
}

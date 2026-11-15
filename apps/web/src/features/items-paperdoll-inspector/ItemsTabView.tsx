import { useCallback, useMemo, useState } from 'react';
import {
  EQUIPMENT_SLOTS,
  computeItemSlotDiff,
  serializeItemToClipboard,
  validateEquipmentForArchetype,
  type EquipmentSlot,
  type ParsedItem,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import { EquipmentPaperdoll } from './EquipmentPaperdoll.js';
import { HoverDiffComparison } from './HoverDiffComparison.js';
import { ItemRollAndTextEditor } from './ItemRollAndTextEditor.js';
import { PasteItemModal } from './PasteItemModal.js';
import { PoeItemTooltip } from './PoeItemTooltip.js';
import { UniquesBrowserPanel } from './UniquesBrowserPanel.js';
import { SLOT_LABELS } from './slot_display_metadata.js';
import styles from './ItemsTabView.module.css';

interface CandidateRef {
  slot: EquipmentSlot;
  item: ParsedItem;
}

export function ItemsTabView() {
  const {
    buildState,
    snapshot,
    catalogs,
    activeArchetype,
    equipItem,
    unequipItem,
    equipStarterLoadout,
  } = useMercenaryCalculator();

  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('Weapon1');
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pasteSlot, setPasteSlot] = useState<EquipmentSlot>('Weapon1');
  const [pasteText, setPasteText] = useState('');
  const [hoveredCandidate, setHoveredCandidate] = useState<CandidateRef | null>(null);
  const [pinnedCandidate, setPinnedCandidate] = useState<CandidateRef | null>(null);
  const [copiedFlag, setCopiedFlag] = useState(false);

  const equippedCount = EQUIPMENT_SLOTS.filter((slot) => Boolean(buildState.equippedItems[slot])).length;
  const selectedItem = buildState.equippedItems[selectedSlot];
  const weapon1 = buildState.equippedItems.Weapon1;
  const activeCompare = pinnedCandidate ?? hoveredCandidate;

  const compareDiff = useMemo(() => {
    if (!activeCompare) return null;
    return computeItemSlotDiff(
      buildState,
      activeCompare.slot,
      activeCompare.item,
      catalogs,
      snapshot,
    );
  }, [activeCompare, buildState, catalogs, snapshot]);

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

  function getEmptySlotRestrictionHint(): string {
    if (!activeArchetype) return 'Select an archetype to see weapon restrictions.';
    if (selectedSlot === 'Weapon1') {
      return `Allowed Main-Hand: ${activeArchetype.allowedMainHandClasses.join(', ')}`;
    }
    if (selectedSlot === 'Weapon2') {
      const dw = activeArchetype.canDualWield ? 'Dual Wield enabled' : 'No Dual Wield';
      return `Allowed Off-Hand: ${activeArchetype.allowedOffHandClasses.join(', ')} (${dw})`;
    }
    return `Standard ${SLOT_LABELS[selectedSlot]} slot — paste a PoE item (Ctrl+V) or hover a Unique to compare.`;
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
            onSelectSlot={(slot) => {
              setSelectedSlot(slot);
              setPinnedCandidate(null);
            }}
            onOpenPasteModal={handleOpenPasteModal}
          />
        </div>
      </section>

      <section className="pom-panel">
        <div className="pom-panel-header">
          <span>
            {activeCompare
              ? `Compare — ${SLOT_LABELS[activeCompare.slot]}`
              : `Inspector — ${SLOT_LABELS[selectedSlot]}`}
          </span>
          <span className="pom-badge">
            {activeCompare ? 'What-If Diff' : selectedItem ? selectedItem.rarity : 'Empty'}
          </span>
        </div>
        <div className={styles.panelBody}>
          {activeCompare && compareDiff ? (
            <HoverDiffComparison
              slot={activeCompare.slot}
              candidateItem={activeCompare.item}
              equippedItem={buildState.equippedItems[activeCompare.slot]}
              diff={compareDiff}
              onClearCompare={
                pinnedCandidate
                  ? () => {
                      setPinnedCandidate(null);
                      setHoveredCandidate(null);
                    }
                  : undefined
              }
              onEquipCandidate={() => {
                equipItem(activeCompare.slot, activeCompare.item);
                setSelectedSlot(activeCompare.slot);
                setPinnedCandidate(null);
                setHoveredCandidate(null);
              }}
            />
          ) : selectedItem ? (
            <>
              <div className={styles.inspectorActions}>
                <button
                  type="button"
                  className="pom-button pom-button-gold"
                  onClick={() => setIsEditorOpen(true)}
                >
                  Edit Rolls / Text
                </button>
                <button
                  type="button"
                  className="pom-button"
                  onClick={() => handleOpenPasteModal(selectedSlot)}
                >
                  Paste (Ctrl+V)
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
          <span>Uniques Catalog &amp; Hover Diffs</span>
          <span className="pom-badge pom-badge-gold">{catalogs.uniques.length} Uniques</span>
        </div>
        <div className={styles.panelBody}>
          <UniquesBrowserPanel
            selectedSlot={selectedSlot}
            onHoverCandidate={setHoveredCandidate}
            onPinCandidate={setPinnedCandidate}
            onEquipUnique={(slot, item) => {
              equipItem(slot, item);
              setSelectedSlot(slot);
              setPinnedCandidate(null);
              setHoveredCandidate(null);
            }}
          />
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

      {selectedItem && (
        <ItemRollAndTextEditor
          isOpen={isEditorOpen}
          slot={selectedSlot}
          item={selectedItem}
          onClose={() => setIsEditorOpen(false)}
          onSave={(slot, updatedItem) => equipItem(slot, updatedItem)}
        />
      )}
    </div>
  );
}

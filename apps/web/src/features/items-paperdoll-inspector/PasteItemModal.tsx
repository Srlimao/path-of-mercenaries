import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EQUIPMENT_SLOTS,
  parsePoeItemClipboard,
  validateEquipmentForArchetype,
  type EquipmentSlot,
  type ParsedItem,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import { PoeItemTooltip } from './PoeItemTooltip.js';
import { SAMPLE_CLIPBOARD_PRESETS, SLOT_LABELS } from './slot_display_metadata.js';
import styles from './PasteItemModal.module.css';

interface PasteItemModalProps {
  isOpen: boolean;
  initialSlot: EquipmentSlot;
  initialText: string;
  onOpenWithText: (rawText: string) => void;
  onClose: () => void;
  onEquipped?: (slot: EquipmentSlot) => void;
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

export function PasteItemModal({
  isOpen,
  initialSlot,
  initialText,
  onOpenWithText,
  onClose,
  onEquipped,
}: PasteItemModalProps) {
  const { catalogs, buildState, activeArchetype, equipItem } = useMercenaryCalculator();
  const [rawText, setRawText] = useState(initialText);
  const [targetSlot, setTargetSlot] = useState<EquipmentSlot>(initialSlot);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    function handleWindowPaste(event: ClipboardEvent) {
      if (isEditableElement(document.activeElement)) return;
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim()) return;
      event.preventDefault();
      onOpenWithText(text);
    }

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [onOpenWithText]);

  useEffect(() => {
    if (!isOpen) return;
    setRawText(initialText);
    setTargetSlot(initialSlot);
    const frameId = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, initialText, initialSlot]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const parseResult = useMemo<{ item: ParsedItem | null; error: string | null }>(() => {
    if (!rawText.trim()) {
      return { item: null, error: null };
    }
    try {
      return { item: parsePoeItemClipboard(rawText, catalogs), error: null };
    } catch (err) {
      return {
        item: null,
        error: err instanceof Error ? err.message : 'Could not parse item text.',
      };
    }
  }, [rawText, catalogs]);

  useEffect(() => {
    const parsed = parseResult.item;
    if (!parsed) return;
    setTargetSlot(
      parsed.validSlots.includes(initialSlot)
        ? initialSlot
        : (parsed.validSlots[0] ?? initialSlot),
    );
  }, [parseResult.item, initialSlot]);

  if (!isOpen) return null;

  const parsedItem = parseResult.item;
  const archetypeWarning =
    parsedItem && activeArchetype
      ? validateEquipmentForArchetype(
          activeArchetype,
          targetSlot,
          parsedItem,
          buildState.equippedItems.Weapon1,
        )
      : null;

  const slotMismatchWarning =
    parsedItem && !parsedItem.validSlots.includes(targetSlot)
      ? `${parsedItem.itemClass} cannot normally equip into ${SLOT_LABELS[targetSlot]} (expected ${parsedItem.validSlots
          .map((s) => SLOT_LABELS[s])
          .join(' or ')}).`
      : null;

  function handleEquip() {
    if (!parsedItem) return;
    equipItem(targetSlot, parsedItem);
    onEquipped?.(targetSlot);
    onClose();
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Paste Path of Exile Item"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Paste Item (PoE Ctrl+C Clipboard)</span>
          <button type="button" className="pom-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.presetBar}>
          <span className={styles.presetLabel}>Sample Presets:</span>
          {SAMPLE_CLIPBOARD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="pom-button"
              onClick={() => setRawText(preset.rawText)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          <div className={styles.editorCol}>
            <div className={styles.hint}>
              Hover any item in Path of Exile, press <code>Ctrl+C</code>, then paste below (or press{' '}
              <code>Ctrl+V</code> anywhere on the Items tab).
            </div>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw PoE item text here (Item Class / Rarity / -------- sections)..."
            />
            {parseResult.error && <div className={styles.warningBox}>{parseResult.error}</div>}
          </div>

          <div className={styles.previewCol}>
            <div className={styles.slotControl}>
              <label htmlFor="paste-target-slot" className={styles.slotControlLabel}>
                Target Slot
              </label>
              <select
                id="paste-target-slot"
                className={`pom-select ${styles.slotSelect}`}
                value={targetSlot}
                onChange={(e) => setTargetSlot(e.target.value as EquipmentSlot)}
              >
                {EQUIPMENT_SLOTS.map((slot) => {
                  const isPreferred = parsedItem?.validSlots.includes(slot) ?? false;
                  return (
                    <option key={slot} value={slot}>
                      {SLOT_LABELS[slot]}
                      {parsedItem && isPreferred ? ' (Recommended)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {slotMismatchWarning && <div className={styles.warningBox}>{slotMismatchWarning}</div>}
            {archetypeWarning && <div className={styles.warningBox}>{archetypeWarning}</div>}

            {parsedItem ? (
              <PoeItemTooltip item={parsedItem} />
            ) : (
              <div className={styles.emptyPreview}>
                Paste item text or click a Sample Preset to preview Stage 1 local stats &amp; mods.
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className="pom-button" onClick={() => setRawText('')}>
            Clear
          </button>
          <button type="button" className="pom-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="pom-button pom-button-gold"
            disabled={!parsedItem}
            onClick={handleEquip}
          >
            Equip into {SLOT_LABELS[targetSlot]}
          </button>
        </div>
      </div>
    </div>
  );
}

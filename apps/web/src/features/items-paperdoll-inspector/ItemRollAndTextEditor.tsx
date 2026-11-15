import { useEffect, useMemo, useState } from 'react';
import {
  computeItemSlotDiff,
  extractScalableModMeta,
  rebuildEditedItem,
  scaleModLineByRollPct,
  serializeItemToClipboard,
  type EquipmentSlot,
  type ParsedItem,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import { PoeItemTooltip } from './PoeItemTooltip.js';
import { SLOT_LABELS } from './slot_display_metadata.js';
import styles from './ItemRollAndTextEditor.module.css';

interface ItemRollAndTextEditorProps {
  isOpen: boolean;
  slot: EquipmentSlot;
  item: ParsedItem;
  onClose: () => void;
  onSave: (slot: EquipmentSlot, updatedItem: ParsedItem) => void;
}

interface RollEntry {
  template: string;
  rollPct: number;
  scalable: boolean;
}

const CATALYST_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'None' },
  { value: 'Physical', label: 'Abrasive (Physical)' },
  { value: 'Elemental', label: 'Prismatic (Elemental)' },
  { value: 'Caster', label: 'Imbued (Caster)' },
  { value: 'Attack', label: 'Noxious / Attack' },
  { value: 'Defence', label: 'Tempering (Defence)' },
];

function formatPct(val: number): string {
  if (Math.abs(val) < 0.05) return '0.0%';
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function toneClass(val: number): string {
  if (val > 0.05) return styles.pos ?? '';
  if (val < -0.05) return styles.neg ?? '';
  return styles.neutral ?? '';
}

export function ItemRollAndTextEditor({
  isOpen,
  slot,
  item,
  onClose,
  onSave,
}: ItemRollAndTextEditorProps) {
  const { buildState, snapshot, catalogs } = useMercenaryCalculator();
  const [qualityPct, setQualityPct] = useState(item.qualityPct);
  const [catalystType, setCatalystType] = useState<ParsedItem['catalystType']>(item.catalystType);
  const [rollEntries, setRollEntries] = useState<RollEntry[]>([]);
  const [rawText, setRawText] = useState('');
  const [useRawText, setUseRawText] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQualityPct(item.qualityPct);
    setCatalystType(item.catalystType);
    const explicits = item.modLines.filter(
      (m) => m.tierType !== 'implicit' && m.tierType !== 'enchant',
    );
    setRollEntries(
      explicits.map((m) => ({
        template: m.rawText,
        rollPct: 50,
        scalable: extractScalableModMeta(m.rawText).hasNumbers,
      })),
    );
    setRawText(serializeItemToClipboard(item));
    setUseRawText(false);
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const scaledModLines = useMemo(
    () => rollEntries.map((entry) => scaleModLineByRollPct(entry.template, entry.rollPct)),
    [rollEntries],
  );

  const previewItem = useMemo(() => {
    try {
      return rebuildEditedItem(
        item,
        {
          qualityPct,
          catalystType,
          explicitModLines: useRawText ? undefined : scaledModLines,
          rawTextOverride: useRawText ? rawText : undefined,
        },
        catalogs,
      );
    } catch {
      return item;
    }
  }, [item, qualityPct, catalystType, scaledModLines, useRawText, rawText, catalogs]);

  useEffect(() => {
    if (!isOpen || useRawText) return;
    setRawText(serializeItemToClipboard(previewItem));
  }, [isOpen, useRawText, previewItem]);

  const liveDiff = useMemo(
    () => computeItemSlotDiff(buildState, slot, previewItem, catalogs, snapshot),
    [buildState, slot, previewItem, catalogs, snapshot],
  );

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${item.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>
            Edit {item.name} ({SLOT_LABELS[slot]})
          </span>
          <button type="button" className="pom-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.controlsCol}>
            <div className={styles.topControls}>
              <label className={styles.controlField}>
                <span>Quality: +{qualityPct}%</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={qualityPct}
                  onChange={(e) => {
                    setUseRawText(false);
                    setQualityPct(Number(e.target.value));
                  }}
                />
              </label>

              <label className={styles.controlField}>
                <span>Catalyst Type</span>
                <select
                  className="pom-select"
                  value={catalystType ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCatalystType(val ? (val as ParsedItem['catalystType']) : undefined);
                  }}
                >
                  {CATALYST_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {rollEntries.length > 0 && (
              <div className={styles.rollList}>
                {rollEntries.map((entry, idx) => (
                  <div key={`${entry.template}-${idx}`} className={styles.rollRow}>
                    <span className={styles.rollText} title={scaledModLines[idx]}>
                      {scaledModLines[idx]}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      disabled={!entry.scalable}
                      value={entry.rollPct}
                      onChange={(e) => {
                        const nextPct = Number(e.target.value);
                        setUseRawText(false);
                        setRollEntries((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, rollPct: nextPct } : row)),
                        );
                      }}
                    />
                    <span className={styles.rollPct}>{entry.rollPct}%</span>
                  </div>
                ))}
              </div>
            )}

            <label className={styles.controlField}>
              <span>Raw PoE Item Text (direct edit overrides sliders)</span>
              <textarea
                className={styles.textarea}
                value={rawText}
                onChange={(e) => {
                  setUseRawText(true);
                  setRawText(e.target.value);
                }}
              />
            </label>
          </div>

          <div className={styles.previewCol}>
            <div className={styles.diffStrip}>
              <span className={toneClass(liveDiff.deltaFullDpsPct)}>
                Full DPS: {formatPct(liveDiff.deltaFullDpsPct)}
              </span>
              <span className={toneClass(liveDiff.deltaEhpPct)}>
                EHP: {formatPct(liveDiff.deltaEhpPct)}
              </span>
              <span className={toneClass(liveDiff.deltaLife)}>
                Life: {liveDiff.deltaLife > 0 ? `+${Math.round(liveDiff.deltaLife)}` : Math.round(liveDiff.deltaLife)}
              </span>
            </div>

            <PoeItemTooltip item={previewItem} />
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className="pom-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="pom-button pom-button-gold"
            onClick={() => {
              onSave(slot, previewItem);
              onClose();
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

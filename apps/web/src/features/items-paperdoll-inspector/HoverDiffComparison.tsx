import type { EquipmentSlot, ItemSlotDiff, ParsedItem } from '@pom/engine';
import { PoeItemTooltip } from './PoeItemTooltip.js';
import { SLOT_LABELS } from './slot_display_metadata.js';
import styles from './HoverDiffComparison.module.css';

interface HoverDiffComparisonProps {
  slot: EquipmentSlot;
  candidateItem: ParsedItem;
  equippedItem?: ParsedItem;
  diff: ItemSlotDiff;
  onClearCompare?: () => void;
  onEquipCandidate?: () => void;
}

function formatSignedNumber(val: number): string {
  const rounded = Math.round(val);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('en-US')}`;
}

function formatSignedPct(val: number): string {
  if (Math.abs(val) < 0.01) return '0.0%';
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function diffColorClass(val: number): string {
  if (val > 0.005) return styles.pos ?? '';
  if (val < -0.005) return styles.neg ?? '';
  return styles.neutral ?? '';
}

const RESISTANCE_KEYS = ['Fire', 'Cold', 'Lightning', 'Chaos'] as const;

export function HoverDiffComparison({
  slot,
  candidateItem,
  equippedItem,
  diff,
  onClearCompare,
  onEquipCandidate,
}: HoverDiffComparisonProps) {
  const nonZeroResDeltas = RESISTANCE_KEYS.filter(
    (res) => diff.deltaResistances[res] !== 0,
  );

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <span className={styles.titleText}>
          What-If Comparison ({SLOT_LABELS[slot]})
        </span>
        <div className={styles.actions}>
          {onEquipCandidate && (
            <button type="button" className="pom-button pom-button-gold" onClick={onEquipCandidate}>
              Equip Candidate
            </button>
          )}
          {onClearCompare && (
            <button type="button" className="pom-button" onClick={onClearCompare}>
              Clear Compare
            </button>
          )}
        </div>
      </div>

      <div className={styles.diffBanner}>
        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Full DPS</span>
          <span className={`${styles.metricValue} ${diffColorClass(diff.deltaFullDps)}`}>
            {formatSignedNumber(diff.deltaFullDps)} ({formatSignedPct(diff.deltaFullDpsPct)})
          </span>
        </div>

        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Active Skill DPS</span>
          <span className={`${styles.metricValue} ${diffColorClass(diff.deltaSkillDps)}`}>
            {formatSignedNumber(diff.deltaSkillDps)} ({formatSignedPct(diff.deltaSkillDpsPct)})
          </span>
        </div>

        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Effective Hit Pool</span>
          <span className={`${styles.metricValue} ${diffColorClass(diff.deltaEhp)}`}>
            {formatSignedNumber(diff.deltaEhp)} ({formatSignedPct(diff.deltaEhpPct)})
          </span>
        </div>

        <div className={styles.metricBox}>
          <span className={styles.metricLabel}>Max Life / Phys Max</span>
          <span
            className={`${styles.metricValue} ${diffColorClass(
              diff.deltaLife !== 0 ? diff.deltaLife : diff.deltaMaxHitPhys,
            )}`}
          >
            {formatSignedNumber(diff.deltaLife)} / {formatSignedNumber(diff.deltaMaxHitPhys)}
          </span>
        </div>

        {nonZeroResDeltas.length > 0 && (
          <div className={styles.resRow}>
            {nonZeroResDeltas.map((res) => {
              const delta = diff.deltaResistances[res];
              return (
                <span key={res} className={diffColorClass(delta)}>
                  {res}: {delta > 0 ? `+${delta}%` : `${delta}%`}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className={equippedItem ? styles.sideBySide : styles.singlePane}>
        <div className={styles.colWrap}>
          <div className={styles.colHeader}>Candidate: {candidateItem.name}</div>
          <PoeItemTooltip item={candidateItem} />
        </div>

        {equippedItem && (
          <div className={styles.colWrap}>
            <div className={styles.colHeader}>
              Equipped ({SLOT_LABELS[slot]}): {equippedItem.name}
            </div>
            <PoeItemTooltip item={equippedItem} />
          </div>
        )}
      </div>
    </div>
  );
}

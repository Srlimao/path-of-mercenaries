import { useMemo } from 'react';
import {
  rankSupportGemsForSkillGroup,
  type EquippedSupportSlot,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './SupportSlotSelector.module.css';

interface SupportSlotSelectorProps {
  groupId: string;
  slotIndex: number;
  equippedSlot?: EquippedSupportSlot;
  canAppendNew: boolean;
  onSelectSupport: (supportId: string, level: number) => void;
  onToggleEnabled: () => void;
  onChangeLevel: (level: number) => void;
  onRemoveSlot: () => void;
}

function formatCompactDps(value: number): string {
  const abs = Math.abs(value);
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

export function SupportSlotSelector({
  groupId,
  slotIndex,
  equippedSlot,
  canAppendNew,
  onSelectSupport,
  onToggleEnabled,
  onChangeLevel,
  onRemoveSlot,
}: SupportSlotSelectorProps) {
  const { buildState, modDb, snapshot, catalogs } = useMercenaryCalculator();
  const isEmpty = !equippedSlot;
  const shouldRank = !isEmpty || canAppendNew;

  const rankedEntries = useMemo(() => {
    if (!shouldRank) return [];
    return rankSupportGemsForSkillGroup({
      buildState,
      baseModDb: modDb,
      groupId,
      slotIndex,
      derivedSkillLevel: snapshot.derivedSkillLevel,
      accuracy: snapshot.defences.accuracy,
      mercLightningUncappedResistPct: snapshot.defences.resistances.Lightning.uncapped,
      supportLevel: equippedSlot?.level ?? 20,
      catalogs,
    });
  }, [
    shouldRank,
    buildState,
    modDb,
    groupId,
    slotIndex,
    snapshot.derivedSkillLevel,
    snapshot.defences.accuracy,
    snapshot.defences.resistances.Lightning.uncapped,
    equippedSlot?.level,
    catalogs,
  ]);

  const selectedEntry = equippedSlot
    ? rankedEntries.find((r) => r.support.id === equippedSlot.supportId)
    : undefined;
  const primaryDeltaPct = selectedEntry
    ? selectedEntry.deltaFullDps !== 0
      ? selectedEntry.deltaFullDpsPct
      : selectedEntry.deltaDpsPct
    : 0;

  // Baseline comparison when currently equipped: show top candidate uplift if available
  const topCandidate = !equippedSlot ? rankedEntries[0] : undefined;
  const displayPct = equippedSlot ? primaryDeltaPct : (topCandidate?.deltaFullDpsPct ?? 0);
  const deltaClass =
    displayPct > 0.05
      ? (styles.deltaPos ?? '')
      : displayPct < -0.05
        ? (styles.deltaNeg ?? '')
        : (styles.deltaNeutral ?? '');

  return (
    <div className={`${styles.row ?? ''} ${equippedSlot && !equippedSlot.enabled ? (styles.rowDisabled ?? '') : ''}`}>
      <span className={styles.slotTag ?? ''}>S{slotIndex + 1}</span>

      <input
        type="checkbox"
        checked={equippedSlot?.enabled ?? false}
        disabled={isEmpty}
        title={isEmpty ? 'Empty Support Slot' : 'Enable / Disable Support Gem'}
        onChange={onToggleEnabled}
      />

      <select
        className={`pom-select ${styles.selectWide ?? ''}`}
        value={equippedSlot?.supportId ?? ''}
        disabled={isEmpty && !canAppendNew}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) {
            if (!isEmpty) onRemoveSlot();
          } else {
            onSelectSupport(val, equippedSlot?.level ?? 20);
          }
        }}
      >
        <option value="">
          {isEmpty
            ? canAppendNew
              ? '-- Select Support Gem (Sorted by +DPS) --'
              : '-- Fill previous support slot first --'
            : '-- Remove Support --'}
        </option>
        {rankedEntries.map((entry) => {
          const useFull = entry.deltaFullDps !== 0 || entry.baselineFullDps !== 0;
          const pct = useFull ? entry.deltaFullDpsPct : entry.deltaDpsPct;
          const dps = useFull ? entry.deltaFullDps : entry.deltaDps;
          const pctStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
          const dupTag = entry.alreadyEquippedElsewhere ? ' [Linked]' : '';
          return (
            <option
              key={entry.support.id}
              value={entry.support.id}
              disabled={entry.alreadyEquippedElsewhere}
            >
              {entry.support.name} ({pctStr} | {formatCompactDps(dps)} DPS){dupTag}
            </option>
          );
        })}
      </select>

      <input
        type="number"
        min={1}
        max={25}
        className={`pom-input ${styles.levelInput ?? ''}`}
        value={equippedSlot?.level ?? 20}
        disabled={isEmpty}
        title="Support Gem Level (1-25)"
        onChange={(e) => {
          const num = Number(e.target.value);
          if (Number.isFinite(num)) onChangeLevel(num);
        }}
      />

      <span className={`${styles.deltaCell ?? ''} ${deltaClass}`}>
        {equippedSlot
          ? equippedSlot.enabled
            ? `${selectedEntry?.support.manaMultiplierPct ?? 100}% Mana`
            : 'Disabled'
          : topCandidate
            ? `Best ${topCandidate.deltaFullDpsPct >= 0 ? '+' : ''}${topCandidate.deltaFullDpsPct.toFixed(0)}%`
            : '—'}
      </span>

      <button
        type="button"
        className={`pom-button ${styles.clearBtn ?? ''}`}
        disabled={isEmpty}
        title="Clear Support Slot"
        onClick={onRemoveSlot}
      >
        ×
      </button>
    </div>
  );
}

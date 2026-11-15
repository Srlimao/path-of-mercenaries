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

  const currentTier = equippedSlot
    ? equippedSlot.level > 3
      ? 3
      : Math.max(1, Math.min(3, Math.round(equippedSlot.level)))
    : 3;

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
      supportLevel: currentTier,
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
    currentTier,
    catalogs,
  ]);

  const selectedEntry = equippedSlot
    ? rankedEntries.find((r) => r.support.id === equippedSlot.supportId)
    : undefined;
  const selectedSupport =
    selectedEntry?.support ??
    (equippedSlot ? catalogs.supports.find((s) => s.id === equippedSlot.supportId) : undefined);
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
            const nextDef = rankedEntries.find((r) => r.support.id === val)?.support;
            const avail = nextDef?.tiersAvailable ?? [1, 2, 3];
            const nextTier = avail.includes(currentTier as 1 | 2 | 3)
              ? currentTier
              : (avail[avail.length - 1] ?? 3);
            onSelectSupport(val, nextTier);
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

      <select
        aria-label={`Support slot ${slotIndex + 1} tier`}
        className={`pom-select ${styles.levelInput ?? ''}`}
        value={currentTier}
        disabled={isEmpty}
        title={
          selectedSupport?.isGilded
            ? 'Mercenary Gilded Support (Tier III)'
            : 'Mercenary Support Tier (I–III)'
        }
        onChange={(e) => {
          const num = Number(e.target.value);
          if (Number.isFinite(num)) onChangeLevel(num);
        }}
      >
        <option
          value={1}
          disabled={Boolean(
            selectedSupport?.tiersAvailable &&
              !selectedSupport.tiersAvailable.includes(1),
          )}
        >
          Tier I (Lesser)
        </option>
        <option
          value={2}
          disabled={Boolean(
            selectedSupport?.tiersAvailable &&
              !selectedSupport.tiersAvailable.includes(2),
          )}
        >
          Tier II
        </option>
        <option value={3}>
          {selectedSupport?.isGilded ? 'Gilded III' : 'Tier III (Greater)'}
        </option>
      </select>

      <span className={`${styles.deltaCell ?? ''} ${deltaClass}`}>
        {equippedSlot ? (
          equippedSlot.enabled ? (
            selectedSupport?.isGilded ? (
              <span className="pom-badge pom-badge-gold">Gilded III</span>
            ) : (
              `Tiers: ${(selectedSupport?.tiersAvailable ?? [1, 2, 3])
                .map((t) => (t === 1 ? 'I' : t === 2 ? 'II' : 'III'))
                .join(' / ')}`
            )
          ) : (
            'Disabled'
          )
        ) : topCandidate ? (
          `Best ${topCandidate.deltaFullDpsPct >= 0 ? '+' : ''}${topCandidate.deltaFullDpsPct.toFixed(0)}%`
        ) : (
          '—'
        )}
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

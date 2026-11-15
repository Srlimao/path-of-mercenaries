import { useMemo, useState } from 'react';
import {
  computeItemSlotDiff,
  createParsedItemFromUnique,
  type EquipmentSlot,
  type ItemSlotDiff,
  type ParsedItem,
  type UniqueItemDefinition,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import { SLOT_LABELS } from './slot_display_metadata.js';
import styles from './UniquesBrowserPanel.module.css';

type CategoryFilter = 'ALL' | 'WEAPON' | 'ARMOUR' | 'JEWELLERY';

interface UniquesBrowserPanelProps {
  selectedSlot: EquipmentSlot;
  onHoverCandidate: (candidate: { slot: EquipmentSlot; item: ParsedItem } | null) => void;
  onPinCandidate?: (candidate: { slot: EquipmentSlot; item: ParsedItem }) => void;
  onEquipUnique: (slot: EquipmentSlot, item: ParsedItem) => void;
}

function matchesCategory(u: UniqueItemDefinition, category: CategoryFilter): boolean {
  if (category === 'ALL') return true;
  if (category === 'WEAPON') {
    return (
      u.validSlots.some((s) => s === 'Weapon1' || s === 'Weapon2') &&
      u.itemClass !== 'Shield'
    );
  }
  if (category === 'ARMOUR') {
    return (
      u.validSlots.some(
        (s) => s === 'Helmet' || s === 'BodyArmour' || s === 'Gloves' || s === 'Boots',
      ) || u.itemClass === 'Shield'
    );
  }
  return u.validSlots.some(
    (s) => s === 'Amulet' || s === 'Ring1' || s === 'Ring2' || s === 'Belt',
  );
}

function matchesSearch(u: UniqueItemDefinition, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (
    u.name.toLowerCase().includes(q) ||
    u.baseType.toLowerCase().includes(q) ||
    u.itemClass.toLowerCase().includes(q)
  ) {
    return true;
  }
  return [...u.implicits, ...u.explicits].some((line) => line.toLowerCase().includes(q));
}

function formatPctBadge(val: number): string {
  if (Math.abs(val) < 0.05) return '0.0%';
  return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function deltaTone(val: number): string {
  if (val > 0.05) return styles.pos ?? '';
  if (val < -0.05) return styles.neg ?? '';
  return styles.neutral ?? '';
}

export function UniquesBrowserPanel({
  selectedSlot,
  onHoverCandidate,
  onPinCandidate,
  onEquipUnique,
}: UniquesBrowserPanelProps) {
  const { buildState, snapshot, catalogs } = useMercenaryCalculator();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [mercMetaOnly, setMercMetaOnly] = useState(false);

  const visibleEntries = useMemo(() => {
    const filtered = catalogs.uniques.filter(
      (u) =>
        (!mercMetaOnly || u.isMercMeta) &&
        matchesCategory(u, category) &&
        matchesSearch(u, searchQuery),
    );

    return filtered.map((uniqueDef) => {
      const targetSlot = uniqueDef.validSlots.includes(selectedSlot)
        ? selectedSlot
        : (uniqueDef.validSlots[0] ?? 'BodyArmour');
      const parsed = createParsedItemFromUnique(uniqueDef, catalogs);
      const diff: ItemSlotDiff = computeItemSlotDiff(
        buildState,
        targetSlot,
        parsed,
        catalogs,
        snapshot,
      );
      return { uniqueDef, targetSlot, parsed, diff };
    });
  }, [catalogs, mercMetaOnly, category, searchQuery, selectedSlot, buildState, snapshot]);

  return (
    <div className={styles.wrapper} onMouseLeave={() => onHoverCandidate(null)}>
      <input
        type="search"
        className={`pom-input ${styles.searchInput}`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder='Search Uniques or mods (e.g. "Lucky", "Lightning Resistance")...'
        aria-label="Search Uniques Catalog"
      />

      <div className={styles.filterBar}>
        {(['ALL', 'WEAPON', 'ARMOUR', 'JEWELLERY'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.filterPill} ${category === cat ? styles.filterPillActive : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'ALL'
              ? 'All'
              : cat === 'WEAPON'
                ? 'Weapons'
                : cat === 'ARMOUR'
                  ? 'Armour'
                  : 'Jewellery'}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.filterPill} ${mercMetaOnly ? styles.filterPillActive : ''}`}
          onClick={() => setMercMetaOnly((prev) => !prev)}
        >
          Merc Meta
        </button>
      </div>

      <div className={styles.list}>
        {visibleEntries.map(({ uniqueDef, targetSlot, parsed, diff }) => (
          <div
            key={uniqueDef.id}
            className={styles.card}
            onMouseEnter={() => onHoverCandidate({ slot: targetSlot, item: parsed })}
          >
            <div className={styles.cardTop}>
              <div className={styles.titleWrap}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{uniqueDef.name}</span>
                  {uniqueDef.isMercMeta && (
                    <span className="pom-badge pom-badge-gold">Merc Meta</span>
                  )}
                </div>
                <span className={styles.base}>
                  {uniqueDef.baseType} · {SLOT_LABELS[targetSlot]}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className="pom-button"
                  onClick={() =>
                    onPinCandidate
                      ? onPinCandidate({ slot: targetSlot, item: parsed })
                      : onHoverCandidate({ slot: targetSlot, item: parsed })
                  }
                  title="Pin side-by-side comparison in Inspector"
                >
                  Diff
                </button>
                <button
                  type="button"
                  className="pom-button pom-button-gold"
                  onClick={() => onEquipUnique(targetSlot, parsed)}
                >
                  Equip
                </button>
              </div>
            </div>

            <div className={styles.deltaRow}>
              <span className={deltaTone(diff.deltaFullDpsPct)}>
                DPS {formatPctBadge(diff.deltaFullDpsPct)}
              </span>
              <span className={deltaTone(diff.deltaEhpPct)}>
                EHP {formatPctBadge(diff.deltaEhpPct)}
              </span>
              {diff.deltaLife !== 0 && (
                <span className={deltaTone(diff.deltaLife)}>
                  Life {diff.deltaLife > 0 ? `+${Math.round(diff.deltaLife)}` : Math.round(diff.deltaLife)}
                </span>
              )}
            </div>

            {uniqueDef.explicits.length > 0 && (
              <div className={styles.modPreview}>{uniqueDef.explicits[0]}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

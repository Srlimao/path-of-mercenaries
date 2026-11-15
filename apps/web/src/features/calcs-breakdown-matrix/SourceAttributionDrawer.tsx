import { useMemo, useState } from 'react';
import {
  inspectCalcsRowModifiers,
  type CalcBreakdownRow,
  type ModDB,
  type StatSourceAttribution,
} from '@pom/engine';
import styles from './CalcsTabView.module.css';

interface SourceAttributionDrawerProps {
  selectedRow: CalcBreakdownRow | null;
  activeSkillModDb: ModDB;
  onClearSelection: () => void;
}

export function SourceAttributionDrawer({
  selectedRow,
  activeSkillModDb,
  onClearSelection,
}: SourceAttributionDrawerProps) {
  const [filterText, setFilterText] = useState('');

  const rows = useMemo<StatSourceAttribution[]>(() => {
    const baseList = inspectCalcsRowModifiers(selectedRow, activeSkillModDb);
    const needle = filterText.trim().toLowerCase();
    if (!needle) return baseList;
    return baseList.filter(
      (item) =>
        item.sourceLabel.toLowerCase().includes(needle) ||
        item.sourceType.toLowerCase().includes(needle) ||
        item.rawLine.toLowerCase().includes(needle),
    );
  }, [selectedRow, activeSkillModDb, filterText]);

  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>
          {selectedRow
            ? `Source Attribution — ${selectedRow.label}`
            : 'Source Attribution — All Active Modifiers (Click Any Matrix Row Above to Filter)'}
        </span>
        <span className="pom-badge pom-badge-gold">{rows.length} Entries</span>
      </div>

      <div className={styles.drawerBody ?? ''}>
        <div className={styles.drawerToolbar ?? ''}>
          <input
            type="text"
            className={`pom-input ${styles.searchInput ?? ''}`}
            placeholder="Filter by source, stat name, or mod text..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="Filter modifiers"
          />
          {selectedRow && (
            <button
              type="button"
              className="pom-button"
              onClick={onClearSelection}
            >
              Show All Active Modifiers
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyMsg ?? ''}>
            No matching modifiers found for this breakdown row.
          </div>
        ) : (
          <table className="pom-table">
            <thead>
              <tr>
                <th>Source Type</th>
                <th>Source Label</th>
                <th>Mod Type</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Stat &amp; Raw Mod Line</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 150).map((entry, idx) => (
                <tr key={`${entry.sourceLabel}-${entry.rawLine}-${idx}`}>
                  <td>
                    <span className="pom-badge">{entry.sourceType}</span>
                  </td>
                  <td>{entry.sourceLabel}</td>
                  <td>
                    <span className="pom-badge pom-badge-gold">{entry.modType}</span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="tabular-nums">
                    {entry.modType === 'FLAG' ? 'TRUE' : entry.resolvedValue}
                  </td>
                  <td>{entry.rawLine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

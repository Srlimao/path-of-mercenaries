import { useMemo, useState } from 'react';
import {
  DAMAGE_TYPES,
  buildCalcsBreakdownRows,
  compileSkillGroupModDb,
  findSkillById,
  type CalcBreakdownRow,
} from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './CalcsTabView.module.css';
import { SourceAttributionDrawer } from './SourceAttributionDrawer.js';

const COL_CLASS_MAP: Record<string, string | undefined> = {
  Physical: styles.colPhys,
  Lightning: styles.colLight,
  Cold: styles.colCold,
  Fire: styles.colFire,
  Chaos: styles.colChaos,
};

function fmtNum(val: number): string {
  return Math.round(val).toLocaleString('en-US');
}

function MatrixSection({
  title,
  rows,
  selectedRowId,
  onSelectRow,
}: {
  title: string;
  rows: CalcBreakdownRow[];
  selectedRowId: string | null;
  onSelectRow: (rowId: string) => void;
}) {
  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>{title}</span>
        <span className="pom-badge">{rows.length} Stages</span>
      </div>
      <table className={`pom-table ${styles.matrixTable ?? ''}`}>
        <thead>
          <tr>
            <th>Pipeline Stage / Stat</th>
            {DAMAGE_TYPES.map((dt) => (
              <th key={dt} className={COL_CLASS_MAP[dt] ?? ''}>
                {dt}
              </th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.rowId === selectedRowId;
            return (
              <tr
                key={row.rowId}
                className={`${styles.clickableRow ?? ''} ${isSelected ? (styles.clickableRowSelected ?? '') : ''}`}
                onClick={() => onSelectRow(isSelected ? '' : row.rowId)}
                title="Click to inspect contributing ModDB modifiers"
              >
                <td className={styles.rowLabel ?? ''}>{row.label}</td>
                {DAMAGE_TYPES.map((dt) => (
                  <td key={dt}>{row.valuesByType[dt] ?? '—'}</td>
                ))}
                <td>{row.valuesByType.Total ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function CalcsTabView() {
  const { buildState, modDb, snapshot, catalogs } = useMercenaryCalculator();
  const [groupOverrideId, setGroupOverrideId] = useState<string | null>(null);
  const [partOverrideId, setPartOverrideId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const selectedGroup =
    buildState.skillGroups.find((g) => g.groupId === (groupOverrideId ?? buildState.activeSkillGroupId)) ??
    buildState.skillGroups[0];
  const selectedSkill = selectedGroup ? findSkillById(selectedGroup.skillId, catalogs) : undefined;
  const selectedPart =
    selectedSkill?.parts.find((p) => p.id === (partOverrideId ?? selectedGroup?.activePartId)) ??
    selectedSkill?.parts[0];

  const inspectedPartResult = useMemo(() => {
    if (!selectedGroup || !selectedPart) return snapshot.activePartResult;
    return (
      snapshot.skillResults.find(
        (r) => r.groupId === selectedGroup.groupId && r.partId === selectedPart.id,
      ) ?? snapshot.activePartResult
    );
  }, [snapshot, selectedGroup, selectedPart]);

  const activeSkillModDb = useMemo(() => {
    if (!selectedSkill || !selectedPart || !selectedGroup) return modDb;
    return compileSkillGroupModDb(modDb, selectedSkill, selectedPart, selectedGroup, catalogs);
  }, [modDb, selectedSkill, selectedPart, selectedGroup, catalogs]);

  const matrixRows = useMemo(
    () => buildCalcsBreakdownRows(inspectedPartResult, snapshot.defences),
    [inspectedPartResult, snapshot.defences],
  );

  const offenceRows = matrixRows.filter((r) => r.section === 'OFFENCE');
  const defenceRows = matrixRows.filter((r) => r.section === 'DEFENCE');
  const selectedRow = matrixRows.find((r) => r.rowId === selectedRowId) ?? null;

  return (
    <div className={styles.container ?? ''}>
      <div className={styles.controlsBar ?? ''}>
        <div className={styles.selectorCluster ?? ''}>
          <label className={styles.fieldLabel ?? ''}>
            <span>Skill Group</span>
            <select
              className="pom-select"
              value={selectedGroup?.groupId ?? ''}
              onChange={(e) => {
                setGroupOverrideId(e.target.value);
                setPartOverrideId(null);
              }}
            >
              {buildState.skillGroups.map((g, idx) => {
                const def = findSkillById(g.skillId, catalogs);
                return (
                  <option key={g.groupId} value={g.groupId}>
                    #{idx + 1} {def?.name ?? g.skillId}
                  </option>
                );
              })}
            </select>
          </label>

          {selectedSkill && selectedSkill.parts.length > 0 && (
            <label className={styles.fieldLabel ?? ''}>
              <span>Skill Part</span>
              <select
                className="pom-select"
                value={selectedPart?.id ?? ''}
                onChange={(e) => setPartOverrideId(e.target.value)}
              >
                {selectedSkill.parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={styles.badgeCluster ?? ''}>
          <span className="pom-badge pom-badge-gold">
            Full DPS: {fmtNum(snapshot.combinedFullDps)}
          </span>
          <span className="pom-badge">
            Part Hit DPS: {fmtNum(inspectedPartResult?.hitDps ?? 0)}
          </span>
          <span className="pom-badge">
            EHP: {fmtNum(snapshot.defences.effectiveHitPool)}
          </span>
        </div>
      </div>

      {offenceRows.length > 0 && (
        <MatrixSection
          title={`Offence Breakdown Matrix — ${selectedSkill?.name ?? 'Active Skill'} (${selectedPart?.label ?? 'Hit'})`}
          rows={offenceRows}
          selectedRowId={selectedRowId}
          onSelectRow={(id) => setSelectedRowId(id || null)}
        />
      )}

      <MatrixSection
        title="Defences Breakdown Matrix"
        rows={defenceRows}
        selectedRowId={selectedRowId}
        onSelectRow={(id) => setSelectedRowId(id || null)}
      />

      <SourceAttributionDrawer
        selectedRow={selectedRow}
        activeSkillModDb={activeSkillModDb}
        onClearSelection={() => setSelectedRowId(null)}
      />
    </div>
  );
}

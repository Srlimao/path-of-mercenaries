import { updateFullDpsPartInState, useMercenaryCalculator } from '../../state/index.js';
import styles from './FullDpsPartsTable.module.css';

function fmt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function FullDpsPartsTable() {
  const { buildState, snapshot, updateBuildState } = useMercenaryCalculator();
  const { skillResults, combinedFullDps } = snapshot;

  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>Stage 10 — Multi-Part &amp; Combined Full DPS Aggregator</span>
        <span className="pom-badge pom-badge-gold">
          Combined Full DPS: {fmt(combinedFullDps)}
        </span>
      </div>

      <table className="pom-table">
        <thead>
          <tr>
            <th>Inc.</th>
            <th>Skill &amp; Part</th>
            <th>Lv</th>
            <th style={{ textAlign: 'right' }}>Single-Part DPS</th>
            <th style={{ textAlign: 'center' }}>Count / Overlap</th>
            <th style={{ textAlign: 'right' }}>Full DPS Contrib</th>
            <th style={{ textAlign: 'right' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {skillResults.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ color: 'var(--pom-text-secondary)', textAlign: 'center' }}>
                Enable at least one Skill Group above to compute Combined Full DPS.
              </td>
            </tr>
          ) : (
            skillResults.map((res) => {
              const group = buildState.skillGroups.find((g) => g.groupId === res.groupId);
              const partEntry = group?.fullDpsParts.find((p) => p.partId === res.partId);
              const includeInFullDps = partEntry?.includeInFullDps ?? false;
              const hitCount = partEntry?.hitCountMultiplier ?? 1;
              const singlePartTotalDps = res.hitDps + res.impaleDps + res.igniteDps + res.bleedDps + res.poisonDps;
              const sharePct =
                combinedFullDps > 0 ? (res.partFullDpsContribution / combinedFullDps) * 100 : 0;

              return (
                <tr key={`${res.groupId}:${res.partId}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={includeInFullDps}
                      onChange={(e) =>
                        updateBuildState((prev) =>
                          updateFullDpsPartInState(prev, res.groupId, res.partId, {
                            includeInFullDps: e.target.checked,
                          }),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{res.skillName}</strong>{' '}
                    <span style={{ color: 'var(--pom-text-secondary)' }}>— {res.partLabel}</span>
                  </td>
                  <td className="tabular-nums">{res.effectiveSkillLevel}</td>
                  <td className={styles.numCell ?? ''}>{fmt(singlePartTotalDps)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      className={`pom-input ${styles.countInput ?? ''}`}
                      value={hitCount}
                      disabled={!includeInFullDps}
                      title="Overlap / Projectile Hit Count Multiplier (e.g. 5x Clustering Explosions)"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isFinite(val)) return;
                        updateBuildState((prev) =>
                          updateFullDpsPartInState(prev, res.groupId, res.partId, {
                            hitCountMultiplier: Math.max(0, Math.min(30, val)),
                          }),
                        );
                      }}
                    />
                  </td>
                  <td className={styles.numCell ?? ''}>
                    {includeInFullDps ? fmt(res.partFullDpsContribution) : '—'}
                  </td>
                  <td className={styles.numCell ?? ''}>
                    {includeInFullDps ? `${sharePct.toFixed(1)}%` : '0.0%'}
                  </td>
                </tr>
              );
            })
          )}
          <tr className={styles.footerRow ?? ''}>
            <td colSpan={5}>Total Combined Full DPS across all enabled Skill Parts</td>
            <td className={styles.numCell ?? ''}>{fmt(combinedFullDps)}</td>
            <td className={styles.numCell ?? ''}>{combinedFullDps > 0 ? '100.0%' : '0.0%'}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

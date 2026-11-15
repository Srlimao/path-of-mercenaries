import { useMercenaryCalculator } from '../../state/index.js';
import { ItemsTabView } from '../items-paperdoll-inspector/index.js';
import { ConfigTabView } from '../party-enemy-config/index.js';
import { SkillsTabView } from '../skills-support-planner/index.js';
import styles from './FeatureSlotPlaceholder.module.css';

export function FeatureSlotPlaceholder() {
  const { activeTab, modDb } = useMercenaryCalculator();

  if (activeTab === 'items') {
    return <ItemsTabView />;
  }

  if (activeTab === 'skills') {
    return <SkillsTabView />;
  }

  if (activeTab === 'config') {
    return <ConfigTabView />;
  }

  return (
    <div className={styles.container}>
      <section className={`pom-panel ${styles.fullSpan}`}>
        <div className="pom-panel-header">
          <span>Calcs — Live ModDB Source Attribution Table</span>
          <span className="pom-badge pom-badge-gold">{modDb.getAllMods().length} Mods Active</span>
        </div>
        <div className={styles.body}>
          <div className={styles.notice}>
            Phase 12 expands this tab into the full 6-column per-element Damage &amp; Defences
            Matrix. Currently showing live baseline entries compiled in ModDB:
          </div>
          <table className="pom-table">
            <thead>
              <tr>
                <th>Stat</th>
                <th>Type</th>
                <th>Value</th>
                <th>Source</th>
                <th>Raw Mod Line</th>
              </tr>
            </thead>
            <tbody>
              {modDb.getAllMods().map((mod, idx) => (
                <tr key={`${mod.name}-${idx}`}>
                  <td className="tabular-nums">{mod.name}</td>
                  <td>
                    <span className="pom-badge">{mod.type}</span>
                  </td>
                  <td className="tabular-nums">{String(mod.value)}</td>
                  <td>{mod.source.sourceLabel}</td>
                  <td>{mod.source.rawLine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

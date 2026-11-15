import { useMercenaryCalculator } from '../../state/index.js';
import styles from './TopActionHeader.module.css';

export function TopActionHeader() {
  const { buildState, snapshot, setBuildName, resetBuildState } = useMercenaryCalculator();

  return (
    <header className={styles.header}>
      <div className={styles.leftCluster}>
        <div className={styles.brandMark}>
          <span>PATH OF MERCENARIES</span>
          <span className={styles.brandSub}>PoM v0.1</span>
        </div>

        <input
          type="text"
          className={`pom-input ${styles.buildNameInput}`}
          value={buildState.buildName}
          onChange={(e) => setBuildName(e.target.value)}
          aria-label="Build Name"
          placeholder="Mercenary Build Name..."
        />

        <div className={styles.metaCluster}>
          <span className="pom-badge pom-badge-gold">{snapshot.archetypeName}</span>
          <span className="pom-badge">Merc Lv {snapshot.mercLevel}</span>
          <span className="pom-badge">Skill Lv {snapshot.derivedSkillLevel}</span>
        </div>
      </div>

      <div className={styles.actionsCluster}>
        <button
          type="button"
          className="pom-button"
          onClick={resetBuildState}
          title="Reset build back to Level 84 Kineticist baseline"
        >
          Reset
        </button>
        <button
          type="button"
          className="pom-button"
          disabled
          title="Cloud save via auth.dunhas.com (Phase 13)"
        >
          Save / Cloud
        </button>
        <button
          type="button"
          className="pom-button"
          disabled
          title="Share compressed URL hash (Phase 13)"
        >
          Share URL
        </button>
        <button
          type="button"
          className="pom-button"
          disabled
          title="Export desktop PoB Party XML (Phase 13)"
        >
          Export PoB XML
        </button>
        <button
          type="button"
          className="pom-button pom-button-gold"
          disabled
          title="Import Mercenary from GGG API (Phase 13)"
        >
          Import GGG
        </button>
      </div>
    </header>
  );
}

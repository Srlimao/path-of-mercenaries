import { useState } from 'react';
import { exportMercenaryAsPobParty } from '@pom/engine';
import {
  CloudBuildsModal,
  GggImportModal,
  writeBuildToWindowHash,
} from '../build-share-auth/index.js';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './TopActionHeader.module.css';

export function TopActionHeader() {
  const { buildState, snapshot, catalogs, setBuildName, resetBuildState } = useMercenaryCalculator();
  const [activeModal, setActiveModal] = useState<'cloud' | 'import' | null>(null);
  const [feedback, setFeedback] = useState<'url' | 'pob' | null>(null);

  const flashFeedback = (kind: 'url' | 'pob') => {
    setFeedback(kind);
    window.setTimeout(() => setFeedback((cur) => (cur === kind ? null : cur)), 2000);
  };

  const handleShareUrl = async () => {
    const shareUrl = writeBuildToWindowHash(buildState);
    await navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    flashFeedback('url');
  };

  const handleExportPob = async (copyXml: boolean) => {
    const exported = exportMercenaryAsPobParty(buildState, snapshot, catalogs);
    const payload = copyXml ? exported.xml : exported.pobPartyCode;
    await navigator.clipboard?.writeText(payload).catch(() => undefined);
    flashFeedback('pob');
  };

  return (
    <>
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
            onClick={() => setActiveModal('cloud')}
            title="Save or load builds via auth.dunhas.com Cloud D1 or local browser storage"
          >
            Save / Cloud
          </button>
          <button
            type="button"
            className="pom-button"
            onClick={() => void handleShareUrl()}
            title="Encode current build into #b= URL fragment and copy to clipboard"
          >
            {feedback === 'url' ? 'Copied URL!' : 'Share URL'}
          </button>
          <button
            type="button"
            className="pom-button"
            onClick={(e) => void handleExportPob(e.shiftKey)}
            title="Copy PoB Party import code to clipboard (Shift+Click for raw XML)"
          >
            {feedback === 'pob' ? 'Copied PoB!' : 'Export PoB XML'}
          </button>
          <button
            type="button"
            className="pom-button pom-button-gold"
            onClick={() => setActiveModal('import')}
            title="Import Mercenary from GGG API, curated 3.26 presets, or #b= share code"
          >
            Import GGG
          </button>
        </div>
      </header>

      {activeModal === 'cloud' && <CloudBuildsModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'import' && <GggImportModal onClose={() => setActiveModal(null)} />}
    </>
  );
}

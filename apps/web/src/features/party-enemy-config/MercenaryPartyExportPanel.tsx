import { useMemo, useState } from 'react';
import { exportMercenaryAsPobParty } from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './MercenaryPartyExportPanel.module.css';

export function MercenaryPartyExportPanel() {
  const { buildState, snapshot, catalogs } = useMercenaryCalculator();
  const [copiedMode, setCopiedMode] = useState<'code' | 'text' | null>(null);

  const exported = useMemo(
    () => exportMercenaryAsPobParty(buildState, snapshot, catalogs),
    [buildState, snapshot, catalogs],
  );

  const handleCopy = async (content: string, mode: 'code' | 'text') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMode(mode);
      window.setTimeout(() => setCopiedMode(null), 1800);
    } catch {
      setCopiedMode(null);
    }
  };

  const totalOutboundCount =
    exported.partyMemberStatsLines.length +
    exported.auraLines.length +
    exported.curseLines.length +
    exported.enemyModLines.length;

  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>Mercenary as Aurabot → Export to Player&apos;s PoB &lt;Party&gt; Tab</span>
        <span className="pom-badge pom-badge-gold">{totalOutboundCount} Active Buffs</span>
      </div>

      <div className={styles.body ?? ''}>
        <div className={styles.desc ?? ''}>
          Compiles equipped Mercenary support uniques (<em>Kingmaker</em>,{' '}
          <em>Perquil&apos;s Toe</em>, <em>Doryani&apos;s Prototype</em>,{' '}
          <em>Crown of the Tyrant</em>, <em>Leer Cast</em>, <em>Dying Breath</em>,{' '}
          <em>Garb of the Ephemeral</em>) plus Mercenary Auras/Curses into a PoB{' '}
          <code>&lt;Party&gt;</code> import payload.
        </div>

        <div className={styles.bucketList ?? ''}>
          <div className={styles.bucketBox ?? ''}>
            <div className={styles.bucketTitle ?? ''}>
              Party Member Stats ({exported.partyMemberStatsLines.length})
            </div>
            {exported.partyMemberStatsLines.length === 0 ? (
              <div style={{ color: 'var(--pom-text-secondary)' }}>None detected from gear.</div>
            ) : (
              exported.partyMemberStatsLines.map((line, i) => (
                <div key={i} className={styles.lineItem ?? ''}>
                  • {line}
                </div>
              ))
            )}
          </div>

          <div className={styles.bucketBox ?? ''}>
            <div className={styles.bucketTitle ?? ''}>
              Mercenary Auras &amp; Curses ({exported.auraLines.length + exported.curseLines.length})
            </div>
            {exported.auraLines.length + exported.curseLines.length === 0 ? (
              <div style={{ color: 'var(--pom-text-secondary)' }}>None enabled in Skills.</div>
            ) : (
              [...exported.auraLines, ...exported.curseLines].map((line, i) => (
                <div key={i} className={styles.lineItem ?? ''}>
                  • {line}
                </div>
              ))
            )}
          </div>

          <div className={styles.bucketBox ?? ''}>
            <div className={styles.bucketTitle ?? ''}>
              Enemy Overrides ({exported.enemyModLines.length})
            </div>
            {exported.enemyModLines.length === 0 ? (
              <div style={{ color: 'var(--pom-text-secondary)' }}>None detected from gear.</div>
            ) : (
              exported.enemyModLines.map((line, i) => (
                <div key={i} className={styles.lineItem ?? ''}>
                  • {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.actionsRow ?? ''}>
          <button
            type="button"
            className="pom-button pom-button-gold"
            onClick={() => void handleCopy(exported.pobPartyCode, 'code')}
          >
            {copiedMode === 'code' ? 'Copied PoB Code!' : 'Copy PoB <Party> Import Code'}
          </button>
          <button
            type="button"
            className="pom-button"
            onClick={() => void handleCopy(exported.plainTextSummary, 'text')}
          >
            {copiedMode === 'text' ? 'Copied Text!' : 'Copy Plain-Text Buff Summary'}
          </button>
        </div>

        <textarea
          readOnly
          className={`pom-input ${styles.codePreview ?? ''}`}
          value={exported.pobPartyCode}
          aria-label="Encoded PoB Party Import Code"
        />
      </div>
    </section>
  );
}

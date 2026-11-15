import { computeFlameLinkAddedFire } from '@pom/engine';
import {
  updateDestructiveLinkInState,
  updateFlameLinkInState,
  updateIntuitiveLinkInState,
  useMercenaryCalculator,
} from '../../state/index.js';
import { PlayerAurasSection } from './PlayerAurasSection.js';
import styles from './PlayerLinksAndAurasPanel.module.css';

export function PlayerLinksAndAurasPanel() {
  const { buildState, updateBuildState } = useMercenaryCalculator();
  const { partyConfig } = buildState;
  const { flameLink, destructiveLink, intuitiveLink } = partyConfig.links;

  const flameFire = computeFlameLinkAddedFire(
    flameLink.gemLevel,
    flameLink.playerMaxLife,
    flameLink.linkEffectPct,
  );
  const auraMultiPct =
    100 + partyConfig.globalPlayerAuraEffectPct + (partyConfig.generositySupported ? 39 : 0);

  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>Player-Given Buffs (Luminary / Support Player → Carry Mercenary)</span>
        <span className="pom-badge pom-badge-gold">Aura Mult {auraMultiPct}%</span>
      </div>

      <div className={styles.body ?? ''}>
        <div className={styles.sectionGrid ?? ''}>
          {/* Flame Link */}
          <div className={styles.linkCard ?? ''}>
            <div className={styles.linkHeader ?? ''}>
              <label className={styles.checkLabel ?? ''}>
                <input
                  type="checkbox"
                  checked={flameLink.enabled}
                  onChange={(e) =>
                    updateBuildState((p) => updateFlameLinkInState(p, { enabled: e.target.checked }))
                  }
                />
                <span>Flame Link</span>
              </label>
              <span className="pom-badge">
                +{flameFire.min} to {flameFire.max} Attack Fire
              </span>
            </div>
            <div className={styles.fieldRow ?? ''}>
              <label className={styles.fieldItem ?? ''}>
                <span>Player Max Life</span>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={250}
                  className="pom-input"
                  value={flameLink.playerMaxLife}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateFlameLinkInState(p, { playerMaxLife: Number(e.target.value) || 0 }),
                    )
                  }
                />
              </label>
              <label className={styles.fieldItem ?? ''}>
                <span>Link Gem Lv (1-30)</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="pom-input"
                  value={flameLink.gemLevel}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateFlameLinkInState(p, { gemLevel: Number(e.target.value) || 20 }),
                    )
                  }
                />
              </label>
              <label className={styles.fieldItem ?? ''}>
                <span>Link Effect %</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  className="pom-input"
                  value={flameLink.linkEffectPct}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateFlameLinkInState(p, { linkEffectPct: Number(e.target.value) || 0 }),
                    )
                  }
                />
              </label>
            </div>
          </div>

          {/* Destructive Link */}
          <div className={styles.linkCard ?? ''}>
            <div className={styles.linkHeader ?? ''}>
              <label className={styles.checkLabel ?? ''}>
                <input
                  type="checkbox"
                  checked={destructiveLink.enabled}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateDestructiveLinkInState(p, { enabled: e.target.checked }),
                    )
                  }
                />
                <span>Destructive Link</span>
              </label>
              <span className="pom-badge">
                Base Crit Override {destructiveLink.playerMainHandCritPct.toFixed(1)}%
              </span>
            </div>
            <div className={styles.fieldRow ?? ''}>
              <label className={styles.fieldItem ?? ''}>
                <span>Player Main-Hand Crit %</span>
                <input
                  type="number"
                  min={1}
                  max={25}
                  step={0.1}
                  className="pom-input"
                  value={destructiveLink.playerMainHandCritPct}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateDestructiveLinkInState(p, {
                        playerMainHandCritPct: Number(e.target.value) || 5,
                      }),
                    )
                  }
                />
              </label>
              <label className={styles.fieldItem ?? ''}>
                <span>Link Gem Lv</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="pom-input"
                  value={destructiveLink.gemLevel}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateDestructiveLinkInState(p, { gemLevel: Number(e.target.value) || 20 }),
                    )
                  }
                />
              </label>
            </div>
          </div>

          {/* Intuitive Link */}
          <div className={styles.linkCard ?? ''}>
            <div className={styles.linkHeader ?? ''}>
              <label className={styles.checkLabel ?? ''}>
                <input
                  type="checkbox"
                  checked={intuitiveLink.enabled}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateIntuitiveLinkInState(p, { enabled: e.target.checked }),
                    )
                  }
                />
                <span>Intuitive Link (Player Block Sharing)</span>
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--pom-text-secondary)' }}>Atk %</span>
                <input
                  type="number"
                  min={0}
                  max={75}
                  className={`pom-input ${styles.lvInput ?? ''}`}
                  value={intuitiveLink.blockPct}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateIntuitiveLinkInState(p, { blockPct: Number(e.target.value) || 0 }),
                    )
                  }
                />
                <span style={{ fontSize: 11, color: 'var(--pom-text-secondary)' }}>Spl %</span>
                <input
                  type="number"
                  min={0}
                  max={75}
                  className={`pom-input ${styles.lvInput ?? ''}`}
                  value={intuitiveLink.spellBlockPct}
                  onChange={(e) =>
                    updateBuildState((p) =>
                      updateIntuitiveLinkInState(p, { spellBlockPct: Number(e.target.value) || 0 }),
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <PlayerAurasSection />
      </div>
    </section>
  );
}

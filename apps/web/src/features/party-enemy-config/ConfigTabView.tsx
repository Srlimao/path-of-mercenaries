import { CombatConditionsAndCustomModsPanel } from './CombatConditionsAndCustomModsPanel.js';
import { EnemyBossConfigPanel } from './EnemyBossConfigPanel.js';
import { MercenaryPartyExportPanel } from './MercenaryPartyExportPanel.js';
import { PlayerLinksAndAurasPanel } from './PlayerLinksAndAurasPanel.js';
import styles from './ConfigTabView.module.css';

/**
 * Config tab workspace combining:
 * - Left column: Player-Given Buffs (Luminary / Support Player -> Carry Mercenary),
 *   Combat Conditions, Charges, and Custom Modifier overrides.
 * - Right column: Enemy Boss Presets & Stages 7-8 Mitigation Math, plus
 *   Mercenary-as-Aurabot -> Player PoB <Party> Exporter.
 */
export function ConfigTabView() {
  return (
    <div className={styles.container ?? ''}>
      <div className={styles.banner ?? ''}>
        <span className={styles.bannerTitle ?? ''}>
          Config &amp; Party Co-op Planner — Player Buffs, Enemy Mitigation &amp; PoB Export
        </span>
        <div className={styles.bannerSummary ?? ''}>
          <span className="pom-badge pom-badge-gold">Playstyle A: Luminary → Carry</span>
          <span className="pom-badge">Playstyle B: Merc Aurabot → PoB &lt;Party&gt;</span>
        </div>
      </div>

      <div className={styles.grid ?? ''}>
        <div className={styles.column ?? ''}>
          <PlayerLinksAndAurasPanel />
          <CombatConditionsAndCustomModsPanel />
        </div>

        <div className={styles.column ?? ''}>
          <EnemyBossConfigPanel />
          <MercenaryPartyExportPanel />
        </div>
      </div>
    </div>
  );
}

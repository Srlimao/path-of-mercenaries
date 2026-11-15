import { EQUIPMENT_SLOTS } from '@pom/engine';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './FeatureSlotPlaceholder.module.css';

export function FeatureSlotPlaceholder() {
  const { activeTab, buildState, catalogs, activeSkillDef, modDb, snapshot } =
    useMercenaryCalculator();

  if (activeTab === 'items') {
    return (
      <div className={styles.container}>
        <section className="pom-panel">
          <div className="pom-panel-header">
            <span>Equipment Paperdoll (10 Slots)</span>
            <span className="pom-badge">Phase 4 Slot</span>
          </div>
          <div className={styles.body}>
            <div className={styles.notice}>
              Ready for Slice 2 &amp; 3: PoE Ctrl+V item pasting, Stage 1 local weapon DPS,
              in-place roll editor, and live hover +DPS / +EHP diffs.
            </div>
            <div className={styles.slotGrid}>
              {EQUIPMENT_SLOTS.map((slot) => {
                const item = buildState.equippedItems[slot];
                return (
                  <div key={slot} className={styles.slotItem}>
                    <span className={styles.slotName}>{slot}</span>
                    <span className={item ? '' : styles.slotEmpty}>
                      {item ? item.name : '(Empty)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pom-panel">
          <div className="pom-panel-header">
            <span>Seed Uniques &amp; Base Catalogs</span>
            <span className="pom-badge pom-badge-gold">{catalogs.uniques.length} Uniques</span>
          </div>
          <div className={styles.body}>
            <div className={styles.notice}>
              Loaded {catalogs.uniques.length} signature Mercenary Uniques and{' '}
              {catalogs.baseItems.length} Base Items from @pom/engine seed catalog.
            </div>
            <div className={styles.slotGrid}>
              {catalogs.uniques.slice(0, 8).map((u) => (
                <div key={u.id} className={styles.slotItem}>
                  <span style={{ color: 'var(--poe-unique)', fontWeight: 600 }}>{u.name}</span>
                  <span className="pom-badge">{u.itemClass}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (activeTab === 'skills') {
    return (
      <div className={styles.container}>
        <section className={`pom-panel ${styles.fullSpan}`}>
          <div className="pom-panel-header">
            <span>Mercenary Skill Groups &amp; Support +DPS Sorter</span>
            <span className="pom-badge">Phase 6–7 Slot</span>
          </div>
          <div className={styles.body}>
            <div className={styles.notice}>
              Active Skill: <strong>{activeSkillDef?.name ?? 'None'}</strong> (Skill Level{' '}
              {snapshot.derivedSkillLevel}). Ready for Support Gem +DPS ranking and multi-part
              Combined Full DPS multipliers.
            </div>
            {(activeSkillDef?.parts ?? []).map((part) => (
              <div key={part.id} className={styles.slotItem}>
                <span>{part.label}</span>
                <span className="pom-badge">
                  Eff {(part.damageEffectiveness * 100).toFixed(0)}% | Default{' '}
                  {part.defaultFullDpsCount}x
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (activeTab === 'config') {
    return (
      <div className={styles.container}>
        <section className={`pom-panel ${styles.fullSpan}`}>
          <div className="pom-panel-header">
            <span>Party Links, Aurabot Scaling &amp; Enemy Presets</span>
            <span className="pom-badge">Phase 8–9 Slot</span>
          </div>
          <div className={styles.body}>
            <div className={styles.notice}>
              Enemy Preset: <strong>{buildState.enemyConfig.presetId}</strong> (Level{' '}
              {buildState.enemyConfig.level}) | Player Aura Effect:{' '}
              {buildState.partyConfig.globalPlayerAuraEffectPct}%. Ready for Flame Link,
              Destructive Link, Auras, Curses, and Custom Modifiers.
            </div>
          </div>
        </section>
      </div>
    );
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

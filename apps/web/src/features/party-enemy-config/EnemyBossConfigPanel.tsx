import {
  CURSE_CATALOG,
  ENEMY_BOSS_PRESETS,
  type EnemyPresetId,
} from '@pom/engine';
import {
  applyEnemyBossPresetInState,
  setEnemyExposureInState,
  toggleEnemyCurseInState,
  updateEnemyConfigInState,
  useMercenaryCalculator,
} from '../../state/index.js';
import styles from './EnemyBossConfigPanel.module.css';

export function EnemyBossConfigPanel() {
  const { buildState, updateBuildState } = useMercenaryCalculator();
  const enemy = buildState.enemyConfig;

  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>Stages 7–8 — Enemy Boss Preset, Curses &amp; Mitigation</span>
        <span className="pom-badge pom-badge-gold">
          {ENEMY_BOSS_PRESETS[enemy.presetId]?.label ?? enemy.presetId}
        </span>
      </div>

      <div className={styles.body ?? ''}>
        <div className={styles.statsGrid ?? ''}>
          <label className={styles.fieldItem ?? ''} style={{ gridColumn: 'span 2' }}>
            <span>Enemy Target Preset</span>
            <select
              className="pom-select"
              value={enemy.presetId}
              onChange={(e) =>
                updateBuildState((p) =>
                  applyEnemyBossPresetInState(p, e.target.value as EnemyPresetId),
                )
              }
            >
              {Object.values(ENEMY_BOSS_PRESETS).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldItem ?? ''}>
            <span>Enemy Armour</span>
            <input
              type="number"
              min={0}
              step={1000}
              className="pom-input"
              value={enemy.armour}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, { armour: Math.max(0, Number(e.target.value) || 0) }),
                )
              }
            />
          </label>

          <label className={styles.fieldItem ?? ''}>
            <span>Enemy Evasion</span>
            <input
              type="number"
              min={0}
              step={500}
              className="pom-input"
              value={enemy.evasion}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, { evasion: Math.max(0, Number(e.target.value) || 0) }),
                )
              }
            />
          </label>

          <label className={styles.fieldItem ?? ''}>
            <span>Phys Hit Size (PDR)</span>
            <input
              type="number"
              min={100}
              step={250}
              className="pom-input"
              value={enemy.physicalHitSize}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, {
                    physicalHitSize: Math.max(100, Number(e.target.value) || 3500),
                  }),
                )
              }
            />
          </label>

          <label className={styles.fieldItem ?? ''}>
            <span>Curse Effect %</span>
            <input
              type="number"
              min={0}
              max={200}
              className="pom-input"
              value={enemy.curseEffectPct}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, { curseEffectPct: Number(e.target.value) || 0 }),
                )
              }
            />
          </label>
        </div>

        {/* Base Resistances & Exposures */}
        <div className={styles.statsGrid ?? ''}>
          {(['Fire', 'Cold', 'Lightning', 'Chaos'] as const).map((dt) => (
            <label key={dt} className={styles.fieldItem ?? ''}>
              <span>Base {dt} Res %</span>
              <input
                type="number"
                className="pom-input"
                value={enemy.baseResistsPct[dt]}
                onChange={(e) =>
                  updateBuildState((p) =>
                    updateEnemyConfigInState(p, {
                      baseResistsPct: {
                        ...p.enemyConfig.baseResistsPct,
                        [dt]: Number(e.target.value) || 0,
                      },
                    }),
                  )
                }
              />
            </label>
          ))}
          {(['Fire', 'Cold', 'Lightning'] as const).map((dt) => (
            <label key={`exp-${dt}`} className={styles.fieldItem ?? ''}>
              <span>{dt} Exposure %</span>
              <input
                type="number"
                min={0}
                max={50}
                className="pom-input"
                value={enemy.exposurePct[dt] ?? 0}
                onChange={(e) =>
                  updateBuildState((p) =>
                    setEnemyExposureInState(p, dt, Number(e.target.value) || 0),
                  )
                }
              />
            </label>
          ))}
        </div>

        {/* Debuffs: Shock, Scorch, Brittle, Wither */}
        <div className={styles.statsGrid ?? ''}>
          <label className={styles.fieldItem ?? ''}>
            <span>Shock % (0-50)</span>
            <input
              type="number"
              min={0}
              max={60}
              className="pom-input"
              value={enemy.shockPct}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, {
                    shockPct: Math.max(0, Math.min(60, Number(e.target.value) || 0)),
                  }),
                )
              }
            />
          </label>
          <label className={styles.fieldItem ?? ''}>
            <span>Scorch % (0-30)</span>
            <input
              type="number"
              min={0}
              max={30}
              className="pom-input"
              value={enemy.scorchPct}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, {
                    scorchPct: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                  }),
                )
              }
            />
          </label>
          <label className={styles.fieldItem ?? ''}>
            <span>Brittle % (0-6)</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              className="pom-input"
              value={enemy.brittlePct}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, {
                    brittlePct: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                  }),
                )
              }
            />
          </label>
          <label className={styles.fieldItem ?? ''}>
            <span>Withered Stacks (0-15)</span>
            <input
              type="number"
              min={0}
              max={15}
              className="pom-input"
              value={enemy.witherStacks}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateEnemyConfigInState(p, {
                    witherStacks: Math.max(0, Math.min(15, Number(e.target.value) || 0)),
                  }),
                )
              }
            />
          </label>
        </div>

        {/* Curses & Marks */}
        <div className={styles.chipsGrid ?? ''}>
          {CURSE_CATALOG.map((curse) => {
            const active = enemy.activeCurses.includes(curse.id);
            return (
              <label key={curse.id} className={styles.checkChip ?? ''} title={curse.summary}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    updateBuildState((p) => toggleEnemyCurseInState(p, curse.id))
                  }
                />
                <span>{curse.name}</span>
              </label>
            );
          })}
        </div>

        {/* Binary Debuff Flags */}
        <div className={styles.chipsGrid ?? ''}>
          {(
            [
              ['isIntimidated', 'Intimidated (+10% Atk Taken)'],
              ['isUnnerved', 'Unnerved (+10% Spell Taken)'],
              ['isCoveredInAsh', 'Covered in Ash (+20% Fire)'],
              ['isChilled', 'Enemy is Chilled'],
              ['isFrozen', 'Enemy is Frozen'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={styles.checkChip ?? ''}>
              <input
                type="checkbox"
                checked={enemy[key]}
                onChange={(e) =>
                  updateBuildState((p) => updateEnemyConfigInState(p, { [key]: e.target.checked }))
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

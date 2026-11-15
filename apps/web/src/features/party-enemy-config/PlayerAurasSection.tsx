import { PLAYER_AURA_CATALOG } from '@pom/engine';
import {
  setGenerositySupportedInState,
  setGlobalAuraEffectInState,
  setPlayerAuraLevelInState,
  setPyroclastMineCountInState,
  setSmiteEnabledInState,
  togglePlayerAuraInState,
  useMercenaryCalculator,
} from '../../state/index.js';
import styles from './PlayerLinksAndAurasPanel.module.css';

export function PlayerAurasSection() {
  const { buildState, updateBuildState } = useMercenaryCalculator();
  const { partyConfig } = buildState;

  return (
    <>
      {/* Global Aura Effect, Generosity, Smite, Pyroclast Mines */}
      <div className={styles.sliderRow ?? ''}>
        <label className={styles.fieldItem ?? ''} style={{ flex: '1 1 180px' }}>
          <span>Player Aura Effect: {partyConfig.globalPlayerAuraEffectPct}%</span>
          <input
            type="range"
            min={0}
            max={300}
            step={5}
            value={partyConfig.globalPlayerAuraEffectPct}
            onChange={(e) =>
              updateBuildState((p) => setGlobalAuraEffectInState(p, Number(e.target.value)))
            }
          />
        </label>
        <label className={styles.checkLabel ?? ''}>
          <input
            type="checkbox"
            checked={partyConfig.generositySupported}
            onChange={(e) =>
              updateBuildState((p) => setGenerositySupportedInState(p, e.target.checked))
            }
          />
          <span>Generosity (+39%)</span>
        </label>
        <label className={styles.checkLabel ?? ''}>
          <input
            type="checkbox"
            checked={partyConfig.smiteEnabled}
            onChange={(e) => updateBuildState((p) => setSmiteEnabledInState(p, e.target.checked))}
          />
          <span>Smite</span>
        </label>
        <label className={styles.fieldItem ?? ''}>
          <span>Pyroclast Mines (0-25)</span>
          <input
            type="number"
            min={0}
            max={25}
            className={`pom-input ${styles.lvInput ?? ''}`}
            value={partyConfig.pyroclastMineCount}
            onChange={(e) =>
              updateBuildState((p) =>
                setPyroclastMineCountInState(p, Number(e.target.value) || 0),
              )
            }
          />
        </label>
      </div>

      {/* Player Auras Grid */}
      <div className={styles.auraGrid ?? ''}>
        {PLAYER_AURA_CATALOG.map((aura) => {
          const stateEntry = partyConfig.auras[aura.id];
          const isOn = stateEntry?.enabled ?? false;
          const lv = stateEntry?.level ?? aura.defaultLevel;
          return (
            <div key={aura.id} className={styles.auraRow ?? ''} title={aura.summary}>
              <label className={styles.checkLabel ?? ''} style={{ fontWeight: isOn ? 600 : 400 }}>
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() =>
                    updateBuildState((p) =>
                      togglePlayerAuraInState(p, aura.id, aura.defaultLevel),
                    )
                  }
                />
                <span>{aura.name}</span>
              </label>
              <input
                type="number"
                min={1}
                max={35}
                disabled={!isOn}
                className={`pom-input ${styles.lvInput ?? ''}`}
                value={lv}
                onChange={(e) =>
                  updateBuildState((p) =>
                    setPlayerAuraLevelInState(p, aura.id, Number(e.target.value) || 21),
                  )
                }
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

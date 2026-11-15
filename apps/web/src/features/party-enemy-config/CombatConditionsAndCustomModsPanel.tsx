import { parseModLineToMods } from '@pom/engine';
import {
  setCustomModifierLinesTextInState,
  updateCombatConditionsInState,
  useMercenaryCalculator,
} from '../../state/index.js';
import styles from './CombatConditionsAndCustomModsPanel.module.css';

export function CombatConditionsAndCustomModsPanel() {
  const { buildState, updateBuildState } = useMercenaryCalculator();
  const { combatConditions, customModifierLines } = buildState.partyConfig;
  const hasRalakesh = buildState.equippedItems.Boots?.uniqueId === 'ralakeshs_impatience';

  const unrecognizedCount = customModifierLines.filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) return false;
    return (
      parseModLineToMods(t, {
        sourceType: 'Config',
        sourceId: 'custom_preview',
        sourceLabel: 'Custom',
        rawLine: t,
      }).length === 0
    );
  }).length;

  return (
    <section className="pom-panel">
      <div className="pom-panel-header">
        <span>Mercenary Combat Conditions &amp; Custom Modifiers</span>
        {hasRalakesh && (
          <span className="pom-badge pom-badge-gold">Ralakesh Floor (3 Charges)</span>
        )}
      </div>

      <div className={styles.body ?? ''}>
        <div className={styles.chargesGrid ?? ''}>
          <label className={styles.fieldItem ?? ''}>
            <span>Power Charges</span>
            <input
              type="number"
              min={0}
              max={10}
              className="pom-input"
              value={combatConditions.powerCharges}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, { powerCharges: Math.max(0, Number(e.target.value) || 0) }),
                )
              }
            />
          </label>
          <label className={styles.fieldItem ?? ''}>
            <span>Frenzy Charges</span>
            <input
              type="number"
              min={0}
              max={10}
              className="pom-input"
              value={combatConditions.frenzyCharges}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, { frenzyCharges: Math.max(0, Number(e.target.value) || 0) }),
                )
              }
            />
          </label>
          <label className={styles.fieldItem ?? ''}>
            <span>Endurance Charges</span>
            <input
              type="number"
              min={0}
              max={10}
              className="pom-input"
              value={combatConditions.enduranceCharges}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, { enduranceCharges: Math.max(0, Number(e.target.value) || 0) }),
                )
              }
            />
          </label>
          <label className={styles.fieldItem ?? ''}>
            <span>Crown Socket Color</span>
            <select
              className="pom-select"
              value={combatConditions.crownSocketColor ?? 'Red'}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, {
                    crownSocketColor: e.target.value as 'Red' | 'Green' | 'Blue' | 'White',
                  }),
                )
              }
            >
              <option value="Red">Red (+64-96 Fire)</option>
              <option value="Green">Green (+56-88 Cold)</option>
              <option value="Blue">Blue (+13-144 Light)</option>
              <option value="White">White (+47-61 Chaos)</option>
            </select>
          </label>
        </div>

        <div className={styles.toggleRow ?? ''}>
          <label className={styles.checkLabel ?? ''}>
            <input
              type="checkbox"
              checked={combatConditions.onslaught}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, { onslaught: e.target.checked }),
                )
              }
            />
            <span>Onslaught (20% Speed)</span>
          </label>
          <label className={styles.checkLabel ?? ''}>
            <input
              type="checkbox"
              checked={combatConditions.tailwind}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, { tailwind: e.target.checked }),
                )
              }
            />
            <span>Tailwind (8% More Action Speed)</span>
          </label>
          <label className={styles.checkLabel ?? ''}>
            <input
              type="checkbox"
              checked={combatConditions.adrenaline}
              onChange={(e) =>
                updateBuildState((p) =>
                  updateCombatConditionsInState(p, { adrenaline: e.target.checked }),
                )
              }
            />
            <span>Adrenaline (100% Inc Dmg / 25% Spd)</span>
          </label>
        </div>

        <label className={styles.fieldItem ?? ''}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Custom Modifiers (PoE / PoB line-per-line syntax)</span>
            <span
              className="pom-badge"
              style={{ color: unrecognizedCount > 0 ? '#f87171' : '#4ade80' }}
            >
              {unrecognizedCount > 0 ? `${unrecognizedCount} Unrecognized` : 'All Parsed'}
            </span>
          </div>
          <textarea
            className={`pom-input ${styles.customArea ?? ''}`}
            placeholder={'Example:\n50% increased Elemental Damage\n+200 to Accuracy Rating\nDamage Penetrates 10% Lightning Resistance'}
            value={customModifierLines.join('\n')}
            onChange={(e) =>
              updateBuildState((p) => setCustomModifierLinesTextInState(p, e.target.value))
            }
          />
        </label>
      </div>
    </section>
  );
}

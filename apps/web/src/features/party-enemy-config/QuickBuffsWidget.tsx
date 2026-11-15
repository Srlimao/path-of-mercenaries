import {
  setSmiteEnabledInState,
  updateCombatConditionsInState,
  updateFlameLinkInState,
  useMercenaryCalculator,
} from '../../state/index.js';

export function QuickBuffsWidget() {
  const { buildState, updateBuildState } = useMercenaryCalculator();
  const { links, smiteEnabled, combatConditions } = buildState.partyConfig;

  return (
    <fieldset className="pom-fieldset">
      <legend>Quick Player &amp; Buff Toggles</legend>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 6px', fontSize: 11 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={links.flameLink.enabled}
            onChange={(e) =>
              updateBuildState((p) => updateFlameLinkInState(p, { enabled: e.target.checked }))
            }
          />
          <span>Flame Link</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={smiteEnabled}
            onChange={(e) =>
              updateBuildState((p) => setSmiteEnabledInState(p, e.target.checked))
            }
          />
          <span>Smite Aura</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={combatConditions.onslaught}
            onChange={(e) =>
              updateBuildState((p) =>
                updateCombatConditionsInState(p, { onslaught: e.target.checked }),
              )
            }
          />
          <span>Onslaught</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={combatConditions.tailwind}
            onChange={(e) =>
              updateBuildState((p) =>
                updateCombatConditionsInState(p, { tailwind: e.target.checked }),
              )
            }
          />
          <span>Tailwind</span>
        </label>
      </div>
    </fieldset>
  );
}

import { useMercenaryCalculator } from '../../state/index.js';

export function MercLevelControl() {
  const { buildState, snapshot, setMercLevel } = useMercenaryCalculator();
  const hiddenRes = snapshot.defences.resistances.Fire.hiddenBaselinePct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--pom-text-secondary)' }}>Merc Level (1–85)</span>
        <div style={{ display: 'flex', gap: 3 }}>
          <button
            type="button"
            className="pom-button"
            style={{ height: 18, padding: '0 5px', fontSize: 10 }}
            onClick={() => setMercLevel(buildState.mercLevel - 1)}
          >
            -1
          </button>
          <button
            type="button"
            className="pom-button"
            style={{ height: 18, padding: '0 5px', fontSize: 10 }}
            onClick={() => setMercLevel(buildState.mercLevel + 1)}
          >
            +1
          </button>
          <button
            type="button"
            className="pom-button"
            style={{ height: 18, padding: '0 5px', fontSize: 10 }}
            onClick={() => setMercLevel(84)}
          >
            84
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, alignItems: 'center' }}>
        <input
          type="number"
          min={1}
          max={85}
          className="pom-input tabular-nums"
          value={buildState.mercLevel}
          onChange={(e) => setMercLevel(Number(e.target.value))}
          aria-label="Mercenary Level"
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span className="pom-badge pom-badge-gold">Skill Lv {snapshot.derivedSkillLevel}</span>
          <span className="pom-badge" title="Hidden Mercenary Elemental Resistance baseline">
            +{hiddenRes}% Res
          </span>
        </div>
      </div>
    </div>
  );
}

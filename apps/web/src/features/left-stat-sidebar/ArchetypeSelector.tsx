import { useMercenaryCalculator } from '../../state/index.js';

export function ArchetypeSelector() {
  const { buildState, catalogs, activeArchetype, setArchetypeId } = useMercenaryCalculator();
  const standardArchetypes = catalogs.archetypes.filter((a) => !a.isInfamous);
  const infamousArchetypes = catalogs.archetypes.filter((a) => a.isInfamous);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontSize: 11,
          color: 'var(--pom-text-secondary)',
        }}
      >
        <span>Archetype</span>
        <select
          className="pom-select"
          value={buildState.archetypeId}
          onChange={(e) => setArchetypeId(e.target.value)}
        >
          <optgroup label="Standard Mercenaries">
            {standardArchetypes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.attributeAffinity})
              </option>
            ))}
          </optgroup>
          <optgroup label="Infamous Mercenaries">
            {infamousArchetypes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.attributeAffinity})
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {activeArchetype && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span className="pom-badge pom-badge-gold">{activeArchetype.attributeAffinity}</span>
          <span className="pom-badge" title="Allowed Main-Hand Weapon Classes">
            MH: {activeArchetype.allowedMainHandClasses[0]}
            {activeArchetype.allowedMainHandClasses.length > 1
              ? ` +${activeArchetype.allowedMainHandClasses.length - 1}`
              : ''}
          </span>
          {activeArchetype.canDualWield && <span className="pom-badge">Dual Wield</span>}
        </div>
      )}
    </div>
  );
}

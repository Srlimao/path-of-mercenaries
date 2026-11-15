import { useMercenaryCalculator } from '../../state/index.js';
import styles from './LeftStatSidebar.module.css';

function formatNum(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function formatDps(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  return Math.round(value).toLocaleString('en-US');
}

export function LeftStatSidebar() {
  const {
    buildState,
    snapshot,
    catalogs,
    activeArchetype,
    activeSkillGroup,
    activeSkillDef,
    setArchetypeId,
    setMercLevel,
    setActiveSkillId,
    setActiveSkillPart,
  } = useMercenaryCalculator();

  const standardArchetypes = catalogs.archetypes.filter((a) => !a.isInfamous);
  const infamousArchetypes = catalogs.archetypes.filter((a) => a.isInfamous);

  const allowedSkillIds = new Set(
    activeArchetype
      ? [
          ...activeArchetype.skillPool.primary,
          ...activeArchetype.skillPool.secondary,
          ...activeArchetype.skillPool.utility,
        ]
      : [],
  );

  const visibleSkills = catalogs.skills.filter(
    (s) => s.parts.length > 0 && (buildState.showAllSkillsSandbox || allowedSkillIds.has(s.id)),
  );

  const { defences, activePartResult } = snapshot;

  return (
    <aside className={styles.sidebar} aria-label="Mercenary Summary Sidebar">
      <fieldset className="pom-fieldset">
        <legend>Mercenary Identity</legend>
        <div className={styles.controlGrid}>
          <label className={styles.fieldLabel}>
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

          <div className={styles.inlineSplit}>
            <label className={styles.fieldLabel}>
              <span>Merc Level (1–85)</span>
              <input
                type="number"
                min={1}
                max={85}
                className="pom-input tabular-nums"
                value={buildState.mercLevel}
                onChange={(e) => setMercLevel(Number(e.target.value))}
              />
            </label>
            <div className={styles.fieldLabel}>
              <span>Skill Level</span>
              <div className="pom-badge pom-badge-gold" style={{ height: 24, justifyContent: 'center' }}>
                Gem Lv {snapshot.derivedSkillLevel}
              </div>
            </div>
          </div>

          {activeSkillGroup && (
            <>
              <label className={styles.fieldLabel}>
                <span>Main Skill</span>
                <select
                  className="pom-select"
                  value={activeSkillGroup.skillId}
                  onChange={(e) => setActiveSkillId(activeSkillGroup.groupId, e.target.value)}
                >
                  {visibleSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>

              {activeSkillDef && activeSkillDef.parts.length > 0 && (
                <label className={styles.fieldLabel}>
                  <span>Skill Part</span>
                  <select
                    className="pom-select"
                    value={activeSkillGroup.activePartId}
                    onChange={(e) => setActiveSkillPart(activeSkillGroup.groupId, e.target.value)}
                  >
                    {activeSkillDef.parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </div>
      </fieldset>

      <div className={styles.fullDpsCard}>
        <span className={styles.fullDpsLabel}>Combined Full DPS</span>
        <span className={styles.fullDpsValue}>{formatDps(snapshot.combinedFullDps)}</span>
      </div>

      <fieldset className="pom-fieldset">
        <legend>Offence</legend>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Active Skill DPS</span>
          <span className="pom-stat-value">{formatNum(snapshot.activeSkillDps)}</span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Average Hit</span>
          <span className="pom-stat-value">{formatNum(activePartResult?.averageHit ?? 0)}</span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Attack / Cast Rate</span>
          <span className="pom-stat-value">
            {(activePartResult?.effectiveActionRate ?? 0).toFixed(2)}/s
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Eff. Crit Chance</span>
          <span className="pom-stat-value">
            {(activePartResult?.effectiveCritChancePct ?? 0).toFixed(2)}%
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Crit Multiplier</span>
          <span className="pom-stat-value">{activePartResult?.critMultiplierPct ?? 150}%</span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Hit Chance</span>
          <span className="pom-stat-value">
            {(activePartResult?.hitChancePct ?? 100).toFixed(0)}%
          </span>
        </div>
      </fieldset>

      <fieldset className="pom-fieldset">
        <legend>Attributes &amp; Pools</legend>
        <div className="pom-stat-row">
          <span className="pom-stat-label">STR / DEX / INT</span>
          <span className="pom-stat-value">
            {defences.str} / {defences.dex} / {defences.int}
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label" style={{ color: 'var(--poe-life)' }}>
            Maximum Life
          </span>
          <span className="pom-stat-value">{formatNum(defences.maxLife)}</span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label" style={{ color: 'var(--poe-es)' }}>
            Energy Shield / Ward
          </span>
          <span className="pom-stat-value">
            {formatNum(defences.maxEnergyShield)} / {formatNum(defences.maxWard)}
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Effective Hit Pool</span>
          <span className="pom-stat-value" style={{ color: 'var(--pom-text-accent)' }}>
            {formatNum(defences.effectiveHitPool)}
          </span>
        </div>
      </fieldset>

      <fieldset className="pom-fieldset">
        <legend>Defences &amp; Resistances</legend>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Accuracy / Evasion</span>
          <span className="pom-stat-value">
            {formatNum(defences.accuracy)} / {formatNum(defences.evasion)}
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Armour / Phys DR</span>
          <span className="pom-stat-value">
            {formatNum(defences.armour)} ({defences.physicalDamageReductionPct}%)
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label" style={{ color: 'var(--poe-fire)' }}>
            Fire Resistance
          </span>
          <span className="pom-stat-value">
            {defences.resistances.Fire.capped}% ({defences.resistances.Fire.uncapped}%)
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label" style={{ color: 'var(--poe-cold)' }}>
            Cold Resistance
          </span>
          <span className="pom-stat-value">
            {defences.resistances.Cold.capped}% ({defences.resistances.Cold.uncapped}%)
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label" style={{ color: 'var(--poe-lightning)' }}>
            Lightning Resistance
          </span>
          <span className="pom-stat-value">
            {defences.resistances.Lightning.capped}% ({defences.resistances.Lightning.uncapped}%)
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label" style={{ color: 'var(--poe-chaos)' }}>
            Chaos Resistance
          </span>
          <span className="pom-stat-value">
            {defences.resistances.Chaos.capped}% ({defences.resistances.Chaos.uncapped}%)
          </span>
        </div>

        <div className={styles.maxHitGrid} title="Maximum Hit Taken by Damage Type">
          {(
            [
              ['Phys', defences.maxHitTaken.Physical, 'var(--poe-phys)'],
              ['Fire', defences.maxHitTaken.Fire, 'var(--poe-fire)'],
              ['Cold', defences.maxHitTaken.Cold, 'var(--poe-cold)'],
              ['Light', defences.maxHitTaken.Lightning, 'var(--poe-lightning)'],
              ['Chaos', defences.maxHitTaken.Chaos, 'var(--poe-chaos)'],
            ] as const
          ).map(([label, val, color]) => (
            <div key={label} className={styles.maxHitCell}>
              <div className={styles.maxHitLabel} style={{ color }}>
                {label}
              </div>
              <div className={styles.maxHitNum}>{formatNum(val)}</div>
            </div>
          ))}
        </div>
      </fieldset>
    </aside>
  );
}

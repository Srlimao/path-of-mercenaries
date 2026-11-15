import { useMercenaryCalculator } from '../../state/index.js';
import { QuickBuffsWidget } from '../party-enemy-config/index.js';
import { ArchetypeSelector } from './ArchetypeSelector.js';
import { MercLevelControl } from './MercLevelControl.js';
import { SidebarDefencesPanel } from './SidebarDefencesPanel.js';
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
    setActiveSkillId,
    setActiveSkillPart,
  } = useMercenaryCalculator();

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

  const { activePartResult } = snapshot;

  return (
    <aside className={styles.sidebar} aria-label="Mercenary Summary Sidebar">
      <fieldset className="pom-fieldset">
        <legend>Mercenary Identity</legend>
        <div className={styles.controlGrid}>
          <ArchetypeSelector />
          <MercLevelControl />

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

      {snapshot.warnings.length > 0 && (
        <div
          style={{
            padding: '5px 8px',
            border: '1px solid #993333',
            backgroundColor: 'rgba(210, 0, 0, 0.12)',
            color: '#f87171',
            fontSize: 11,
            borderRadius: 2,
          }}
        >
          {snapshot.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

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
          <span className="pom-stat-label">Hit DPS</span>
          <span className="pom-stat-value">{formatNum(activePartResult?.hitDps ?? 0)}</span>
        </div>
        {(activePartResult?.impaleDps ?? 0) > 0 && (
          <div className="pom-stat-row">
            <span className="pom-stat-label">Impale DPS</span>
            <span className="pom-stat-value">{formatNum(activePartResult?.impaleDps ?? 0)}</span>
          </div>
        )}
        <div className="pom-stat-row" title="Ignite / Bleed / Poison DPS">
          <span className="pom-stat-label">Ignite / Bleed / Poison</span>
          <span className="pom-stat-value">
            {formatNum(activePartResult?.igniteDps ?? 0)} / {formatNum(activePartResult?.bleedDps ?? 0)} /{' '}
            {formatNum(activePartResult?.poisonDps ?? 0)}
          </span>
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

      <SidebarDefencesPanel />

      <QuickBuffsWidget />
    </aside>
  );
}

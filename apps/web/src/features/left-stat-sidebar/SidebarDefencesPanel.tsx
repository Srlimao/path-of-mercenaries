import { useMercenaryCalculator } from '../../state/index.js';
import styles from './LeftStatSidebar.module.css';

function formatNum(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function SidebarDefencesPanel() {
  const { snapshot } = useMercenaryCalculator();
  const { defences } = snapshot;

  const shiftParts: string[] = [];
  if (defences.physTakenAsPct.Fire > 0) shiftParts.push(`${defences.physTakenAsPct.Fire}% Fire`);
  if (defences.physTakenAsPct.Cold > 0) shiftParts.push(`${defences.physTakenAsPct.Cold}% Cold`);
  if (defences.physTakenAsPct.Lightning > 0) shiftParts.push(`${defences.physTakenAsPct.Lightning}% Light`);
  if (defences.physTakenAsPct.Chaos > 0) shiftParts.push(`${defences.physTakenAsPct.Chaos}% Chaos`);

  return (
    <>
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
        <div className="pom-stat-row">
          <span className="pom-stat-label">Net Life Recovery /s</span>
          <span className="pom-stat-value">{formatNum(defences.netLifeRecoveryPerSec)}/s</span>
        </div>
      </fieldset>

      <fieldset className="pom-fieldset">
        <legend>Defences &amp; Resistances</legend>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Accuracy / Evasion</span>
          <span className="pom-stat-value">
            {formatNum(defences.accuracy)} / {formatNum(defences.evasion)} ({defences.evadeChancePct}%)
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Armour / Phys DR</span>
          <span className="pom-stat-value">
            {formatNum(defences.armour)} ({defences.physicalDamageReductionPct}%)
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Block (Atk / Spell)</span>
          <span className="pom-stat-value">
            {defences.attackBlockPct}% / {defences.spellBlockPct}%
          </span>
        </div>
        <div className="pom-stat-row">
          <span className="pom-stat-label">Spell Suppression</span>
          <span className="pom-stat-value">{defences.spellSuppressionPct}%</span>
        </div>
        {shiftParts.length > 0 && (
          <div className="pom-stat-row">
            <span className="pom-stat-label">Phys Taken As</span>
            <span className="pom-stat-value">{shiftParts.join(' / ')}</span>
          </div>
        )}
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

        <div className={styles.maxHitGrid ?? ''} title="Maximum Hit Taken by Damage Type">
          {(
            [
              ['Phys', defences.maxHitTaken.Physical, 'var(--poe-phys)'],
              ['Fire', defences.maxHitTaken.Fire, 'var(--poe-fire)'],
              ['Cold', defences.maxHitTaken.Cold, 'var(--poe-cold)'],
              ['Light', defences.maxHitTaken.Lightning, 'var(--poe-lightning)'],
              ['Chaos', defences.maxHitTaken.Chaos, 'var(--poe-chaos)'],
            ] as const
          ).map(([label, val, color]) => (
            <div key={label} className={styles.maxHitCell ?? ''}>
              <div className={styles.maxHitLabel ?? ''} style={{ color }}>
                {label}
              </div>
              <div className={styles.maxHitNum ?? ''}>{formatNum(val)}</div>
            </div>
          ))}
        </div>
      </fieldset>
    </>
  );
}

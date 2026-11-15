import type { SkillPartDefinition } from '@pom/engine';

interface SkillPartSelectorProps {
  parts: SkillPartDefinition[];
  activePartId: string;
  onSelectPart: (partId: string) => void;
}

export function SkillPartSelector({
  parts,
  activePartId,
  onSelectPart,
}: SkillPartSelectorProps) {
  if (parts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          color: 'var(--pom-text-secondary)',
        }}
      >
        Skill Part:
      </span>
      {parts.map((part) => {
        const isActive = part.id === activePartId;
        return (
          <button
            key={part.id}
            type="button"
            className={`pom-button ${isActive ? 'pom-button-gold' : ''}`}
            onClick={() => onSelectPart(part.id)}
            title={`Added Damage Eff: ${(part.damageEffectiveness * 100).toFixed(0)}% | Default Count: ${part.defaultFullDpsCount}x`}
          >
            <span>{part.label}</span>
            <span className="pom-badge" style={{ marginLeft: 3 }}>
              {part.isAttack
                ? `${part.weaponDamageMultiplierPctByLevel[20] ?? part.damageEffectiveness * 100}% Wpn`
                : `${(part.damageEffectiveness * 100).toFixed(0)}% Eff`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

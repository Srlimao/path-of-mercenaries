import {
  DAMAGE_TYPES,
  findSkillById,
  type MercenarySkillDefinition,
  type SkillGroupSetup,
} from '@pom/engine';
import {
  removeSkillGroupInState,
  removeSupportGemSlotInState,
  setSkillGroupCategoryInState,
  setSkillGroupLevelOverrideInState,
  setSupportGemLevelInState,
  setSupportGemSlotInState,
  toggleSkillGroupEnabledInState,
  toggleSupportGemSlotInState,
  useMercenaryCalculator,
} from '../../state/index.js';
import { SkillPartSelector } from './SkillPartSelector.js';
import { SupportSlotSelector } from './SupportSlotSelector.js';
import styles from './SkillGroupCard.module.css';

interface SkillGroupCardProps {
  group: SkillGroupSetup;
  index: number;
  isActiveGroup: boolean;
  canRemove: boolean;
  visibleSkills: MercenarySkillDefinition[];
}

const MAX_SUPPORT_SLOTS = 5;

function fmt(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  return Math.round(val).toLocaleString('en-US');
}

export function SkillGroupCard({
  group,
  index,
  isActiveGroup,
  canRemove,
  visibleSkills,
}: SkillGroupCardProps) {
  const {
    snapshot,
    catalogs,
    setActiveSkillGroup,
    setActiveSkillId,
    setActiveSkillPart,
    updateBuildState,
  } = useMercenaryCalculator();

  const skillDef = findSkillById(group.skillId, catalogs);
  const dropdownSkills =
    skillDef && !visibleSkills.some((s) => s.id === skillDef.id)
      ? [skillDef, ...visibleSkills]
      : visibleSkills;

  const partResult =
    snapshot.skillResults.find(
      (r) => r.groupId === group.groupId && r.partId === group.activePartId,
    ) ?? snapshot.skillResults.find((r) => r.groupId === group.groupId);

  const gildedCount = group.supports.filter((s) => {
    if (!s.enabled) return false;
    const def = catalogs.supports.find((x) => x.id === s.supportId);
    return Boolean(def?.isGilded);
  }).length;

  return (
    <section className={`pom-panel ${styles.card ?? ''} ${isActiveGroup ? (styles.cardActive ?? '') : ''}`}>
      <div className="pom-panel-header">
        <div className={styles.headerControls ?? ''}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={group.enabled}
              onChange={() => updateBuildState((prev) => toggleSkillGroupEnabledInState(prev, group.groupId))}
            />
            <span>
              Socket Group #{index + 1}: {skillDef?.name ?? group.skillId}
            </span>
          </label>
          <span className="pom-badge">{group.slotCategory}</span>
        </div>

        <div className={styles.headerControls ?? ''}>
          <button
            type="button"
            className={`pom-button ${isActiveGroup ? 'pom-button-gold' : ''}`}
            onClick={() => setActiveSkillGroup(group.groupId)}
          >
            {isActiveGroup ? '★ Active Skill' : 'Set Active'}
          </button>
          <button
            type="button"
            className="pom-button"
            disabled={!canRemove}
            title={canRemove ? 'Remove Socket Group' : 'At least one Skill Group must remain'}
            onClick={() => updateBuildState((prev) => removeSkillGroupInState(prev, group.groupId))}
          >
            Remove
          </button>
        </div>
      </div>

      <div className={styles.body ?? ''}>
        <div className={styles.topRow ?? ''}>
          <select
            className={`pom-select ${styles.skillSelect ?? ''}`}
            value={group.skillId}
            onChange={(e) => setActiveSkillId(group.groupId, e.target.value)}
          >
            {dropdownSkills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} [{s.tags.slice(0, 3).join(', ')}]
              </option>
            ))}
          </select>

          <select
            className="pom-select"
            value={group.slotCategory}
            onChange={(e) =>
              updateBuildState((prev) =>
                setSkillGroupCategoryInState(
                  prev,
                  group.groupId,
                  e.target.value as SkillGroupSetup['slotCategory'],
                ),
              )
            }
          >
            <option value="PRIMARY">PRIMARY</option>
            <option value="SECONDARY">SECONDARY</option>
            <option value="UTILITY">UTILITY</option>
          </select>

          <label className={styles.levelBox ?? ''}>
            <span>Skill Lv:</span>
            <input
              type="number"
              min={1}
              max={40}
              className={`pom-input ${styles.levelInput ?? ''}`}
              placeholder={String(snapshot.derivedSkillLevel)}
              value={group.skillLevelOverride ?? ''}
              title="Leave blank to inherit Derived Skill Level from Mercenary Level"
              onChange={(e) => {
                const raw = e.target.value.trim();
                updateBuildState((prev) =>
                  setSkillGroupLevelOverrideInState(
                    prev,
                    group.groupId,
                    raw === '' ? undefined : Number(raw),
                  ),
                );
              }}
            />
            {group.skillLevelOverride !== undefined && (
              <button
                type="button"
                className="pom-button"
                title="Reset to Mercenary Derived Skill Level"
                onClick={() =>
                  updateBuildState((prev) =>
                    setSkillGroupLevelOverrideInState(prev, group.groupId, undefined),
                  )
                }
              >
                Auto ({snapshot.derivedSkillLevel})
              </button>
            )}
          </label>
        </div>

        {skillDef && (
          <SkillPartSelector
            parts={skillDef.parts}
            activePartId={group.activePartId}
            onSelectPart={(partId) => setActiveSkillPart(group.groupId, partId)}
          />
        )}

        {partResult && (
          <div className={styles.metricsStrip ?? ''}>
            <span className={styles.metricItem ?? ''}>
              <span className={styles.metricLabel ?? ''}>Eff Lv:</span>
              <span className={styles.metricVal ?? ''}>{partResult.effectiveSkillLevel}</span>
            </span>
            <span className={styles.metricItem ?? ''}>
              <span className={styles.metricLabel ?? ''}>Avg Hit:</span>
              <span className={styles.metricVal ?? ''}>{fmt(partResult.averageHit)}</span>
            </span>
            <span className={styles.metricItem ?? ''}>
              <span className={styles.metricLabel ?? ''}>Rate:</span>
              <span className={styles.metricVal ?? ''}>{partResult.effectiveActionRate.toFixed(2)}/s</span>
            </span>
            <span className={styles.metricItem ?? ''}>
              <span className={styles.metricLabel ?? ''}>Crit:</span>
              <span className={styles.metricVal ?? ''}>
                {partResult.effectiveCritChancePct.toFixed(1)}% / {partResult.critMultiplierPct}%
              </span>
            </span>
            <span className={styles.metricItem ?? ''}>
              <span className={styles.metricLabel ?? ''}>Hit %:</span>
              <span className={styles.metricVal ?? ''}>{partResult.hitChancePct}%</span>
            </span>
            <span className={styles.metricItem ?? ''}>
              <span className={styles.metricLabel ?? ''}>Hit DPS:</span>
              <span className={styles.metricVal ?? ''}>{fmt(partResult.hitDps)}</span>
            </span>
            {partResult.impaleDps > 0 && (
              <span className={styles.metricItem ?? ''}>
                <span className={styles.metricLabel ?? ''}>Impale DPS:</span>
                <span className={styles.metricVal ?? ''}>{fmt(partResult.impaleDps)}</span>
              </span>
            )}
            {DAMAGE_TYPES.map((dt) => {
              const bd = partResult.perTypeBreakdown[dt];
              if (bd.finalAverageHit <= 0.1) return null;
              return (
                <span key={dt} className="pom-badge">
                  {dt.slice(0, 4)}: {fmt(bd.finalAverageHit)}
                </span>
              );
            })}
          </div>
        )}

        <div className={styles.supportsList ?? ''}>
          <div className={styles.supportsTitleRow ?? ''}>
            <span>Support Links ({group.supports.filter((s) => s.enabled).length} / {MAX_SUPPORT_SLOTS})</span>
            <span className="pom-badge pom-badge-gold">
              Tier (I–III) · DPS Delta / Tier{gildedCount > 0 ? ` · ${gildedCount} Gilded` : ''}
            </span>
          </div>
          {Array.from({ length: MAX_SUPPORT_SLOTS }, (_, slotIdx) => (
            <SupportSlotSelector
              key={slotIdx}
              groupId={group.groupId}
              slotIndex={slotIdx}
              equippedSlot={group.supports[slotIdx]}
              canAppendNew={slotIdx === group.supports.length}
              onSelectSupport={(supportId, level) =>
                updateBuildState((prev) =>
                  setSupportGemSlotInState(prev, group.groupId, slotIdx, supportId, level),
                )
              }
              onToggleEnabled={() =>
                updateBuildState((prev) => toggleSupportGemSlotInState(prev, group.groupId, slotIdx))
              }
              onChangeLevel={(level) =>
                updateBuildState((prev) =>
                  setSupportGemLevelInState(prev, group.groupId, slotIdx, level),
                )
              }
              onRemoveSlot={() =>
                updateBuildState((prev) => removeSupportGemSlotInState(prev, group.groupId, slotIdx))
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

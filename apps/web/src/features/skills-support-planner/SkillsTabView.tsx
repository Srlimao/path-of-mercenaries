import {
  addSkillGroupInState,
  setShowAllSkillsSandboxInState,
  useMercenaryCalculator,
} from '../../state/index.js';
import { SkillGroupCard } from './SkillGroupCard.js';
import { FullDpsPartsTable } from './FullDpsPartsTable.js';
import styles from './SkillsTabView.module.css';

export function SkillsTabView() {
  const { buildState, catalogs, activeArchetype, updateBuildState } = useMercenaryCalculator();

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

  const handleAddSkillGroup = () => {
    const defaultNewSkill =
      activeArchetype?.skillPool.secondary[0] ??
      activeArchetype?.skillPool.utility[0] ??
      visibleSkills[0]?.id ??
      'kinetic_blast_of_clustering';
    updateBuildState((prev) =>
      addSkillGroupInState(prev, defaultNewSkill, 'SECONDARY', catalogs),
    );
  };

  return (
    <div className={styles.wrapper ?? ''}>
      <div className={`pom-panel ${styles.toolbar ?? ''}`}>
        <div className={styles.toolbarLeft ?? ''}>
          <span className={styles.toolbarTitle ?? ''}>
            Skills &amp; Support Planner ({buildState.skillGroups.length})
          </span>
          <span className="pom-badge">
            {buildState.showAllSkillsSandbox
              ? `Sandbox Pool: All ${visibleSkills.length} Skills`
              : `${activeArchetype?.name ?? 'Archetype'} Pool: ${visibleSkills.length} Skills`}
          </span>
        </div>

        <div className={styles.toolbarLeft ?? ''}>
          <label className={styles.sandboxToggle ?? ''}>
            <input
              type="checkbox"
              checked={buildState.showAllSkillsSandbox}
              onChange={(e) =>
                updateBuildState((prev) =>
                  setShowAllSkillsSandboxInState(prev, e.target.checked),
                )
              }
            />
            <span>All-Skills Sandbox Mode</span>
          </label>
          <button
            type="button"
            className="pom-button pom-button-gold"
            onClick={handleAddSkillGroup}
          >
            + Add Skill Group
          </button>
        </div>
      </div>

      <div className={styles.groupsList ?? ''}>
        {buildState.skillGroups.map((group, index) => (
          <SkillGroupCard
            key={group.groupId}
            group={group}
            index={index}
            isActiveGroup={group.groupId === buildState.activeSkillGroupId}
            canRemove={buildState.skillGroups.length > 1}
            visibleSkills={visibleSkills}
          />
        ))}
      </div>

      <FullDpsPartsTable />
    </div>
  );
}

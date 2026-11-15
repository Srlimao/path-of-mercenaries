import { useMercenaryCalculator } from '../../state/index.js';
import { CalcsTabView } from '../calcs-breakdown-matrix/index.js';
import { ItemsTabView } from '../items-paperdoll-inspector/index.js';
import { ConfigTabView } from '../party-enemy-config/index.js';
import { SkillsTabView } from '../skills-support-planner/index.js';

export function FeatureSlotPlaceholder() {
  const { activeTab } = useMercenaryCalculator();

  if (activeTab === 'items') {
    return <ItemsTabView />;
  }

  if (activeTab === 'skills') {
    return <SkillsTabView />;
  }

  if (activeTab === 'config') {
    return <ConfigTabView />;
  }

  return <CalcsTabView />;
}

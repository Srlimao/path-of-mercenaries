import { useEffect } from 'react';
import { useMercenaryCalculator, type WorkspaceTabId } from '../../state/index.js';
import styles from './WorkspaceTabBar.module.css';

interface TabDefinition {
  id: WorkspaceTabId;
  label: string;
  hotkey: string;
}

const TABS: TabDefinition[] = [
  { id: 'items', label: 'Items', hotkey: 'F1' },
  { id: 'skills', label: 'Skills', hotkey: 'F2' },
  { id: 'config', label: 'Config', hotkey: 'F3' },
  { id: 'calcs', label: 'Calcs', hotkey: 'F4' },
];

export function WorkspaceTabBar() {
  const { activeTab, setActiveTab, buildState, modDb } = useMercenaryCalculator();
  const equippedCount = Object.values(buildState.equippedItems).filter(Boolean).length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault();
        setActiveTab('items');
      } else if (event.key === 'F2') {
        event.preventDefault();
        setActiveTab('skills');
      } else if (event.key === 'F3') {
        event.preventDefault();
        setActiveTab('config');
      } else if (event.key === 'F4') {
        event.preventDefault();
        setActiveTab('calcs');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTab]);

  return (
    <div className={styles.tabBar}>
      <nav className={styles.tabList} aria-label="Planner Mode Tabs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
            >
              <span>{tab.label}</span>
              <span className={styles.hotkey}>{tab.hotkey}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.statusHint}>
        Equipped: {equippedCount}/10 | Active Mods: {modDb.getAllMods().length}
      </div>
    </div>
  );
}

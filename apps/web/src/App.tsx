import { BuildStateProvider } from './state/index.js';
import { LeftStatSidebar } from './features/left-stat-sidebar/index.js';
import {
  FeatureSlotPlaceholder,
  TopActionHeader,
  WorkspaceTabBar,
} from './features/workspace-shell/index.js';
import styles from './App.module.css';

export function App() {
  return (
    <BuildStateProvider>
      <div className={styles.appRoot}>
        <TopActionHeader />
        <div className={styles.workspaceBody}>
          <LeftStatSidebar />
          <main className={styles.mainPane}>
            <WorkspaceTabBar />
            <div className={styles.tabViewport}>
              <FeatureSlotPlaceholder />
            </div>
          </main>
        </div>
      </div>
    </BuildStateProvider>
  );
}

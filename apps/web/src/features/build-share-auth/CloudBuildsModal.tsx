import { useEffect, useState } from 'react';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './BuildShareModals.module.css';
import {
  deleteBuildRecord,
  fetchDunhasUser,
  listSavedBuilds,
  loadSharedBuild,
  loginWithDunhasGoogle,
  logoutDunhas,
  publishSharedBuild,
  saveBuildRecord,
  type DunhasUser,
  type SavedBuildEntry,
} from './dunhas_auth_client.js';

interface CloudBuildsModalProps {
  onClose: () => void;
}

export function CloudBuildsModal({ onClose }: CloudBuildsModalProps) {
  const { buildState, snapshot, loadBuildState } = useMercenaryCalculator();
  const [user, setUser] = useState<DunhasUser | null>(null);
  const [entries, setEntries] = useState<SavedBuildEntry[]>([]);
  const [slotName, setSlotName] = useState(buildState.buildName);
  const [shareSlug, setShareSlug] = useState('');
  const [loadSlug, setLoadSlug] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const activeUser = await fetchDunhasUser();
    setUser(activeUser);
    const list = await listSavedBuilds(activeUser);
    setEntries(list);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSave = async () => {
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const saved = await saveBuildRecord(
        slotName || buildState.buildName,
        buildState,
        {
          name: slotName || buildState.buildName,
          archetypeName: snapshot.archetypeName,
          mercLevel: snapshot.mercLevel,
          fullDps: Math.round(snapshot.combinedFullDps),
        },
        user,
      );
      setStatusMsg(
        `Saved "${saved.data.name}" (${saved.storage === 'cloud' ? 'auth.dunhas.com Cloud + Local' : 'Local Browser Storage'}).`,
      );
      setEntries(await listSavedBuilds(user));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublishShared = async () => {
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const slug = await publishSharedBuild(shareSlug, buildState, {
        archetypeName: snapshot.archetypeName,
        mercLevel: snapshot.mercLevel,
        fullDps: Math.round(snapshot.combinedFullDps),
      });
      const shareUrl = `${window.location.origin}/#s=${slug}`;
      await navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
      setShareSlug(slug);
      setStatusMsg(`Published shared build "${slug}" to auth.dunhas.com (URL copied: ${shareUrl}).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleLoadShared = async () => {
    if (!loadSlug.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const loaded = await loadSharedBuild(loadSlug.trim());
      if (!loaded) {
        setErrorMsg(`No shared build found for slug "${loadSlug.trim()}".`);
      } else {
        loadBuildState(loaded);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load shared slug.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop ?? ''} onClick={onClose}>
      <div className={`pom-panel ${styles.modal ?? ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="pom-panel-header">
          <span>Cloud Builds &amp; Auth (auth.dunhas.com / general-db)</span>
          <button type="button" className="pom-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.body ?? ''}>
          <fieldset className={`pom-fieldset ${styles.sectionBox ?? ''}`}>
            <legend>Dunhas Auth Hub Session</legend>
            <div className={styles.row ?? ''}>
              {user ? (
                <>
                  <span className="pom-badge pom-badge-gold">Signed In</span>
                  <span>
                    <strong>{user.displayName}</strong> ({user.email})
                  </span>
                  <button
                    type="button"
                    className="pom-button"
                    onClick={async () => {
                      await logoutDunhas();
                      await refresh();
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <span className="pom-badge">Offline / Local Only</span>
                  <span>Sign in with Google via auth.dunhas.com to sync builds across devices.</span>
                  <button
                    type="button"
                    className="pom-button pom-button-gold"
                    onClick={loginWithDunhasGoogle}
                  >
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          </fieldset>

          {statusMsg && <div className={styles.statusLine ?? ''}>{statusMsg}</div>}
          {errorMsg && <div className={styles.errorLine ?? ''}>{errorMsg}</div>}

          <fieldset className={`pom-fieldset ${styles.sectionBox ?? ''}`}>
            <legend>Save Current Build &amp; Public Slug</legend>
            <div className={styles.row ?? ''}>
              <input
                type="text"
                className={`pom-input ${styles.growInput ?? ''}`}
                value={slotName}
                onChange={(e) => setSlotName(e.target.value)}
                placeholder="Save slot name..."
              />
              <button
                type="button"
                className="pom-button pom-button-gold"
                disabled={busy}
                onClick={() => void handleSave()}
              >
                {user ? 'Save to Cloud + Local' : 'Save Locally'}
              </button>
            </div>
            <div className={styles.row ?? ''}>
              <input
                type="text"
                className={`pom-input ${styles.growInput ?? ''}`}
                value={shareSlug}
                onChange={(e) => setShareSlug(e.target.value)}
                placeholder="Custom public slug (e.g. doryani-kineticist-84)..."
              />
              <button
                type="button"
                className="pom-button"
                disabled={busy || !user}
                title={user ? 'Publish public build slug' : 'Sign in to publish shared builds'}
                onClick={() => void handlePublishShared()}
              >
                Publish Shared Slug
              </button>
            </div>
            <div className={styles.row ?? ''}>
              <input
                type="text"
                className={`pom-input ${styles.growInput ?? ''}`}
                value={loadSlug}
                onChange={(e) => setLoadSlug(e.target.value)}
                placeholder="Load shared slug from auth.dunhas.com..."
              />
              <button
                type="button"
                className="pom-button"
                disabled={busy || !loadSlug.trim()}
                onClick={() => void handleLoadShared()}
              >
                Load Slug
              </button>
            </div>
          </fieldset>

          <fieldset className={`pom-fieldset ${styles.sectionBox ?? ''}`}>
            <legend>Saved Builds ({entries.length})</legend>
            {entries.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--pom-text-muted)' }}>
                No saved builds yet. Save your current Mercenary setup above.
              </span>
            ) : (
              <table className="pom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Archetype</th>
                    <th>Full DPS</th>
                    <th>Storage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.key}>
                      <td>{entry.data.name}</td>
                      <td>
                        {entry.data.archetypeName} (Lv {entry.data.mercLevel})
                      </td>
                      <td className="tabular-nums">
                        {Math.round(entry.data.fullDps).toLocaleString('en-US')}
                      </td>
                      <td>
                        <span className={`pom-badge ${entry.storage === 'cloud' ? 'pom-badge-gold' : ''}`}>
                          {entry.storage === 'cloud' ? 'Cloud' : 'Local'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.row ?? ''}>
                          <button
                            type="button"
                            className="pom-button pom-button-gold"
                            onClick={() => {
                              loadBuildState(entry.data.buildState);
                              onClose();
                            }}
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            className="pom-button"
                            onClick={async () => {
                              await deleteBuildRecord(entry.key, user);
                              setEntries(await listSavedBuilds(user));
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>
        </div>
      </div>
    </div>
  );
}

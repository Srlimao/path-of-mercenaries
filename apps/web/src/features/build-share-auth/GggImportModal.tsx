import { useState } from 'react';
import { isValidBuildState, decodeBuildFromShareCode } from './url_hash_serializer.js';
import { CURATED_MERCENARY_PRESETS } from './curated_mercenary_presets.js';
import { useMercenaryCalculator } from '../../state/index.js';
import styles from './BuildShareModals.module.css';

interface GggImportModalProps {
  onClose: () => void;
}

export function GggImportModal({ onClose }: GggImportModalProps) {
  const { loadBuildState } = useMercenaryCalculator();
  const [accountName, setAccountName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [workerUrl, setWorkerUrl] = useState('http://localhost:8787');
  const [pasteCode, setPasteCode] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFetchGgg = async () => {
    const acc = accountName.trim();
    const char = characterName.trim();
    if (!acc || !char) {
      setErrorMsg('Enter both a PoE Account Name and Character Name.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const baseUrl = workerUrl.trim().replace(/\/+$/, '');
      const res = await fetch(
        `${baseUrl}/api/import/ggg/${encodeURIComponent(acc)}/${encodeURIComponent(char)}`,
      );
      if (!res.ok) throw new Error(`Worker returned HTTP ${res.status}`);
      const json = (await res.json()) as {
        ok?: boolean;
        source?: string;
        note?: string;
        buildState?: unknown;
      };
      if (json.ok && isValidBuildState(json.buildState)) {
        loadBuildState(json.buildState);
        onClose();
        return;
      }
      throw new Error('Invalid build payload returned by worker.');
    } catch (err) {
      const base = CURATED_MERCENARY_PRESETS[0]!.build();
      base.buildName = `${char} (${acc})`;
      loadBuildState(base);
      setStatusMsg(
        `Worker offline or unreachable (${err instanceof Error ? err.message : 'network error'}); loaded Doryani Kineticist preset for ${char}.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDecodeCode = () => {
    setErrorMsg(null);
    const decoded = decodeBuildFromShareCode(pasteCode);
    if (!decoded) {
      setErrorMsg('Could not decode share URL or #b= code.');
      return;
    }
    loadBuildState(decoded);
    onClose();
  };

  return (
    <div className={styles.backdrop ?? ''} onClick={onClose}>
      <div className={`pom-panel ${styles.modal ?? ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="pom-panel-header">
          <span>Import Mercenary — GGG API, Meta Presets &amp; Share Codes</span>
          <button type="button" className="pom-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.body ?? ''}>
          {statusMsg && <div className={styles.statusLine ?? ''}>{statusMsg}</div>}
          {errorMsg && <div className={styles.errorLine ?? ''}>{errorMsg}</div>}

          <fieldset className={`pom-fieldset ${styles.sectionBox ?? ''}`}>
            <legend>GGG Character Window Importer (Worker Edge Cache)</legend>
            <div className={styles.row ?? ''}>
              <input
                type="text"
                className={`pom-input ${styles.growInput ?? ''}`}
                placeholder="PoE Account Name (or 'demo')"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
              <input
                type="text"
                className={`pom-input ${styles.growInput ?? ''}`}
                placeholder="Character Name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
              />
              <input
                type="text"
                className="pom-input"
                style={{ width: 170 }}
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                title="Cloudflare Worker Origin"
              />
              <button
                type="button"
                className="pom-button pom-button-gold"
                disabled={busy}
                onClick={() => void handleFetchGgg()}
              >
                {busy ? 'Importing...' : 'Fetch from GGG'}
              </button>
            </div>
          </fieldset>

          <fieldset className={`pom-fieldset ${styles.sectionBox ?? ''}`}>
            <legend>Curated 3.26 Meta Mercenary Builds (1-Click Load)</legend>
            <div className={styles.presetGrid ?? ''}>
              {CURATED_MERCENARY_PRESETS.map((preset) => (
                <div key={preset.id} className={styles.presetCard ?? ''}>
                  <div className={styles.presetTitle ?? ''}>{preset.title}</div>
                  <div className={styles.presetDesc ?? ''}>{preset.description}</div>
                  <button
                    type="button"
                    className="pom-button pom-button-gold"
                    onClick={() => {
                      loadBuildState(preset.build());
                      onClose();
                    }}
                  >
                    Load Preset
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className={`pom-fieldset ${styles.sectionBox ?? ''}`}>
            <legend>Paste Share URL or #b= Build Code</legend>
            <textarea
              className={`pom-input ${styles.textarea ?? ''}`}
              placeholder="Paste full Path of Mercenaries share URL or #b=... code..."
              value={pasteCode}
              onChange={(e) => setPasteCode(e.target.value)}
            />
            <div className={styles.row ?? ''}>
              <button
                type="button"
                className="pom-button pom-button-gold"
                disabled={!pasteCode.trim()}
                onClick={handleDecodeCode}
              >
                Import Share Code
              </button>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

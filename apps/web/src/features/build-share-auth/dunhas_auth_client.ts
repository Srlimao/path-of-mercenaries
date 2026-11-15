import type { MercenaryBuildState } from '@pom/engine';
import { isValidBuildState } from './url_hash_serializer.js';

export const DUNHAS_HUB_ORIGIN = 'https://auth.dunhas.com';
export const POM_APP_ID = 'path-of-mercenaries';
const TOKEN_STORAGE_KEY = 'dunhas_auth_token';
const LOCAL_SAVES_KEY = 'pom_saved_builds_v1';

export interface DunhasUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
}

export interface SavedBuildRecordPayload {
  name: string;
  archetypeName: string;
  mercLevel: number;
  fullDps: number;
  updatedAt: string;
  buildState: MercenaryBuildState;
}

export interface SavedBuildEntry {
  key: string;
  data: SavedBuildRecordPayload;
  storage: 'cloud' | 'local';
}

/** Captures `#auth_token=...` returned from auth.dunhas.com Google SSO redirect. */
export function captureDunhasRedirectToken(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  const match = hash.match(/auth_token=([^&]+)/);
  if (!match?.[1]) return;
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, decodeURIComponent(match[1]));
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  } catch {
    // Ignore storage restriction
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Ignore
  }
  return headers;
}

export async function fetchDunhasUser(): Promise<DunhasUser | null> {
  captureDunhasRedirectToken();
  try {
    const res = await fetch(`${DUNHAS_HUB_ORIGIN}/api/auth/me`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; user?: DunhasUser };
    return json.user ?? null;
  } catch {
    return null;
  }
}

export function loginWithDunhasGoogle(): void {
  if (typeof window === 'undefined') return;
  const redirectUri = encodeURIComponent(window.location.href.split('#')[0] ?? window.location.href);
  window.location.href = `${DUNHAS_HUB_ORIGIN}/api/auth/google/login?app_id=${POM_APP_ID}&redirect_uri=${redirectUri}`;
}

export async function logoutDunhas(): Promise<void> {
  try {
    await fetch(`${DUNHAS_HUB_ORIGIN}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
  } catch {
    // Best-effort remote logout
  }
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function readLocalBuildsMap(): Record<string, SavedBuildRecordPayload> {
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SavedBuildRecordPayload>;
  } catch {
    return {};
  }
}

function writeLocalBuildsMap(map: Record<string, SavedBuildRecordPayload>): void {
  try {
    window.localStorage.setItem(LOCAL_SAVES_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota limits
  }
}

export async function listSavedBuilds(signedInUser: DunhasUser | null): Promise<SavedBuildEntry[]> {
  const localMap = readLocalBuildsMap();
  const entriesByKey = new Map<string, SavedBuildEntry>();

  for (const [key, data] of Object.entries(localMap)) {
    if (isValidBuildState(data?.buildState)) {
      entriesByKey.set(key, { key, data, storage: 'local' });
    }
  }

  if (signedInUser) {
    try {
      const res = await fetch(`${DUNHAS_HUB_ORIGIN}/api/data/${POM_APP_ID}/builds?limit=100`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        type CloudRow = { key?: string; record_key?: string; data?: SavedBuildRecordPayload };
        const json = (await res.json()) as
          | CloudRow[]
          | { results?: CloudRow[]; records?: CloudRow[]; items?: CloudRow[] };
        const rows = Array.isArray(json) ? json : (json.results ?? json.records ?? json.items ?? []);
        for (const row of rows) {
          const rowKey = row.key ?? row.record_key;
          if (rowKey && row.data && isValidBuildState(row.data.buildState)) {
            entriesByKey.set(rowKey, { key: rowKey, data: row.data, storage: 'cloud' });
          }
        }
      }
    } catch {
      // Offline / network fallback keeps local saves accessible
    }
  }

  return Array.from(entriesByKey.values()).sort((a, b) =>
    b.data.updatedAt.localeCompare(a.data.updatedAt),
  );
}

export async function saveBuildRecord(
  key: string,
  state: MercenaryBuildState,
  summary: { name: string; archetypeName: string; mercLevel: number; fullDps: number },
  signedInUser: DunhasUser | null,
): Promise<SavedBuildEntry> {
  const cleanKey = key.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'build';
  const payload: SavedBuildRecordPayload = {
    ...summary,
    updatedAt: new Date().toISOString(),
    buildState: state,
  };

  const localMap = readLocalBuildsMap();
  localMap[cleanKey] = payload;
  writeLocalBuildsMap(localMap);

  if (signedInUser) {
    const res = await fetch(
      `${DUNHAS_HUB_ORIGIN}/api/data/${POM_APP_ID}/builds/${encodeURIComponent(cleanKey)}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ data: payload }),
      },
    );
    if (res.ok) {
      return { key: cleanKey, data: payload, storage: 'cloud' };
    }
  }

  return { key: cleanKey, data: payload, storage: 'local' };
}

export async function deleteBuildRecord(key: string, signedInUser: DunhasUser | null): Promise<void> {
  const localMap = readLocalBuildsMap();
  delete localMap[key];
  writeLocalBuildsMap(localMap);

  if (signedInUser) {
    try {
      await fetch(
        `${DUNHAS_HUB_ORIGIN}/api/data/${POM_APP_ID}/builds/${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: getAuthHeaders(),
        },
      );
    } catch {
      // Ignore remote error on delete
    }
  }
}

export async function publishSharedBuild(
  slug: string,
  state: MercenaryBuildState,
  summary: { archetypeName: string; mercLevel: number; fullDps: number },
): Promise<string> {
  const cleanSlug =
    slug.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') ||
    `pom-${Date.now().toString(36)}`;
  const res = await fetch(
    `${DUNHAS_HUB_ORIGIN}/api/shared/${POM_APP_ID}/shared_builds/${encodeURIComponent(cleanSlug)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        data: { ...summary, updatedAt: new Date().toISOString(), buildState: state },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Publish failed (HTTP ${res.status}). Sign in to auth.dunhas.com first.`);
  }
  return cleanSlug;
}

export async function loadSharedBuild(slug: string): Promise<MercenaryBuildState | null> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;
  const res = await fetch(
    `${DUNHAS_HUB_ORIGIN}/api/shared/${POM_APP_ID}/shared_builds/${encodeURIComponent(cleanSlug)}`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { buildState?: unknown } };
  const candidate = json.data?.buildState;
  return isValidBuildState(candidate) ? candidate : null;
}

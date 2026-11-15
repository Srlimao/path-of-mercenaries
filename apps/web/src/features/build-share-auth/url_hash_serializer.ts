import { encodePobCode, type MercenaryBuildState } from '@pom/engine';

const AUTOSAVE_KEY = 'pom_autosave_build_v1';

function decodeBase64UrlToBytes(input: string): Uint8Array | null {
  try {
    const clean = input.trim().replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (clean.length % 4)) % 4;
    const padded = clean + '='.repeat(padLen);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function inflateStoredZlib(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 11) return null;
  // Standard Zlib stored blocks written by encodePobCode (CMF=0x78)
  if ((bytes[0]! & 0x0f) !== 8) return null;
  let pos = 2;
  const chunks: Uint8Array[] = [];
  let totalOut = 0;

  while (pos + 5 <= bytes.length) {
    const hdr = bytes[pos++]!;
    const isFinal = (hdr & 0x01) === 1;
    const blockType = (hdr >> 1) & 0x03;
    if (blockType !== 0) return null;
    const len = bytes[pos]! | (bytes[pos + 1]! << 8);
    const nlen = bytes[pos + 2]! | (bytes[pos + 3]! << 8);
    pos += 4;
    if (((len ^ 0xffff) & 0xffff) !== nlen) return null;
    if (pos + len > bytes.length) return null;
    const slice = bytes.subarray(pos, pos + len);
    chunks.push(slice);
    totalOut += len;
    pos += len;
    if (isFinal) break;
  }

  const out = new Uint8Array(totalOut);
  let offset = 0;
  for (const ch of chunks) {
    out.set(ch, offset);
    offset += ch.length;
  }
  return out;
}

export function isValidBuildState(candidate: unknown): candidate is MercenaryBuildState {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    typeof obj.archetypeId === 'string' &&
    typeof obj.mercLevel === 'number' &&
    Array.isArray(obj.skillGroups) &&
    typeof obj.equippedItems === 'object' &&
    obj.equippedItems !== null &&
    typeof obj.partyConfig === 'object' &&
    typeof obj.enemyConfig === 'object'
  );
}

/** Encodes a `MercenaryBuildState` into a compressed Base64URL `#b=` share payload. */
export function encodeBuildToShareCode(state: MercenaryBuildState): string {
  return encodePobCode(JSON.stringify(state));
}

/** Decodes a full share URL or raw `#b=` / Base64URL share code into `MercenaryBuildState`. */
export function decodeBuildFromShareCode(rawInput: string): MercenaryBuildState | null {
  let code = rawInput.trim();
  const hashIdx = code.indexOf('#b=');
  if (hashIdx >= 0) {
    code = code.slice(hashIdx + 3).split('&')[0] ?? '';
  } else if (code.startsWith('b=')) {
    code = code.slice(2).split('&')[0] ?? '';
  }
  if (!code) return null;

  const bytes = decodeBase64UrlToBytes(code);
  if (!bytes) return null;

  const inflated = inflateStoredZlib(bytes) ?? bytes;
  try {
    const jsonText = new TextDecoder('utf-8').decode(inflated);
    const parsed = JSON.parse(jsonText) as unknown;
    return isValidBuildState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readBuildFromWindowHash(): MercenaryBuildState | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.includes('b=')) return null;
  return decodeBuildFromShareCode(hash);
}

export function readSharedSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/\/b\/([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return match[1];
  const hashMatch = window.location.hash.match(/#s=([a-zA-Z0-9_-]+)/);
  return hashMatch?.[1] ?? null;
}

export function writeBuildToWindowHash(state: MercenaryBuildState): string {
  const code = encodeBuildToShareCode(state);
  if (typeof window === 'undefined') return `#b=${code}`;
  const nextHash = `#b=${code}`;
  window.history.replaceState(null, '', nextHash);
  return `${window.location.origin}${window.location.pathname}${nextHash}`;
}

export function saveAutosaveBuild(state: MercenaryBuildState): void {
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadAutosaveBuild(): MercenaryBuildState | null {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidBuildState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

import { KeywordFlags, ModFlags } from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';

export interface DamageTakenConversionResult {
  physTakenAsPct: Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', number>;
  coldTakenAsFirePct: number;
  lightningTakenAsFirePct: number;
}

const EMPTY_CTX: EvalContext = { conditions: {}, stats: {} };

const q = (names: string[]) => ({
  names,
  flags: ModFlags.None,
  keywordFlags: KeywordFlags.None,
  context: EMPTY_CTX,
});

/** Computes normalized Physical-taken-as-Elemental/Chaos and Elemental-taken-as-Fire shifts. */
export function computeDamageTakenConversion(modDb: ModDB): DamageTakenConversionResult {
  const rawFire = Math.max(0, modDb.sum('BASE', q(['PhysicalTakenAsFire'])));
  const rawCold = Math.max(0, modDb.sum('BASE', q(['PhysicalTakenAsCold'])));
  const rawLight = Math.max(0, modDb.sum('BASE', q(['PhysicalTakenAsLightning'])));
  const rawChaos = Math.max(0, modDb.sum('BASE', q(['PhysicalTakenAsChaos'])));

  const total = rawFire + rawCold + rawLight + rawChaos;
  const scale = total > 100 && total > 0 ? 100 / total : 1;

  return {
    physTakenAsPct: {
      Fire: Number((rawFire * scale).toFixed(1)),
      Cold: Number((rawCold * scale).toFixed(1)),
      Lightning: Number((rawLight * scale).toFixed(1)),
      Chaos: Number((rawChaos * scale).toFixed(1)),
    },
    coldTakenAsFirePct: Math.min(100, Math.max(0, modDb.sum('BASE', q(['ColdTakenAsFire'])))),
    lightningTakenAsFirePct: Math.min(100, Math.max(0, modDb.sum('BASE', q(['LightningTakenAsFire'])))),
  };
}

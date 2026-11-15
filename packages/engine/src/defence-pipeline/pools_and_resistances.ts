import { KeywordFlags, ModFlags } from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';

export interface PoolsAndResistancesResult {
  str: number;
  dex: number;
  int: number;
  accuracy: number;
  maxLife: number;
  maxEnergyShield: number;
  maxWard: number;
  resistances: Record<
    'Fire' | 'Cold' | 'Lightning' | 'Chaos',
    { capped: number; uncapped: number; maxCap: number; hiddenBaselinePct: number }
  >;
}

const EMPTY_CTX: EvalContext = { conditions: {}, stats: {} };

const q = (names: string[]) => ({
  names,
  flags: ModFlags.None,
  keywordFlags: KeywordFlags.None,
  context: EMPTY_CTX,
});

/** Computes primary attributes, Life/ES/Ward pools, Accuracy, and Capped/Uncapped Resistances. */
export function computePoolsAndResistances(
  modDb: ModDB,
  hiddenElemResPct: number,
): PoolsAndResistancesResult {
  const str = Math.round(modDb.sum('BASE', q(['Str'])));
  const dex = Math.round(modDb.sum('BASE', q(['Dex'])));
  const int = Math.round(modDb.sum('BASE', q(['Int'])));

  const maxLife = Math.round(
    (modDb.sum('BASE', q(['Life'])) + str / 2) *
      Math.max(0.1, 1 + modDb.sum('INC', q(['Life'])) / 100),
  );
  const maxEnergyShield = Math.round(
    modDb.sum('BASE', q(['EnergyShield'])) *
      Math.max(0, 1 + (modDb.sum('INC', q(['EnergyShield'])) + int / 5) / 100),
  );
  const maxWard = Math.round(
    modDb.sum('BASE', q(['Ward'])) * Math.max(0, 1 + modDb.sum('INC', q(['Ward'])) / 100),
  );
  const accuracy = Math.round(
    (modDb.sum('BASE', q(['Accuracy'])) + dex * 2) *
      Math.max(0, 1 + modDb.sum('INC', q(['Accuracy'])) / 100),
  );

  const maxEleAdd = modDb.sum('BASE', q(['MaxElementalResist']));
  const fireCap = Math.min(90, 75 + maxEleAdd + modDb.sum('BASE', q(['MaxFireResist'])));
  const coldCap = Math.min(90, 75 + maxEleAdd + modDb.sum('BASE', q(['MaxColdResist'])));
  const lightCap = Math.min(90, 75 + maxEleAdd + modDb.sum('BASE', q(['MaxLightningResist'])));
  const chaosCap = Math.min(90, 75 + modDb.sum('BASE', q(['MaxChaosResist'])));

  const fireUncapped = modDb.sum('BASE', q(['FireResist']));
  const coldUncapped = modDb.sum('BASE', q(['ColdResist']));
  const lightUncapped = modDb.sum('BASE', q(['LightningResist']));
  const chaosUncapped = modDb.sum('BASE', q(['ChaosResist']));

  return {
    str,
    dex,
    int,
    accuracy,
    maxLife,
    maxEnergyShield,
    maxWard,
    resistances: {
      Fire: {
        capped: Math.max(-200, Math.min(fireCap, fireUncapped)),
        uncapped: fireUncapped,
        maxCap: fireCap,
        hiddenBaselinePct: hiddenElemResPct,
      },
      Cold: {
        capped: Math.max(-200, Math.min(coldCap, coldUncapped)),
        uncapped: coldUncapped,
        maxCap: coldCap,
        hiddenBaselinePct: hiddenElemResPct,
      },
      Lightning: {
        capped: Math.max(-200, Math.min(lightCap, lightUncapped)),
        uncapped: lightUncapped,
        maxCap: lightCap,
        hiddenBaselinePct: hiddenElemResPct,
      },
      Chaos: {
        capped: Math.max(-200, Math.min(chaosCap, chaosUncapped)),
        uncapped: chaosUncapped,
        maxCap: chaosCap,
        hiddenBaselinePct: 0,
      },
    },
  };
}

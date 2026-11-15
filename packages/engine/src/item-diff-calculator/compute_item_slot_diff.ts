import type {
  CalculationResultSnapshot,
  EquipmentSlot,
  MercenaryBuildState,
  ParsedItem,
} from '../catalog-types/index.js';
import { calculateBuild } from '../orchestrator/index.js';
import { SEED_CATALOGS, type GameCatalogBundle } from '../seed-catalog/index.js';

export interface ItemSlotDiff {
  slot: EquipmentSlot;
  candidateItemName: string;
  replacedItemName: string | null;
  deltaFullDps: number;
  deltaFullDpsPct: number;
  deltaSkillDps: number;
  deltaSkillDpsPct: number;
  deltaEhp: number;
  deltaEhpPct: number;
  deltaLife: number;
  deltaEnergyShield: number;
  deltaMaxHitPhys: number;
  deltaResistances: Record<'Fire' | 'Cold' | 'Lightning' | 'Chaos', number>;
  baselineSnapshot: CalculationResultSnapshot;
  candidateSnapshot: CalculationResultSnapshot;
}

function pctDelta(delta: number, baseline: number): number {
  if (Math.abs(baseline) < 1e-6) return 0;
  return Number(((delta / baseline) * 100).toFixed(2));
}

/**
 * Evaluates a candidate `ParsedItem` (or unequip when `undefined`) in `slot`
 * against the current `buildState`, returning exact DPS, EHP, pool, and resistance deltas.
 */
export function computeItemSlotDiff(
  buildState: MercenaryBuildState,
  slot: EquipmentSlot,
  candidateItem: ParsedItem | undefined,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
  existingBaselineSnapshot?: CalculationResultSnapshot,
): ItemSlotDiff {
  const baselineSnapshot =
    existingBaselineSnapshot ?? calculateBuild(buildState, catalogs).snapshot;

  const nextEquipped = { ...buildState.equippedItems };
  if (candidateItem) {
    nextEquipped[slot] = candidateItem;
  } else {
    delete nextEquipped[slot];
  }

  const candidateSnapshot = calculateBuild(
    { ...buildState, equippedItems: nextEquipped },
    catalogs,
  ).snapshot;

  const deltaFullDps = candidateSnapshot.combinedFullDps - baselineSnapshot.combinedFullDps;
  const deltaSkillDps = candidateSnapshot.activeSkillDps - baselineSnapshot.activeSkillDps;
  const deltaEhp =
    candidateSnapshot.defences.effectiveHitPool - baselineSnapshot.defences.effectiveHitPool;

  const baseRes = baselineSnapshot.defences.resistances;
  const nextRes = candidateSnapshot.defences.resistances;

  return {
    slot,
    candidateItemName: candidateItem?.name ?? '(Unequipped)',
    replacedItemName: buildState.equippedItems[slot]?.name ?? null,
    deltaFullDps,
    deltaFullDpsPct: pctDelta(deltaFullDps, baselineSnapshot.combinedFullDps),
    deltaSkillDps,
    deltaSkillDpsPct: pctDelta(deltaSkillDps, baselineSnapshot.activeSkillDps),
    deltaEhp,
    deltaEhpPct: pctDelta(deltaEhp, baselineSnapshot.defences.effectiveHitPool),
    deltaLife: candidateSnapshot.defences.maxLife - baselineSnapshot.defences.maxLife,
    deltaEnergyShield:
      candidateSnapshot.defences.maxEnergyShield - baselineSnapshot.defences.maxEnergyShield,
    deltaMaxHitPhys:
      candidateSnapshot.defences.maxHitTaken.Physical -
      baselineSnapshot.defences.maxHitTaken.Physical,
    deltaResistances: {
      Fire: nextRes.Fire.uncapped - baseRes.Fire.uncapped,
      Cold: nextRes.Cold.uncapped - baseRes.Cold.uncapped,
      Lightning: nextRes.Lightning.uncapped - baseRes.Lightning.uncapped,
      Chaos: nextRes.Chaos.uncapped - baseRes.Chaos.uncapped,
    },
    baselineSnapshot,
    candidateSnapshot,
  };
}

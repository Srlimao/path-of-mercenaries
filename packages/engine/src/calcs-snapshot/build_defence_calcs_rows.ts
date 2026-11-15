import type { CalcBreakdownRow, DefenceCalcResult } from '../catalog-types/index.js';

export function fmtCalcNum(val: number, digits = 0): string {
  const fixed = val.toFixed(digits);
  const parts = fixed.split('.');
  parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0]!;
}

/** Builds the 6-column DEFENCE breakdown rows for the Phase 12 Calcs matrix. */
export function buildDefenceCalcsRows(defences: DefenceCalcResult): CalcBreakdownRow[] {
  const minEleRes = Math.min(
    defences.resistances.Fire.capped,
    defences.resistances.Cold.capped,
    defences.resistances.Lightning.capped,
  );
  const physRemPct = Math.max(
    0,
    100 -
      defences.physTakenAsPct.Fire -
      defences.physTakenAsPct.Cold -
      defences.physTakenAsPct.Lightning -
      defences.physTakenAsPct.Chaos,
  );

  return [
    {
      rowId: 'def_pools',
      section: 'DEFENCE',
      label: 'Maximum Pools & Armour',
      valuesByType: {
        Physical: `Arm ${fmtCalcNum(defences.armour)}`,
        Total: `Life ${fmtCalcNum(defences.maxLife)} | ES ${fmtCalcNum(defences.maxEnergyShield)} | Ward ${fmtCalcNum(defences.maxWard)}`,
      },
      tabulateQueryName: 'PoolsAndAttributes',
      inspectStatNames: ['Life', 'EnergyShield', 'Ward', 'Armour', 'Evasion', 'Str', 'Dex', 'Int'],
      inspectModTypes: ['BASE', 'INC'],
    },
    {
      rowId: 'def_resists',
      section: 'DEFENCE',
      label: 'Capped (Uncapped) Res / PDR',
      valuesByType: {
        Physical: `${defences.physicalDamageReductionPct}% PDR`,
        Fire: `${defences.resistances.Fire.capped}% (${defences.resistances.Fire.uncapped}%)`,
        Cold: `${defences.resistances.Cold.capped}% (${defences.resistances.Cold.uncapped}%)`,
        Lightning: `${defences.resistances.Lightning.capped}% (${defences.resistances.Lightning.uncapped}%)`,
        Chaos: `${defences.resistances.Chaos.capped}% (${defences.resistances.Chaos.uncapped}%)`,
        Total: `Min Ele ${minEleRes}%`,
      },
      tabulateQueryName: 'ResistancesAndPDR',
      inspectStatNames: [
        'PhysicalDamageReduction',
        'FireResist',
        'ColdResist',
        'LightningResist',
        'ChaosResist',
        'MaxFireResist',
        'MaxColdResist',
        'MaxLightningResist',
        'MaxChaosResist',
      ],
      inspectModTypes: ['BASE', 'INC'],
    },
    {
      rowId: 'def_taken_as',
      section: 'DEFENCE',
      label: 'Physical Taken As (%)',
      valuesByType: {
        Physical: `${physRemPct}%`,
        Fire: `${defences.physTakenAsPct.Fire}%`,
        Cold: `${defences.physTakenAsPct.Cold}%`,
        Lightning: `${defences.physTakenAsPct.Lightning}%`,
        Chaos: `${defences.physTakenAsPct.Chaos}%`,
        Total: '100% Shift Split',
      },
      tabulateQueryName: 'PhysicalTakenAs',
      inspectStatNames: [
        'PhysicalTakenAsFire',
        'PhysicalTakenAsCold',
        'PhysicalTakenAsLightning',
        'PhysicalTakenAsChaos',
      ],
      inspectModTypes: ['BASE'],
    },
    {
      rowId: 'def_avoidance',
      section: 'DEFENCE',
      label: 'Avoidance & Recovery',
      valuesByType: {
        Total: `Evade ${defences.evadeChancePct}% | Block ${defences.attackBlockPct}%/${defences.spellBlockPct}% | Supp ${defences.spellSuppressionPct}% | Regen ${fmtCalcNum(defences.netLifeRecoveryPerSec, 1)}/s`,
      },
      tabulateQueryName: 'AvoidanceAndRecovery',
      inspectStatNames: [
        'Evasion',
        'AttackBlockChance',
        'SpellBlockChance',
        'SpellSuppressionChance',
        'LifeRegen',
        'LifeRegenPercent',
      ],
      inspectModTypes: ['BASE', 'INC'],
    },
    {
      rowId: 'def_max_hit',
      section: 'DEFENCE',
      label: 'Max Hit Taken & EHP',
      valuesByType: {
        Physical: fmtCalcNum(defences.maxHitTaken.Physical),
        Lightning: fmtCalcNum(defences.maxHitTaken.Lightning),
        Cold: fmtCalcNum(defences.maxHitTaken.Cold),
        Fire: fmtCalcNum(defences.maxHitTaken.Fire),
        Chaos: fmtCalcNum(defences.maxHitTaken.Chaos),
        Total: `EHP ${fmtCalcNum(defences.effectiveHitPool)}`,
      },
      tabulateQueryName: 'AllDefenceMods',
    },
  ];
}

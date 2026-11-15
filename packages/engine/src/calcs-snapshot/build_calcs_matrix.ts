import {
  DAMAGE_TYPES,
  type CalcBreakdownRow,
  type DamageRange,
  type DamageType,
  type DefenceCalcResult,
  type SkillPartCalcResult,
  type StatSourceAttribution,
} from '../catalog-types/index.js';
import type { ModDB } from '../mod-db/index.js';
import { buildDefenceCalcsRows, fmtCalcNum } from './build_defence_calcs_rows.js';

function fmtRange(range: DamageRange): string {
  if (range.max <= 0.05 && range.min <= 0.05) return '—';
  return `${fmtCalcNum(range.min)}–${fmtCalcNum(range.max)}`;
}

function mapDamageColumns(
  fn: (dt: DamageType) => string | number,
): Partial<Record<DamageType | 'Total', string | number>> {
  const out: Partial<Record<DamageType | 'Total', string | number>> = {};
  for (const dt of DAMAGE_TYPES) {
    out[dt] = fn(dt);
  }
  return out;
}

function buildOffenceCalcsRows(activePart: SkillPartCalcResult): CalcBreakdownRow[] {
  const bd = activePart.perTypeBreakdown;
  const sumFieldAvg = (pick: (dt: DamageType) => number) =>
    DAMAGE_TYPES.reduce((acc, dt) => acc + pick(dt), 0);
  const totalAilmentImpale =
    activePart.impaleDps + activePart.igniteDps + activePart.bleedDps + activePart.poisonDps;

  return [
    {
      rowId: 'base_damage',
      section: 'OFFENCE',
      label: 'Weapon / Skill Base Damage',
      valuesByType: {
        ...mapDamageColumns((dt) => fmtRange(bd[dt].baseDamage)),
        Total: fmtCalcNum(sumFieldAvg((dt) => bd[dt].baseDamage.avg), 1),
      },
      tabulateQueryName: 'BaseDamage',
      inspectStatNames: [
        'PhysicalMin', 'PhysicalMax', 'LightningMin', 'LightningMax',
        'ColdMin', 'ColdMax', 'FireMin', 'FireMax', 'ChaosMin', 'ChaosMax',
      ],
      inspectModTypes: ['BASE'],
    },
    {
      rowId: 'added_damage',
      section: 'OFFENCE',
      label: 'Added Damage (× Effectiveness)',
      valuesByType: {
        ...mapDamageColumns((dt) => fmtRange(bd[dt].addedAfterEffectiveness)),
        Total: fmtCalcNum(sumFieldAvg((dt) => bd[dt].addedAfterEffectiveness.avg), 1),
      },
      tabulateQueryName: 'AddedDamage',
      inspectStatNames: [
        'PhysicalMin', 'PhysicalMax', 'LightningMin', 'LightningMax',
        'ColdMin', 'ColdMax', 'FireMin', 'FireMax', 'ChaosMin', 'ChaosMax',
      ],
      inspectModTypes: ['BASE'],
    },
    {
      rowId: 'converted_out',
      section: 'OFFENCE',
      label: 'Converted Out (%)',
      valuesByType: {
        ...mapDamageColumns((dt) => (bd[dt].convertedOutPct > 0 ? `${bd[dt].convertedOutPct}%` : '—')),
        Total: '—',
      },
      tabulateQueryName: 'Conversion',
      inspectStatNames: [
        'PhysicalToLightning', 'PhysicalToCold', 'PhysicalToFire', 'PhysicalToChaos',
        'LightningToCold', 'LightningToFire', 'LightningToChaos',
        'ColdToFire', 'ColdToChaos', 'FireToChaos', 'ElementalToChaos',
      ],
      inspectModTypes: ['BASE'],
    },
    {
      rowId: 'gained_extra',
      section: 'OFFENCE',
      label: 'Gained as Extra Damage',
      valuesByType: {
        ...mapDamageColumns((dt) => fmtRange(bd[dt].gainedAsExtra)),
        Total: fmtCalcNum(sumFieldAvg((dt) => bd[dt].gainedAsExtra.avg), 1),
      },
      tabulateQueryName: 'GainAsExtra',
      inspectStatNames: [
        'PhysicalAsExtraFire', 'PhysicalAsExtraCold', 'PhysicalAsExtraLightning',
        'PhysicalAsExtraChaos', 'LightningAsExtraCold', 'LightningAsExtraChaos',
        'ColdAsExtraFire', 'ColdAsExtraChaos', 'FireAsExtraChaos',
      ],
      inspectModTypes: ['BASE'],
    },
    {
      rowId: 'total_inc',
      section: 'OFFENCE',
      label: 'Total Increased (%)',
      valuesByType: {
        ...mapDamageColumns((dt) => `${bd[dt].totalIncreasedPct >= 0 ? '+' : ''}${Math.round(bd[dt].totalIncreasedPct)}%`),
        Total: '—',
      },
      tabulateQueryName: 'DamageInc',
      inspectStatNames: [
        'Damage', 'PhysicalDamage', 'LightningDamage', 'ColdDamage', 'FireDamage', 'ChaosDamage', 'ElementalDamage',
      ],
      inspectModTypes: ['INC'],
    },
    {
      rowId: 'total_more',
      section: 'OFFENCE',
      label: 'Total More Multiplier',
      valuesByType: {
        ...mapDamageColumns((dt) => `×${bd[dt].totalMoreMulti.toFixed(2)}`),
        Total: '—',
      },
      tabulateQueryName: 'DamageMore',
      inspectStatNames: [
        'Damage', 'PhysicalDamage', 'LightningDamage', 'ColdDamage',
        'FireDamage', 'ChaosDamage', 'ElementalDamage', 'MaxAttackDamage', 'MinAttackDamage',
      ],
      inspectModTypes: ['MORE'],
    },
    {
      rowId: 'pre_mit_hit',
      section: 'OFFENCE',
      label: 'Pre-Mitigation Hit Range',
      valuesByType: {
        ...mapDamageColumns((dt) => fmtRange(bd[dt].preMitigationHit)),
        Total: fmtCalcNum(sumFieldAvg((dt) => bd[dt].effectivePreMitigationAvg), 1),
      },
      tabulateQueryName: 'PreMitHit',
    },
    {
      rowId: 'enemy_res_pdr',
      section: 'OFFENCE',
      label: 'Enemy Effective Res / PDR',
      valuesByType: {
        ...mapDamageColumns((dt) => `${bd[dt].enemyEffectiveResistPct}%`),
        Total: '—',
      },
      tabulateQueryName: 'EnemyResistAndPen',
      inspectStatNames: [
        'FirePenetration', 'ColdPenetration', 'LightningPenetration',
        'ChaosPenetration', 'ElementalPenetration', 'EnemyAllResist',
        'EnemyLightningResEqualsMerc', 'InvertEnemyElementalResistances', 'EnemyChaosResZero',
      ],
      inspectModTypes: ['BASE', 'FLAG'],
    },
    {
      rowId: 'mitigation_multi',
      section: 'OFFENCE',
      label: 'Enemy Mitigation & Taken Multi',
      valuesByType: {
        ...mapDamageColumns((dt) => `×${bd[dt].mitigationMulti.toFixed(3)}`),
        Total: '—',
      },
      tabulateQueryName: 'EnemyDamageTaken',
      inspectStatNames: ['EnemyDamageTaken'],
      inspectModTypes: ['BASE'],
    },
    {
      rowId: 'final_avg_hit',
      section: 'OFFENCE',
      label: 'Final Average Hit',
      valuesByType: {
        ...mapDamageColumns((dt) => (bd[dt].finalAverageHit > 0.05 ? fmtCalcNum(bd[dt].finalAverageHit, 1) : '—')),
        Total: fmtCalcNum(activePart.averageHit, 1),
      },
      tabulateQueryName: 'CritAndLucky',
      inspectStatNames: ['CritChance', 'CritMultiplier', 'LuckyHitDamage', 'LuckyCritChance', 'ProjectilesReturn'],
      inspectModTypes: ['BASE', 'INC', 'FLAG'],
    },
    {
      rowId: 'rate_and_crit',
      section: 'OFFENCE',
      label: 'Action Rate / Crit / Hit Chance',
      valuesByType: {
        Total: `${activePart.effectiveActionRate.toFixed(2)}/s | Crit ${activePart.effectiveCritChancePct.toFixed(1)}% (${activePart.critMultiplierPct}%) | Hit ${activePart.hitChancePct}%`,
      },
      tabulateQueryName: 'SpeedAccuracyCrit',
      inspectStatNames: ['Speed', 'Accuracy', 'CritChance', 'CritMultiplier'],
      inspectModTypes: ['BASE', 'INC', 'MORE'],
    },
    {
      rowId: 'hit_dps',
      section: 'OFFENCE',
      label: 'Hit DPS',
      valuesByType: {
        ...mapDamageColumns((dt) => (bd[dt].hitDps > 0.5 ? fmtCalcNum(bd[dt].hitDps) : '—')),
        Total: fmtCalcNum(activePart.hitDps),
      },
      tabulateQueryName: 'AllOffenceMods',
    },
    {
      rowId: 'ailment_impale_dps',
      section: 'OFFENCE',
      label: 'Impale & Ailments DPS',
      valuesByType: {
        Physical: activePart.impaleDps + activePart.bleedDps > 0.5
          ? `Imp ${fmtCalcNum(activePart.impaleDps)} / Bld ${fmtCalcNum(activePart.bleedDps)}`
          : '—',
        Lightning: '—',
        Cold: '—',
        Fire: activePart.igniteDps > 0.5 ? `Ign ${fmtCalcNum(activePart.igniteDps)}` : '—',
        Chaos: activePart.poisonDps > 0.5 ? `Psn ${fmtCalcNum(activePart.poisonDps)}` : '—',
        Total: fmtCalcNum(totalAilmentImpale),
      },
      tabulateQueryName: 'AilmentsAndImpale',
      inspectStatNames: [
        'ImpaleChance', 'ImpaleEffect', 'DotMultiplier', 'FireDotMultiplier',
        'PhysicalDotMultiplier', 'ChaosDotMultiplier', 'IgniteChance', 'BleedChance', 'PoisonChance',
      ],
      inspectModTypes: ['BASE', 'INC', 'MORE'],
    },
  ];
}

/**
 * Phase 12: Builds the 6-column (`Physical | Lightning | Cold | Fire | Chaos | Total`)
 * Offence & Defence breakdown matrix with `ModDB` source inspection metadata.
 */
export function buildCalcsBreakdownRows(
  activePart: SkillPartCalcResult | null,
  defences: DefenceCalcResult,
): CalcBreakdownRow[] {
  return [
    ...(activePart ? buildOffenceCalcsRows(activePart) : []),
    ...buildDefenceCalcsRows(defences),
  ];
}

/** Filters `modDb` entries contributing to a selected `CalcBreakdownRow`. */
export function inspectCalcsRowModifiers(
  row: CalcBreakdownRow | null,
  modDb: ModDB,
): StatSourceAttribution[] {
  const statFilter = row?.inspectStatNames?.length ? new Set(row.inspectStatNames) : null;
  const typeFilter = row?.inspectModTypes?.length ? new Set(row.inspectModTypes) : null;

  const out: StatSourceAttribution[] = [];
  for (const mod of modDb.getAllMods()) {
    if (statFilter && !statFilter.has(mod.name)) continue;
    if (typeFilter && !typeFilter.has(mod.type)) continue;
    const numericVal = typeof mod.value === 'number' ? mod.value : mod.value ? 1 : 0;
    if (numericVal === 0 && mod.type !== 'OVERRIDE') continue;
    out.push({
      sourceLabel: mod.source.sourceLabel,
      sourceType: mod.source.sourceType,
      modType: mod.type,
      resolvedValue: numericVal,
      rawLine: `${mod.name}: ${mod.source.rawLine}`,
    });
  }
  return out;
}

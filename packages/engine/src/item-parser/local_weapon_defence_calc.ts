import type {
  ArmourLocalStats,
  BaseItemDefinition,
  DamageType,
  ItemModLine,
  WeaponLocalStats,
} from '../catalog-types/index.js';

export const WEAPON_ITEM_CLASSES = new Set([
  'Wand',
  'Bow',
  'One Hand Sword',
  'Thrusting One Hand Sword',
  'Two Hand Sword',
  'One Hand Axe',
  'Two Hand Axe',
  'One Hand Mace',
  'Two Hand Mace',
  'Sceptre',
  'Staff',
  'Claw',
  'Dagger',
]);

export const ARMOUR_ITEM_CLASSES = new Set([
  'Helmet',
  'Body Armour',
  'Gloves',
  'Boots',
  'Shield',
]);

export interface HeaderFallbackStats {
  physMin?: number;
  physMax?: number;
  aps?: number;
  critChancePct?: number;
  armour?: number;
  evasion?: number;
  energyShield?: number;
  blockPct?: number;
}

function stripModTag(raw: string): string {
  return raw.replace(/\s*\((implicit|crafted|fractured|enchant)\)\s*$/i, '').trim();
}

/**
 * Computes Stage 1 local weapon DPS/APS/Crit and local Armour/Evasion/ES/Block,
 * marking consumed local mod lines with isLocal=true so ModParser skips them.
 */
export function computeLocalItemStats(
  itemClass: string,
  qualityPct: number,
  modLines: ItemModLine[],
  baseItem?: BaseItemDefinition,
  headerFallback?: HeaderFallbackStats,
): { localWeaponStats?: WeaponLocalStats; localArmourStats?: ArmourLocalStats } {
  if (WEAPON_ITEM_CLASSES.has(itemClass)) {
    const base = baseItem?.weaponStats ?? {
      physMin: headerFallback?.physMin ?? 20,
      physMax: headerFallback?.physMax ?? 45,
      aps: headerFallback?.aps ?? 1.4,
      critChancePct: headerFallback?.critChancePct ?? 6.0,
    };

    let flatPhysMin = 0;
    let flatPhysMax = 0;
    let incPhysPct = 0;
    let incSpeedPct = 0;
    let incCritPct = 0;
    let noPhysicalDamage = false;
    const eleMin: Partial<Record<DamageType, number>> = {};
    const eleMax: Partial<Record<DamageType, number>> = {};

    for (const line of modLines) {
      const text = stripModTag(line.rawText);

      if (/^No Physical Damage$/i.test(text)) {
        noPhysicalDamage = true;
        line.isLocal = true;
        continue;
      }

      const incPhysMatch = text.match(/^(\d+)%\s+increased Physical Damage$/i);
      if (incPhysMatch) {
        incPhysPct += Number(incPhysMatch[1]);
        line.isLocal = true;
        continue;
      }

      const localFlatMatch = text.match(
        /^Adds\s+(\d+)\s+to\s+(\d+)\s+(Physical|Fire|Cold|Lightning|Chaos)\s+Damage$/i,
      );
      if (localFlatMatch) {
        const min = Number(localFlatMatch[1]);
        const max = Number(localFlatMatch[2]);
        const dt = (localFlatMatch[3]!.charAt(0).toUpperCase() +
          localFlatMatch[3]!.slice(1).toLowerCase()) as DamageType;
        if (dt === 'Physical') {
          flatPhysMin += min;
          flatPhysMax += max;
        } else {
          eleMin[dt] = (eleMin[dt] ?? 0) + min;
          eleMax[dt] = (eleMax[dt] ?? 0) + max;
        }
        line.isLocal = true;
        continue;
      }

      const incAsMatch = text.match(/^(\d+)%\s+increased Attack Speed$/i);
      if (incAsMatch) {
        incSpeedPct += Number(incAsMatch[1]);
        line.isLocal = true;
        continue;
      }

      const incCritMatch = text.match(/^(\d+)%\s+increased Critical Strike Chance$/i);
      if (incCritMatch) {
        incCritPct += Number(incCritMatch[1]);
        line.isLocal = true;
      }
    }

    const physScalar = 1 + (incPhysPct + qualityPct) / 100;
    const physMin = noPhysicalDamage ? 0 : Math.round((base.physMin + flatPhysMin) * physScalar);
    const physMax = noPhysicalDamage ? 0 : Math.round((base.physMax + flatPhysMax) * physScalar);
    const aps = Number((base.aps * (1 + incSpeedPct / 100)).toFixed(2));
    const critChancePct = Number((base.critChancePct * (1 + incCritPct / 100)).toFixed(2));

    const physDps = Number((((physMin + physMax) / 2) * aps).toFixed(1));
    let eleAvgSum = 0;
    for (const dt of ['Fire', 'Cold', 'Lightning', 'Chaos'] as const) {
      eleAvgSum += ((eleMin[dt] ?? 0) + (eleMax[dt] ?? 0)) / 2;
    }
    const eleDps = Number((eleAvgSum * aps).toFixed(1));
    const totalDps = Number((physDps + eleDps).toFixed(1));

    return {
      localWeaponStats: {
        physMin,
        physMax,
        eleMin,
        eleMax,
        aps,
        critChancePct,
        physDps,
        eleDps,
        totalDps,
      },
    };
  }

  if (ARMOUR_ITEM_CLASSES.has(itemClass)) {
    const base = baseItem?.armourStats ?? {
      armour: headerFallback?.armour ?? 0,
      evasion: headerFallback?.evasion ?? 0,
      energyShield: headerFallback?.energyShield ?? 0,
      blockPct: headerFallback?.blockPct ?? (itemClass === 'Shield' ? 24 : 0),
    };

    let flatArmour = 0;
    let flatEvasion = 0;
    let flatEs = 0;
    let flatWard = 0;
    let incArmour = 0;
    let incEvasion = 0;
    let incEs = 0;
    let flatBlock = 0;

    for (const line of modLines) {
      const text = stripModTag(line.rawText);

      const flatDef = text.match(/^\+(\d+)\s+to\s+(Armour|Evasion Rating|maximum Energy Shield|Ward)$/i);
      if (flatDef) {
        const val = Number(flatDef[1]);
        const target = flatDef[2]!.toLowerCase();
        if (target === 'armour') flatArmour += val;
        else if (target.includes('evasion')) flatEvasion += val;
        else if (target.includes('energy shield')) flatEs += val;
        else if (target === 'ward') flatWard += val;
        line.isLocal = true;
        continue;
      }

      const incDef = text.match(
        /^(\d+)%\s+increased\s+(Armour|Evasion Rating|Energy Shield|Armour and Energy Shield|Armour and Evasion|Evasion and Energy Shield|Armour, Evasion and Energy Shield)$/i,
      );
      if (incDef) {
        const val = Number(incDef[1]);
        const target = incDef[2]!.toLowerCase();
        if (target.includes('armour')) incArmour += val;
        if (target.includes('evasion')) incEvasion += val;
        if (target.includes('energy shield')) incEs += val;
        line.isLocal = true;
        continue;
      }

      const blockMatch = text.match(/^\+(\d+)%\s+Chance to Block$/i);
      if (blockMatch && itemClass === 'Shield') {
        flatBlock += Number(blockMatch[1]);
        line.isLocal = true;
      }
    }

    const baseArmour = base.armour ?? 0;
    const baseEvasion = base.evasion ?? 0;
    const baseEs = base.energyShield ?? 0;
    const baseWard = base.ward ?? 0;

    const armour =
      baseArmour + flatArmour > 0
        ? Math.round((baseArmour + flatArmour) * (1 + (incArmour + qualityPct) / 100))
        : 0;
    const evasion =
      baseEvasion + flatEvasion > 0
        ? Math.round((baseEvasion + flatEvasion) * (1 + (incEvasion + qualityPct) / 100))
        : 0;
    const energyShield =
      baseEs + flatEs > 0
        ? Math.round((baseEs + flatEs) * (1 + (incEs + qualityPct) / 100))
        : 0;
    const ward =
      baseWard + flatWard > 0 ? Math.round((baseWard + flatWard) * (1 + qualityPct / 100)) : 0;
    const blockPct = (base.blockPct ?? 0) + flatBlock;

    return {
      localArmourStats: { armour, evasion, energyShield, ward, blockPct },
    };
  }

  return {};
}

import {
  DAMAGE_TYPES,
  KeywordFlags,
  type DamageRange,
  type DamageType,
  type SkillPartDefinition,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB } from '../mod-db/index.js';
import { makeDamageRange } from './stage2_added_damage.js';

export interface DamageChunk {
  currentType: DamageType;
  ancestralMask: number;
  range: DamageRange;
}

export interface Stage3ConversionResult {
  chunks: DamageChunk[];
  convertedOutPctByType: Record<DamageType, number>;
  gainedAsExtraByType: Record<DamageType, DamageRange>;
}

const DAMAGE_KEYWORD_MAP: Record<DamageType, KeywordFlags> = {
  Physical: KeywordFlags.Physical,
  Lightning: KeywordFlags.Lightning,
  Cold: KeywordFlags.Cold,
  Fire: KeywordFlags.Fire,
  Chaos: KeywordFlags.Chaos,
};

function sumConversionPct(
  skillModDb: ModDB,
  sourceType: DamageType,
  targetType: DamageType,
  queryFlags: number,
  context: EvalContext,
): number {
  const names = [`${sourceType}To${targetType}`];
  if (sourceType === 'Lightning' || sourceType === 'Cold' || sourceType === 'Fire') {
    names.push(`ElementalTo${targetType}`);
  }
  return Math.max(
    0,
    skillModDb.sum('BASE', { names, flags: queryFlags, keywordFlags: 0, context }),
  );
}

function sumExtraGainPct(
  skillModDb: ModDB,
  sourceType: DamageType,
  targetType: DamageType,
  queryFlags: number,
  context: EvalContext,
): number {
  const names = [`${sourceType}AsExtra${targetType}`];
  if (sourceType === 'Lightning' || sourceType === 'Cold' || sourceType === 'Fire') {
    names.push(`ElementalAsExtra${targetType}`);
  }
  return Math.max(
    0,
    skillModDb.sum('BASE', { names, flags: queryFlags, keywordFlags: 0, context }),
  );
}

/**
 * Stage 3: Executes the forward PoE damage conversion DAG
 * (Physical -> Lightning -> Cold -> Fire -> Chaos) plus Gain-as-Extra,
 * preserving ancestral KeywordFlags bitmasks without double-counting and
 * respecting DealNoElementalDamage / DealNoChaosDamage / DealNoPhysicalDamage flags.
 */
export function computeStage3ConversionDag(
  baseRanges: Record<DamageType, DamageRange>,
  part: SkillPartDefinition,
  skillModDb: ModDB,
  queryFlags: number,
  context: EvalContext,
): Stage3ConversionResult {
  const pool: DamageChunk[] = [];
  const convertedOutPctByType = {} as Record<DamageType, number>;
  const gainedAsExtraByType = {} as Record<DamageType, DamageRange>;

  for (const dt of DAMAGE_TYPES) {
    convertedOutPctByType[dt] = 0;
    gainedAsExtraByType[dt] = makeDamageRange(0, 0);
    const r = baseRanges[dt];
    if (r.max > 0 || r.min > 0) {
      pool.push({
        currentType: dt,
        ancestralMask: DAMAGE_KEYWORD_MAP[dt],
        range: makeDamageRange(r.min, r.max),
      });
    }
  }

  const terminalChunks: DamageChunk[] = [];

  for (let i = 0; i < DAMAGE_TYPES.length; i++) {
    const srcType = DAMAGE_TYPES[i]!;
    const currentStepChunks = pool.filter((c) => c.currentType === srcType);
    if (currentStepChunks.length === 0) continue;

    const downstream = DAMAGE_TYPES.slice(i + 1);
    const inherentRaw: Array<{ target: DamageType; pct: number }> = [];
    const externalRaw: Array<{ target: DamageType; pct: number }> = [];
    let inherentTotal = 0;
    let externalTotal = 0;

    for (const target of downstream) {
      const inh = Math.max(0, part.inherentConversion?.[srcType]?.[target] ?? 0);
      const ext = sumConversionPct(skillModDb, srcType, target, queryFlags, context);
      if (inh > 0) {
        inherentRaw.push({ target, pct: inh });
        inherentTotal += inh;
      }
      if (ext > 0) {
        externalRaw.push({ target, pct: ext });
        externalTotal += ext;
      }
    }

    const inhScale = inherentTotal > 100 ? 100 / inherentTotal : 1;
    const usedInherent = Math.min(100, inherentTotal);
    const remainingCap = Math.max(0, 100 - usedInherent);
    const extScale = externalTotal > remainingCap && externalTotal > 0 ? remainingCap / externalTotal : 1;

    const finalConversions = new Map<DamageType, number>();
    for (const item of inherentRaw) {
      finalConversions.set(item.target, (finalConversions.get(item.target) ?? 0) + item.pct * inhScale);
    }
    for (const item of externalRaw) {
      finalConversions.set(item.target, (finalConversions.get(item.target) ?? 0) + item.pct * extScale);
    }

    const totalConvertedPct = Math.min(100, usedInherent + Math.min(remainingCap, externalTotal));
    convertedOutPctByType[srcType] = Number(totalConvertedPct.toFixed(1));
    const stayFraction = Math.max(0, 1 - totalConvertedPct / 100);

    const extraGains: Array<{ target: DamageType; fraction: number }> = [];
    for (const target of downstream) {
      const gainPct = sumExtraGainPct(skillModDb, srcType, target, queryFlags, context);
      if (gainPct > 0) {
        extraGains.push({ target, fraction: gainPct / 100 });
      }
    }

    for (const chunk of currentStepChunks) {
      for (const extra of extraGains) {
        const extraRange = makeDamageRange(chunk.range.min * extra.fraction, chunk.range.max * extra.fraction);
        pool.push({
          currentType: extra.target,
          ancestralMask: chunk.ancestralMask | DAMAGE_KEYWORD_MAP[extra.target],
          range: extraRange,
        });
        const prev = gainedAsExtraByType[extra.target];
        gainedAsExtraByType[extra.target] = makeDamageRange(prev.min + extraRange.min, prev.max + extraRange.max);
      }

      for (const [target, pct] of finalConversions.entries()) {
        if (pct <= 0) continue;
        const frac = pct / 100;
        pool.push({
          currentType: target,
          ancestralMask: chunk.ancestralMask | DAMAGE_KEYWORD_MAP[target],
          range: makeDamageRange(chunk.range.min * frac, chunk.range.max * frac),
        });
      }

      if (stayFraction > 1e-6) {
        terminalChunks.push({
          currentType: srcType,
          ancestralMask: chunk.ancestralMask,
          range: makeDamageRange(chunk.range.min * stayFraction, chunk.range.max * stayFraction),
        });
      }
    }
  }

  const noPhys = skillModDb.flag('DealNoPhysicalDamage', context, queryFlags);
  const noEle = skillModDb.flag('DealNoElementalDamage', context, queryFlags);
  const noChaos = skillModDb.flag('DealNoChaosDamage', context, queryFlags);

  const chunks = terminalChunks.filter((chunk) => {
    if (noPhys && chunk.currentType === 'Physical') return false;
    if (noEle && (chunk.currentType === 'Lightning' || chunk.currentType === 'Cold' || chunk.currentType === 'Fire')) {
      return false;
    }
    if (noChaos && chunk.currentType === 'Chaos') return false;
    return true;
  });

  return { chunks, convertedOutPctByType, gainedAsExtraByType };
}

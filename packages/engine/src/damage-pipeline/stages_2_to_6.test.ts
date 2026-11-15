import { describe, expect, it } from 'vitest';
import { KeywordFlags, ModFlags } from '../catalog-types/index.js';
import { ModDB, type ModSource } from '../mod-db/index.js';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { SEED_CATALOGS } from '../seed-catalog/index.js';
import {
  computeStage2AddedDamage,
  makeDamageRange,
  type Stage2AddedDamageResult,
} from './stage2_added_damage.js';
import { computeStage3ConversionDag } from './stage3_conversion_dag.js';
import { computeStage4IncMoreAndMitigation } from './stage4_inc_more_buckets.js';
import { computeExpectedRangeRoll, computeStage5CritAndHit } from './stage5_crit_lucky_multihit.js';
import { computeAttackHitChancePct } from './stage6_accuracy_speed.js';
import { computeStage10FullDps } from './stage10_full_dps.js';
import { createDefaultBuildState } from '../orchestrator/create_default_build_state.js';

const SRC: ModSource = {
  sourceType: 'Custom',
  sourceId: 'test',
  sourceLabel: 'Test Mod',
  rawLine: 'test',
};

describe('Damage Pipeline Stages 2-6 & Stage 10', () => {
  it('converts Physical -> Lightning -> Cold along forward DAG and inherits ancestral KeywordFlags without double-counting', () => {
    const modDb = new ModDB();
    modDb.addMods([
      { name: 'PhysicalToLightning', type: 'BASE', value: 50, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: SRC },
      { name: 'LightningToCold', type: 'BASE', value: 50, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: SRC },
      { name: 'PhysicalAsExtraFire', type: 'BASE', value: 20, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: SRC },
      { name: 'PhysicalDamage', type: 'INC', value: 50, flags: ModFlags.None, keywordFlags: KeywordFlags.Physical, source: SRC },
      { name: 'LightningDamage', type: 'INC', value: 30, flags: ModFlags.None, keywordFlags: KeywordFlags.Lightning, source: SRC },
      { name: 'ElementalDamage', type: 'INC', value: 20, flags: ModFlags.None, keywordFlags: KeywordFlags.Elemental, source: SRC },
    ]);

    const part = SEED_CATALOGS.skills[0]!.parts[0]!;
    const build = createDefaultBuildState();
    build.enemyConfig.baseResistsPct = { Fire: 0, Cold: 0, Lightning: 0, Chaos: 0 };
    build.enemyConfig.armour = 0;

    const baseRanges = {
      Physical: makeDamageRange(100, 100),
      Lightning: makeDamageRange(0, 0),
      Cold: makeDamageRange(0, 0),
      Fire: makeDamageRange(0, 0),
      Chaos: makeDamageRange(0, 0),
    };

    const stage3 = computeStage3ConversionDag(baseRanges, part, modDb, ModFlags.Attack, { conditions: {}, stats: {} });
    const stage4 = computeStage4IncMoreAndMitigation(
      stage3.chunks,
      modDb,
      build.enemyConfig,
      0,
      ModFlags.Attack,
      { conditions: {}, stats: {} },
    );

    expect(stage4.rawRangesPostScale.Physical.min).toBeCloseTo(75, 2);
    expect(stage4.rawRangesPostScale.Lightning.min).toBeCloseTo(50, 2);
    expect(stage4.rawRangesPostScale.Cold.min).toBeCloseTo(50, 2);
    expect(stage4.rawRangesPostScale.Fire.min).toBeCloseTo(34, 2);
  });

  it('calculates Lucky Hit Damage as min + 2/3 * (max - min) and Accuracy hit chance formula', () => {
    expect(computeExpectedRangeRoll(makeDamageRange(10, 100), false)).toBeCloseTo(55, 4);
    expect(computeExpectedRangeRoll(makeDamageRange(10, 100), true)).toBeCloseTo(70, 4);
    expect(computeAttackHitChancePct(1_000_000, 11200, false)).toBe(100);
    expect(computeAttackHitChancePct(500, 20000, true)).toBe(100);
    expect(computeAttackHitChancePct(3500, 11200, false)).toBeGreaterThanOrEqual(90);
  });

  it('applies Volatility min/max widening and Doryani negative enemy Lightning Res', () => {
    const build = createDefaultBuildState();
    build.enemyConfig.baseResistsPct = { Fire: 50, Cold: 50, Lightning: 50, Chaos: 30 };
    build.enemyConfig.armour = 0;

    const modDb = new ModDB();
    modDb.addMods([
      { name: 'MinAttackDamage', type: 'MORE', value: -50, flags: ModFlags.Attack, keywordFlags: KeywordFlags.None, source: SRC },
      { name: 'MaxAttackDamage', type: 'MORE', value: 100, flags: ModFlags.Attack, keywordFlags: KeywordFlags.None, source: SRC },
      { name: 'EnemyLightningResEqualsMerc', type: 'FLAG', value: true, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: SRC },
      { name: 'LuckyHitDamage', type: 'FLAG', value: true, flags: ModFlags.None, keywordFlags: KeywordFlags.None, source: SRC },
    ]);

    const zeroRanges = {
      Physical: makeDamageRange(0, 0),
      Lightning: makeDamageRange(100, 100),
      Cold: makeDamageRange(0, 0),
      Fire: makeDamageRange(0, 0),
      Chaos: makeDamageRange(0, 0),
    };
    const stubStage2: Stage2AddedDamageResult = {
      effectiveSkillLevel: 27,
      weaponDamageMultiplierPct: 100,
      damageEffectiveness: 1,
      queryFlags: ModFlags.Attack | ModFlags.Hit,
      evalContext: { conditions: {}, stats: {} },
      weaponBaseRanges: zeroRanges,
      addedAfterEffectivenessRanges: zeroRanges,
      baseRanges: zeroRanges,
      baseCritChancePct: 0,
      baseActionTimeSec: 1,
    };
    const stubStage3 = {
      chunks: [
        {
          currentType: 'Lightning' as const,
          ancestralMask: KeywordFlags.Lightning,
          range: makeDamageRange(100, 100),
        },
      ],
      convertedOutPctByType: { Physical: 0, Lightning: 0, Cold: 0, Fire: 0, Chaos: 0 },
      gainedAsExtraByType: zeroRanges,
    };

    const stage4 = computeStage4IncMoreAndMitigation(
      stubStage3.chunks,
      modDb,
      build.enemyConfig,
      -100,
      ModFlags.Attack | ModFlags.Hit,
      { conditions: {}, stats: {} },
    );
    expect(stage4.scaledRanges.Lightning.min).toBeCloseTo(100, 2);
    expect(stage4.scaledRanges.Lightning.max).toBeCloseTo(400, 2);

    const stage5 = computeStage5CritAndHit(
      stubStage2,
      stubStage3,
      stage4,
      modDb,
      build.enemyConfig,
      ModFlags.Attack | ModFlags.Hit,
      { conditions: {}, stats: {} },
    );
    expect(stage5.isLuckyDamage).toBe(true);
    expect(stage5.averageHit).toBeCloseTo(300, 2);
  });

  it('aggregates Stage 10 multi-part Full DPS across active parts (1x + 5x) cleanly', () => {
    const build = createDefaultBuildState();
    build.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Storm Song
Prophecy Wand
--------
Physical Damage: 40-80
Critical Strike Chance: 9.00%
Attacks per Second: 1.50
--------
Adds 50 to 120 Lightning Damage`);

    const full = computeStage10FullDps(build, new ModDB(), 27, 4000, 0, SEED_CATALOGS);
    expect(full.skillResults.length).toBeGreaterThanOrEqual(2);
    const proj = full.skillResults.find((r) => r.partId === 'projectile');
    const exp = full.skillResults.find((r) => r.partId === 'clustering_explosion');
    expect(proj).toBeDefined();
    expect(exp).toBeDefined();
    expect(full.combinedFullDps).toBeCloseTo(
      (proj?.partFullDpsContribution ?? 0) + (exp?.partFullDpsContribution ?? 0),
      0,
    );
    expect(full.combinedFullDps).toBeGreaterThan(full.activeSkillDps);

    const skill = SEED_CATALOGS.skills.find((s) => s.id === 'kinetic_blast_of_clustering')!;
    const modDb = new ModDB();
    modDb.addMod({ name: 'FireMin', type: 'BASE', value: 100, flags: ModFlags.Attack, keywordFlags: 0, source: SRC });
    modDb.addMod({ name: 'FireMax', type: 'BASE', value: 100, flags: ModFlags.Attack, keywordFlags: 0, source: SRC });
    const s2 = computeStage2AddedDamage(skill, skill.parts[0]!, 27, modDb, build);
    expect(s2.baseRanges.Fire.min).toBeCloseTo(100 * s2.damageEffectiveness, 1);
  });
});

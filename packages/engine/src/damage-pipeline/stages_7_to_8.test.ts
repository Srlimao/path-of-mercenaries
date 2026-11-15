import { describe, expect, it } from 'vitest';
import { ModFlags } from '../catalog-types/index.js';
import { ModDB } from '../mod-db/index.js';
import { createDefaultBuildState } from '../orchestrator/create_default_build_state.js';
import { calculateBuild } from '../orchestrator/calculate_build.js';
import { parsePoeItemClipboard } from '../item-parser/index.js';
import { SEED_CATALOGS } from '../seed-catalog/index.js';
import { computeStage7EnemyEffectiveResist, ENEMY_BOSS_PRESETS } from './stage7_enemy_resistances.js';
import { computeStage8EnemyMitigationAndTaken } from './stage8_enemy_pdr_and_taken.js';

describe('Damage Pipeline Stages 7-8 (Enemy Boss Presets, Curses & Mitigation)', () => {
  it('applies boss hex penalty (0.67x) to Curses on Pinnacle bosses vs full effect on Standard Monsters', () => {
    const stdEnemy = {
      ...createDefaultBuildState().enemyConfig,
      presetId: 'standard' as const,
      baseResistsPct: { ...ENEMY_BOSS_PRESETS.standard.baseResistsPct },
      activeCurses: ['conductivity'],
    };
    const pinEnemy = {
      ...createDefaultBuildState().enemyConfig,
      presetId: 'pinnacle' as const,
      baseResistsPct: { ...ENEMY_BOSS_PRESETS.pinnacle.baseResistsPct },
      activeCurses: ['conductivity'],
    };

    const stdRes = computeStage7EnemyEffectiveResist('Lightning', stdEnemy, new ModDB(), 0, ModFlags.Attack, { conditions: {}, stats: {} });
    const pinRes = computeStage7EnemyEffectiveResist('Lightning', pinEnemy, new ModDB(), 0, ModFlags.Attack, { conditions: {}, stats: {} });

    // Standard: 40 - 36 = 4%; Pinnacle: 50 - (36 * 0.67) = 25.9%
    expect(stdRes).toBeCloseTo(4, 1);
    expect(pinRes).toBeCloseTo(25.9, 1);
  });

  it('applies Uber Pinnacle 0.30x damage multiplier (70% less damage taken) relative to Pinnacle', () => {
    const buildPin = createDefaultBuildState();
    buildPin.equippedItems.Weapon1 = parsePoeItemClipboard(`Item Class: Wands
Rarity: Rare
Boss Tester
Prophecy Wand
--------
Physical Damage: 50-100
Critical Strike Chance: 8.50%
Attacks per Second: 1.50
--------
Adds 40 to 120 Lightning Damage`);

    const buildUber = structuredClone(buildPin);
    buildUber.enemyConfig.presetId = 'uber_pinnacle';
    buildUber.enemyConfig.armour = ENEMY_BOSS_PRESETS.uber_pinnacle.armour;
    buildUber.enemyConfig.evasion = ENEMY_BOSS_PRESETS.uber_pinnacle.evasion;

    const pinOut = calculateBuild(buildPin, SEED_CATALOGS).snapshot.activeSkillDps;
    const uberOut = calculateBuild(buildUber, SEED_CATALOGS).snapshot.activeSkillDps;
    expect(uberOut).toBeGreaterThan(0);
    expect(uberOut / pinOut).toBeLessThan(0.32);
    expect(uberOut / pinOut).toBeGreaterThan(0.2);

    const mit = computeStage8EnemyMitigationAndTaken(
      'Fire',
      1000,
      50,
      { ...buildPin.enemyConfig, presetId: 'uber_pinnacle', shockPct: 50, isCoveredInAsh: true },
      ModFlags.Attack,
    );
    // 50% res -> 0.5x * (1 + 0.5 + 0.2) * 0.30 = 0.255
    expect(mit.mitigationMultiplier).toBeCloseTo(0.255, 3);
  });
});

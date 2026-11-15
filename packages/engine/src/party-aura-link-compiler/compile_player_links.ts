import {
  KeywordFlags,
  ModFlags,
  type PartyConfigState,
} from '../catalog-types/index.js';
import type { ModDB, ModSource } from '../mod-db/index.js';

function makeLinkSource(sourceId: string, sourceLabel: string, rawLine: string): ModSource {
  return {
    sourceType: 'PartyLink',
    sourceId,
    sourceLabel,
    rawLine,
  };
}

/**
 * Computes Flame Link flat Added Fire Damage to Attacks from Player Max Life,
 * Link Gem Level (1–30), and Player Link Effect %.
 */
export function computeFlameLinkAddedFire(
  gemLevel: number,
  playerMaxLife: number,
  linkEffectPct: number,
): { min: number; max: number } {
  const clampedLv = Math.max(1, Math.min(30, gemLevel));
  // Lv 1 ~ [7, 11], Lv 20 = [44, 66], scales smoothly into 21-30
  const baseMin = 5 + clampedLv * 1.95;
  const baseMax = 8 + clampedLv * 2.9;
  const lifeBonus = Math.max(0, playerMaxLife) * 0.05;
  const scalar = Math.max(0, 1 + linkEffectPct / 100);
  return {
    min: Math.round((baseMin + lifeBonus) * scalar),
    max: Math.round((baseMax + lifeBonus) * scalar),
  };
}

/**
 * Compiles Luminary / Support-Player Link buffs applied onto the Carry Mercenary:
 * - Flame Link: Added Fire Damage scaled by Player Max Life & Gem Lv
 * - Destructive Link: Main-Hand Base Crit override + Crit Multiplier
 * - Intuitive Link: Attack & Spell Block Chance
 */
export function compilePlayerLinkMods(
  partyConfig: PartyConfigState,
  modDb: ModDB,
): void {
  const { flameLink, destructiveLink, intuitiveLink } = partyConfig.links;

  if (flameLink.enabled) {
    const fire = computeFlameLinkAddedFire(
      flameLink.gemLevel,
      flameLink.playerMaxLife,
      flameLink.linkEffectPct,
    );
    const label = `Player Flame Link (Lv ${flameLink.gemLevel}, ${Math.round(flameLink.playerMaxLife)} Life)`;
    modDb.addMods([
      {
        name: 'FireMin',
        type: 'BASE',
        value: fire.min,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.None,
        source: makeLinkSource('flame_link', label, `Adds ${fire.min} to ${fire.max} Fire Damage to Attacks`),
      },
      {
        name: 'FireMax',
        type: 'BASE',
        value: fire.max,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.None,
        source: makeLinkSource('flame_link', label, `Adds ${fire.min} to ${fire.max} Fire Damage to Attacks`),
      },
    ]);
  }

  if (destructiveLink.enabled) {
    const lv = Math.max(1, Math.min(30, destructiveLink.gemLevel));
    const critMulti = Math.round(40 + (lv - 1) * 1.5);
    const baseCritOverride = Math.max(0, Math.min(100, destructiveLink.playerMainHandCritPct));
    const label = `Player Destructive Link (Lv ${lv})`;
    modDb.addMods([
      {
        name: 'DestructiveLinkMainHandCritOverride',
        type: 'OVERRIDE',
        value: baseCritOverride,
        flags: ModFlags.Attack,
        keywordFlags: KeywordFlags.None,
        source: makeLinkSource('destructive_link', label, `Main Hand Base Crit Chance overridden to ${baseCritOverride.toFixed(2)}%`),
      },
      {
        name: 'CritMultiplier',
        type: 'BASE',
        value: critMulti,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: makeLinkSource('destructive_link', label, `+${critMulti}% to Critical Strike Multiplier`),
      },
    ]);
  }

  if (intuitiveLink.enabled) {
    const label = 'Player Intuitive Link';
    if (intuitiveLink.blockPct > 0) {
      modDb.addMod({
        name: 'AttackBlockChance',
        type: 'BASE',
        value: intuitiveLink.blockPct,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: makeLinkSource('intuitive_link', label, `+${intuitiveLink.blockPct}% Chance to Block Attack Damage`),
      });
    }
    if (intuitiveLink.spellBlockPct > 0) {
      modDb.addMod({
        name: 'SpellBlockChance',
        type: 'BASE',
        value: intuitiveLink.spellBlockPct,
        flags: ModFlags.None,
        keywordFlags: KeywordFlags.None,
        source: makeLinkSource('intuitive_link', label, `+${intuitiveLink.spellBlockPct}% Chance to Block Spell Damage`),
      });
    }
  }
}

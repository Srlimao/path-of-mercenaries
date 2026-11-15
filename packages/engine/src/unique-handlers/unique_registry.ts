import {
  EQUIPMENT_SLOTS,
  KeywordFlags,
  ModFlags,
  type EquipmentSlot,
  type MercenaryBuildState,
  type ParsedItem,
} from '../catalog-types/index.js';
import type { EvalContext, ModDB, ModSource } from '../mod-db/index.js';
import { SEED_UNIQUES } from '../seed-catalog/index.js';

export interface UniqueHandlerContext {
  slot: EquipmentSlot;
  item: ParsedItem;
  buildState: MercenaryBuildState;
  modDb: ModDB;
  source: ModSource;
}

export interface UniqueMechanicalHandler {
  uniqueId: string;
  name: string;
  category: 'offence' | 'defence' | 'party';
  summary: string;
  applyMods: (ctx: UniqueHandlerContext) => void;
}

const EMPTY_CTX: EvalContext = { conditions: {}, stats: {} };

const addBase = (ctx: UniqueHandlerContext, name: string, value: number, flags = ModFlags.None) =>
  ctx.modDb.addMod({ name, type: 'BASE', value, flags, keywordFlags: KeywordFlags.None, source: ctx.source });

const addInc = (ctx: UniqueHandlerContext, name: string, value: number, flags = ModFlags.None) =>
  ctx.modDb.addMod({ name, type: 'INC', value, flags, keywordFlags: KeywordFlags.None, source: ctx.source });

const addFlag = (ctx: UniqueHandlerContext, name: string, flags = ModFlags.None) =>
  ctx.modDb.addMod({ name, type: 'FLAG', value: true, flags, keywordFlags: KeywordFlags.None, source: ctx.source });

const noop = () => undefined;

const PASSIVE_PARSED_UNIQUES: UniqueMechanicalHandler[] = [
  { uniqueId: 'perquils_toe', name: "Perquil's Toe", category: 'party', summary: 'Nearby Allies hit damage is Lucky (explicit parser)', applyMods: noop },
  { uniqueId: 'rakiatas_dance', name: "Rakiata's Dance", category: 'offence', summary: 'Inverts enemy elemental resistances (explicit parser)', applyMods: noop },
  { uniqueId: 'original_sin', name: 'Original Sin', category: 'offence', summary: '100% Ele->Chaos & 0% enemy Chaos res (explicit parser)', applyMods: noop },
  { uniqueId: 'crown_of_the_tyrant', name: 'Crown of the Tyrant', category: 'party', summary: '-10% enemy res (explicit parser) & socket color flat (conditions compiler)', applyMods: noop },
  { uniqueId: 'nimis', name: 'Nimis', category: 'offence', summary: 'Projectiles Return (explicit parser)', applyMods: noop },
  { uniqueId: 'piscators_vigil', name: "Piscator's Vigil", category: 'offence', summary: 'Attack Elemental Penetration (explicit parser)', applyMods: noop },
  { uniqueId: 'ralakeshs_impatience', name: "Ralakesh's Impatience", category: 'offence', summary: 'Charge count minimum floor (conditions compiler)', applyMods: noop },
  { uniqueId: 'gravebind', name: 'Gravebind', category: 'party', summary: 'Kill attribution aura for on-kill effects', applyMods: noop },
  { uniqueId: 'dawnbreaker', name: 'Dawnbreaker', category: 'defence', summary: 'Phys/Cold/Lightning taken as Fire (explicit parser)', applyMods: noop },
  { uniqueId: 'cloak_of_flame', name: 'Cloak of Flame', category: 'defence', summary: '40% Phys taken as Fire (explicit parser)', applyMods: noop },
  { uniqueId: 'lightning_coil', name: 'Lightning Coil', category: 'defence', summary: '50% Phys taken as Lightning (explicit parser)', applyMods: noop },
];

const ACTIVE_MECHANICAL_UNIQUES: UniqueMechanicalHandler[] = [
  {
    uniqueId: 'doryanis_prototype',
    name: "Doryani's Prototype",
    category: 'defence',
    summary: 'Armour applies to Lightning hits; Lightning Res does not affect Lightning Damage taken',
    applyMods: (ctx) => {
      addFlag(ctx, 'DoryaniLightningResIgnoredForTaken');
      addFlag(ctx, 'DoryaniArmourAppliesToLightning');
    },
  },
  {
    uniqueId: 'heatshiver',
    name: 'Heatshiver',
    category: 'offence',
    summary: '+30% Cold as Extra Fire vs Chilled; +70% vs Frozen',
    applyMods: (ctx) => {
      const { isChilled, isFrozen } = ctx.buildState.enemyConfig;
      if (isChilled) addBase(ctx, 'ColdAsExtraFire', 30);
      if (isFrozen) addBase(ctx, 'ColdAsExtraFire', 70);
    },
  },
  {
    uniqueId: 'yoke_of_suffering',
    name: 'Yoke of Suffering',
    category: 'offence',
    summary: 'Enemies take +10% increased Damage per ailment inflicted',
    applyMods: (ctx) => {
      const e = ctx.buildState.enemyConfig;
      const ailments =
        (e.isChilled ? 1 : 0) +
        (e.isFrozen ? 1 : 0) +
        (e.isIgnited ? 1 : 0) +
        ((e.shockPct ?? 0) > 0 ? 1 : 0) +
        ((e.scorchPct ?? 0) > 0 ? 1 : 0) +
        ((e.brittlePct ?? 0) > 0 ? 1 : 0) +
        (e.isBleeding ? 1 : 0) +
        (e.isPoisoned ? 1 : 0);
      if (ailments > 0) addBase(ctx, 'EnemyDamageTaken', ailments * 10);
    },
  },
  {
    uniqueId: 'the_taming',
    name: 'The Taming',
    category: 'offence',
    summary: '+40% increased Damage with Hits and Ailments per Freeze, Shock, or Ignite on Enemy',
    applyMods: (ctx) => {
      const e = ctx.buildState.enemyConfig;
      const count = (e.isFrozen ? 1 : 0) + ((e.shockPct ?? 0) > 0 ? 1 : 0) + (e.isIgnited ? 1 : 0);
      if (count > 0) {
        addInc(ctx, 'Damage', count * 40, ModFlags.Hit);
        addInc(ctx, 'Damage', count * 40, ModFlags.Ailment | ModFlags.Dot);
      }
    },
  },
  {
    uniqueId: 'voidforge',
    name: 'Voidforge',
    category: 'offence',
    summary: 'Deal no Non-Elemental Damage; expected +233.3% Phys as Extra each Element (700%/3)',
    applyMods: (ctx) => {
      const avgExtra = 700 / 3;
      addFlag(ctx, 'DealNoPhysicalDamage');
      addFlag(ctx, 'DealNoChaosDamage');
      addBase(ctx, 'PhysicalAsExtraFire', avgExtra);
      addBase(ctx, 'PhysicalAsExtraCold', avgExtra);
      addBase(ctx, 'PhysicalAsExtraLightning', avgExtra);
    },
  },
  {
    uniqueId: 'ephemeral_edge',
    name: 'Ephemeral Edge',
    category: 'offence',
    summary: 'Attacks gain Added Max Lightning Damage equal to 20% of Maximum ES',
    applyMods: (ctx) => {
      const q = (names: string[]) => ({ names, flags: ModFlags.None, keywordFlags: KeywordFlags.None, context: EMPTY_CTX });
      const int = ctx.modDb.sum('BASE', q(['Int']));
      const baseEs = ctx.modDb.sum('BASE', q(['EnergyShield']));
      const incEs = ctx.modDb.sum('INC', q(['EnergyShield']));
      const currentEs = Math.max(0, baseEs * (1 + (incEs + int / 5) / 100));
      const bonusMax = Math.round(currentEs * 0.2);
      if (bonusMax > 0) addBase(ctx, 'LightningMax', bonusMax, ModFlags.Attack);
    },
  },
  {
    uniqueId: 'sign_of_the_sin_eater',
    name: 'Sign of the Sin Eater',
    category: 'party',
    summary: 'Grants Level 30 Smite flat Lightning aura when player Smite is not already active',
    applyMods: (ctx) => {
      if (!ctx.buildState.partyConfig.smiteEnabled) {
        addBase(ctx, 'LightningMin', 24);
        addBase(ctx, 'LightningMax', 460);
      }
    },
  },
  {
    uniqueId: 'leer_cast',
    name: 'Leer Cast',
    category: 'party',
    summary: 'You and nearby Allies gain +50% increased Damage',
    applyMods: (ctx) => addInc(ctx, 'Damage', 50),
  },
  {
    uniqueId: 'dying_breath',
    name: 'Dying Breath',
    category: 'party',
    summary: '+18% increased Damage & +18% Enemy Curse Effect aura',
    applyMods: (ctx) => {
      addInc(ctx, 'Damage', 18);
      addBase(ctx, 'EnemyCurseEffect', 18);
    },
  },
  {
    uniqueId: 'kingmaker',
    name: 'Kingmaker',
    category: 'party',
    summary: '+50% Crit Multiplier, Culling Strike, and 10 Fortification aura',
    applyMods: (ctx) => {
      addBase(ctx, 'CritMultiplier', 50);
      addFlag(ctx, 'CullingStrike');
      addBase(ctx, 'KingmakerFortify', 10);
    },
  },
  {
    uniqueId: 'garb_of_the_ephemeral',
    name: 'Garb of the Ephemeral',
    category: 'defence',
    summary: 'Nearby Enemies cannot deal Critical Strikes',
    applyMods: (ctx) => addFlag(ctx, 'EnemiesCannotCrit'),
  },
];

export const UNIQUE_HANDLER_REGISTRY: Record<string, UniqueMechanicalHandler> = Object.fromEntries(
  [...PASSIVE_PARSED_UNIQUES, ...ACTIVE_MECHANICAL_UNIQUES].map((h) => [h.uniqueId, h]),
);

function resolveUniqueId(item: ParsedItem): string | undefined {
  if (item.uniqueHandlerId) return item.uniqueHandlerId;
  if (item.uniqueId) return item.uniqueId;
  const targetName = item.name.trim().toLowerCase();
  return SEED_UNIQUES.find((u) => u.name.trim().toLowerCase() === targetName)?.id;
}

/** Executes special mechanical unique handlers for all equipped items into ModDB. */
export function compileUniqueHandlerMods(buildState: MercenaryBuildState, modDb: ModDB): void {
  for (const slot of EQUIPMENT_SLOTS) {
    const item = buildState.equippedItems[slot];
    if (!item) continue;
    const handlerId = resolveUniqueId(item);
    if (!handlerId) continue;
    const handler = UNIQUE_HANDLER_REGISTRY[handlerId];
    if (!handler) continue;
    handler.applyMods({
      slot,
      item,
      buildState,
      modDb,
      source: {
        sourceType: 'Item',
        sourceId: `unique:${handler.uniqueId}:${slot}`,
        sourceLabel: `${handler.name} (${slot})`,
        rawLine: handler.summary,
      },
    });
  }
}

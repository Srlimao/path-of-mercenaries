import type { SupportGemDefinition } from '../catalog-types/index.js';

export function makeMercSupport(
  id: string,
  name: string,
  requiredSkillTags: string[],
  t1: string[],
  t2: string[],
  t3: string[],
  opts?: Pick<SupportGemDefinition, 'isGilded' | 'tiersAvailable' | 'excludedSkillTags'>,
): SupportGemDefinition {
  return {
    id,
    name,
    requiredSkillTags,
    ...(opts?.excludedSkillTags ? { excludedSkillTags: opts.excludedSkillTags } : {}),
    ...(opts?.isGilded ? { isGilded: true } : {}),
    tiersAvailable: opts?.tiersAvailable ?? [1, 2, 3],
    manaMultiplierPct: 100,
    modsByLevel: { 1: t1, 2: t2, 3: t3 },
  };
}

export function makeTier3MercSupport(
  id: string,
  name: string,
  requiredSkillTags: string[],
  mods: string[],
  isGilded = false,
): SupportGemDefinition {
  return makeMercSupport(id, name, requiredSkillTags, mods, mods, mods, {
    ...(isGilded ? { isGilded: true } : {}),
    tiersAvailable: [3],
  });
}

export const SEED_MERCENARY_EXCLUSIVE_AND_GILDED_SUPPORTS: SupportGemDefinition[] = [
  makeMercSupport(
    'dot_multiplier',
    'DoT Multiplier',
    ['Hit'],
    ['+15% to Damage over Time Multiplier'],
    ['+25% to Damage over Time Multiplier'],
    ['+35% to Damage over Time Multiplier'],
  ),
  makeMercSupport(
    'physical_as_extra_element',
    'Physical as Extra Element',
    ['Hit'],
    ['Supported Skills Gain 10% of Physical Damage as Extra Damage of a random Element'],
    ['Supported Skills Gain 20% of Physical Damage as Extra Damage of a random Element'],
    ['Supported Skills Gain 35% of Physical Damage as Extra Damage of a random Element'],
  ),
  makeMercSupport(
    'physical_as_extra_chaos',
    'Physical as Extra Chaos',
    ['Hit'],
    ['Supported Skills Gain 15% of Physical Damage as Extra Chaos Damage'],
    ['Supported Skills Gain 15% of Physical Damage as Extra Chaos Damage'],
    ['Supported Skills Gain 30% of Physical Damage as Extra Chaos Damage'],
    { tiersAvailable: [2, 3] },
  ),
  makeMercSupport(
    'chaos_penetration',
    'Chaos Penetration',
    ['Hit'],
    ['Supported Skills Penetrate 10% Chaos Resistance'],
    ['Supported Skills Penetrate 15% Chaos Resistance'],
    ['Supported Skills Penetrate 20% Chaos Resistance'],
  ),
  makeMercSupport(
    'cooldown_recovery',
    'Cooldown Recovery',
    [],
    ['Supported Skills have 15% increased Cooldown Recovery Rate'],
    ['Supported Skills have 25% increased Cooldown Recovery Rate'],
    ['Supported Skills have 35% increased Cooldown Recovery Rate'],
  ),
  makeTier3MercSupport(
    'lucky_lightning_damage',
    'Lucky Lightning Damage III',
    ['Hit'],
    ['Lightning Damage with Non-Critical Strikes is Lucky'],
  ),
  makeTier3MercSupport(
    'gilded_heft',
    'Gilded Heft III',
    ['Attack'],
    ['Supported Attack Skills deal 40% more Maximum Physical Attack Damage'],
    true,
  ),
  makeTier3MercSupport(
    'gilded_jolt',
    'Gilded Jolt III',
    ['Hit'],
    ['Supported Skills have +10% to Critical Strike Chance'],
    true,
  ),
  makeTier3MercSupport(
    'gilded_cull',
    'Gilded Cull III',
    ['Hit'],
    ['Kill Enemies that have 10% Life or lower when Hit by Supported Skills'],
    true,
  ),
  makeTier3MercSupport(
    'gilded_freezer_burn',
    'Gilded Freezer Burn III',
    ['Hit'],
    ['Supported Skills Gain 30% of Cold Damage as Extra Fire Damage'],
    true,
  ),
  makeTier3MercSupport(
    'gilded_voltaxic_conversion',
    'Gilded Voltaxic Conversion III',
    ['Hit'],
    ['40% of Lightning Damage Converted to Chaos Damage'],
    true,
  ),
  makeTier3MercSupport(
    'gilded_caustic_conversion',
    'Gilded Caustic Conversion III',
    ['Hit'],
    ['40% of Physical Damage Converted to Chaos Damage'],
    true,
  ),
  makeTier3MercSupport(
    'gilded_scattershot',
    'Gilded Scattershot III',
    ['Projectile'],
    ['Supported Skills fire 4 additional Projectiles', 'Supported Skills deal 20% less Projectile Damage'],
    true,
  ),
];

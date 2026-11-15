import {
  ENEMY_BOSS_PRESETS,
  type EnemyConfigState,
  type EnemyPresetId,
  type MercenaryBuildState,
  type PartyConfigState,
} from '@pom/engine';

export function updateFlameLinkInState(
  prev: MercenaryBuildState,
  patch: Partial<PartyConfigState['links']['flameLink']>,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      links: {
        ...prev.partyConfig.links,
        flameLink: { ...prev.partyConfig.links.flameLink, ...patch },
      },
    },
  };
}

export function updateDestructiveLinkInState(
  prev: MercenaryBuildState,
  patch: Partial<PartyConfigState['links']['destructiveLink']>,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      links: {
        ...prev.partyConfig.links,
        destructiveLink: { ...prev.partyConfig.links.destructiveLink, ...patch },
      },
    },
  };
}

export function updateIntuitiveLinkInState(
  prev: MercenaryBuildState,
  patch: Partial<PartyConfigState['links']['intuitiveLink']>,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      links: {
        ...prev.partyConfig.links,
        intuitiveLink: { ...prev.partyConfig.links.intuitiveLink, ...patch },
      },
    },
  };
}

export function setGlobalAuraEffectInState(
  prev: MercenaryBuildState,
  pct: number,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      globalPlayerAuraEffectPct: Math.max(0, Math.min(400, Math.round(pct))),
    },
  };
}

export function setGenerositySupportedInState(
  prev: MercenaryBuildState,
  generositySupported: boolean,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: { ...prev.partyConfig, generositySupported },
  };
}

export function togglePlayerAuraInState(
  prev: MercenaryBuildState,
  auraId: string,
  defaultLevel = 21,
): MercenaryBuildState {
  const existing = prev.partyConfig.auras[auraId];
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      auras: {
        ...prev.partyConfig.auras,
        [auraId]: {
          enabled: !(existing?.enabled ?? false),
          level: existing?.level ?? defaultLevel,
        },
      },
    },
  };
}

export function setPlayerAuraLevelInState(
  prev: MercenaryBuildState,
  auraId: string,
  level: number,
): MercenaryBuildState {
  const clamped = Math.max(1, Math.min(35, Math.round(level)));
  const existing = prev.partyConfig.auras[auraId];
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      auras: {
        ...prev.partyConfig.auras,
        [auraId]: {
          enabled: existing?.enabled ?? true,
          level: clamped,
        },
      },
    },
  };
}

export function setSmiteEnabledInState(
  prev: MercenaryBuildState,
  smiteEnabled: boolean,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: { ...prev.partyConfig, smiteEnabled },
  };
}

export function setPyroclastMineCountInState(
  prev: MercenaryBuildState,
  count: number,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      pyroclastMineCount: Math.max(0, Math.min(25, Math.round(count))),
    },
  };
}

export function updateCombatConditionsInState(
  prev: MercenaryBuildState,
  patch: Partial<PartyConfigState['combatConditions']>,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      combatConditions: { ...prev.partyConfig.combatConditions, ...patch },
    },
  };
}

export function setCustomModifierLinesTextInState(
  prev: MercenaryBuildState,
  rawText: string,
): MercenaryBuildState {
  return {
    ...prev,
    partyConfig: {
      ...prev.partyConfig,
      customModifierLines: rawText.split(/\r?\n/),
    },
  };
}

export function applyEnemyBossPresetInState(
  prev: MercenaryBuildState,
  presetId: EnemyPresetId,
): MercenaryBuildState {
  const preset = ENEMY_BOSS_PRESETS[presetId];
  return {
    ...prev,
    enemyConfig: {
      ...prev.enemyConfig,
      presetId: preset.id,
      level: preset.level,
      baseResistsPct: { ...preset.baseResistsPct },
      armour: preset.armour,
      evasion: preset.evasion,
      physicalHitSize: preset.physicalHitSize,
    },
  };
}

export function updateEnemyConfigInState(
  prev: MercenaryBuildState,
  patch: Partial<EnemyConfigState>,
): MercenaryBuildState {
  return {
    ...prev,
    enemyConfig: { ...prev.enemyConfig, ...patch },
  };
}

export function toggleEnemyCurseInState(
  prev: MercenaryBuildState,
  curseId: string,
): MercenaryBuildState {
  const active = prev.enemyConfig.activeCurses;
  const next = active.includes(curseId)
    ? active.filter((c) => c !== curseId)
    : [...active, curseId];
  return {
    ...prev,
    enemyConfig: { ...prev.enemyConfig, activeCurses: next },
  };
}

export function setEnemyExposureInState(
  prev: MercenaryBuildState,
  elem: 'Fire' | 'Cold' | 'Lightning',
  value: number,
): MercenaryBuildState {
  return {
    ...prev,
    enemyConfig: {
      ...prev.enemyConfig,
      exposurePct: {
        ...prev.enemyConfig.exposurePct,
        [elem]: Math.max(0, Math.min(50, Math.round(value))),
      },
    },
  };
}

import type { ItemModTierType, ParsedItem } from '@pom/engine';

interface PoeItemTooltipProps {
  item: ParsedItem;
}

const MOD_CLASS_BY_TIER: Record<ItemModTierType, string> = {
  implicit: 'poe-mod-implicit',
  explicit: 'poe-mod-explicit',
  crafted: 'poe-mod-crafted',
  fractured: 'poe-mod-fractured',
  enchant: 'poe-mod-crafted',
};

export function PoeItemTooltip({ item }: PoeItemTooltipProps) {
  const rarityClass = `poe-tooltip-header--${item.rarity.toLowerCase()}`;
  const implicits = item.modLines.filter((m) => m.tierType === 'implicit' || m.tierType === 'enchant');
  const explicits = item.modLines.filter((m) => m.tierType !== 'implicit' && m.tierType !== 'enchant');
  const w = item.localWeaponStats;
  const a = item.localArmourStats;

  return (
    <div className="poe-tooltip">
      <div className={`poe-tooltip-header ${rarityClass}`}>
        <div>{item.name}</div>
        {item.baseType && item.baseType !== item.name && (
          <div style={{ fontSize: 11, fontWeight: 500 }}>{item.baseType}</div>
        )}
      </div>

      <div className="poe-tooltip-body">
        <div style={{ color: 'var(--pom-text-secondary)', fontSize: 11 }}>{item.itemClass}</div>
        {item.qualityPct > 0 && (
          <div style={{ fontSize: 11 }}>
            Quality: <span className="poe-mod-explicit">+{item.qualityPct}%</span>
          </div>
        )}

        {w && (
          <>
            {(w.physMax > 0) && (
              <div>
                Physical Damage:{' '}
                <span className="poe-mod-explicit tabular-nums">
                  {w.physMin}-{w.physMax}
                </span>
              </div>
            )}
            {(['Fire', 'Cold', 'Lightning', 'Chaos'] as const).map((dt) => {
              const min = w.eleMin[dt];
              const max = w.eleMax[dt];
              if (!min && !max) return null;
              return (
                <div key={dt}>
                  {dt} Damage:{' '}
                  <span className="tabular-nums" style={{ color: `var(--poe-${dt.toLowerCase()})` }}>
                    {min}-{max}
                  </span>
                </div>
              );
            })}
            <div>
              Critical Strike Chance:{' '}
              <span className="poe-mod-explicit tabular-nums">{w.critChancePct.toFixed(2)}%</span>
            </div>
            <div>
              Attacks per Second:{' '}
              <span className="poe-mod-explicit tabular-nums">{w.aps.toFixed(2)}</span>
            </div>
            <div style={{ color: 'var(--pom-gold)', fontSize: 11, marginTop: 2 }} className="tabular-nums">
              pDPS: {w.physDps} | eDPS: {w.eleDps} | Total: {w.totalDps}
            </div>
          </>
        )}

        {a && (
          <>
            {a.blockPct > 0 && (
              <div>
                Chance to Block: <span className="poe-mod-explicit tabular-nums">{a.blockPct}%</span>
              </div>
            )}
            {a.armour > 0 && (
              <div>
                Armour: <span className="poe-mod-explicit tabular-nums">{a.armour}</span>
              </div>
            )}
            {a.evasion > 0 && (
              <div>
                Evasion Rating: <span className="poe-mod-explicit tabular-nums">{a.evasion}</span>
              </div>
            )}
            {a.energyShield > 0 && (
              <div>
                Energy Shield: <span className="poe-mod-explicit tabular-nums">{a.energyShield}</span>
              </div>
            )}
            {a.ward > 0 && (
              <div>
                Ward: <span className="poe-mod-explicit tabular-nums">{a.ward}</span>
              </div>
            )}
          </>
        )}

        {implicits.length > 0 && (
          <>
            <div className="poe-tooltip-divider" />
            {implicits.map((line, i) => (
              <div key={i} className={MOD_CLASS_BY_TIER[line.tierType]}>
                {line.rawText}
              </div>
            ))}
          </>
        )}

        {explicits.length > 0 && (
          <>
            <div className="poe-tooltip-divider" />
            {explicits.map((line, i) => (
              <div key={i} className={MOD_CLASS_BY_TIER[line.tierType]}>
                {line.rawText}
              </div>
            ))}
          </>
        )}

        {item.corrupted && (
          <>
            <div className="poe-tooltip-divider" />
            <div className="poe-mod-corrupted">Corrupted</div>
          </>
        )}
      </div>
    </div>
  );
}

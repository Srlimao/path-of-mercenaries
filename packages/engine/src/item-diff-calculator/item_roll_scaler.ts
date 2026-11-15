import type { ItemModLine, ParsedItem } from '../catalog-types/index.js';
import { parsePoeItemClipboard, serializeItemToClipboard } from '../item-parser/index.js';
import { SEED_CATALOGS, type GameCatalogBundle } from '../seed-catalog/index.js';

export interface ModNumberRange {
  base: number;
  min: number;
  max: number;
  decimals: number;
}

export interface ScalableModMeta {
  hasNumbers: boolean;
  ranges: ModNumberRange[];
}

function computeRangeForNumber(rawToken: string): ModNumberRange {
  const val = Number(rawToken);
  const dotIdx = rawToken.indexOf('.');
  const decimals = dotIdx >= 0 ? rawToken.length - dotIdx - 1 : 0;

  if (val === 0 || Number.isNaN(val)) {
    return { base: val, min: val, max: val, decimals };
  }

  if (decimals > 0) {
    const factor = 10 ** decimals;
    const min =
      val > 0
        ? Math.round(val * 0.75 * factor) / factor
        : Math.round(val * 1.25 * factor) / factor;
    const max =
      val > 0
        ? Math.round(val * 1.25 * factor) / factor
        : Math.round(val * 0.75 * factor) / factor;
    return { base: val, min, max, decimals };
  }

  if (val > 0) {
    return {
      base: val,
      min: Math.max(1, Math.round(val * 0.75)),
      max: Math.max(val + 1, Math.round(val * 1.25)),
      decimals: 0,
    };
  }

  return {
    base: val,
    min: Math.min(val - 1, Math.round(val * 1.25)),
    max: Math.min(-1, Math.round(val * 0.75)),
    decimals: 0,
  };
}

/** Extracts scalable `[min, max]` bounds for every numeric value in a PoE mod line. */
export function extractScalableModMeta(rawLine: string): ScalableModMeta {
  const matches = rawLine.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const ranges = matches.map((token) => computeRangeForNumber(token));
  return {
    hasNumbers: ranges.length > 0,
    ranges,
  };
}

/** Scales numeric values in `templateLine` using a `0–100%` roll slider (`50%` = original value). */
export function scaleModLineByRollPct(templateLine: string, rollPct: number): string {
  const pct = Math.max(0, Math.min(100, rollPct));
  if (Math.abs(pct - 50) < 1e-6) {
    return templateLine;
  }

  return templateLine.replace(/-?\d+(?:\.\d+)?/g, (token) => {
    const range = computeRangeForNumber(token);
    if (range.min === range.max) return token;

    const interpolated =
      pct < 50
        ? range.min + ((range.base - range.min) * pct) / 50
        : range.base + ((range.max - range.base) * (pct - 50)) / 50;

    return range.decimals > 0
      ? interpolated.toFixed(range.decimals)
      : String(Math.round(interpolated));
  });
}

export interface RebuildEditedItemOptions {
  qualityPct: number;
  catalystType?: ParsedItem['catalystType'];
  rawTextOverride?: string;
  explicitModLines?: string[];
}

/**
 * Re-parses a modified item from updated quality, catalyst, explicit mod lines,
 * or raw PoE clipboard text so Stage 1 local weapon/armour math updates cleanly.
 */
export function rebuildEditedItem(
  originalItem: ParsedItem,
  options: RebuildEditedItemOptions,
  catalogs: GameCatalogBundle = SEED_CATALOGS,
): ParsedItem {
  const clampedQuality = Math.max(0, Math.min(30, Math.round(options.qualityPct)));
  let rawClipboardText = options.rawTextOverride;

  if (rawClipboardText === undefined) {
    const implicits = originalItem.modLines.filter(
      (m) => m.tierType === 'implicit' || m.tierType === 'enchant',
    );
    const nonImplicits: ItemModLine[] = options.explicitModLines
      ? options.explicitModLines
          .map((line) => line.trim())
          .filter(Boolean)
          .map((rawText, idx) => ({
            rawText,
            tierType:
              originalItem.modLines.filter(
                (m) => m.tierType !== 'implicit' && m.tierType !== 'enchant',
              )[idx]?.tierType ?? 'explicit',
          }))
      : originalItem.modLines.filter(
          (m) => m.tierType !== 'implicit' && m.tierType !== 'enchant',
        );

    const tempItem: ParsedItem = {
      ...originalItem,
      qualityPct: clampedQuality,
      modLines: [...implicits, ...nonImplicits],
    };
    rawClipboardText = serializeItemToClipboard(tempItem);
  }

  const parsed = parsePoeItemClipboard(rawClipboardText, catalogs);
  return {
    ...parsed,
    id: originalItem.id,
    catalystType: options.catalystType,
    uniqueId: parsed.uniqueId ?? (parsed.rarity === 'Unique' ? originalItem.uniqueId : undefined),
    uniqueHandlerId:
      parsed.uniqueHandlerId ??
      (parsed.rarity === 'Unique' ? originalItem.uniqueHandlerId : undefined),
  };
}

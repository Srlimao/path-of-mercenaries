import { evaluateModConditions } from './condition_evaluator.js';
import type { EvalContext, Mod, ModQuery, ModType, TabulatedModEntry } from './mod_types.js';

const EMPTY_CONTEXT: EvalContext = { conditions: {}, stats: {}, skillTags: [] };

/**
 * Path of Building-style tagged modifier store with source attribution.
 * Indexes modifiers by stat name for fast repeated evaluation.
 */
export class ModDB {
  private readonly modsByName = new Map<string, Mod[]>();
  private readonly allMods: Mod[] = [];

  public addMod(mod: Mod): void {
    this.allMods.push(mod);
    const bucket = this.modsByName.get(mod.name);
    if (bucket) {
      bucket.push(mod);
    } else {
      this.modsByName.set(mod.name, [mod]);
    }
  }

  public addMods(mods: readonly Mod[]): void {
    for (const mod of mods) {
      this.addMod(mod);
    }
  }

  public getAllMods(): readonly Mod[] {
    return this.allMods;
  }

  public sum(type: 'BASE' | 'INC', query: ModQuery): number {
    let total = 0;
    for (const mod of this.collectMatchingMods(type, query)) {
      if (typeof mod.value !== 'number') continue;
      const evalResult = evaluateModConditions(mod.conditions, query.context);
      if (!evalResult.active) continue;
      total += mod.value * evalResult.scalarMultiplier;
    }
    return total;
  }

  public more(query: ModQuery): number {
    let multiplier = 1;
    for (const mod of this.collectMatchingMods('MORE', query)) {
      if (typeof mod.value !== 'number') continue;
      const evalResult = evaluateModConditions(mod.conditions, query.context);
      if (!evalResult.active) continue;
      const resolvedPct = mod.value * evalResult.scalarMultiplier;
      multiplier *= Math.max(0, 1 + resolvedPct / 100);
    }
    return multiplier;
  }

  public override(name: string, query?: Partial<ModQuery>): number | undefined {
    const bucket = this.modsByName.get(name);
    if (!bucket) return undefined;

    const fullQuery: ModQuery = {
      names: [name],
      flags: query?.flags ?? 0,
      keywordFlags: query?.keywordFlags ?? 0,
      context: query?.context ?? EMPTY_CONTEXT,
    };

    let resolved: number | undefined;
    for (const mod of bucket) {
      if (mod.type !== 'OVERRIDE' || typeof mod.value !== 'number') continue;
      if (!this.matchesFlags(mod, fullQuery)) continue;
      const evalResult = evaluateModConditions(mod.conditions, fullQuery.context);
      if (!evalResult.active) continue;
      resolved = mod.value * evalResult.scalarMultiplier;
    }
    return resolved;
  }

  public flag(name: string, context: EvalContext = EMPTY_CONTEXT, flags = 0, keywordFlags = 0): boolean {
    const bucket = this.modsByName.get(name);
    if (!bucket) return false;

    const query: ModQuery = { names: [name], flags, keywordFlags, context };
    for (const mod of bucket) {
      if (mod.type !== 'FLAG' || mod.value !== true) continue;
      if (!this.matchesFlags(mod, query)) continue;
      const evalResult = evaluateModConditions(mod.conditions, context);
      if (evalResult.active) return true;
    }
    return false;
  }

  public tabulate(type: ModType, query: ModQuery): TabulatedModEntry[] {
    const entries: TabulatedModEntry[] = [];
    for (const mod of this.collectMatchingMods(type, query)) {
      const evalResult = evaluateModConditions(mod.conditions, query.context);
      if (!evalResult.active) continue;
      const resolvedValue =
        typeof mod.value === 'number'
          ? mod.value * evalResult.scalarMultiplier
          : mod.value
            ? 1
            : 0;
      if (resolvedValue === 0 && type !== 'OVERRIDE') continue;
      entries.push({
        sourceLabel: mod.source.sourceLabel,
        sourceType: mod.source.sourceType,
        sourceId: mod.source.sourceId,
        rawLine: mod.source.rawLine,
        modType: mod.type,
        resolvedValue,
      });
    }
    return entries;
  }

  private collectMatchingMods(type: ModType, query: ModQuery): Mod[] {
    const matched: Mod[] = [];
    const seen = new Set<Mod>();

    for (const name of query.names) {
      const bucket = this.modsByName.get(name);
      if (!bucket) continue;
      for (const mod of bucket) {
        if (seen.has(mod) || mod.type !== type) continue;
        if (!this.matchesFlags(mod, query)) continue;
        seen.add(mod);
        matched.push(mod);
      }
    }
    return matched;
  }

  private matchesFlags(mod: Mod, query: ModQuery): boolean {
    if ((query.flags & mod.flags) !== mod.flags) {
      return false;
    }
    if (mod.keywordFlags !== 0 && (query.keywordFlags & mod.keywordFlags) === 0) {
      return false;
    }
    return true;
  }
}

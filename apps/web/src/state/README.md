# `state` Bridge

Reactive React Context connecting UI components directly to `@pom/engine`'s `calculateBuild()`.

- `build_state_context.tsx`: Holds `MercenaryBuildState`, active tab (`items | skills | config | calcs`), memoized `EngineCalculationOutput`, and state updaters.
- `use_mercenary_calculator.ts`: Convenience hook exposing `snapshot`, `modDb`, `catalogs`, `activeArchetype`, `activeSkillGroup`, and `activeSkillDef`.

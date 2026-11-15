# `@pom/worker` Edge API

Cloudflare Workers + Hono edge API for Path of Mercenaries (`PoM`).

- Phase 1 provides `/api/health` and `/api/catalog/summary` plus D1 (`general-db`) and KV (`POM_CACHE_KV`) bindings in `wrangler.toml`.
- Phase 13 adds GGG `active_mercenary_index` proxy caching and immutable catalog endpoints.

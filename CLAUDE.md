# Front-end Platform - Claude Code Configuration

## Project Overview

**Front-end Platform** is the game client and lobby monorepo for the Game Front API. It uses **Nx** for workspace
management and **bun** as package manager. Games are separate apps launched by the lobby in an iframe — no Module
Federation.

Read before changing architecture:

- `docs/frontend-architecture.html` — client architecture (layers, present-after-animate, lobby profiles, stack, risks)
- `docs/index.html` — Game Front API architecture (session, nextStep flow, response model, variants, errors)
- `docs/Test Game Front API.md` — the API contract itself, with JSON examples
- `docs/multi-provider-gateway.html`, `docs/free-dev-infrastructure.html` — gateway and infra proposals
- `docs/crash-architecture.html` — crash game family next to slots (CrashTransport, gateway stream hub, multi-provider,
  SSE/WebSocket config); `docs/crash-api.md` is Provider A's native crash API

## Architecture

```
front-end-platform/
├── apps/
│   ├── lobby          # Vite + React (port 4200) — one build, many lobbies via runtime profile
│   └── games/
│       └── gameone    # Vite + React game client (port 4300) — config, atlases, Spine, adapter
├── packages/
│   ├── protocol       # Zod schemas + transports: common (`@fep/protocol`) and per game family (`@fep/protocol/slot`)
│   ├── game-core      # session, fingerprint, nextStep loop, error policy — plain TS (@fep/game-core)
│   ├── renderer       # PixiJS reels, win lines, big win — plain TS, no React (@fep/renderer)
│   ├── hud            # React HUD: bet panel, balance, popups (@fep/hud)
│   ├── lobby-kit      # lobby components, theming, profile types (@fep/lobby-kit)
│   ├── i18n           # i18next + translationsUrl (@fep/i18n)
│   └── mappers/
│       └── provider-a # Provider A native API → protocol, direct transport (@fep/mapper-provider-a)
└── docs/              # architecture + API docs (not formatted by Biome)
```

### Layering

Dependencies point down only, enforced by `@nx/enforce-module-boundaries` (tags in each `package.json` → `nx.tags`,
constraints in root `eslint.config.mjs`):

`type:app` → `type:ui` / `type:renderer` → `type:core` → `type:protocol` (`type:util` usable from anything above
protocol)

- `type:mapper` (`packages/mappers/*`) depends on `type:protocol` only and is imported by apps only: it translates one
  provider's native API into the protocol and holds that provider's direct transport
- React (`hud`, `lobby-kit`) and Pixi (`renderer`) never call the API — they read the store and send intents to
  `game-core`
- Per-frame reel motion is imperative Pixi driven from the store; React never re-renders per frame
- Game-specific state differences live in that game's adapter (`apps/games/<sysname>`), never in `hud` or `game-core`

### Game API rules that shape the code

- Call game init (`GET /game/{sessionKey}`) **once** per game start — it rotates the `fingerprint`, and a stale one gets
  error 112 (self-lockout)
- Every POST action sends `fingerprint`; action responses don't repeat it or `sessionKey`
- `nextStep` is the only driver of what is called next
- Present after animate: keep `pendingResult` separate from displayed state; commit balance/win after the reels land
- Money/bets are numeric strings; `extra` is `[]` outside freespin/bonus; index bases differ (reels/rows 1-based,
  `reelIndex`/`symbolIndex` 0-based)
- `GameState` is not one schema — 7 variant games need their own adapter

## Tech Stack

| Layer      | Technology                                 | Status    |
| ---------- | ------------------------------------------ | --------- |
| Build      | Nx 24, Vite 8, bun 1.2                     | installed |
| UI         | React 19                                   | installed |
| TypeScript | 6.0, strict                                | installed |
| Testing    | Vitest 5, React Testing Library, jsdom     | installed |
| Linting    | ESLint 9 (flat config), Biome 2.5          | installed |
| Commits    | Husky, commitlint, lint-staged             | installed |
| State      | Zustand (store), React Query (lobby/tours) | planned   |
| Validation | Zod 4                                      | planned   |
| Rendering  | PixiJS v8, GSAP, Spine, Motion             | planned   |
| Audio      | @pixi/sound                                | planned   |
| i18n       | i18next                                    | planned   |
| E2E        | Playwright smoke for a spin cycle          | planned   |

Planned dependencies are added to the package that uses them, together with the first code that uses them.

## Commands

```sh
# Install
bun install

# Development
bun run serve:lobby             # Lobby (port 4200)
bun run serve:gameone           # Game One (port 4300)
bun nx serve <PROJECT>

# Build
bun run build                   # all projects
bun nx build <PROJECT>

# Quality
bun nx lint <PROJECT>
bun nx test <PROJECT>
bun nx test <PROJECT> --coverage
bun nx typecheck <PROJECT>
bun nx run-many -t lint test typecheck build   # what must pass before merge
bun run format                  # biome check --write
bun run format:check            # biome check
bun nx graph

# Scaffolding (then add nx.tags + commitlint scope)
bun nx g @nx/react:app apps/games/<sysname> --name=<sysname> --bundler=vite --unitTestRunner=vitest --e2eTestRunner=none --linter=eslint --style=css --routing=false
bun nx g @nx/react:lib packages/<name> --name=<name> --bundler=none --unitTestRunner=vitest --linter=eslint --style=none
bun nx g @nx/js:lib packages/<name> --name=<name> --bundler=none --unitTestRunner=vitest --linter=eslint
```

Always run tasks through Nx (`bun nx ...`), not the underlying tool directly.

## Conventions

### Commit Messages

Conventional Commits format enforced by commitlint + husky (`commitlint.config.mjs`):

```
<type>(<scope>): <description>
```

- **Scopes:** lobby, gameone, protocol, game-core, hud, renderer, lobby-kit, i18n, mapper-provider-a, workspace, deps
- **Types:** feat, fix, chore, docs, refactor, style, ci, perf, test
- Max subject length: 64 characters
- New app/package → add its name to `scope-enum`

### Branch Naming

```
<initials>/<type>/<name>
```

Example: `ech/feat/spin-loop`, `ech/fix/fingerprint-retry`

### Code Style

- **Formatter/linter:** Biome (`biome.json`); ESLint only for Nx module boundaries
- **Indent:** 4 spaces
- **Semicolons:** required
- **Quotes:** double quotes
- **Line width:** 120 characters
- **Trailing commas:** ES5
- **Import sorting:** via Biome `organizeImports` assist

### TypeScript

- Prefer `Type[]` over `Array<Type>`
- Strict mode enabled
- Libraries expose their API from `src/index.ts`; import by package name (`@fep/game-core`), never deep paths
- Zod at the API edge, types via `z.infer`
- `moduleResolution: "bundler"` (set once in `tsconfig.base.json`): relative imports have no extension — `./money`, not
  `./money.js`

### Package Layout

One export per file — never mix types, schemas, constants and logic in one file. Group files by kind inside each game
family folder (`common/`, `slot/`):

```
src/
├── index.ts            # barrel: `export *` for code, `export type *` for type files
├── store/              # all zustand code, root level: store creation, state types, selector hooks, subscriptions
├── common/ | slot/
│   ├── schemas/        # <name>.schema.ts — one Zod schema each
│   ├── types/          # <name>.type.ts — one type/interface each (z.infer types live here, not next to the schema)
│   ├── config/         # static lookup maps, e.g. error codes
│   ├── constants/
│   ├── utils/          # one function each
│   ├── errors/         # error classes
│   └── <feature>/      # e.g. session/, transport/, adapters/
```

- Specs sit next to the file they test: `create-slot-session.spec.ts`
- Internal helpers (schemas, types) get their own file too, but stay out of the barrel

### Testing

- Unit tests with Vitest + React Testing Library
- `game-core`, `protocol`, adapters: test against the JSON examples in `docs/Test Game Front API.md`
- Coverage floor: 80% (statements, branches, functions, lines) — set as thresholds in each project's Vite/Vitest config
- Mock at network/infra boundaries (transport, time, randomness), not component boundaries

### Tech Debt

Mark with: `TODO[techdebt]: <description and proposed solution>`

## Important Notes

- Never push directly to main
- All lint/test/typecheck/build targets must pass before merge
- Trunk-based development workflow
- No CI pipeline yet; no NX Cloud
- `docs/` is excluded from Biome — don't reformat it

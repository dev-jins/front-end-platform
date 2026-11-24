<h1 align="center">Front-end Platform</h1>
<p>Game client and lobby monorepo for the Game Front API: a React HUD over a PixiJS canvas, a framework-free game core, and one lobby codebase deployed as many lobbies.</p>

Architecture: [`docs/frontend-architecture.html`](docs/frontend-architecture.html) · API: [`docs/index.html`](docs/index.html) ·
Source contract: [`docs/Test Game Front API.md`](docs/Test%20Game%20Front%20API.md)

## Get Started

#### Installation

We use `bun` as a package manager: [bun](https://bun.sh/)

```sh
// Install all dependencies
bun install
```

#### Commands

```sh
// Run development
bun nx serve <PROJECT_NAME>

e.g bun run serve:lobby      # http://localhost:4200
e.g bun run serve:gameone    # http://localhost:4300

// Preview a production build
bun nx preview <PROJECT_NAME>
```

#### Building

```sh
// Build
bun nx build <PROJECT_NAME>

e.g bun nx build lobby

// Build everything
bun run build
```

#### Lint

```sh
bun nx lint <PROJECT_NAME>

e.g bun nx lint game-core

// Lint / typecheck everything
bun run lint
bun run typecheck
```

### Testing

```sh
// Unit tests
bun nx test <PROJECT_NAME>

e.g bun nx test game-core

// Coverage report (fails under 80%)
bun nx test <PROJECT_NAME> --coverage

e.g bun nx test game-core --coverage
```

#### Project graph

```sh
bun nx graph
```

## Conventions and Best Practices

- [Introduction](#introduction)
- [Monorepo](#monorepo)
- [Commits and commit messages](#commits-and-commit-messages)
- [Code Quality](#code-quality)
- [Code Formatting](#code-formatting)
- [Linting](#linting)
- [File System](#file-system)
- [Typescript Semantics](#typescript-semantics)
- [Unit tests](#unit-tests)
- [Code Reviews](#code-reviews)
- [Never push directly to main](#never-push-directly-to-main)
- [Own the branches](#own-the-branches)
- [Provide descriptive PRs](#provide-descriptive-prs)
- [PRs must not break main](#prs-must-not-break-main)
- [External Libraries](#external-libraries)
- [Tech Debt](#intentional-tech-debt)
- [Scaffolding](#scaffolding)

### Introduction

This document contains various conventions and best practices that we strive to adhere to. While these rules are
important, we are still by and large driven by common sense.

- We want to move fast, but at the same time we want to reasonably minimize the amount of technical debt we incur
- We believe the [Broken windows theory](https://en.wikipedia.org/wiki/Broken_windows_theory) is true for code and
  everything surrounding it. We want to keep everything (code, commit messages, variable names, etc.) nice and tidy.
  This means that small things (typos, extra whitespace, etc.) matter

### Monorepo

We are using [Nx](https://nx.dev/) for monorepo management and `bun` workspaces for dependencies.

```sh
// NX Command Template

bun nx run <PROJECT_NAME>:<COMMAND> --options
```

We have 2 types of projects:

- **Application** (`apps/`) - a project that is meant to be run and deployed as a standalone application
- **Library** (`packages/`) - a project that is meant to be used as a dependency in other projects. Shared code is
  shared at build time through packages, not at runtime

```
apps/
├── lobby/              # Vite + React, one codebase for all lobbies (profile resolved at runtime)
└── games/
    └── gameone/        # one app per game: config, atlases, Spine, adapter
packages/
├── protocol/           # canonical Zod schemas + GameTransport
├── game-core/          # session, fingerprint, nextStep loop, error policy (no React)
├── renderer/           # PixiJS reels, win lines, big win (no React)
├── hud/                # React HUD components
├── lobby-kit/          # lobby components, theming, profile types
└── i18n/               # i18next + translationsUrl
```

Dependencies point down only. Every project carries a tag in its `package.json` (`nx.tags`) and
`@nx/enforce-module-boundaries` fails lint on an upward import:

| Tag             | Projects           | May depend on                      |
| --------------- | ------------------ | ---------------------------------- |
| `type:app`      | `lobby`, `games/*` | ui, renderer, core, protocol, util |
| `type:ui`       | `hud`, `lobby-kit` | ui, core, protocol, util           |
| `type:renderer` | `renderer`         | core, protocol, util               |
| `type:core`     | `game-core`        | protocol, util                     |
| `type:protocol` | `protocol`         | —                                  |
| `type:util`     | `i18n`             | —                                  |

Some of best practices we are following:

- Every project should have its own `README.md` file
  - Include in the project `README.md` mostly the structure of the project; everything shared is described in this
    main `README.md` file
  - Include in the `README.md` anything that is project specific
- Every project should have its own `package.json` file
- Every project should be architected in a way that it can be built and tested independently
- React and Pixi never call the API directly — they read from the store and send intents to `game-core`
- Game-specific differences live in that game's adapter and never leak into `hud` or `game-core`

### Commits and commit messages

- Where applicable commits should be squashed (or broken apart) to make sure that a commit represents a logical unit of
  work that is complete
- Drive by fixes should be reasonably avoided (they should come in a separate commit)
- Followup fixes within the same PR or a group of commits that are being merged together should be squashed
- Commit messages should be succinct _and_ descriptive
- Commit messages should contain references where applicable (like issue numbers) in addition to the description

#### Conventional Commits

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org) specification. The `commit-msg`
hook (Husky + commitlint) rejects anything that doesn't match.

```
type(scope): short subject   ← 64 chars max
```

Allowed types: `feat` · `fix` · `chore` · `docs` · `refactor` · `style` · `ci` · `perf` · `test`

Allowed scopes: `lobby` · `gameone` · `protocol` · `game-core` · `hud` · `renderer` · `lobby-kit` · `i18n` · `workspace` ·
`deps`

A new app or package adds its name to `scope-enum` in `commitlint.config.mjs`.

#### Commit Message Examples

```text
feat(game-core): follow nextStep after reels commit

fix(protocol): accept numeric-string bets in init response

feat(lobby-kit): allow profile theme to extend base tokens

BREAKING CHANGE: `theme.tokens` now extends the base theme instead of replacing it
```

### Code Quality

#### Code formatting

Javascript and Typescript give developers a lot of latitude in how they write code. We want to leverage that without
sacrificing style consistency, which is why formatting is automated.

- We use [prettier](https://prettier.io) — if Prettier is happy, the code is formatted correctly
- Semicolons required, double quotes, print width 120, ES5 trailing commas
- Imports are sorted by `@trivago/prettier-plugin-sort-imports` (external → `@fep/*` → relative)
- `lint-staged` formats staged files on the `pre-commit` hook
- Install `prettier` as your editor plugin and enable format on save
- `bun run format` formats the workspace; `bun nx format:check` verifies it

### Linting

ESLint 9 flat config. Every project has its own `eslint.config.mjs`, which extends the root `eslint.config.mjs`. Avoid
overriding the root configuration per project; propose a change to the root instead.

### File System

- `apps/` hold deployable applications, `packages/` hold shared libraries
- A library exposes its public API from `src/index.ts` only; import it by package name (`@fep/game-core`), never by a
  deep path
- New per-game code goes into `apps/games/<sysname>`; the 7 variant games (Space Infinity, Fruit Storm, Shootland, Dark
  Portal, TapTap, Pinball Inferno, Mystic Gates/Charmana) ship their own adapter there

### Typescript Semantics

Things can be expressed in a different way with Typescript. When in doubt, we prefer the following:

```typescript
// Prefer
Type[]
// instead of
Array<Type>
```

- Strict mode is enabled
- Validate API responses with Zod at the edge and derive types with `z.infer` — don't type `GameState` as one interface
- Money arrives as numeric strings; never parse it into a float

### Unit tests

For the `Unit tests` we use [Vitest](https://vitest.dev/) and `React Testing Library`.

`game-core`, `protocol` and the per-game adapters are tested against the JSON examples from the API doc. Product
components are required to have unit tests except very simple components (for example components rendering just props).

To see the coverage statistics please run `bun nx test <PROJECT_NAME> --coverage`. We target **80%** coverage across
source code; the threshold is set in every project's Vite/Vitest config, so `--coverage` fails below it.

Accepted criteria for the particular component / file _Unit Tests_ are

- **Statements**: 80% - 100%
- **Branches**: 80% - 100%
- **Functions**: 80% - 100%
- **Lines**: 80% - 100%

### Code Reviews

We are working with Trunk Based Development, which means that we are merging to `main` frequently. This means that we
need to be extra careful with the code that we are merging. We are using GitHub PRs for code reviews.

#### Never push directly to main

All feature work must happen on its own fork or a branch. No direct commits on `main` are allowed. Always branch from
`main`, never from another feature branch.

#### Own the branches

When creating branches you must prefix the branch with your initials and a forward slash. For example, Ernest Chakhoyan's
branches would be prefixed with `ech/...`.

```
<initials>/<type>/<short-description>
```

- If it is a feature `ech/feat/[feature-name]`
- If it is bug fix `ech/fix/[bug-name]`
- If it is test `ech/test/[container/component name]`

#### Provide descriptive PRs

In order to merge your changes you must always open a pull request.

1. Branch from `main`.
2. Keep the diff under ~400 lines. If it must be larger, explain why in the PR body.
3. Describe what changed and why; a skeleton description will be sent back without review.
4. All checks must be green before requesting review.
5. Do not merge your own PR unless you are the sole contributor and the change is a trivial chore.

#### PRs must not break main

All lint, typecheck, test and build targets must pass before the PR can be safely merged:

```sh
bun nx run-many -t lint test typecheck build
```

### External Libraries

- Please verify the license of every library before using it (e.g. the Spine editor licence for the art team)
- It is a good practice to use "as few as possible, but as many as necessary". Consider the "cost" of using a library
  (is it well maintained, is the project active, etc)
- If it's a smaller library with few contributors (and thus has a risk of being abandoned) and you just need a single
  function out of it, maybe it's a better idea just to implement the function yourself
- Add a dependency to the package that uses it, together with the first code that uses it. The planned stack is listed
  in [`docs/frontend-architecture.html`](docs/frontend-architecture.html) §7

### Intentional Tech Debt

- Comment sections with `TODO[techdebt]: ` and a description of the incurred tech debt as well as a high level solution
  to fix the tech debt

### Scaffolding

We are using the built-in [Nx](https://nx.dev/) generators. After generating, add the project's tag to its
`package.json` (`nx.tags`) and its name to `scope-enum` in `commitlint.config.mjs`.

```sh
// New game app (tag: type:app)
bun nx g @nx/react:app apps/games/<sysname> --name=<sysname> --bundler=vite --unitTestRunner=vitest --e2eTestRunner=none --linter=eslint --style=css --routing=false

// New React library (tag: type:ui)
bun nx g @nx/react:lib packages/<name> --name=<name> --bundler=none --unitTestRunner=vitest --linter=eslint --style=none

// New plain TS library
bun nx g @nx/js:lib packages/<name> --name=<name> --bundler=none --unitTestRunner=vitest --linter=eslint
```

---

## Contributing

> **Read this section before you open a branch or a PR.** These rules apply to everyone who contributes — team members,
> cross-team contributors, and external contractors alike.

### Git workflow

This repository follows the **Trunk-Based Development** workflow. See the
[Freedx Git Process](https://docs.freedx.com/git-process/introduction) docs for the full rules.

| Branch | Purpose                                 |
| ------ | --------------------------------------- |
| `main` | Source of truth — never commit directly |

### Running the service locally

```bash
bun install

bun run serve:lobby      # Lobby (port 4200)
bun run serve:gameone    # Game One client (port 4300)
```

### Running tests

```bash
bun nx test <PROJECT>
bun nx test <PROJECT> --coverage
```

### Getting help

If something in this repo is unclear, ask in the relevant Slack channel before opening a PR that might need to be
reverted.

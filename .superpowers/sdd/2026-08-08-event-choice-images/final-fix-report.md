# Final review fix wave — RED/GREEN report

Date: 2026-08-09
Starting head: `526e52d`
Worktree: `D:\CodeX\Game_5\.worktrees\event-choice-images`

## Scope and root causes

1. The art catalogue and strict asset audit already covered all nine faction challenge keys and all fifteen territory capture/fortify key pairs, but `factionBoard()` rendered text-only action buttons. Asset existence therefore did not prove UI use.
2. Resolving the final official event moves the engine directly to `ending`. The ordinary `result()` renderer was bypassed, so `lastResult.artKey` and `lastResult.success` never reached the shared result image/status presentation.
3. The service worker awaited runtime image writes without handling rejection. A successful network response was discarded when either `caches.open()` or `cache.put()` rejected.
4. `app.mjs` imported `art-content.mjs?v=1` while `engine.mjs` imported the unversioned module. The art catalogue then imported unversioned content modules, producing duplicate esbuild module identities and duplicate catalogue/content code.

## RED evidence

### Actual UI rendering

Command:

```text
node --test test/app-render.test.mjs
```

Meaningful RED result after correcting the DOM harness itself: 0 passed, 3 failed.

- Faction challenge and territory capture art paths were absent from rendered faction-board HTML.
- Territory fortify art paths were absent from rendered faction-board HTML.
- The finale ending HTML lacked `.result-art` and `.result-status`.

These tests load a saved game through the real app, render the actual view, and compare its output with independently resolved stable catalogue paths.

### Runtime cache rejection

Command:

```text
node --test --test-name-pattern="runtime cache writes reject" test/art-content.test.mjs
```

RED result: 0 passed, 1 failed. The successful network image promise rejected with `cache open rejected`. The test covers both `caches.open()` and `cache.put()` rejection.

### Bundle module identity

Command:

```text
node --test test/bundle.test.mjs
```

RED result: 0 passed, 1 failed. esbuild reported two art catalogue identities:

```text
src/art-content.mjs?v=1
src/art-content.mjs
```

## Minimal production changes

- Added `choicePicture()` output to every faction challenge action and every unlocked territory capture/defend or fortify action, using the registered stable parent/option keys and existing `battle` fallback category.
- Added the shared `resultPicture()` and `resultStatus()` presentation to `ending()` using `state.lastResult`, while retaining existing ending effects, flags, narrative, statistics, buttons, and free-play flow.
- Wrapped only the runtime cache clone/open/put sequence in `try/catch`; a successful network response is returned whether the best-effort cache write succeeds or rejects. The existing pending-write lifecycle remains awaited.
- Aligned app and engine on `art-content.mjs?v=1`, aligned catalogue content imports to the existing v23/v24 entry-module convention, and aligned the app chapter import to v24.
- Rebuilt `dist/game.bundle.js`. No image or gameplay-content asset was edited.

## GREEN evidence

### Focused regressions

Commands and results:

```text
node --test test/app-render.test.mjs test/bundle.test.mjs
4 passed, 0 failed

node --test --test-name-pattern="runtime cache" test/art-content.test.mjs
2 passed, 0 failed
```

The service-worker focused run includes both the original pending-write contract and the new rejected-write contract.

### Full Node suite

```text
node --test
71 passed, 0 failed
duration: 5.25 s
```

This includes the 200-seed complete-mainline simulation and all existing gameplay, persistence, art-key, faction, territory, market, battle, side-quest, character, and assistant tests.

### Strict art audit

```text
node scripts/audit-art-assets.mjs
Art audit: 293 requirements, 0 missing mappings, 0 missing files.
```

### Production build and duplication check

```text
esbuild src/app.mjs --bundle --format=iife --platform=browser --target=es2020 --charset=utf8 --legal-comments=none --minify --outfile=dist/game.bundle.js
dist/game.bundle.js  260.4kb
```

The same build was inspected through its esbuild metafile. Each relevant source now has exactly one module identity:

```text
art-content.mjs: 1 [src/art-content.mjs?v=1]
content.mjs: 1 [src/content.mjs?v=23]
chapter-content.mjs: 1 [src/chapter-content.mjs?v=24]
character-content.mjs: 1 [src/character-content.mjs?v=24]
life-content.mjs: 1 [src/life-content.mjs?v=23]
night-content.mjs: 1 [src/night-content.mjs?v=23]
faction-content.mjs: 1 [src/faction-content.mjs?v=23]
```

The pre-fix bundle measured 401.4kb; the rebuilt bundle is 260.4kb after removing duplicate module identities.

### Diff and preservation checks

```text
git diff --check
exit 0

git diff --name-only -- assets
(no output)
```

No image asset changed. The implementation did not change action handlers, engine effects, ending flags, ending text, or phase transitions.

## Environment note

The bundled `pnpm` wrapper attempted an unnecessary dependency-store install and could not open its external SQLite store. Verification therefore invoked the package scripts' underlying commands directly with the bundled Node runtime and the already installed local esbuild package. All product commands above completed successfully.

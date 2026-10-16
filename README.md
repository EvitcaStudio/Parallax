# Parallax Module 
A parallax module that will enable effortless integration of depth effects into your game.

## Installation

### ES Module

```js
import { Parallax } from './dist/index.js';
```

### IIFE output

The build also generates `dist/iife/parallax-iife.js` and its minified variant.
These currently do not expose a global namespace; use the ES module entry point
to access the public API.

### Global Dependency

Parallax relies on the `VYLO` variable being globally accessible.

## Development

Run `bun test ./tests` for movement, wrapping, layer, and event regressions,
`bun run typecheck` to check the public source types, and `bun run build` to
regenerate JavaScript bundles and declarations. The package entry points use
`dist/index.js`; minified ESM output is in `dist/min/index.min.js`.

Coordinate setters are called only when an axis changes. Camera formulas,
looping thresholds, clone offsets, and `MoveEvent` timing remain unchanged.

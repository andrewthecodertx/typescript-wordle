# typescript-wordle

A browser-based Wordle clone built with pure TypeScript. No frameworks, no dependencies, no build step required for the output — just a single JS file and some HTML.

## Features

- **Pure TypeScript** — type-safe game engine, zero runtime dependencies
- **Terminal aesthetic** — dark theme with green/amber/zinc color scheme
- **Full gameplay** — 5-letter words, 6 guesses, color-coded feedback
- **On-screen keyboard** — with color state tracking (correct/present/absent)
- **Physical keyboard support** — just type and press Enter
- **Animations** — flip reveal, pop on type, shake on invalid input
- **~18KB minified** — lightweight, fast loading

## Play

Open `index.html` in a browser, or visit [andrewthecoder.com/demos/wordle](https://andrewthecoder.com/demos/wordle).

## How It Works

- **`src/words.ts`** — curated word list (~500 solution words + ~200 extra guess words)
- **`src/engine.ts`** — pure game logic: state machine, guess validation, letter state computation
- **`src/main.ts`** — DOM renderer, keyboard handler, CSS injection, game lifecycle

The build bundles everything into a single IIFE (`dist/wordle.js`) that can be dropped into any HTML page.

## Development

```bash
npm install
npm run build       # TypeScript check + esbuild bundle → dist/wordle.js
npm run typecheck   # Just type-check, no output
```

## License

MIT
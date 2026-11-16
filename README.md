# Comic Reader

[comic-reader.com](https://comic-reader.com): read `.cbz`, `.cbr`, `.zip` and `.rar` comics in the browser. Books are extracted on the device (libarchive compiled to WebAssembly, [extract-zip-rar](https://github.com/milky2028/extract)) and kept in the browser's private file system (OPFS). Nothing is uploaded anywhere.

## Develop

```sh
pnpm install
pnpm dev
```

Node 26 (see `.nvmrc`) and pnpm.

## Test

```sh
pnpm verify        # prettier, eslint, svelte-check, unit tests (vitest), production build
pnpm test:e2e      # end-to-end tests in headless Chrome, against the production build
```

The end-to-end tests start the built app and a throwaway headless Chrome (set `CHROME_PATH` if it isn't found), generate small comics on the fly, and pick them through the real file input. They cover reading order, landscape page pairing, touch taps and swipes at tablet size, 48 px touch targets, the light/dark theme, error reporting, and the library surviving reloads and deletions. They need the `zip` command.

To check big archives of your own (first page time, total time, browser memory, every page stored):

```sh
pnpm build && E2E_ARCHIVES="/path/to/big.cbz:/path/to/book.cbr" pnpm test:e2e
```

## Deploy

Netlify builds `main` with `pnpm build` and publishes `build/` (see `netlify.toml`). Pull requests get deploy previews.

Usage counting (GoatCounter, cookie-less, route patterns only) is off until `VITE_GOATCOUNTER_ENDPOINT` is set in `netlify.toml`.

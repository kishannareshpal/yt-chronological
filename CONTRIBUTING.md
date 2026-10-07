# Contributing

## Requirements

- [Node.js](https://nodejs.org) 24+
- [pnpm](https://pnpm.io) 10+

Tool versions are pinned in [`mise.toml`](mise.toml); with [mise](https://mise.jdx.dev) installed, `mise install` sets them all up.

Only needed for regenerating assets:

- [librsvg](https://gitlab.gnome.org/GNOME/librsvg) (`rsvg-convert`) - `pnpm icons`
- [Google Chrome](https://www.google.com/chrome/) and [ImageMagick](https://imagemagick.org) - `pnpm screenshots`

## Setup

```sh
gh repo clone kishannareshpal/yt-chronological
cd yt-chronological
pnpm install
```

## Development

Build once, or rebuild on every save:

```sh
pnpm build
pnpm dev
```

Both write `dist/chrome` and `dist/firefox`. Load `dist/chrome` with **Load unpacked** in `chrome://extensions`, or `dist/firefox/manifest.json` with **Load Temporary Add-on** in `about:debugging`. After a rebuild, reload the extension and refresh YouTube.

To work on the interface without touching YouTube, run the preview. It renders every screen and button state with sample data, in light and dark, at http://localhost:5174:

```sh
pnpm preview
```

Typecheck and test:

```sh
pnpm typecheck
pnpm test
```

## Assets

The icon's source is [`icons/icon.svg`](icons/icon.svg). Regenerate the PNG sizes after changing it:

```sh
pnpm icons
```

The Chrome Web Store screenshots and promo tile in [`store/`](store/) are rendered from the real interface on a mock page. Regenerate them after interface changes:

```sh
pnpm screenshots
```

Both outputs are committed, so building and releasing need neither tool.

## How it works

Every channel has hidden uploads playlists, newest first: `UU…` for everything, `UULF…` for videos, `UUSH…` for Shorts and `UULV…` for live streams. The extension reads the ones you selected and reverses them. When a set has several channels, it looks up each video's publish date (cached in local storage) and merges the lists.

Playlists are created and edited through YouTube's internal web API with the signed-in session, the same calls the site's own Save button and drag-to-reorder make. New uploads at the end are appended. When videos land in the middle, the affected playlists are read back, trimmed, topped up and reordered with the fewest moves. Writes are spaced about a second apart, retried with backoff, and progress is stored after every batch so an interrupted save resumes.

```
src/
  youtube/      API client, signed-in session headers, channel lookup
  uploads/      reading uploads lists, counts and publish dates
  playlists/    sets, merging by date, parts, syncing playlists in place, saved progress
  watching/     remembering the last watched video, the continue bar
  ui/           dialog, in-page button, toast and shared styles
  main-world.ts runs in the page so it can use YouTube's session
  bridge.ts     relays the toolbar click into the page
  background.ts handles the toolbar click
dev/            interface preview and store screenshot scenes
scripts/        build, release, icons and screenshots
```

## Releasing

Releases are built by GitHub Actions, triggered when a GitHub Release is published.

Versions are date-based: `YYYY.MM.DD.n`, where `n` starts at `1` and increments for each release on the same day (e.g. `2026.10.07.1`, then `2026.10.07.2`).

From a clean, up-to-date `main`:

```sh
pnpm release
```

That computes the next version, asks you to confirm, then runs `gh release create` (tag + published release). The `release` workflow typechecks, tests and builds, then attaches `yt-chronological-chrome-<version>.zip` and `yt-chronological-firefox-<version>.zip`.

The extension's version comes from the tag. Browsers reject leading zeros, so the tag `2026.10.07.1` becomes `2026.10.7.1` in the manifest.

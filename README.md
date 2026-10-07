# Oldest First for YouTube

A browser extension that saves every upload from a YouTube channel into real playlists in your account, ordered from the first video to the latest. Channels with more than 5,000 uploads are split into numbered parts, because that is the most a YouTube playlist can hold.

## Use it

1. Open a channel page (`youtube.com/@name`) or any video from that channel.
2. Click **Oldest first** next to the Subscribe button, or click the extension's toolbar icon.
3. Pick what to include. Each type shows how many uploads it has. Choose who can see the playlists, then click **Save 192 videos**.
4. Keep browsing while it saves. The button next to Subscribe shows the progress, and a message appears when it is done.

From then on, the button next to Subscribe reads **Continue · 37 of 192** and takes you straight back to where you left off. The arrow beside it opens the details.

A video counts as watched once you have seen 30 seconds of it, so opening the playlist at video 1 does not lose your place. You can also continue from:

- **Continue from video 37** under Play all on the playlist page, and under the title of the playlist panel beside a video.
- The details window, which shows how far along you are, each part, and whether the channel has new uploads.

When a part ends, the next part starts automatically, unless autoplay is off.

## Join channels

A set can hold several channels in the same playlists, ordered by publish date across all of them. That suits a creator with a second channel, or a series split over a few channels.

- **From the new channel:** open Oldest first on it and pick an existing set under **Save to**.
- **From a set:** open its details, choose **Add a channel**, and paste a channel link, a video link or an @handle.
- **Per channel:** click a channel in a set's details to change which of its Videos, Shorts and Live streams are included, or to remove it from the set.

The existing playlists are updated in place. Videos that no longer belong are removed, missing ones are added, and the rest are moved into date order with as few moves as possible, the same way dragging works on YouTube. Merging needs each video's exact publish date, which is looked up once (about 30 videos a second) and remembered. If a set shrinks enough that a part is no longer needed, that playlist is deleted.

The details window also lets you:

- **Add to playlist** when there are new uploads. They are appended, starting a new part when the last one is full. If a channel grows past one playlist, the first one is renamed to "Part 1".
- **Resume saving** if a save was interrupted. Progress is kept after every batch of 100 videos.

## Install for development

```bash
pnpm install
```

```bash
pnpm build
```

This writes `dist/chrome` and `dist/firefox`. Use `pnpm dev` to rebuild on save.

**Chrome, Arc, Brave, Edge:** open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `dist/chrome`.

**Firefox 128 or later:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and pick `dist/firefox/manifest.json`. If the button does not appear on YouTube, open the extension's permissions in `about:addons` and allow it on www.youtube.com.

## How it works

Every channel has hidden "uploads" playlists, newest first: `UU…` for everything, `UULF…` for videos, `UUSH…` for Shorts and `UULV…` for live streams. The extension reads the ones you selected, reverses the order, then creates playlists and adds videos the same way the site's own Save button does, using your signed-in session.

- Nothing is sent anywhere except youtube.com. No API key and no Google Cloud project are needed.
- Writes are spaced about a second apart and retried with backoff if YouTube asks it to slow down.
- Progress and your place in each channel are stored in your browser's local storage for youtube.com, so they are per browser profile. Watching on your phone or TV does not move your place.

### Caveats

- This relies on YouTube's internal web API. It is the same API the site uses, but it is undocumented and a YouTube update could break it.
- Saving runs inside the YouTube tab. Navigating within YouTube is fine, but closing or reloading the tab pauses it until you resume.

## Project layout

```
src/
  youtube/      API client, signed-in session headers, channel lookup
  uploads/      reading a channel's uploads, oldest first
  playlists/    sets, merging by date, splitting into parts, syncing playlists in place, saved progress
  watching/     remembering the last watched video and where to continue
  ui/           dialog, in-page button, toast and shared styles
  main-world.ts runs in the page so it can use YouTube's session
  bridge.ts     relays the toolbar click into the page
  background.ts handles the toolbar click
dev/            preview page for the interface
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

To work on the interface without touching YouTube, run the preview. It shows every screen and button state with sample data, in light and dark, at http://localhost:5174.

```bash
pnpm preview
```

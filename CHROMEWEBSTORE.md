# Chrome Web Store listing

Everything to paste into the [developer dashboard](https://chrome.google.com/webstore/devconsole), kept in line with the code and the [privacy policy](https://kishanjadav.com/yt-chronological/privacy/). Update it when permissions, data handling or features change.

> Last updated: 2026-10-07

## Package

Upload `yt-chronological-chrome-<version>.zip` from the [latest release](https://github.com/kishannareshpal/yt-chronological/releases/latest). Make one with `pnpm release`.

## Store listing tab

**Name:** yt-chronological

**Summary** (132 characters max, taken from the manifest's description)

```
Watch any YouTube channel from its first video. Saves every upload into playlists, oldest first, and remembers where you left off.
```

**Description**

```
Watch any YouTube channel from its very first video, in order, and pick up where you left off.

YouTube only lets you sort a channel by newest or most popular, and its playlists of a channel's uploads always start with the latest video. yt-chronological saves every upload into playlists in your own account, ordered from the first video to the latest.

What it does
• Saves a channel's uploads into playlists, oldest first, with one click
• Lets you choose Videos, Shorts and live streams, with counts up front
• Splits big channels into parts, because a playlist holds up to 5,000 videos, and moves to the next part on its own
• Remembers the last video you watched and adds a Continue button next to Subscribe, on the playlist page and beside the video
• Adds new uploads later with one click
• Joins several channels into one timeline, merged by publish date, for creators with second channels or shared series

How to use it
1. Open a YouTube channel, or any of its videos.
2. Click Oldest first next to the Subscribe button.
3. Pick what to include and who can see the playlists, then save.
4. Keep browsing while it saves. From then on, Continue takes you straight back to where you were.

Privacy
yt-chronological has no servers, analytics or tracking. It only talks to YouTube, using your own signed-in session to create and update playlists in your account, and only when you ask. Your saved channels and your place stay in your browser.

yt-chronological is not affiliated with or endorsed by YouTube or Google.
```

**Category:** Entertainment

**Language:** English

**Graphics**

| Asset | Size | File |
| --- | --- | --- |
| Store icon | 128×128 | `icons/icon-128.png` |
| Screenshot 1 | 1280×800 | `store/screenshot-1.png` (Continue next to Subscribe) |
| Screenshot 2 | 1280×800 | `store/screenshot-2.png` (choosing what to include) |
| Screenshot 3 | 1280×800 | `store/screenshot-3.png` (continuing where you left off) |
| Screenshot 4 | 1280×800 | `store/screenshot-4.png` (joined channels) |
| Screenshot 5 | 1280×800 | `store/screenshot-5.png` (saving in the background) |
| Small promo tile | 440×280 | `store/promo-small.png` |

Regenerate the screenshots after interface changes with `pnpm screenshots`.

**Homepage URL:** https://kishanjadav.com/yt-chronological/

**Support URL:** https://github.com/kishannareshpal/yt-chronological/issues

## Privacy practices tab

**Single purpose**

```
Saves a YouTube channel's uploads into playlists in the user's own YouTube account, ordered from oldest to newest, and helps the user continue watching from where they left off.
```

**Permission justifications**

The manifest requests no API permissions (`permissions` is empty). The only access is the content scripts' match on `https://www.youtube.com/*`, which the dashboard lists as host access.

| Access | Justification |
| --- | --- |
| Host: `https://www.youtube.com/*` | The extension adds its button next to Subscribe on YouTube channel and video pages, reads the channel's list of uploads, and creates and updates playlists in the user's own YouTube account when they click save. It only runs on youtube.com, and never on other sites. |

**Remote code:** No, I am not using remote code. All code ships in the package. The extension only requests data (channel uploads and playlist changes) from youtube.com.

**Data usage**

Leave every data type unchecked. The extension does not collect any user data: nothing is sent to the developer or to any third party. For the record:

| Data type | Handled? | Notes |
| --- | --- | --- |
| Personally identifiable information | No | |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | No | Uses the existing youtube.com session for requests to youtube.com only. Never reads, stores or transmits passwords or credentials. |
| Personal communications | No | |
| Location | No | |
| Web history | No | |
| User activity | Stored locally only | The last video watched in each saved set is kept in youtube.com local storage on the device, to offer Continue. Never transmitted. |
| Website content | Read locally only | Public channel and video information from youtube.com is read to build the playlists. Never transmitted elsewhere. |

Tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://kishanjadav.com/yt-chronological/privacy/

## Account tab

**Contact email:** kishan_jadav@hotmail.com (verify it in the dashboard; it is shown publicly)

## Notes for review

- Playlists are created and edited through the same youtube.com requests the website makes when you save a video or drag one in a playlist, using the signed-in session. If a reviewer asks, say so plainly: it acts only on the user's own account, only on their click.
- The name and listing avoid YouTube's logo, and the screenshots use a made-up channel. If the "yt-" in the name or the "YT" in the icon is flagged as implying affiliation, rename to the "Chronological for YouTube" pattern and drop the letters from the icon.

## Version history

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 2026.10.07.2 | 2026-10-07 | First store submission | Draft |

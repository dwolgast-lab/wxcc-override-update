# WxCC Override Manager

A web application for managing Webex Contact Center Business Hours Overrides — activate/deactivate overrides, record G.711 µ-law WAV announcements, and update TTS messages, all from a browser without needing Cisco Control Hub access.

Any Webex Contact Center user whose profile grants permission to manage overrides, global variables, and/or audio files can use this app — no full administrator role required.

Built by **TTEC Digital**.

---

## Recent Changes

- **v1.0.1** — Fixed dialog layout overflow for WAV-type overrides; logos, version footer, refactoring; corrected access model (any user with appropriate permissions, not admins only); added Admin Guide and updated User Guide with screenshot markers
- **v1.0.0** — Initial release: override activate/deactivate, WAV recording (browser-native G.711 µ-law), TTS editing with SSML support, automatic variable linking, Webex OAuth authentication

---

## Documentation

| Document | Audience |
|---|---|
| [User Guide](USER_GUIDE.md) | End users managing overrides day-to-day |
| [Admin Guide](ADMIN_GUIDE.md) | Administrators deploying and configuring the app |
| [Integrator's Guide](INTEGRATOR_GUIDE.md) | Technical integrators connecting the app to a new tenant |
| [Changelog](CHANGELOG.md) | All changes by version |

---

## Quick Start

```bash
npm install
npm run dev
```

Set the following environment variables (see `.env.example`):

| Variable | Description |
|---|---|
| `WEBEX_CLIENT_ID` | OAuth app client ID from developer.webex.com |
| `WEBEX_CLIENT_SECRET` | OAuth app client secret |
| `WEBEX_REDIRECT_URI` | Must match the URI registered in the OAuth app |
| `SESSION_SECRET` | ≥32-char random string for iron-session encryption |
| `NEXT_PUBLIC_ORG_ID` | Your Webex organization ID |

---

## How It Works

### Authentication
OAuth 2.0 via Webex. The user signs in with their Webex account; the app exchanges the code for a bearer token scoped to `cjp:config` and `cjp:config_write`.

### Override Sets & Entries
The WxCC API exposes **Override Sets** — named collections of override entries. Each entry has a start/end time, recurrence, and an `active` flag. The app toggles that flag via a `PUT` on the v1 override API.

### Announcements
The app follows a naming convention to discover which global CAD variable holds the announcement for each override:

| Variable suffix | Behavior |
|---|---|
| `globalOverrideNameTTS` | Editable text-to-speech string (supports SSML) |
| `globalOverrideNameWAV` | Filename of a WAV file in the WxCC audio repository |
| `globalOverrideNameFIXED` | Pre-recorded; shown read-only |

WAV recordings are encoded client-side to **G.711 µ-law, 8 kHz, mono** using the Web Audio API — no server-side ffmpeg required.

---

## Project Structure

```
src/
  app/
    api/wxcc/        — Proxy routes: overrides, variables, audio upload
    dashboard/       — Main authenticated page
    login/           — OAuth login page
  components/
    audio/           — AudioRecorder (browser-native WAV encoding)
    layout/          — TopNav, FeedbackForm
    overrides/       — OverridesDashboard, OverrideEditDialog, VariableEditor
  hooks/
    useOverrideData.ts — Data fetching hook (overrides + variables)
  lib/
    wxcc-api.ts        — WxCC Config API client
    audio-encode.ts    — G.711 µ-law WAV encoding (browser-native)
    override-format.ts — Naming conventions, date/time formatting
    session.ts         — iron-session helpers
    version.ts         — App version constant
public/
  logos/             — Place ttec-digital.svg and webex-cc.svg here
```

---

## Logo Setup

Place your logo files in `public/logos/`:
- `public/logos/ttec-digital.svg` — TTEC Digital logo (appears on login page and top nav)
- `public/logos/webex-cc.png` — Webex Contact Center logo (appears on login page and top nav)

If the files are absent, the logo slots are hidden gracefully.

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **Major** — breaking changes or full redesigns
- **Minor** — new features
- **Patch** — bug fixes

The version is defined in `src/lib/version.ts` and displayed in the app footer and login page. Update both `src/lib/version.ts` and `package.json` when bumping the version.

See [CHANGELOG.md](CHANGELOG.md) for full release notes.

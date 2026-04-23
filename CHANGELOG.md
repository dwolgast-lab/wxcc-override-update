# Changelog

All notable changes to WxCC Override Manager are documented here.
Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

---

## [1.0.1] — 2026-04-23

### Fixed
- Dialog layout overflow for WAV-type overrides: long no-space filenames (e.g. `globalStandardWeatherClosingWAV`) were expanding past the dialog boundary due to CSS grid children having `min-width: auto`. Added `min-w-0` to step wrappers and `overflow-hidden flex-1` to card text containers.
- Horizontal scrollbar on page body caused by dialog portal overflow; added `overflow-x: clip` to body.

### Added
- Dual logo slots on login page (`/public/logos/ttec-digital.svg` and `/public/logos/webex-cc.svg`). Logos gracefully hidden if files are absent.
- Webex CC logo in top navigation bar (replaces "WX" text avatar).
- Version footer on every page (`v1.0.1 — Built by TTEC Digital`).
- `src/lib/version.ts` as the single source of truth for the app version string.

---

## [1.0.0] — 2026-04-23

### Added
- **Override management dashboard** — lists all Business Hours Override sets and entries from the WxCC Config API. Cards show active/inactive status, schedule, and message type badge.
- **Activate / deactivate overrides** — toggle switch in the edit dialog updates `workingHours` via a `PUT` to the WxCC v1 overrides API. Conflict detection prevents activating an override that overlaps an already-active one.
- **TTS message editing** — inline text editor for global CAD variables ending in `TTS`. Supports SSML markup (telephone, cardinal, currency, date, break, emphasis). Changes written via `PUT` to v1 `cad-variable` API with both `value` and `defaultValue` fields.
- **WAV announcement recording** — in-browser audio recorder using `MediaRecorder`. Recordings are converted client-side to G.711 µ-law, 8 kHz, mono WAV using `AudioContext` / `OfflineAudioContext` — no server-side ffmpeg dependency. Filename auto-generated as `<OverrideName><YYYYMMDDHHmmss>.wav`.
- **WAV upload** — uploads the encoded WAV to the WxCC audio repository via manual multipart POST (Node.js `FormData` sends strings as `text/plain`; the manual approach forces `audioFileInfo` as `application/json` which the Spring/Java backend requires).
- **Auto variable linking** — after a successful upload, the WAV filename is automatically written to the linked `globalOverrideNameWAV` variable's `defaultValue`.
- **Webex OAuth authentication** — sign-in via OAuth 2.0 authorization code flow. Session managed with iron-session (encrypted cookie). Token refresh handled automatically 5 minutes before expiry.
- **Responsive layout** — works on desktop and mobile. Navigation collapses to a slide-out sheet on small screens.
- **SSML tips panel** — collapsible reference panel in the TTS editing step.

### Technical notes
- WxCC write paths use v1 (no `/v2/`). List endpoints are v2; write endpoints are v1. This applies to overrides, CAD variables, and audio files.
- CAD variable `defaultValue` is what Cisco Control Hub displays; `value` is runtime per-call. Both must be sent in the PUT body to persist changes visibly in Control Hub.
- Audio file `name` field in `audioFileInfo` must include the `.wav` extension or the API returns `400: name should have valid extension`.

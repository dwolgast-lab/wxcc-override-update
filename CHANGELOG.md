# Changelog

All notable changes to WxCC Override Manager are documented here.
Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

---

## [1.0.3] — 2026-04-28

### Added
- **Supervisor Desktop widget** — the app can now be embedded directly in the WxCC Extensible Supervisor Desktop as a custom widget, with no separate login required.
  - `public/wxcc-override-widget.js`: custom element `<wxcc-override-manager>` that receives `$STORE.auth.accessToken` from the desktop layout, creates an iframe pointing to `/embed`, and posts the token in via `postMessage`.
  - `src/app/embed/page.tsx`: stripped embed page (no TopNav/footer) that receives the desktop token, exchanges it for an iron-session, and renders the override dashboard.
  - `src/app/api/auth/widget/route.ts`: POST endpoint that validates a desktop bearer token against `/v1/people/me`, decodes the org ID, and creates a session.
  - `wxcc-supervisor-desktop-layout.json`: ready-to-upload desktop layout with the Override Manager widget added to both `supervisor` and `supervisorAgent` navigation.
- **`SameSite=None` session cookie in production** — required for the session cookie to be sent in cross-site iframe requests (WxCC desktop → app embed route). Local dev continues to use `SameSite=Lax`.

### Fixed
- **Desktop layout `navigateTo` with hyphens** — WxCC silently drops any navigation entry whose `navigateTo` value contains a hyphen. Renamed from `override-manager` to `overrides`.
- **postMessage origin check** — the embed page was rejecting the desktop token because `event.origin` (WxCC desktop domain) didn't match `window.location.origin` (our app domain). The check is removed; the token is validated server-side against the Webex API instead.
- **Iron-session cookie overflow** — the WxCC desktop access token is a large JWT that exceeds the 4096-byte browser cookie limit when sealed by iron-session. The widget auth route now stores only user metadata (userId, orgId, etc.) in the iron-session and writes the raw token to a separate `wxcc_token` httpOnly/Secure/SameSite=None cookie. All WxCC API routes and `/api/auth/me` fall back to this cookie when the session carries no access token.

### Notes
- The desktop OAuth app must have `cjp:config` and `cjp:config_write` scopes for all widget operations to succeed. If only `cjp:config` is present, read operations work but TTS/WAV saves will fail with a 403.
- WAV recording inside the widget requires the browser to grant microphone access to the iframe. This works unless the WxCC desktop page applies a restrictive Permissions Policy for embedded iframes.
- Token refresh is handled automatically: when the desktop refreshes its token, `$STORE.auth.accessToken` updates, the web component re-posts the new token, and the embed page silently re-authenticates.

---

## [1.0.2] — 2026-04-27

### Changed
- Organization ID is now derived automatically from the user's Webex OAuth token at login — `WXCC_ORG_ID` environment variable removed. The same deployment now works for any Webex Contact Center tenant without config changes.

### Fixed
- Documentation incorrectly listed `NEXT_PUBLIC_ORG_ID` as a required environment variable (the code used `WXCC_ORG_ID`). Both references removed.
- OAuth consent screen (first-time login) now documented in Integrator's Guide and User Guide with screenshot placeholders.

---

## [1.0.1] — 2026-04-24

### Fixed
- Dialog layout overflow for WAV-type overrides: long no-space filenames (e.g. `globalStandardWeatherClosingWAV`) were expanding past the dialog boundary due to CSS grid children having `min-width: auto`. Added `min-w-0` to step wrappers and `overflow-hidden flex-1` to card text containers.
- Horizontal scrollbar on page body caused by dialog portal overflow; added `overflow-x: clip` to body.

### Added
- Dual logo slots on login page (`/public/logos/ttec-digital.svg` and `/public/logos/webex-cc.png`). Logos gracefully hidden if files are absent.
- Webex CC logo in top navigation bar (replaces "WX" text avatar).
- Version footer on every page (`v1.0.1 — Built by TTEC Digital`).
- `src/lib/version.ts` as the single source of truth for the app version string.
- Extracted G.711 µ-law encoding to `src/lib/audio-encode.ts`; `AudioRecorder` now imports from there.
- Extracted override/variable data fetching to `src/hooks/useOverrideData.ts`; `OverridesDashboard` uses the hook.
- Consolidated `GlobalVariable` type into `wxcc-api.ts`; removed duplicate declaration from `OverridesDashboard`.
- `ADMIN_GUIDE.md` — comprehensive admin guide covering OAuth setup, flow design, Control Hub configuration (override sets, variables, audio files), and user profile permissions; includes screenshot suggestions throughout.
- `INTEGRATOR_GUIDE.md` — step-by-step guide for connecting the app to a new tenant, from OAuth integration creation through end-to-end verification; includes troubleshooting section and sign-off checklist.
- `USER_GUIDE.md` updated: corrected access model (any user with appropriate permissions, not admins only), added screenshot suggestions throughout, added FAQ entry about partial override visibility.
- Login page disclaimer updated to reflect correct access requirements.
- `README.md` updated: corrected access model, added documentation table, updated project structure.

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

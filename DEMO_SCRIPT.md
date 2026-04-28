# WxCC Override Manager — Demo Script (Technical Audience)

**Format:** Microsoft Teams screen share, ~75 attendees  
**Audience:** WxCC/CC implementers, AI developers, technical sales  
**Target duration:** 22–25 minutes + Q&A  
**Presenter prep:** Pre-open all tabs. Two browsers logged into two different Webex accounts. Control Hub open. Test call ready to dial.

---

## OUTLINE

| # | Section | Duration |
|---|---------|----------|
| 1 | Opening — the implementer's problem | 2 min |
| 2 | Stack and how it was built | 3 min |
| 3 | Authentication — OAuth, session, multi-tenant design | 2 min |
| 4 | Role-based visibility — Webex as the RBAC | 2 min |
| 5 | TTS override — API pattern walkthrough | 3 min |
| 6 | WAV override — browser-side audio encoding | 4 min |
| 7 | Deactivate / conflict detection | 1 min |
| 8 | Supervisor Desktop widget — seamless auth passthrough | 4 min |
| 9 | Portability — any tenant, four environment variables | 2 min |
| 10 | What you could build on top of this | 2 min |
| 11 | Q&A | open |

---

## SCRIPT

---

### SECTION 1 — Opening (2 min)

*Start with screen NOT shared.*

"Before I share my screen — a question for the implementers in the room.

How many of you have deployed Webex Contact Center for a customer, finished the engagement, and then gotten a call three weeks later because nobody on the customer side has Control Hub access and they need to activate a weather closing?

That's the problem this solves.

What I'm going to show you today is a web application I built that gives the right people — supervisors, team leads, designated operators — direct control over Business Hours Overrides and their announcement text, from a browser, with no Control Hub access required. The app talks directly to the WxCC Config API using the user's own Webex identity.

But I'm less interested in showing you the finished app than in showing you how it's built — because the architecture, the API patterns, and frankly the development process are all things you can take back and apply. Let's get into it."

*Share screen.*

---

### SECTION 2 — Stack and How It Was Built (3 min)

*Tab: GitHub repository — show file tree and a recent commit.*

"Here's the repository. The stack is **Next.js 16 / React 19 / TypeScript**, deployed on **Vercel**. Authentication is **Webex OAuth 2.0** with **iron-session** for encrypted cookie sessions. No database. No separate backend service. The proxy layer that talks to the WxCC API lives in Next.js API routes, so there's no CORS exposure — the browser never talks to Webex APIs directly.

The whole server-side logic — auth, session management, WxCC API calls — is about a dozen API route files. The UI is standard React with Tailwind.

Now, I want to be straight with you about the development process, because I think it's relevant to what all of us do.

This was built almost entirely through **Claude Code** — Anthropic's AI coding assistant in the terminal. I'm not a full-time developer. I described what I wanted, the tool wrote and iterated on the code, I reviewed and course-corrected. The app went from concept to deployed in roughly [X weeks].

Here's a recent commit message."

*Click into the v1.0.3 commit.*

"You can see the level of architectural reasoning recorded here — not just what changed but why. The AI produced working code, production docs, and an integrator's guide. The reason I'm showing you this isn't to be self-promotional — it's because **your customers could have this kind of tooling too**, and the effort required to build it is a fraction of what it was two years ago. That's a conversation worth having."

---

### SECTION 3 — Authentication (2 min)

*Tab: App login page.*

"Here's the login page. Sign-in goes through **Webex's own OAuth flow** — we never handle a password. The app requests two scopes: `cjp:config` for read access and `cjp:config_write` for write access to the Config API. First-time users see a Webex consent screen listing those scopes exactly — one-time click, never again.

A few things worth calling out from an implementation standpoint.

**No org ID in config.** The app derives the Organization ID from the user's OAuth token at login — specifically from the `orgId` claim in the Webex profile response. That value comes back as a base64-encoded Hydra URI, which we decode to a plain UUID. That UUID goes into the session and is used for every subsequent API call. The deployment itself has zero tenant-specific configuration.

**Session storage.** We use iron-session — AES-encrypted, HMAC-signed cookie. No server-side session store, no Redis. The cookie is `HttpOnly`, `Secure`, `SameSite=None` in production — that last one matters for the widget embedding we'll see in a few minutes.

Let me sign in."

*Complete login.*

"Dashboard. Let's look at what the API returns."

---

### SECTION 4 — Role-Based Visibility (2 min)

*Browser 1 (admin account) visible. Browser 2 (restricted account) ready.*

"This is where the architecture makes a decision worth explaining.

The app has **no user management of its own**. No app-level roles, no database of who can see what. Instead, the WxCC Config API returns only the resources the authenticated user is permitted to see, based on their profile and resource collection assignments in Control Hub.

In Browser 1, I'm an admin — I see all override sets in this tenant.

In Browser 2—"

*Switch to Browser 2.*

"—same app, same code, different identity. This user's Webex profile scopes them to a specific resource collection. They see only what they're allowed to see. No code change, no app config change.

For you as an implementer, this means **access control is entirely managed in Control Hub**, exactly where your customer already manages it. You don't build a second permission system. You don't have a sync problem. Webex is the source of truth, and the app just reflects it."

---

### SECTION 5 — TTS Override — API Pattern (3 min)

*Back to Browser 1. Dashboard visible.*

"Let me do a live TTS edit and walk through what's actually happening at the API layer.

Here's the [Standard Weather Closing] override — inactive, TTS type. I'll open it and update the message."

*Open card, edit the TTS text.*

"Save. Now let me tell you what just happened.

The WxCC Config API has an important asymmetry: **list endpoints are v2, write endpoints are v1**. If you try to PUT to a v2 endpoint, you get a 404. The app sends the PUT to `/v1/cad-variable/{id}` — v1 — with both the `value` and `defaultValue` fields in the body.

Why both? Because Control Hub displays `defaultValue` — it's what you see in the UI. `value` is the runtime per-call value. If you only update one, the other shows stale data in the portal. Both fields have to go in every PUT body.

Let me flip to Control Hub."

*Switch to Control Hub → Global Variables.*

"There's the variable — `globalStandardWeatherClosingTTS` — and you can see both fields updated. No flow republish. The flow reads the variable at runtime.

Let me call in."

*Make the test call.*

"[Describe or play back.] Typing to live audio in under [X seconds]."

---

### SECTION 6 — WAV Override — Browser-Side Audio Encoding (4 min)

*Back to dashboard.*

"The WAV path is more interesting technically. Here's the [Emergency Closing] override — WAV badge. Open it."

*Open card, navigate to Record step.*

"The app has a built-in recorder using `MediaRecorder`. I'll record something short."

*Record a message.*

"Here's the part that's non-obvious and worth stealing for your own projects.

WxCC's audio repository requires **G.711 µ-law, 8 kHz, mono WAV**. The browser's `MediaRecorder` doesn't produce that. You'd normally reach for ffmpeg server-side. We don't.

Instead, the encoding happens entirely in the browser using the **Web Audio API** — `AudioContext` resamples to 8 kHz, an `OfflineAudioContext` renders it, then a custom µ-law encoder converts each sample. The output is a correctly formatted WAV file assembled from scratch in a `Uint8Array`. No server-side dependency, no external service, no per-request compute cost.

The filename is auto-generated as `{OverrideName}{YYYYMMDDHHmmss}.wav` — timestamped so you always know which recording is current."

*Click Listen back, then Accept.*

"One more API quirk worth knowing: the upload endpoint is a multipart POST, and the `audioFileInfo` field has to come through as `application/json` — not the `text/plain` that Node's native `FormData` sends for string fields. The app builds the multipart payload manually to force the correct content type. That one took some debugging to find.

After upload, the app automatically writes the new filename into the linked global variable. Two API calls, one action from the user."

*Switch to Control Hub.*

"Audio file in the repository. Variable updated. Let me call in."

*Make the test call.*

"[Describe or play back.] Recorded in the browser, encoded in the browser, live in the contact center."

---

### SECTION 7 — Deactivate / Conflict Detection (1 min)

"Deactivating is one toggle — open the card, switch it off, save. Done.

The app also does **conflict detection** before activation: it checks whether any other override in the same set is already active for the same time window, and blocks the save if there's a conflict. That prevents a class of errors that would otherwise require a Control Hub admin to clean up."

---

### SECTION 8 — Supervisor Desktop Widget (4 min)

*Have the WxCC Supervisor Desktop open in a separate tab or window.*

"This is the part I'm most excited to show you, because it required solving three problems that aren't documented anywhere I could find.

Webex Contact Center's Extensible Supervisor Desktop supports custom widgets — you can embed an iframe directly in the supervisor's nav sidebar using a desktop layout JSON uploaded to Control Hub. The vision is: a supervisor managing a queue never leaves their desktop to activate an override.

Here's what the layout entry looks like for our widget."

*Show or describe the relevant section of `wxcc-supervisor-desktop-layout.json`.*

```json
{
  "nav": {
    "label": "Override Manager",
    "icon": "dashboard",
    "iconType": "momentum",
    "navigateTo": "overrides",
    "align": "top"
  },
  "page": {
    "comp": "wxcc-override-manager",
    "script": "https://wxcc-override-update.vercel.app/wxcc-override-widget.js",
    "attributes": { "access-token": "$STORE.auth.accessToken" }
  }
}
```

"The desktop passes its own OAuth token to our custom element via `$STORE.auth.accessToken`. The web component creates an iframe pointing to `/embed` on our app and posts the token in via `postMessage`. The embed page exchanges that token for a session cookie — validated against `/v1/people/me` — and renders the dashboard. No separate login.

Let me show you."

*Click the Override Manager nav item in the Supervisor Desktop.*

"There's the dashboard, inside the desktop, authenticated automatically from the supervisor's existing session.

Now, three non-obvious problems we hit getting here — worth knowing if you do this for any other WxCC widget:

**One:** `navigateTo` values cannot contain hyphens. `override-manager` silently drops the nav item. No error, no log. We only found it by eliminating every other variable. Use single words or camelCase.

**Two:** The embed page's `postMessage` listener was checking `event.origin === window.location.origin`. The desktop runs on `desktop.wxcc-us1.cisco.com`; our app runs on Vercel. Different origins. The message was silently rejected. The token is validated server-side anyway, so the origin check is unnecessary — remove it.

**Three:** The WxCC desktop access token is a large JWT — large enough that when iron-session encrypts and seals it into a cookie, the result exceeds the browser's 4096-byte cookie limit. Session save throws a 500. The fix: store only the user metadata in the iron-session seal, and write the raw token to a separate `HttpOnly` cookie that the API routes fall back to. Two cookies, one session."

"Three bugs, none of them documented. That's WxCC widget development in 2026."

---

### SECTION 9 — Portability (2 min)

"To connect this app to any other Webex Contact Center tenant, here's the complete list of changes required:

1. Create an OAuth integration in that tenant's developer.webex.com
2. Set four environment variables: `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, `SESSION_SECRET`
3. Deploy

That's it. No code changes. No org IDs. No tenant-specific anything in the codebase.

For a services organization, this is a meaningful story. You build the integration once, the Integrator's Guide in the repo walks someone through a new-tenant deployment in 45–90 minutes, and the whole thing is maintainable by one person who isn't a full-time developer.

If you're selling implementation services, this is the kind of differentiated tooling that shortens your delivery cycle and adds value after go-live."

---

### SECTION 10 — What You Could Build on Top (2 min)

"Let me close with the extensibility picture, framed for what's in this room.

**For CC implementers:** The API patterns here — how we're calling the Config API, handling the write/read version asymmetry, structuring the auth flow — apply to any tooling you'd build on top of WxCC. The code is public. Use it as a reference.

**For AI developers:** The interesting next layer is intelligence. Right now the app is CRUD. But the session has the user's org ID and token, and the Config API surface is rich. You could build: natural language override activation ('activate the weather closing for the next four hours'), anomaly detection on override patterns, automatic message drafting based on weather or incident data.

**For technical sales:** The conversation starter is 'what does your customer do today when they need to activate an emergency closure?' If the answer involves a Control Hub admin or a ticket, this is a real gap you can close. The differentiation isn't the app — it's the delivery model and the ability to build adjacent tooling on the same foundation.

**On the roadmap conceptually:** Audit trail, approval workflows, scheduled activations, multi-tenant management console. None of these are long projects on this stack."

---

### CLOSING

"That's the demo. What you saw:

- A Next.js app on Vercel, proxying the WxCC Config API, no database, no separate backend
- Webex OAuth for identity — the org is derived from the token, no tenant config
- Access control delegated entirely to Webex resource collection assignments
- Live TTS and WAV updates hitting the API directly, effective immediately
- G.711 µ-law encoding in the browser with no server-side dependency
- A Supervisor Desktop widget with seamless token passthrough and three hard-won non-obvious fixes
- A four-env-var deployment model that works for any WxCC tenant

The code is on GitHub. The Integrator's Guide is in the repo. I'm happy to take questions."

---

## PRESENTER CHECKLIST

- [ ] Browser 1: admin account, dashboard visible, TTS override noted (current text)
- [ ] Browser 2: restricted account, dashboard visible
- [ ] Control Hub: Global Variables tab open, Audio Files tab open
- [ ] GitHub: repository open, recent commit visible
- [ ] WxCC Supervisor Desktop: logged in, layout with Override Manager widget applied
- [ ] Test phone/softphone ready to dial the queue number
- [ ] Audio output routed so Teams attendees can hear call playback (or describe verbally)
- [ ] WAV override: card in a clean state ready to record
- [ ] Quiet environment for WAV recording segment
- [ ] Know your actual build timeline to fill in the [X weeks] placeholder

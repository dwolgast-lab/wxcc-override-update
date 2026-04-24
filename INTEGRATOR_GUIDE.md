# WxCC Override Manager — Integrator's Guide

**Version:** 1.0.1  
**Built by:** TTEC Digital  
**Audience:** Technical integrators deploying this application to a new Webex Contact Center tenant

---

## Overview

This guide walks through the complete end-to-end process of connecting WxCC Override Manager to a new tenant — from creating the OAuth app registration on developer.webex.com through to a fully working deployment with tested override activation and announcement updates.

Work through the sections in order. Each section has a dependency on the one before it.

**Estimated time:** 45–90 minutes for a clean deployment, assuming the WxCC tenant already has override sets and flows configured.

---

## Prerequisites

Before starting, confirm you have:

- [ ] A Webex Contact Center tenant with at least one Business Hours Override set configured
- [ ] A **full administrator** Webex account on that tenant (required for the initial setup steps — end users can have lesser roles)
- [ ] A deployment target: [Vercel](https://vercel.com) (recommended), or any Node.js hosting platform
- [ ] A clone of this repository, or a Vercel project connected to the GitHub repo

---

## Step 1: Find Your Organization ID

You will need the Organization ID in several later steps.

1. Sign in to [Control Hub](https://admin.webex.com) with your administrator account.
2. Click **Account** in the left sidebar.
3. On the Account page, find the **Organization ID** field. It is a UUID in the format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
4. Copy it — you will use it as `NEXT_PUBLIC_ORG_ID` in the app's environment variables.

> 📷 **Screenshot suggestion:** Capture the Control Hub Account page with the Organization ID field highlighted. Redact or blur the actual value if this document will be shared externally.

> **Tip:** The Organization ID is also visible in the URL when you are in Control Hub: `https://admin.webex.com/o/<orgId>/...`

---

## Step 2: Create the OAuth Integration on developer.webex.com

The app authenticates users via Webex OAuth. You must register an Integration that authorizes users from your tenant to sign in.

1. Go to [developer.webex.com/my-apps](https://developer.webex.com/my-apps) and sign in with your **administrator** Webex account.
2. Click **Create a New App**.
3. Select **Integration** as the app type.

> 📷 **Screenshot suggestion:** Capture the developer.webex.com "Create a New App" page with the Integration option highlighted.

4. Fill in the integration details:
   - **Integration Name:** `WxCC Override Manager` (or your organization's preferred name)
   - **Icon:** Optional — upload a logo or leave default
   - **Description:** Optional
   - **Redirect URI(s):** Enter the URL(s) where Webex will send users after authentication.
     - For Vercel production: `https://<your-project>.vercel.app/api/auth/callback`
     - For a custom domain: `https://your-domain.com/api/auth/callback`
     - For local development: `http://localhost:3000/api/auth/callback`
     - You can enter multiple redirect URIs, one per line. Add both production and local URIs now.

   > ⚠️ **Critical:** The redirect URI must match the `WEBEX_REDIRECT_URI` environment variable **exactly** — including protocol (`https://`), domain, and path. A mismatch will cause a `redirect_uri_mismatch` error at login.

5. **Scopes** — scroll down and enable exactly these two:
   - `cjp:config` — read access to overrides, variables, and audio files
   - `cjp:config_write` — write access to update overrides, variables, and upload audio files

   > ⚠️ Do not add extra scopes. WxCC tenants may reject tokens with unexpected scopes, and users with restricted profiles may see unexpected permission errors.

> 📷 **Screenshot suggestion:** Capture the Integration creation form showing the Redirect URI field filled in and the two `cjp:` scopes checked (and only those two).

6. Click **Add Integration**.
7. On the confirmation screen, copy and securely store:
   - **Client ID** — public identifier, safe to store in version control if needed
   - **Client Secret** — treat like a password; never commit to source control

> 📷 **Screenshot suggestion:** Capture the confirmation screen showing the Client ID and Client Secret fields (with the secret value blurred/redacted).

> **Important:** The Client Secret is only shown once. If you lose it, you must generate a new one, which invalidates the old one and breaks any active deployments using it.

---

## Step 3: Generate a Session Secret

The app uses iron-session to store encrypted session cookies. The session secret must be a random string of at least 32 characters.

Generate one using any of these methods:

**In a terminal:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**In PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Online:** Use a password generator set to 40+ random alphanumeric characters.

Store the generated value — you will use it as `SESSION_SECRET`.

---

## Step 4: Deploy the App

### Option A: Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New Project** → **Import Git Repository**.
3. Connect to your GitHub account if not already connected, then select the `wxcc-override-update` repository.
4. On the project configuration screen:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** leave as `/`
   - **Build Command:** leave as default (`npm run build`)
5. Before clicking Deploy, click **Environment Variables** and add all five variables:

   | Name | Value |
   |---|---|
   | `WEBEX_CLIENT_ID` | Client ID from Step 2 |
   | `WEBEX_CLIENT_SECRET` | Client Secret from Step 2 |
   | `WEBEX_REDIRECT_URI` | Your Vercel app URL + `/api/auth/callback` |
   | `SESSION_SECRET` | Generated value from Step 3 |
   | `NEXT_PUBLIC_ORG_ID` | Organization ID from Step 1 |

   > ⚠️ Set each of these for the **Production** environment at minimum. Add them to Preview and Development environments as well if you plan to use those.

> 📷 **Screenshot suggestion:** Capture the Vercel "Environment Variables" panel during project setup showing all five variable names (with values blurred/redacted) set for Production.

6. Click **Deploy**. Wait for the build to complete (typically 1–2 minutes).
7. Once deployed, Vercel provides a URL like `https://wxcc-override-update-xxx.vercel.app`. Note this URL.
8. **Update the redirect URI:** Go back to [developer.webex.com/my-apps](https://developer.webex.com/my-apps), open your integration, and confirm the redirect URI matches your Vercel URL exactly: `https://<your-vercel-url>/api/auth/callback`.

> 📷 **Screenshot suggestion:** Capture the completed Vercel deployment screen showing the green "Congratulations" banner and the generated project URL.

### Option B: Custom Node.js Host

1. Clone the repository to your server.
2. Copy `.env.example` to `.env.local` and fill in all five variables.
3. Run:
   ```bash
   npm install
   npm run build
   npm start
   ```
4. The app listens on port 3000 by default. Proxy with nginx or similar as needed.
5. Ensure HTTPS is configured — the Webex OAuth flow requires a secure redirect URI in production.

---

## Step 5: Verify Authentication

Before configuring Control Hub, confirm the OAuth flow works end-to-end.

1. Open your deployed app URL in a browser.
2. You should see the login page with the TTEC Digital and Webex CC logos.
3. Click **Sign in with Webex**.
4. You are redirected to `webexapis.com` — sign in with your **administrator** Webex account.
5. If prompted, review and approve the requested permissions (the `cjp:config` and `cjp:config_write` scopes).
6. You should be redirected back to the app and land on the **Business Hours Overrides** dashboard.

> 📷 **Screenshot suggestion:** Capture the successful post-login dashboard, even if it shows no overrides yet (the empty state message is fine).

**If you see an error instead**, consult the troubleshooting section at the end of this guide before proceeding.

---

## Step 6: Control Hub — Override Sets and Entries

Now configure the WxCC resources that the app will manage.

### 6.1 Locate or Create Override Sets

1. In Control Hub, go to **Contact Center → Business Hours**.
2. Open an existing Business Hours profile that your flows use, or create a new one.
3. Find the **Overrides** section within that Business Hours profile.

> 📷 **Screenshot suggestion:** Capture the Control Hub Business Hours profile page with the Overrides section visible, showing at least one override entry.

### 6.2 Name Override Entries Correctly

The app links each override entry to a global variable using the entry name. The naming rule is:

```
variable name = "global" + TitleCaseNoSpaces(override entry name) + "TTS" or "WAV" or "FIXED"
```

**Examples:**

| Override entry name in Control Hub | Announcement variable name |
|---|---|
| `Weather Closing` | `globalWeatherClosingTTS` or `globalWeatherClosingWAV` |
| `Holiday Hours` | `globalHolidayHoursTTS` or `globalHolidayHoursWAV` |
| `Emergency Evacuation` | `globalEmergencyEvacuationWAV` |
| `All Hands Meeting` | `globalAllHandsMeetingTTS` |

> ⚠️ **The override entry name is case-sensitive and space-sensitive.** The app capitalizes the first letter of each space-separated word and concatenates them. `Weather Closing` → `WeatherClosing`. `weather closing` (lowercase) → `weatherClosing` — which would not match `globalWeatherClosingTTS`.

> 📷 **Screenshot suggestion:** Capture the Control Hub Override Entry detail view showing the Name field. Add a callout showing the derived variable name next to it.

---

## Step 7: Control Hub — Global Variables (CAD Variables)

For each override that needs an editable announcement, create a global variable.

1. In Control Hub, go to **Contact Center → Desktop → Global Variables** (the exact menu path may vary — look for "CAD Variables" or "Flow Variables" in some versions).
2. Click **Create Variable** (or the equivalent button).
3. Fill in:
   - **Name:** Must exactly match the derived name from Step 6.2 (e.g., `globalWeatherClosingTTS`)
   - **Type:** String
   - **Default Value:**
     - For TTS: enter the initial announcement text (e.g., `"Due to inclement weather, our office is currently closed. Please call back during normal business hours."`)
     - For WAV: enter the filename of an existing audio file in the repository (e.g., `WeatherClosing_default.wav`) — or leave blank and upload the first recording via the app
   - **Agent Editable:** Optional — does not affect app behavior
   - **Reportable:** Optional

4. Click **Save**.
5. Repeat for each override entry.

> 📷 **Screenshot suggestion:** Capture the "Create Global Variable" form with the Name field showing a correctly formatted variable name, Type set to String, and a Default Value entered. The Default Value field should be fully visible.

> 📷 **Screenshot suggestion:** Capture the completed Global Variables list showing multiple correctly named variables (`globalWeatherClosingTTS`, `globalHolidayHoursWAV`, etc.) to illustrate the naming pattern.

---

## Step 8: Control Hub — Audio Files (WAV Type Only)

Skip this step if all your overrides use TTS announcements.

For WAV-type overrides, the audio file must exist in the Webex audio repository before users can update it via the app. (Alternatively, users can record and upload the first file themselves through the app — in which case skip this step for those overrides.)

1. In Control Hub, go to **Contact Center → Audio Files**.
2. Upload a properly formatted WAV file:
   - **Format:** G.711 µ-law
   - **Sample rate:** 8 kHz
   - **Channels:** Mono
   - **Bit depth:** 8-bit
3. Note the exact filename after upload — you will set this as the Default Value of the corresponding global variable (Step 7).

> 📷 **Screenshot suggestion:** Capture the Control Hub Audio Files list showing an uploaded file with its name visible.

---

## Step 9: Flow Configuration

Your WxCC flow must be designed to check override status and reference the global variables for announcements. This step assumes you have Flow Designer access.

### 9.1 Connect the Business Hours Node to the Override Set

1. Open the relevant flow in **Flow Designer**.
2. Locate the **Business Hours** node (or add one if building from scratch).
3. In the node's configuration, link it to the Business Hours profile that contains your override entries.
4. The node has two exit branches: **Working Hours** and **Non-Working Hours**. Wire these to the appropriate downstream handling.

> 📷 **Screenshot suggestion:** Capture the Business Hours node configuration panel in Flow Designer, showing the Business Hours profile selection dropdown with the correct profile chosen.

### 9.2 Reference Variables in Play Message Nodes

On the override/closed path from the Business Hours node, add or update **Play Message** nodes to use the global variables.

**For TTS:**
- Set message type to **Text-to-Speech**
- In the text field, use the variable syntax for your flow version: `{{globalWeatherClosingTTS}}` or use the variable picker
- The variable's current value will be read aloud to the caller

**For WAV:**
- Set message type to **Audio File**  
- In the filename field, reference the variable: `{{globalWeatherClosingWAV}}`
- Webex will play the audio file whose name is stored in the variable

> 📷 **Screenshot suggestion:** Capture the Play Message node configuration for both a TTS example and a WAV example, side by side or sequentially, showing the variable reference in each.

### 9.3 Publish the Flow

After making any flow changes, publish the flow for them to take effect. Note: **future announcement updates via the Override Manager app do not require republishing** — only structural flow changes require a republish.

---

## Step 10: User Profile Setup

Configure which users can access the app and what they can do.

### 10.1 Identify Permission Requirements

| App capability | Required Control Hub permission |
|---|---|
| View overrides | Read access to Business Hours (usually included by default) |
| Activate / deactivate overrides | Manage Business Hours Overrides |
| Update TTS messages | Manage CAD Variables / Global Variables |
| Upload WAV recordings | Manage Audio Files |

### 10.2 Create or Update a User Profile

1. In Control Hub, go to **Contact Center → User Management → Profiles**.
2. Open the profile for the users who will manage overrides, or create a new one (e.g., `Override Operator`).
3. Enable the permissions corresponding to what those users should be able to do (see table above).
4. Save the profile.

> 📷 **Screenshot suggestion:** Capture the User Profile settings page in Control Hub showing the three relevant permission areas enabled. Circle or annotate each one.

### 10.3 Assign the Profile to Users

1. In Control Hub, go to **Users**.
2. Open each user who should have override management access.
3. Under their Contact Center settings, assign the profile you configured in 10.2.

> 📷 **Screenshot suggestion:** Capture the Control Hub user detail page showing the Contact Center profile assignment field.

---

## Step 11: End-to-End Test

With everything configured, perform a full end-to-end test before handing off to end users.

### 11.1 Test Authentication with a Non-Admin User

1. Open the app in a private/incognito browser window.
2. Sign in with a **non-administrator** user account that has the Override Operator profile.
3. Verify the dashboard loads and shows only the overrides that user's profile permits.

> ✅ Expected: Dashboard loads with the correct set of overrides visible.  
> ❌ If "invalid scope" error: Confirm the user's Webex role includes Contact Center access.  
> ❌ If dashboard is empty unexpectedly: Check the user's profile has Business Hours read permission.

### 11.2 Test Override Activation

1. Click an override card.
2. Toggle **Override Active** on and click **Save**.
3. In Control Hub, confirm the override shows as active (may take 30–60 seconds to propagate).
4. Toggle it back off and save.

> ✅ Expected: Toast notification "Override activated" / "Override deactivated", change visible in Control Hub.

### 11.3 Test TTS Update (TTS-type overrides)

1. Click a TTS-type override card and click **Update text**.
2. Change the text and click **Save**.
3. In Control Hub → Global Variables, confirm the variable's default value updated.
4. Make a test call to the queue while the override is active and verify the new text is read.

> ✅ Expected: Variable value updated immediately; test call plays new TTS text.

### 11.4 Test WAV Recording (WAV-type overrides)

1. Click a WAV-type override card and click **Record new**.
2. Record a short test message and click **Accept**.
3. In Control Hub → Global Variables, confirm the variable's default value now contains the new filename.
4. In Control Hub → Audio Files, confirm the new file appears.
5. Make a test call while the override is active and verify the new audio plays.

> ✅ Expected: File uploaded, variable updated automatically, test call plays new recording.

---

## Troubleshooting

### `redirect_uri_mismatch` at login
The `WEBEX_REDIRECT_URI` environment variable does not exactly match a URI registered in the OAuth Integration. Check for trailing slashes, `http` vs `https`, or typos. Both must match character-for-character.

### `invalid_scope` after login
The OAuth Integration on developer.webex.com is missing the `cjp:config` or `cjp:config_write` scopes. Open the integration, add the missing scope, and save. Users may need to re-authorize.

### Dashboard loads but shows no overrides
- Confirm `NEXT_PUBLIC_ORG_ID` is set to the correct Organization ID for the tenant.
- Confirm the signed-in user's profile has permission to read Business Hours data.
- Confirm override sets exist in Control Hub for this organization.

### Override cards appear but no message badge (TTS/WAV/Pre-recorded)
The global variable does not exist or its name does not exactly match the naming convention. Open the override card — the app will show the expected variable name. Create that variable in Control Hub.

### TTS save succeeds but variable value doesn't change in Control Hub
- Confirm the variable exists with the exact name expected.
- Confirm the user's profile has permission to write CAD variables.
- Check the browser network tab for the `PUT /api/wxcc/variables/{id}` response.

### WAV upload succeeds but callers hear the old recording
- Confirm the Play Message node in the flow references the global variable (not a hardcoded filename).
- Allow 1–2 minutes for the audio file to propagate across the Webex platform after upload.

### Build failure: `Module has no exported member 'GlobalVariable'`
A component is importing `GlobalVariable` from `OverridesDashboard` instead of `wxcc-api`. Search the codebase for `from "./OverridesDashboard"` and update any `GlobalVariable` imports to `from "@/lib/wxcc-api"`.

### Token expired / session errors after a few hours
The app automatically refreshes tokens 5 minutes before expiry. If users report being unexpectedly logged out, confirm `SESSION_SECRET` has not changed in the deployment environment — changing it invalidates all existing sessions.

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `WEBEX_CLIENT_ID` | Yes | OAuth Integration Client ID from developer.webex.com |
| `WEBEX_CLIENT_SECRET` | Yes | OAuth Integration Client Secret — treat as a password |
| `WEBEX_REDIRECT_URI` | Yes | Must exactly match a URI registered in the Integration |
| `SESSION_SECRET` | Yes | Random ≥32-char string for encrypting session cookies |
| `NEXT_PUBLIC_ORG_ID` | Yes | Webex Organization ID (UUID) from Control Hub → Account |

---

## Checklist Summary

Use this as a sign-off checklist before handing the deployment to end users.

**Infrastructure**
- [ ] Repository cloned / Vercel project connected to GitHub
- [ ] All five environment variables set in production environment
- [ ] App URL accessible over HTTPS

**OAuth**
- [ ] Integration created on developer.webex.com
- [ ] Both `cjp:config` and `cjp:config_write` scopes enabled
- [ ] Redirect URI matches `WEBEX_REDIRECT_URI` exactly
- [ ] Admin can sign in and see the dashboard

**Control Hub**
- [ ] Override sets and entries exist with correctly cased names
- [ ] Global variable created for each override (matching naming convention)
- [ ] Variable default values populated (initial TTS text or WAV filename)
- [ ] For WAV overrides: initial audio file uploaded to repository (or users will upload via app)

**Flow**
- [ ] Business Hours node linked to the correct override set
- [ ] Play Message nodes reference global variables (not hardcoded values)
- [ ] Flow published with latest changes

**Users**
- [ ] Override Operator profile created with correct permissions
- [ ] Relevant staff assigned to the profile
- [ ] Non-admin user test: can sign in, sees correct overrides, can activate/deactivate

**Functional Tests**
- [ ] Override activation → visible in Control Hub within 60 seconds
- [ ] TTS update → variable value updated, test call plays new text
- [ ] WAV recording → file in audio repository, variable updated, test call plays new audio

---

*For integration support, contact your TTEC Digital representative.*

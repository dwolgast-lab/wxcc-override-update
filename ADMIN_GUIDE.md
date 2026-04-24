# WxCC Override Manager — Administrator Guide

**Version:** 1.0.1  
**Built by:** TTEC Digital  
**Audience:** Webex Contact Center administrators responsible for deploying and configuring this application

---

## Overview

This guide covers everything required to deploy and configure WxCC Override Manager for your organization. The app allows authorized users (administrators, supervisors, or designated operators) to manage Business Hours Overrides and their associated announcements without accessing Cisco Control Hub directly.

**The four configuration areas you control:**

1. **OAuth application** — registers the app with Webex so users can sign in
2. **Flow design** — your WxCC flows must be built to check override status and play announcement variables
3. **Control Hub setup** — override sets, global variables, and audio files must follow the naming convention
4. **User profiles** — grants each user the specific permissions they need

---

## Part 1: OAuth Application Setup

The app authenticates users via Webex OAuth. You must register an OAuth Integration in the Webex developer portal.

### Steps

1. Go to [developer.webex.com](https://developer.webex.com) and sign in with your administrator account.
2. Navigate to **My Webex Apps** → **Create a New App** → **Integration**.
3. Fill in:
   - **Integration Name:** WxCC Override Manager (or your preferred name)
   - **Description:** Optional
   - **Redirect URI(s):** The URL of your deployed app followed by `/api/auth/callback`
     - Example: `https://your-vercel-app.vercel.app/api/auth/callback`
     - For local development: `http://localhost:3000/api/auth/callback`
   - **Scopes:** Select the following:
     - `cjp:config` — read access to overrides, variables, and audio files
     - `cjp:config_write` — write access to update overrides, variables, and upload audio
4. Click **Add Integration**. Note your **Client ID** and **Client Secret**.

> 📷 **Screenshot suggestion:** Capture the Webex developer portal Integration creation page showing the Redirect URI field and the two `cjp:` scopes checked.

### Environment Variables

Set the following in your deployment environment (Vercel, or a `.env.local` file for local development):

| Variable | Value |
|---|---|
| `WEBEX_CLIENT_ID` | Client ID from the OAuth integration |
| `WEBEX_CLIENT_SECRET` | Client Secret from the OAuth integration |
| `WEBEX_REDIRECT_URI` | The redirect URI you registered (must match exactly) |
| `SESSION_SECRET` | A random string of at least 32 characters (used to encrypt session cookies) |
| `NEXT_PUBLIC_ORG_ID` | Your Webex organization ID (found in Control Hub → Account) |

> ⚠️ **Security note:** Never commit `WEBEX_CLIENT_SECRET` or `SESSION_SECRET` to source control. Set them as encrypted environment variables in your hosting platform.

> 📷 **Screenshot suggestion:** Capture the Vercel project's Environment Variables settings page (with secret values redacted/blurred) showing all five variables configured for the Production environment.

---

## Part 2: Flow Design

Your Webex Contact Center flows must be designed to check override status and use global variables for announcements. The app manages the data (what is active, what the announcement says), but the flow determines what callers experience.

### Recommended Flow Pattern

```
Caller arrives
     │
     ▼
[Business Hours node]
 ├─ Working Hours ──► [Normal queue handling]
 └─ Non-Working Hours
          │
          ▼
    [Condition: Is an override active?]
     ├─ Override active ──► [Play override announcement] ──► [Transfer / Disconnect]
     └─ No override ──────► [Standard closed message]   ──► [Disconnect]
```

The **Business Hours node** in WxCC Flow Designer references an Override Set. When an override entry is active (enabled in this app), the node routes calls accordingly based on the override's configured `workingHours` value.

> 📷 **Screenshot suggestion:** Capture the WxCC Flow Designer canvas showing the Business Hours node with its "Working Hours" and "Non-Working Hours" exit branches connected to downstream nodes.

### Playing Announcements from Variables

Use global variables (CAD variables) in your Play Message nodes so that announcement content can be updated without republishing the flow.

**For TTS announcements:**
1. In the flow, add a **Play Message** node on the override path.
2. Set the message type to **Text-to-Speech**.
3. In the TTS text field, reference the global variable (e.g., `{{globalStandardWeatherClosingTTS}}`).
4. The variable's value will be spoken to the caller. Users update this text via the Override Manager app.

> 📷 **Screenshot suggestion:** Capture the Play Message node configuration panel in Flow Designer showing Text-to-Speech selected and a global variable referenced in the text field using the `{{ }}` variable syntax.

**For WAV file announcements:**
1. In the flow, add a **Play Message** node on the override path.
2. Set the message type to **Audio File**.
3. In the filename field, reference the global variable (e.g., `{{globalStandardWeatherClosingWAV}}`).
4. The variable holds the filename of the uploaded audio file. Users upload new recordings via the Override Manager app, which automatically updates the variable.

> 📷 **Screenshot suggestion:** Capture the Play Message node configuration panel showing Audio File selected and a global variable referenced as the filename source.

### Important: Flow and Override Interaction

- **Activating an override** in this app sets the override's active state in the Webex platform. The Business Hours node in your flow reads this state in real time — there is no need to republish the flow.
- **Updating a TTS variable or uploading a new WAV file** also takes effect immediately on the next call, without republishing.
- The override's **schedule** (start date, end date, recurrence) is enforced by Webex independently of the active flag. An override must be both active AND within its scheduled window to affect call routing.

---

## Part 3: Control Hub Configuration

### 3.1 Override Sets and Entries

Override sets are created and managed in **Control Hub → Contact Center → Business Hours**.

> 📷 **Screenshot suggestion:** Capture the Control Hub Business Hours section showing the list of override sets, with one set expanded to show its override entries.

**Naming override entries:**

The override entry name drives the variable naming convention used by this app. Choose names that are:
- Descriptive and unique within your organization
- Title Case with spaces (the app strips spaces automatically)
- Consistent — once named, changing the name breaks the variable link

| Override entry name | Linked variable names |
|---|---|
| Standard Weather Closing | `globalStandardWeatherClosingTTS` or `globalStandardWeatherClosingWAV` |
| Holiday Closure | `globalHolidayClosureTTS` or `globalHolidayClosureWAV` |
| Emergency Evacuation | `globalEmergencyEvacuationTTS` or `globalEmergencyEvacuationWAV` |

**Variable name derivation rule:** Remove all spaces from the override entry name, capitalize the first letter of each word, prefix with `global`, and suffix with `TTS`, `WAV`, or `FIXED`.

> 📷 **Screenshot suggestion:** Capture the Control Hub Override Entry creation/edit form showing the Name field, schedule configuration (start date, end date, time range, recurrence options).

**Override entry schedule considerations:**
- Set a **start date** in the past or near-future and a **far-future end date** for standing overrides (e.g., the weather closing template that gets activated as needed).
- Set **recurrence** appropriately — a weather closing might have no recurrence (one-time), while a recurring early-Friday closure would use weekly recurrence.
- The Override Manager app activates and deactivates the entry; the schedule defines the maximum possible window.

### 3.2 Global Variables (CAD Variables)

Global variables are created in **Control Hub → Contact Center → Desktop → CAD Variables** (exact path may vary by Control Hub version).

> 📷 **Screenshot suggestion:** Capture the Control Hub CAD Variables list showing several variables that follow the `globalOverrideNameTTS/WAV` naming convention.

**Create one variable per override announcement:**

| Field | Value |
|---|---|
| **Variable name** | Must match the naming convention exactly (case-sensitive) |
| **Type** | String |
| **Default value** | The initial TTS text or WAV filename (can be updated via the app later) |
| **Agent editable** | Optional — not required for the app to function |
| **Reportable** | Optional |

> 📷 **Screenshot suggestion:** Capture the Control Hub "Create CAD Variable" form with the Name field showing a correctly formatted variable name (e.g., `globalStandardWeatherClosingTTS`), Type set to String, and a default value entered.

**Which suffix to use:**

| Suffix | When to use |
|---|---|
| `TTS` | The announcement is text-to-speech; users edit the text via the app |
| `WAV` | The announcement is an audio file; users upload new recordings via the app |
| `FIXED` | The announcement is pre-recorded and should not be changed by end users; app shows it as read-only |

Only create one variable per override entry. If you create both a `TTS` and a `WAV` variable for the same override, the app will find the `TTS` one first (it checks in that order) and ignore the `WAV` one.

### 3.3 Audio Files

For WAV-type announcements, an initial audio file must exist in the Webex audio repository before users can update it (or users can record the first file via the app).

Audio files are managed in **Control Hub → Contact Center → Audio Files**.

> 📷 **Screenshot suggestion:** Capture the Control Hub Audio Files list showing one or more files with the naming pattern used by the Override Manager (override name + timestamp).

**File format requirements** (handled automatically by the app when users record):
- Format: G.711 µ-law
- Sample rate: 8 kHz
- Channels: Mono
- Bit depth: 8-bit
- Container: WAV (RIFF, with `fact` chunk)

If you are pre-loading audio files created outside the app, ensure they meet the above specifications. Files in other formats (MP3, PCM WAV, stereo) may not play correctly in WxCC.

---

## Part 4: User Profiles and Permissions

One of the key benefits of this app is that you can give non-administrator users access to manage specific overrides without granting full Control Hub access. This is done through WxCC User Profiles.

### Required Permissions

Users need some or all of the following permissions depending on what you want them to do:

| Permission | What it enables in the app |
|---|---|
| **Manage Business Hours / Overrides** | Activate and deactivate overrides |
| **Manage CAD Variables / Global Variables** | Update TTS messages; link uploaded WAV filenames |
| **Manage Audio Files** | Upload new WAV recordings |

A user with all three can perform every operation in the app. A user with only "Manage Overrides" can activate/deactivate but will see TTS and WAV sections as read-only.

### Setting Permissions in Control Hub

1. Go to **Control Hub → Contact Center → User Management → Profiles**.
2. Open the user profile you want to configure, or create a new profile for this role (e.g., "Override Operator").
3. Locate the relevant permission sections and enable the required checkboxes.
4. Assign the profile to the appropriate users under **Control Hub → Users**.

> 📷 **Screenshot suggestion:** Capture the WxCC User Profile settings page in Control Hub showing the three relevant permission sections enabled (Business Hours/Override management, CAD Variable management, Audio File management). Circle or highlight the specific checkboxes.

> 📷 **Screenshot suggestion:** Capture the Control Hub Users list showing a supervisor user with the custom "Override Operator" profile assigned.

### Scoping Permissions to Specific Overrides

WxCC user profiles may allow you to restrict which override sets a user can manage. If your tenant supports this, create separate profiles for different teams — for example, a supervisor in one department only sees their department's overrides.

> 📷 **Screenshot suggestion:** If your Control Hub version shows per-set override permissions, capture that configuration screen showing how a specific override set is associated with a user profile.

---

## Part 5: End-to-End Verification Checklist

Before rolling out to end users, verify each of the following:

**OAuth and Authentication**
- [ ] Users can reach the app URL and see the login page
- [ ] Clicking "Sign in with Webex" redirects to the Webex login page
- [ ] After signing in, users are redirected back to the Override Manager dashboard (not an error page)
- [ ] Users with no override permissions see an empty dashboard (not an error)

**Override Activation**
- [ ] Toggling an override active in the app reflects in Control Hub within 30–60 seconds
- [ ] An active override routes test calls down the expected flow path
- [ ] Conflict detection prevents activating two overlapping overrides simultaneously

**TTS Announcements**
- [ ] Updating TTS text via the app updates the variable value in Control Hub
- [ ] A test call plays the updated TTS text on the next call after saving (no republish needed)

**WAV Announcements**
- [ ] Recording and accepting a WAV file uploads the file to the Webex audio repository
- [ ] The linked global variable is automatically updated with the new filename
- [ ] A test call plays the new WAV recording

**User Permissions**
- [ ] Supervisor-level users see only the overrides assigned to their profile
- [ ] Users without audio file permission cannot upload WAV files (the app reflects their permissions)
- [ ] Users without variable permission cannot edit TTS text

---

## Part 6: Maintenance

### Adding a New Override

1. Create the override entry in Control Hub with an appropriate name.
2. Create the corresponding global variable (`globalOverrideNameTTS` or `globalOverrideNameWAV`) with an initial value.
3. If WAV type, optionally pre-load an initial audio file in the audio repository and set it as the variable's default value.
4. Update the flow if necessary to handle the new override's routing path.
5. Grant the appropriate users permission to manage the new override.

### Renaming an Override

**Renaming an override entry breaks its link to the existing variable.** If you must rename:
1. Create a new variable with the name matching the new override name.
2. Migrate the variable value (TTS text or WAV filename) to the new variable.
3. Update the flow to reference the new variable name.
4. Delete the old variable after confirming the new one works correctly.

### Version Updates

When a new version of the Override Manager app is deployed:
1. Review the [CHANGELOG](CHANGELOG.md) for any breaking changes or new configuration requirements.
2. Update the app version in `src/lib/version.ts` and `package.json` before committing.
3. Push to GitHub — Vercel will deploy automatically.

No Control Hub or flow changes are required for routine app updates unless the changelog specifies otherwise.

---

## Appendix: Variable Naming Quick Reference

Given an override entry named **"Standard Weather Closing"**:

| Purpose | Variable name |
|---|---|
| Text-to-speech message | `globalStandardWeatherClosingTTS` |
| WAV audio filename | `globalStandardWeatherClosingWAV` |
| Pre-recorded / locked | `globalStandardWeatherClosingFIXED` |

**Derivation rules:**
1. Take the override entry name exactly as it appears in Control Hub
2. Split on spaces, capitalize the first letter of each word
3. Remove all spaces and special characters
4. Prefix with `global`
5. Suffix with `TTS`, `WAV`, or `FIXED`

Examples:

| Override entry name | Variable suffix | Full variable name |
|---|---|---|
| Weather Closing | WAV | `globalWeatherClosingWAV` |
| Holiday Hours | TTS | `globalHolidayHoursTTS` |
| Emergency Evacuation | WAV | `globalEmergencyEvacuationWAV` |
| All Hands Meeting | TTS | `globalAllHandsMeetingTTS` |
| After Hours Message | FIXED | `globalAfterHoursMessageFIXED` |

---

*For implementation support, contact your TTEC Digital representative.*

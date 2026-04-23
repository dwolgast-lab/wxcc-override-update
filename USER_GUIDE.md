# WxCC Override Manager — User Guide

**Version:** 1.0.1  
**Built by:** TTEC Digital  
**Audience:** Contact Center Administrators

---

## Overview

WxCC Override Manager lets you activate and deactivate Business Hours Overrides in your Webex Contact Center, and update the recorded or text-to-speech announcements callers hear when an override is active — all from a web browser, without needing to log into Cisco Control Hub.

**What you can do:**

- See all configured overrides at a glance
- Activate or deactivate an override with a single toggle
- Record a new WAV announcement directly in the browser
- Edit a TTS (text-to-speech) message

---

## Getting Started

### Logging In

1. Navigate to the app URL provided by your administrator.
2. Click **Sign in with Webex**.
3. Enter your Webex credentials on the Webex login page.
4. You are redirected back to the Override Manager dashboard.

> **Access requirement:** You must have a Webex Contact Center administrator role. If you see an "invalid scope" error, contact your system administrator to verify your role.

### Logging Out

Click your name in the top-right corner of the navigation bar (or tap the menu icon on mobile), then click **Sign out**.

---

## The Dashboard

After signing in you see the **Business Hours Overrides** dashboard.

### Reading the Override Cards

Each card represents one override entry. The card shows:

| Element | Meaning |
|---|---|
| Card title | Override name (e.g., "Standard Weather Closing") |
| **Active** badge (green) | The override is currently enabled — calls are being rerouted |
| **Inactive** badge (grey) | The override is disabled |
| **TTS** badge (blue outline) | The announcement is a text-to-speech message you can edit |
| **WAV** badge (orange outline) | The announcement is a WAV audio file you can re-record |
| **Pre-recorded** badge (grey outline) | The announcement is fixed and cannot be changed here |
| Schedule line | When the override runs (dates, times, recurrence) |

### Refreshing Data

Click the **Refresh** button (top-right of the page) to reload override data from Webex at any time.

---

## Activating or Deactivating an Override

1. Click any override card to open the edit dialog.
2. Toggle the **Override Active** switch to turn it on or off.
   - **On (blue):** Calls are rerouted per this override's schedule.
   - **Off (grey):** The override has no effect on call routing.
3. Click **Save**.

> **Conflict detection:** If another override is already active for an overlapping time period, the app will warn you and prevent the save. Deactivate the conflicting override first.

---

## Updating a WAV Announcement

When an override has an orange **WAV** badge, you can record a replacement announcement.

1. Click the override card.
2. In the **Caller Message** section, click **Record new**.
3. Click **Start Recording** (red button). Your browser will request microphone permission — click Allow.
4. Speak your announcement clearly.
5. Click **Stop** when done.
6. The app converts your recording to the G.711 µ-law format required by Webex Contact Center (8 kHz, mono, 8-bit). This happens entirely in your browser — no audio is sent to any external server during conversion.
7. Click **Listen back** to review your recording.
   - If you are not satisfied, click **Discard** and record again.
8. Optionally edit the **filename** in the text box. The default name includes the override name and a timestamp (e.g., `StandardWeatherClosing20260423163338.wav`) for easy maintenance.
9. Click **Accept** to upload the file to the Webex audio repository and update the linked variable automatically.
10. Click **Back** to return to the edit screen, then **Save** to update the override status if needed.

> **Note on audio quality:** The browser records at whatever sample rate your microphone supports (typically 44.1 kHz or 48 kHz). The app resamples to 8 kHz and encodes as G.711 µ-law automatically. Speak at a normal pace, not too close to the microphone, and avoid background noise.

---

## Updating a TTS Message

When an override has a blue **TTS** badge, you can edit the text that Webex reads aloud to callers.

1. Click the override card.
2. In the **Caller Message** section, click **Update text**.
3. Edit the text in the editor.
4. Optionally use **SSML formatting** for special pronunciation (click the blue "SSML formatting tips" link for examples):

   | Tag | Effect |
   |---|---|
   | `<say-as interpret-as="telephone">800-555-1234</say-as>` | Reads as a phone number |
   | `<say-as interpret-as="cardinal">42</say-as>` | Reads as a number (forty-two) |
   | `<say-as interpret-as="currency">$5.00</say-as>` | Reads as a currency amount |
   | `<say-as interpret-as="date" format="mdy">04/28/2026</say-as>` | Reads as a date |
   | `<break time="1s"/>` | Inserts a one-second pause |
   | `<emphasis level="strong">important</emphasis>` | Emphasizes a word |

5. Click **Save** to write the new text to the Webex variable.
6. Click **Back** to return, then **Save** on the main screen to update override status if needed.

> **Changes take effect immediately:** Once saved, the new TTS text is used the next time a caller hears the announcement. There is no additional publish step.

---

## Understanding the Naming Convention

The app automatically discovers the announcement variable for each override by looking for a Webex global variable whose name matches:

```
global<OverrideNameWithNoSpaces>TTS   — for TTS messages
global<OverrideNameWithNoSpaces>WAV   — for WAV filenames
global<OverrideNameWithNoSpaces>FIXED — for pre-recorded (read-only)
```

For example, an override named **"Standard Weather Closing"** maps to:
- `globalStandardWeatherClosingTTS` — TTS text variable
- `globalStandardWeatherClosingWAV` — WAV filename variable

If no variable is found, the Caller Message section shows the expected variable names so your Webex administrator can create them.

---

## Troubleshooting

### "Microphone access denied"
Your browser blocked microphone access. Click the lock/camera icon in the browser address bar, change Microphone to **Allow**, and try again.

### "Upload failed: Audio upload failed (400)"
- The WAV file may have an unexpected format. Try recording again.
- Your session may have expired. Refresh the page and sign in again.

### "Override activated" but nothing changed in Control Hub
- Allow 30–60 seconds for changes to propagate.
- Verify the override's start date/time is in the past and end date/time is in the future.

### "Update Failed" when saving TTS
- This usually means the linked variable name doesn't match exactly. Check that the variable exists in Webex Contact Center with the correct name (see the naming convention above).
- Your session may have expired — sign out and sign back in.

### The override is active but callers don't hear the WAV file
- Verify the filename stored in the variable exactly matches the filename in the Webex audio repository (including the `.wav` extension).
- Check your Webex flow to ensure it references the correct global variable.

### "Another override is already active for an overlapping period"
Open the other active override, deactivate it, save, then activate the one you want.

---

## Tips and Best Practices

- **Record in a quiet environment** for the best audio quality.
- **Use timestamps in WAV filenames** (the default) so you can track when each recording was made.
- **Test TTS messages** by entering short test text first, saving, and having someone call the queue. Restore the full message when satisfied.
- **Keep a backup** of your TTS text in a notepad before editing — the app does not maintain a history of previous values.
- **Coordinate with your team** before activating emergency overrides. The conflict detection prevents two overrides from being active simultaneously, but it is good practice to communicate any changes.

---

## Frequently Asked Questions

**Q: Does recording use external servers?**  
A: No. Audio is recorded and converted entirely in your browser. Only the final encoded WAV file is uploaded to Webex.

**Q: Can I use this on a phone or tablet?**  
A: Yes. The app is responsive and works on mobile browsers, though recording a WAV file requires a working microphone.

**Q: How long can a WAV announcement be?**  
A: Webex Contact Center has no strict enforced limit in the API, but keep announcements under 2 minutes for practical reasons. Longer recordings may take more time to upload.

**Q: What happens to overrides outside their scheduled window?**  
A: Webex Contact Center enforces the schedule in the flow configuration. The `workingHours` (active) flag enables or disables the override; the schedule defines when it can apply. Consult your flow designer for details on how your specific flow handles override timing.

**Q: Can I delete or create overrides here?**  
A: Not currently. Override sets and entries are managed in Cisco Control Hub. This app handles activation/deactivation and announcement updates only.

---

*For issues or feature requests, contact your TTEC Digital representative.*

# MEERA — Runtime Verification and Security Test Plan

**Target Application:** MEERA  
**Audit Directory:** `C:\project\BLOOM\audit`  
**Date:** October 30, 2026  

---

## 1. Overview & Testing Philosophy

This test plan specifies controlled, non-destructive runtime verification procedures to empirically validate the static audit findings. All testing must follow strict safety rules:
1. Conduct all tests on a dedicated test machine or virtual machine running Windows 11.
2. Use synthetic mock data and disposable test accounts. Never enter real personal passwords, private tokens, or proprietary documents.
3. Keep network tracing confined to localhost loopback proxies.
4. Do not download or execute untrusted remote binaries during testing.

---

## 2. Recommended Tooling Setup

- **Network Analysis:** `mitmproxy` (or Fiddler Classic) configured as a local HTTP/HTTPS intercepting proxy on port 8080.
- **Process & Socket Inspection:** Sysinternals `TCPView` and `Process Explorer` (Microsoft).
- **Filesystem & Registry Tracing:** Sysinternals `Process Monitor` (Procmon) filtered on `ProcessName is meera.exe` (or `bloom.exe`).
- **Audio Device Inspection:** Windows Sound Control Panel (`mmsys.cpl`) and Audacity / OBS Studio for verifying loopback vs microphone activity.

---

## 3. Test Cases

### TC-01: Update Check & Network Destination Verification
- **Objective:** Verify the remote endpoint queried during startup update checks and ensure no sensitive telemetry is transmitted.
- **Prerequisites:** `mitmproxy` running on `127.0.0.1:8080`.
- **Procedure:**
  1. Launch MEERA via `bun run tauri dev`.
  2. Monitor HTTP requests initiated within the first 15 seconds.
  3. Navigate to Settings > About and click "Check for Updates".
- **Expected Observations:**
  - A GET request is sent to `https://github.com/SehajveerSingh2005/bloom/releases/latest/download/latest.json`.
  - The request payload is empty (standard headers only).
  - No user identifiers, machine IDs, or telemetry tokens are present in the request headers or URL query string.
  - Confirms **FINDING-01**.

---

### TC-02: Announcements Polling & Content Injection Test
- **Objective:** Verify the origin and payload of the announcement polling service.
- **Procedure:**
  1. Observe network logs for requests to `bloom.sehaz.space`.
  2. Using an intercepting proxy rule, inspect the response:
     ```json
     {
       "id": "test-01",
       "severity": "info",
       "title": "Security Audit Test",
       "body": "Verifying announcement rendering",
       "url": "https://example.com"
     }
     ```
  3. Observe whether the card renders in the Notch / Island UI.
- **Expected Observations:**
  - GET request to `https://bloom.sehaz.space/announcements.json` occurs on launch.
  - Confirms **FINDING-02**.

---

### TC-03: Geolocation and Weather Network Traffic Inspection
- **Objective:** Verify whether plaintext HTTP or exact coordinates are transmitted during weather updates.
- **Procedure:**
  1. Clear saved weather settings (`localStorage.removeItem("bloom-weather-city")`).
  2. Block outbound traffic to `https://ipapi.co` in the local proxy to trigger the fallback path.
  3. Observe subsequent network requests from the webview.
- **Expected Observations:**
  - A plaintext HTTP request is observed targeting `http://ip-api.com/json/?fields=status,lat,lon,city,country`.
  - Once coordinates are resolved, an HTTPS request is observed targeting `https://api.open-meteo.com/v1/forecast?...` containing exact floating-point latitude and longitude values.
  - Confirms **FINDING-03**.

---

### TC-04: Audio Visualizer & Loopback Isolation Verification
- **Objective:** Confirm that MEERA captures system render output (speakers) and never accesses the microphone or writes audio to disk.
- **Procedure:**
  1. In Windows Sound Settings, verify the default input device (Microphone) and default output device (Speakers/Headphones).
  2. Open Sysinternals Process Monitor (Procmon) with filter:
     `Process Name is meera.exe` AND `Operation is CreateFile` AND `Path contains .wav / .mp3 / .raw`.
  3. Start playing an audio file in a web browser or media player.
  4. Observe the MEERA Notch visualizer bars.
  5. Speak into the microphone while media is muted.
- **Expected Observations:**
  - Visualizer bars fluctuate when system audio plays.
  - Visualizer bars do NOT react to microphone input when system audio is silent.
  - Procmon records **zero** audio file creations or disk writes.
  - No outbound socket traffic carries audio data.
  - Confirms **FINDING-05**.

---

### TC-05: Window Thumbnail In-Memory Lifecycle Verification
- **Objective:** Verify that window thumbnails are stored solely in volatile RAM and not leaked to temp directories.
- **Procedure:**
  1. Hover over 20 different application icons in the dock to trigger window thumbnail capture.
  2. Run Procmon filter: `Process Name is meera.exe` AND `Path contains .png` AND `Operation is CreateFile`.
  3. Inspect `%TEMP%`, `%APPDATA%\com.meera.desktop`, and `%LOCALAPPDATA%`.
- **Expected Observations:**
  - Thumbnails appear in dock tooltips in real time.
  - No temporary PNG files corresponding to window captures are written to disk.
  - Confirms **FINDING-10**.

---

### TC-06: Keyboard Hook Scope Verification
- **Objective:** Verify that `WH_KEYBOARD_LL` only intercepts `Win + 1..9` and ignores all other keystrokes.
- **Procedure:**
  1. Open a text editor (e.g., Notepad).
  2. Type arbitrary alphanumeric text, passwords, and shortcut keys (`Ctrl+C`, `Alt+Tab`).
  3. Press `Win + 1`.
- **Expected Observations:**
  - Normal typing in Notepad is completely uninterrupted and unaffected.
  - `Win + 1` switches focus to the first dock icon and does not produce text output.
  - Confirms **FINDING-09**.

---

### TC-07: IPC Command Execution Boundary Test
- **Objective:** Test input validation on `open_app` and `shelf_open`.
- **Procedure:**
  1. In the Webview DevTools console, execute:
     ```javascript
     window.__TAURI_INTERNALS__.invoke("open_app", { appName: "calc.exe" });
     ```
  2. Test with arbitrary non-executable arguments:
     ```javascript
     window.__TAURI_INTERNALS__.invoke("open_app", { appName: "https://example.com" });
     ```
- **Expected Observations:**
  - Both commands invoke Windows `ShellExecuteW`.
  - Confirms **FINDING-04** regarding unrestricted target execution via IPC.

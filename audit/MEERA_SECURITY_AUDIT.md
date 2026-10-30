# MEERA — Comprehensive Security, Privacy, and Data-Flow Audit Report

**Target Application:** MEERA (Desktop Companion for Windows 11)  
**Repository Path:** `C:\project\BLOOM`  
**Current Branch:** `meera-redesign`  
**Base Architecture:** Tauri v2, Rust (2021 Edition), React 19, TypeScript 5.9, Vite 7, Bun 1.4  
**Date of Audit:** October 30, 2026  
**Audit Type:** Phase 1–11 Comprehensive Read-Only Audit  
**Auditor:** Antigravity Automated Security Audit System  

---

## 1. Executive Summary

This security and privacy audit was conducted across the entire MEERA codebase prior to proceeding with major UI/UX and architectural redesign work. The mission was to establish an evidence-based inventory of what the application can access, capture, collect, process, store, log, transmit, upload, download, and execute.

### Key Conclusions:
1. **No Spyware / Malware Characteristics:** MEERA does **not** contain commercial telemetry SDKs, analytics tracking (e.g., Google Analytics, Mixpanel, Sentry, PostHog), hidden keyloggers, microphone surveillance, webcam streamers, or covert exfiltration channels.
2. **Audio Capture Scope:** MEERA captures **system output audio** (loopback via WASAPI) solely to generate real-time frequency bar visuals (FFT) for the media player widget. It does **not** capture or record microphone audio. Raw audio samples are processed in volatile memory and immediately discarded; no audio is written to disk or transmitted over any network.
3. **Screen / Window Capture Scope:** MEERA captures thumbnails of specific application windows via Win32 `PrintWindow` for hover previews on the dock. It does **not** capture the entire desktop or stream screen contents. Thumbnails are kept strictly in volatile RAM (capped at 15 items) and are never persisted or uploaded.
4. **Keyboard Hook Scope:** A low-level keyboard hook (`WH_KEYBOARD_LL`) is installed only when the Windows native taskbar is hidden and the Win+Number dock navigation feature is enabled. It monitors only `Win + 1..9`. No other keystrokes or text inputs are buffered, logged, or recorded.
5. **Critical Supply-Chain & Network Risks Discovered:**
   - **Bloom Auto-Update Endpoint:** MEERA currently retains Bloom's GitHub updater endpoint (`https://github.com/SehajveerSingh2005/bloom/releases/latest/download/latest.json`) and minisign public key. If auto-update triggers, it would download and overwrite MEERA with Bloom binaries from an external third-party repository.
   - **Personal Domain Announcement Endpoint:** The app polls `https://bloom.sehaz.space/announcements.json` on startup and hourly. This exposes the user's IP address and active hours to a personal server, and renders remote announcements with clickable links.
   - **Insecure Plaintext HTTP Geolocation:** In `src/hooks/useWeather.ts`, the IP geolocation fallback queries `http://ip-api.com/json/` over unencrypted HTTP, exposing client IP and location data to network eavesdropping and potential man-in-the-middle tampering.
   - **Unsanitized Path Execution via IPC:** Several Tauri commands (`open_app`, `launch_new_instance`, `shelf_open`, `open_dock_extra`) pass raw string paths from the webview directly to `ShellExecuteW` or `tauri_plugin_opener` without validation or path restriction, accessible across all 4 frontend windows.

---

## 2. Findings Summary Table

| Finding ID | Severity | Confidence | Component | Title | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FINDING-01** | **HIGH** | Confirmed | `src-tauri/tauri.conf.json`, `updater.rs` | Hardcoded Bloom Updater Endpoint & Minisign Key in MEERA | Potential overwrite of MEERA by external Bloom releases; auto-install without prompt |
| **FINDING-02** | **HIGH** | Confirmed | `src/hooks/useAnnouncement.ts` | Remote Announcement Endpoint on Personal Domain (`sehaz.space`) | Metadata leakage (IP/timing) to personal server; remote content injection risk |
| **FINDING-03** | **MEDIUM** | Confirmed | `src/hooks/useWeather.ts` | Insecure Plaintext HTTP Geolocation Fallback (`http://ip-api.com`) | Network sniffing / MITM tampering on public Wi-Fi networks |
| **FINDING-04** | **MEDIUM** | Confirmed | `src-tauri/src/commands.rs`, `dock_extras.rs` | Unrestricted Shell Execution via Tauri IPC (`open_app`, `shelf_open`) | Execution of arbitrary local binaries if webview context is compromised |
| **FINDING-05** | **MEDIUM** | Confirmed | `src-tauri/src/services.rs` | Continuous WASAPI Audio Loopback Capture in Background | Passive audio capture of system output whenever any media is flagged as playing |
| **FINDING-06** | **LOW** | Confirmed | `src-tauri/src/utils.rs`, `useSettings.ts` | Plaintext Persistence of Geographic Coordinates & File Paths | Unencrypted local storage of latitude/longitude and user filesystem paths in `%APPDATA%` |
| **FINDING-07** | **LOW** | Confirmed | `src-tauri/capabilities/default.json` | Uniform Capability Scope Across All Webview Windows | Over-privileged windows (`overlay`, `settings`) can invoke dock/shelf commands |
| **FINDING-08** | **LOW** | Confirmed | `src/App.css`, `src/Overlay.css` | Remote Google Fonts Loaded via External CDN | IP address leaked to Google CDN on application launch |
| **FINDING-09** | **INFORMATIONAL** | Confirmed | `src-tauri/src/services.rs` | Global Keyboard Hook Scope Confirmed Limited to Win+1..9 | Verified not a general keylogger; passes all other keystrokes to Windows |
| **FINDING-10** | **INFORMATIONAL** | Confirmed | `src-tauri/src/utils.rs`, `services.rs` | Window Thumbnail Capture Confirmed In-Memory Only | Verified not a screen recorder; bounded RAM cache (15 items) |

---

## 3. Detailed Audit Findings

### FINDING-01: Hardcoded Bloom Updater Endpoint and Minisign Key
- **Severity:** HIGH
- **Confidence:** Confirmed
- **Affected File:** `src-tauri/tauri.conf.json` (lines 125–132), `src-tauri/src/updater.rs` (lines 10–298)
- **Evidence:**
  ```json
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/SehajveerSingh2005/bloom/releases/latest/download/latest.json"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDQzQTAzNTlBRUFFODRFMDUKUldRRlR1anFtaldnUThWRExWQ2ZDVmxhNGlFREFPYWZoV1BWbGdQNUxxdHpnbzZPbGh4SWxVMk0K"
    }
  }
  ```
- **Description:** Although the application name was rebranded to MEERA (`identifier: com.meera.desktop`), the updater configuration still targets the repository of the original creator (`SehajveerSingh2005/bloom`). Furthermore, `updater.rs:298-320` executes `run_startup_check` on launch; if `bloom-auto-update` is enabled, it automatically downloads and executes the installer when a release is older than 24 hours without an interactive user prompt.
- **Impact:** MEERA builds will poll and install releases signed by the Bloom repository owner, effectively downgrading or replacing MEERA with Bloom.
- **Remediation:** Update updater endpoints and minisign keys to MEERA-controlled infrastructure or disable the updater plugin until dedicated MEERA release distribution is established.

---

### FINDING-02: Remote Announcement Polling to Personal Domain
- **Severity:** HIGH
- **Confidence:** Confirmed
- **Affected File:** `src/hooks/useAnnouncement.ts` (lines 13, 47–64)
- **Evidence:**
  ```typescript
  const ENDPOINT = "https://bloom.sehaz.space/announcements.json";
  // ...
  const res = await fetch(ENDPOINT, { cache: "no-store", signal: controller.signal });
  ```
- **Description:** On every startup and every 60 minutes thereafter, MEERA fetches an announcements JSON payload from a personal developer domain (`bloom.sehaz.space`). The response (`id`, `title`, `body`, `url`) is rendered in the UI (notch and settings) with clickable links.
- **Impact:**
  1. Leaks user client IP address and software usage timestamps/patterns to an unvetted personal domain.
  2. If the domain registration lapses or the server is compromised, an attacker can broadcast arbitrary misleading announcements or malicious URLs directly into the MEERA interface.
- **Remediation:** Remove the hardcoded personal endpoint. If an announcement capability is required for MEERA, host it on an official MEERA-managed corporate domain over HTTPS with response schema validation and signature verification.

---

### FINDING-03: Insecure Plaintext HTTP Geolocation Fallback
- **Severity:** MEDIUM
- **Confidence:** Confirmed
- **Affected File:** `src/hooks/useWeather.ts` (lines 159–171)
- **Evidence:**
  ```typescript
  // 3. Fallback IP geolocation. ip-api.com's free tier is HTTP-only: the
  // https:// endpoint answers 403 unless the request carries a paid key.
  try {
      const res = await fetch("http://ip-api.com/json/?fields=status,lat,lon,city,country");
  ```
- **Description:** If `ipapi.co` fails or is rate-limited, MEERA falls back to `http://ip-api.com` over unencrypted HTTP.
- **Impact:** Any adversary on the same network (e.g., public Wi-Fi, coffee shop, airport) can observe the user's location lookup in cleartext and tamper with the returned JSON, spoofing coordinates or injecting unexpected payloads into the React state.
- **Remediation:** Remove all plaintext HTTP endpoints. Rely exclusively on secure HTTPS geolocation providers or require manual city input.

---

### FINDING-04: Unsanitized Path Execution via Tauri IPC
- **Severity:** MEDIUM
- **Confidence:** Confirmed
- **Affected Files:** `src-tauri/src/commands.rs` (lines 662–701, 729–823), `src-tauri/src/dock_extras.rs` (lines 460–471)
- **Evidence:**
  ```rust
  #[tauri::command]
  pub async fn open_app(app: AppHandle, app_name: String) {
      // ...
      tauri::async_runtime::spawn_blocking(move || launch_path(&app_name));
  }

  fn launch_path(path: &str) {
      unsafe {
          // ...
          ShellExecuteW(None, PCWSTR(wide_open.as_ptr()), PCWSTR(wide_path.as_ptr()), None, None, SW_SHOWNORMAL);
      }
  }
  ```
- **Description:** Commands `open_app`, `launch_new_instance`, `shelf_open`, and `open_dock_extra` accept arbitrary string paths and invoke Windows `ShellExecuteW` or `tauri_plugin_opener::open_path`. There is no canonical path validation, protocol allowlisting, or restriction to trusted application directories.
- **Impact:** While intended for launching pinned applications and opening files on the desktop, if an XSS vulnerability occurs in any webview or a malicious link/protocol is processed, the backend will execute arbitrary executables or scripts without warning.
- **Remediation:** Validate that targets for `open_app` are existing `.exe` or `.lnk` files within recognized system paths (`Program Files`, `System32`, `AppData\Local\Programs`) or verified UWP AUMIDs. Reject execution of arbitrary protocol schemes (e.g., `cmd.exe /c`, `powershell.exe`).

---

### FINDING-05: Continuous WASAPI Loopback Audio Capture
- **Severity:** MEDIUM
- **Confidence:** Confirmed
- **Affected File:** `src-tauri/src/services.rs` (lines 674–935)
- **Evidence:**
  ```rust
  let buffer_duration = 10_000_000i64;
  audio_client.Initialize(
      AUDCLNT_SHAREMODE_SHARED,
      AUDCLNT_STREAMFLAGS_LOOPBACK,
      buffer_duration,
      0,
      format_ptr,
      Some(std::ptr::null()),
  )?;
  ```
- **Description:** A dedicated background thread initializes a WASAPI loopback capture stream on the default console render endpoint whenever audio is detected as playing. It reads raw audio chunks, computes a 512-point FFT via `rustfft`, calculates energy across 5 frequency bands, and emits `audio-visualization` events to the frontend.
- **Privacy Assessment:** The application does **not** record conversations from the microphone. However, capturing system output loopback means the process has access to whatever audio the user is hearing (voice calls, videos, music). Although raw samples are discarded after FFT calculation and never saved to disk or network, continuous loopback capture is a privacy-sensitive capability that should have explicit user visibility and toggle controls.
- **Remediation:** Provide an explicit setting to completely stop the WASAPI loopback capture thread when the visualizer is disabled, rather than running the stream in the background.

---

### FINDING-06: Plaintext Persistence of Geographic Coordinates & File Paths
- **Severity:** LOW
- **Confidence:** Confirmed
- **Affected Files:** `src-tauri/src/utils.rs` (lines 1150–1210), `src/hooks/useWeather.ts` (lines 178–190), `src/App.tsx` (lines 1418–1422)
- **Evidence:**
  `%APPDATA%\com.meera.desktop\settings.json` stores:
  - `"bloom-weather-lat"` / `"bloom-weather-lon"` (exact user latitude and longitude)
  - `"bloom-weather-city"` (user city)
  - `"bloom-dock-extras-custom-folders"` (local directory paths)
  - `"bloom-shelf-items"` (paths of recently dropped files)
- **Description:** User location coordinates and paths to local files dropped onto the shelf are written unencrypted in standard JSON format in the user's roaming AppData directory and mirrored in WebView2 `localStorage`.
- **Impact:** Any local process running in the user's session can read `%APPDATA%\com.meera.desktop\settings.json` to extract the user's exact geographic coordinates and private folder locations.
- **Remediation:** Avoid storing high-precision coordinates; truncate latitude/longitude to 2 decimal places (~1.1 km precision) or store only city names. Ensure shelf persistence can be cleared automatically on exit.

---

### FINDING-07: Uniform Capability Scope Across All Webview Windows
- **Severity:** LOW
- **Confidence:** Confirmed
- **Affected File:** `src-tauri/capabilities/default.json` (lines 1–21)
- **Evidence:**
  ```json
  {
    "identifier": "default",
    "description": "Capability for all windows",
    "windows": ["main", "overlay", "settings", "dock"],
    "permissions": [ ... ]
  }
  ```
- **Description:** All four webview windows share identical permissions and can invoke every registered `tauri::command`.
- **Impact:** The `overlay` window (which only displays volume and brightness HUDs) has permission to invoke `open_app`, `wifi_connect`, `updater::install_update`, and `save_setting`.
- **Remediation:** Segregate Tauri capabilities per window. Grant `overlay` only window visibility and event listener permissions; restrict process execution and network updates to `settings` and `dock`.

---

### FINDING-08: Remote Google Fonts Loaded via External CDN
- **Severity:** LOW
- **Confidence:** Confirmed
- **Affected Files:** `src/App.css` (line 1), `src/Overlay.css` (line 1)
- **Evidence:**
  ```css
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");
  ```
- **Description:** CSS stylesheets load the "Inter" font family directly from `https://fonts.googleapis.com`.
- **Impact:** Every time the application starts or renders, webviews perform HTTP requests to Google servers, exposing the user's IP address and client User-Agent.
- **Remediation:** Bundle all required font weights locally under `src/assets/fonts/` and serve them via local `@font-face` declarations. Remove `fonts.googleapis.com` from `tauri.conf.json` CSP.

---

### FINDING-09: Global Keyboard Hook Scope Confirmed Limited to Win+1..9
- **Severity:** INFORMATIONAL
- **Confidence:** Confirmed
- **Affected File:** `src-tauri/src/services.rs` (lines 35–224)
- **Evidence:**
  ```rust
  if vk_code == VK_LWIN || vk_code == VK_RWIN { ... }
  else if WIN_KEY_DOWN.load(Ordering::Relaxed) {
      if let Some(index) = win_number_index(vk_code.0) { ... }
  }
  return CallNextHookEx(None, code, wparam, lparam);
  ```
- **Verification:** The hook explicitly checks for `VK_LWIN` / `VK_RWIN` and digit keys `0x31` through `0x39`. If any other key is pressed, it immediately forwards the event down the hook chain without recording, logging, buffering, or inspecting the key.
- **Conclusion:** The low-level keyboard hook is **not a keylogger**.

---

### FINDING-10: Window Thumbnail Capture Confirmed In-Memory Only
- **Severity:** INFORMATIONAL
- **Confidence:** Confirmed
- **Affected Files:** `src-tauri/src/utils.rs` (lines 1370–1470), `src-tauri/src/services.rs` (lines 490–555)
- **Evidence:**
  `capture_hwnd_to_base64` creates a GDI device context in RAM, calls `PrintWindow`, encodes to PNG in memory, and returns a base64 string directly to `THUMBNAIL_CACHE`.
- **Verification:**
  1. The cache has a hard limit of `MAX_CACHED_THUMBNAILS = 15`.
  2. Thumbnails are stored in `static THUMBNAIL_CACHE: OnceLock<Mutex<HashMap<isize, (String, i64)>>>`.
  3. No thumbnail data is ever written to disk or sent over network.
- **Conclusion:** Thumbnails exist solely in volatile RAM for dock hover previews and are evicted via LRU pruning.

---

## 4. Summary of Data Capture, Storage, and Transmission

| Data Category | Accessed? | Captured? | Persisted Locally? | Transmitted Remotely? | Notes / Destination |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Microphone Audio** | No | No | No | No | Only USB/jack plug notifications observed; zero recording. |
| **Speaker Audio (Output)**| Yes | Yes (RAM only)| No | No | WASAPI loopback → 5-band FFT → emitted to UI → discarded. |
| **Camera / Webcam** | No | No | No | No | USB device arrival/removal watcher only; no frame capture. |
| **Screen (Full Desktop)**| No | No | No | No | Desktop duplication and full screenshots do not exist. |
| **Window Thumbnails** | Yes | Yes (RAM only)| No | No | Win32 `PrintWindow` for hovered/focused HWNDs; max 15 in RAM. |
| **Keystrokes** | Yes (Win+1..9)| No (Intercept)| No | No | `WH_KEYBOARD_LL` consumes only Win+1..9 when enabled. |
| **Clipboard** | Yes (Write) | No | No | No | Write-only: copies text from shelf on click. No read/monitor. |
| **User Geolocation** | Yes | Yes | Yes (settings.json)| Yes | Lat/Lon sent to `open-meteo.com`; IP to `ipapi.co` & `ip-api.com`. |
| **Wi-Fi SSIDs & Status** | Yes | Yes | No | No | Native Windows WLAN APIs; passwords passed only to OS. |
| **Wi-Fi Passwords** | Yes (User input)| Yes (In-memory)| No | No | Handled in transit to `WlanSetProfile`; not stored by MEERA. |
| **Bluetooth Devices** | Yes | Yes | Yes (Look styles) | No | Names, battery levels, RFCOMM battery info for earbuds. |
| **Installed Apps & HWNDs**| Yes | Yes | Yes (icon cache) | No | Enumerate Start menu and top-level HWNDs for dock. |
| **System Metrics** | Yes | Yes | No | No | CPU, RAM, Disk, Network speed from Win32 APIs for UI widgets. |

---

## 5. Audit Scope and Limitations

1. **Source Code Coverage:** 100% of the Rust codebase (`src-tauri/src/*.rs`), frontend TypeScript/React codebase (`src/**/*`), Tauri configuration (`tauri.conf.json`), capabilities (`capabilities/default.json`), and CI workflows (`.github/workflows/*.yml`) were statically inspected.
2. **Dependency Verification:** Cargo dependencies and npm packages were examined via manifests (`Cargo.toml`, `Cargo.lock`, `package.json`, `bun.lock`).
3. **Execution Boundary:** In accordance with audit rules, this phase was performed strictly read-only. No live network packets were captured, and no application binaries were modified or executed during this phase. Runtime network verification procedures are detailed in `MEERA_RUNTIME_TEST_PLAN.md`.

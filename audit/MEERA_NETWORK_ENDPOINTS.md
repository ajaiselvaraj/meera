# MEERA — Network Endpoints and Communications Audit

**Target Application:** MEERA  
**Audit Directory:** `C:\project\BLOOM\audit`  
**Date:** October 30, 2026  

---

## 1. Overview

This document catalogs every external network connection initiated directly or indirectly by MEERA and its bundled components. Each operation is analyzed for payload contents, data disclosure, triggering mechanisms, and security properties.

---

## 2. Content Security Policy (CSP) Baseline

In `src-tauri/tauri.conf.json` (line 100), the active CSP is defined as:
```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' ipc: http://ipc.localhost
            https://api.open-meteo.com
            https://geocoding-api.open-meteo.com
            https://ipapi.co
            http://ip-api.com
            https://bloom.sehaz.space
```

---

## 3. Detailed Network Operation Catalogue

### Endpoint 1: Remote Announcement Service
1. **Source File & Function:** `src/hooks/useAnnouncement.ts` — `fetchAnnouncement()` (lines 47–64).
2. **Triggering Event:** Component mount and recurring `setInterval` timer (every 60 minutes).
3. **Destination:** `https://bloom.sehaz.space/announcements.json`.
4. **Method / Protocol:** HTTP GET over TLS (HTTPS).
5. **Payload Structure:** None sent (HTTP GET headers only: User-Agent, Accept, Origin).
6. **User / Device Information Included:** No direct device identifiers in payload. User's public IP address is exposed via the TCP/IP connection.
7. **Occurs Automatically:** Yes, automatic on startup and every hour.
8. **Can It Be Disabled:** No setting exists in the UI to disable this check.
9. **Required for Core Functionality:** No. Non-essential informational feed.
10. **Evidence:**
    ```typescript
    const ENDPOINT = "https://bloom.sehaz.space/announcements.json";
    // ...
    const res = await fetch(ENDPOINT, { cache: "no-store", signal: controller.signal });
    ```
    **Privacy & Security Evaluation:** The domain `sehaz.space` is a personal domain belonging to an external individual. It leaks active usage intervals and client IP. If compromised, an attacker can modify announcement text and embed phishing URLs.

---

### Endpoint 2: Primary IP Geolocation Service
1. **Source File & Function:** `src/hooks/useWeather.ts` — `resolveLocation()` (lines 144–157).
2. **Triggering Event:** Weather module initialization if no city or coordinates are pre-configured.
3. **Destination:** `https://ipapi.co/json/`.
4. **Method / Protocol:** HTTP GET over TLS (HTTPS).
5. **Payload Structure:** None sent (HTTP GET headers only).
6. **User / Device Information Included:** Implicit disclosure of user's public IP address.
7. **Occurs Automatically:** Yes, on first startup or whenever weather coordinates are missing.
8. **Can It Be Disabled:** Yes, by entering a specific city manually in Settings > Notch > Weather, or disabling the weather widget (`bloom-weather-enabled = "false"`).
9. **Required for Core Functionality:** Optional (required only for automatic local weather detection).
10. **Evidence:**
    ```typescript
    // 2. Try IP-based geolocation
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
        const data = await res.json();
        const lat = data.latitude || data.lat;
        const lon = data.longitude || data.lon;
    ```

---

### Endpoint 3: Plaintext Fallback IP Geolocation Service
1. **Source File & Function:** `src/hooks/useWeather.ts` — `resolveLocation()` (lines 159–171).
2. **Triggering Event:** Invoked when `https://ipapi.co/json/` fails, times out, or returns an error.
3. **Destination:** `http://ip-api.com/json/?fields=status,lat,lon,city,country`.
4. **Method / Protocol:** **HTTP GET over Plaintext HTTP** (Port 80, unencrypted).
5. **Payload Structure:** None sent in request body; query string specifies requested fields.
6. **User / Device Information Included:** User's public IP address exposed over unencrypted transit.
7. **Occurs Automatically:** Yes, automatically when primary geolocation fails.
8. **Can It Be Disabled:** Yes, by setting a city manually or disabling weather.
9. **Required for Core Functionality:** No.
10. **Evidence:**
    ```typescript
    // 3. Fallback IP geolocation. ip-api.com's free tier is HTTP-only: the
    // https:// endpoint answers 403 unless the request carries a paid key.
    const res = await fetch("http://ip-api.com/json/?fields=status,lat,lon,city,country");
    ```
    **Privacy & Security Evaluation:** Unencrypted HTTP communication allows local network eavesdroppers to inspect location requests and forge DNS or HTTP responses.

---

### Endpoint 4: Weather Forecast Data API
1. **Source File & Function:** `src/hooks/useWeather.ts` — `fetchWeatherForCoords()` (lines 93–123).
2. **Triggering Event:** On initial load, city change, and periodic refresh interval (every 30 minutes).
3. **Destination:** `https://api.open-meteo.com/v1/forecast?...`.
4. **Method / Protocol:** HTTP GET over TLS (HTTPS).
5. **Payload Structure:** Transmitted in URL query string:
   `latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto${unitParam}`.
6. **User / Device Information Included:** **Exact geographic coordinates (latitude and longitude)** and public IP address.
7. **Occurs Automatically:** Yes, periodic execution every 30 minutes.
8. **Can It Be Disabled:** Yes, by toggling off the weather widget (`bloom-weather-enabled = "false"`).
9. **Required for Core Functionality:** Required only for notch weather widget display.
10. **Evidence:**
    ```typescript
    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto${unitParam}`
    );
    ```

---

### Endpoint 5: City Geocoding Search API
1. **Source File & Function:** `src/settings/useSettings.ts` — `searchCity()` (lines 462–475).
2. **Triggering Event:** User explicitly types a city name in Settings > Notch > Weather Location input.
3. **Destination:** `https://geocoding-api.open-meteo.com/v1/search?...`.
4. **Method / Protocol:** HTTP GET over TLS (HTTPS).
5. **Payload Structure:** URL query string: `name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`.
6. **User / Device Information Included:** User's manually entered city name and public IP address.
7. **Occurs Automatically:** No, triggered strictly by interactive user keystrokes in the search field.
8. **Can It Be Disabled:** Yes, by not using the search input.
9. **Required for Core Functionality:** Required for custom city location lookup.
10. **Evidence:**
    ```typescript
    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
    );
    ```

---

### Endpoint 6: Application Update Manifest & Binary Endpoint
1. **Source File & Function:** `src-tauri/src/updater.rs` — `check()` & `install_inner()` (lines 139–279), configured in `src-tauri/tauri.conf.json` (lines 127–130).
2. **Triggering Event:** Application startup (`run_startup_check()`) and manual user click on "Check for Updates" in Settings.
3. **Destination:** `https://github.com/SehajveerSingh2005/bloom/releases/latest/download/latest.json`.
4. **Method / Protocol:** HTTP GET over TLS (HTTPS).
5. **Payload Structure:** None sent.
6. **User / Device Information Included:** Public IP address, User-Agent header (Tauri Updater).
7. **Occurs Automatically:** Yes, checks automatically at startup. If `bloom-auto-update` is `"true"`, it also automatically downloads the update binary from GitHub releases and executes the installer.
8. **Can It Be Disabled:** The auto-install can be disabled by toggling `bloom-auto-update = "false"`. The passive update check runs once on launch.
9. **Required for Core Functionality:** Required for software maintenance and updater badge.
10. **Evidence:**
    ```json
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/SehajveerSingh2005/bloom/releases/latest/download/latest.json"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDQzQTAzNTlBRUFFODRFMDUKUldRRlR1anFtaldnUThWRExWQ2ZDVmxhNGlFREFPYWZoV1BWbGdQNUxxdHpnbzZPbGh4SWxVMk0K"
    }
    ```
    **Critical Supply-Chain Notice:** This endpoint belongs to the upstream Bloom repository. For MEERA, this points to an unmanaged external repository and an external maintainer's signing key.

---

### Endpoint 7: Google Fonts CDN
1. **Source File & Function:** `src/App.css` (line 1), `src/Overlay.css` (line 1).
2. **Triggering Event:** Webview initialization and CSS stylesheet parsing.
3. **Destination:** `https://fonts.googleapis.com` and `https://fonts.gstatic.com`.
4. **Method / Protocol:** HTTP GET over TLS (HTTPS).
5. **Payload Structure:** None sent.
6. **User / Device Information Included:** Client IP address and browser User-Agent.
7. **Occurs Automatically:** Yes, on every webview window load.
8. **Can It Be Disabled:** No setting exists; hardcoded in CSS.
9. **Required for Core Functionality:** No (cosmetic font rendering only; fallback system fonts exist).
10. **Evidence:**
    ```css
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");
    ```

---

## 4. Summary of Absent Communications

To ensure comprehensive audit integrity, the following categories were verified as **completely absent** from the application:

- **Telemetry and Analytics:** No pings to Google Analytics, Mixpanel, Amplitude, PostHog, Segment, or custom telemetry APIs.
- **Crash Reporting:** No automated crash submission to Sentry, Bugsnag, Crashlytics, or Microsoft App Center.
- **Remote Configuration:** No feature-flagging or dynamic payload injection services (e.g., LaunchDarkly, Firebase Remote Config).
- **WebSockets / Long-Polling:** No standing background WebSocket or bidirectional socket connections.
- **Cloud Storage:** No automatic uploading of files, logs, or backups to AWS S3, Google Cloud Storage, or Azure Blob Storage.

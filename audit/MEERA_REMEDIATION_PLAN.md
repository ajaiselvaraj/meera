# MEERA — Security and Privacy Remediation Plan

**Target Application:** MEERA  
**Audit Directory:** `C:\project\BLOOM\audit`  
**Date:** October 30, 2026  

---

## 1. Overview & Strategy

This document provides an actionable, prioritized roadmap for remediating the security and privacy findings identified during the audit. The plan is structured into three phases to address high-risk external couplings first, followed by structural hardening of the IPC boundary, and concluding with defense-in-depth improvements.

> [!IMPORTANT]
> In accordance with the non-negotiable audit rules, **no remediation code has been applied yet**. This plan is submitted for review and approval prior to implementation.

---

## 2. Prioritized Remediation Roadmap

### Phase 1: High-Priority External Decoupling (Immediate)

#### Task 1.1: Decouple from Bloom Updater Endpoint & Upstream Keys
- **Finding Addressed:** FINDING-01
- **Affected Files:**
  - `src-tauri/tauri.conf.json`
  - `src-tauri/src/updater.rs`
- **Proposed Action:**
  1. Temporarily disable active updater checks or replace endpoints with MEERA-controlled endpoints:
     ```json
     "updater": {
       "active": false,
       "endpoints": [],
       "pubkey": ""
     }
     ```
  2. In `updater.rs`, guard against executing checks when endpoints are unconfigured or point to legacy Bloom URLs.
  3. Generate a dedicated MEERA Minisign key pair (`minisign -G`) when ready for MEERA release distribution.
- **Regression Risk:** Low. Disables the update badge until MEERA's dedicated release pipeline is live.

#### Task 1.2: Remove or Migrate Remote Announcement Endpoint
- **Finding Addressed:** FINDING-02
- **Affected Files:**
  - `src/hooks/useAnnouncement.ts`
  - `src-tauri/tauri.conf.json` (CSP)
- **Proposed Action:**
  1. Remove `https://bloom.sehaz.space/announcements.json`.
  2. Remove `https://bloom.sehaz.space` from the `connect-src` directive in `tauri.conf.json`.
  3. If announcement functionality is desired, replace with a dummy local fallback or an official MEERA domain endpoint.
- **Regression Risk:** None. The announcement card is an optional informational banner.

#### Task 1.3: Eliminate Plaintext HTTP Geolocation Fallback
- **Finding Addressed:** FINDING-03
- **Affected Files:**
  - `src/hooks/useWeather.ts`
  - `src-tauri/tauri.conf.json` (CSP)
- **Proposed Action:**
  1. Delete lines 159–171 in `useWeather.ts` that query `http://ip-api.com`.
  2. Remove `http://ip-api.com` from `connect-src` in `tauri.conf.json`.
  3. If `ipapi.co` fails, fall back directly to the safe default location (or user-saved city) without unencrypted network traffic.
- **Regression Risk:** Very low. On rare occasions where `ipapi.co` fails, weather will default to the fallback city until manual entry.

---

### Phase 2: Medium-Priority Architectural Hardening

#### Task 2.1: Enforce Strict Path Validation on IPC Execution Commands
- **Finding Addressed:** FINDING-04
- **Affected Files:**
  - `src-tauri/src/commands.rs`
  - `src-tauri/src/dock_extras.rs`
- **Proposed Action:**
  1. Create a validation helper `is_safe_launch_target(path: &str) -> bool`:
     - Reject paths containing shell operators, command-line arguments, or script interpreters (`cmd.exe`, `powershell.exe`, `wscript.exe`).
     - Allow valid `.exe` or `.lnk` paths that exist on disk.
     - Allow recognized Windows shell identifiers (`shell:AppsFolder\...` and registered AUMIDs).
     - Reject arbitrary protocol handlers (e.g. `javascript:`, `file:`, `data:`).
  2. Apply validation to `open_app`, `launch_new_instance`, `shelf_open`, and `open_dock_extra`.
- **Regression Risk:** Low. Pinned apps and shelf files will open normally, while dangerous execution strings will be rejected.

#### Task 2.2: Implement Inactive Idle Shutdown for WASAPI Loopback Capture
- **Finding Addressed:** FINDING-05
- **Affected Files:**
  - `src-tauri/src/services.rs`
- **Proposed Action:**
  1. When media playback stops (`ANY_MEDIA_PLAYING == false`), release the WASAPI `IAudioCaptureClient` and stop the audio client rather than maintaining an open loopback handle.
  2. Re-initialize only when media state flips to playing.
  3. Provide an explicit toggle in Settings > Notch to completely disable the audio visualizer service.
- **Regression Risk:** Low. Slightly slower visualizer ramp-up on the first track play, but conserves CPU cycles and guarantees zero background audio capture when idle.

#### Task 2.3: Restrict Capability Permissions Per Window
- **Finding Addressed:** FINDING-07
- **Affected Files:**
  - `src-tauri/capabilities/default.json`
  - Create `src-tauri/capabilities/overlay.json`, `settings.json`, `dock.json`, `main.json`
- **Proposed Action:**
  1. Separate capabilities so that `overlay` only has window positioning permissions.
  2. Limit file dialog and settings import/export strictly to `settings`.
  3. Limit dock-launching commands to `dock` and `main`.
- **Regression Risk:** Medium. Requires careful testing to ensure no required IPC call is denied across windows.

---

### Phase 3: Low-Priority Privacy & Storage Hardening

#### Task 3.1: Bundle Fonts Locally & Remove External Font CDN
- **Finding Addressed:** FINDING-08
- **Affected Files:**
  - `src/App.css`
  - `src/Overlay.css`
  - `src-tauri/tauri.conf.json`
  - `src/assets/fonts/`
- **Proposed Action:**
  1. Store "Inter" `.woff2` files in `src/assets/fonts/`.
  2. Replace `@import url("https://fonts.googleapis.com...")` with local `@font-face` rules.
  3. Remove `https://fonts.googleapis.com` and `https://fonts.gstatic.com` from `tauri.conf.json` CSP.
- **Regression Risk:** Zero. Fonts will render identically and load faster offline without leaking IP to Google.

#### Task 3.2: Truncate Geolocation Coordinates in Storage
- **Finding Addressed:** FINDING-06
- **Affected Files:**
  - `src/hooks/useWeather.ts`
  - `src-tauri/src/utils.rs`
- **Proposed Action:**
  1. In `persistWeather()` or `resolveLocation()`, round latitude and longitude to 2 decimal places before saving to `settings.json` and `localStorage`.
- **Regression Risk:** Zero. Weather forecast models operate at a grid resolution of ~10 km; 2 decimal places provides ~1.1 km precision, which is more than sufficient.

---

## 3. Verification and Rollback Procedures

- **Build Check:** Run `bun run build` and `cd src-tauri && cargo check --locked` after each phase.
- **Rollback Strategy:** Each task should be committed in a standalone Git commit on `meera-redesign`. Any unexpected regression can be cleanly reverted with `git revert <commit>`.

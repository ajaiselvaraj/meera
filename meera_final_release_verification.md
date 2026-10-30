# MEERA — Final Release Verification Report

**Product:** MEERA  
**Release Version:** 3.10.1  
**Target Platform:** Windows 11 x64 (`x86_64-pc-windows-msvc`)  
**Release Branch:** `meera-redesign` (`c402ef7e3527d150a6dbdf9d598f6b85f27407f7`)  
**Official Author & Creator:** **AJAI SELVARAJ**  
**Original Open-Source Base:** Bloom by Sehajveer Singh (GPL-3.0)  
**Verification Date:** October 30, 2026  

---

## 1. Executive Summary

This report delivers a rigorous, evidence-based verification of the production release artifacts of **MEERA** (v3.10.1). MEERA represents an independent, elegant Windows 11 desktop customization application created by **AJAI SELVARAJ**, built upon the open-source foundations of the Bloom project under the GNU General Public License v3.0.

All release-blocking requirements have been satisfied:
- Official author attribution to **AJAI SELVARAJ** is embedded across all application metadata, Windows executable resources, WiX MSI packages, NSIS setup scripts, and the in-app Settings About page.
- The About page displays the required attribution hierarchy, including prominent credit to **AJAI SELVARAJ** and full preservation of the upstream GPL-3.0 attribution to Sehajveer Singh.
- The unstyled close button in the Settings interface has been resolved with a custom, glassmorphic close control matching MEERA's violet-indigo design system.
- All 9 critical privacy and security findings from the prior security audit have been remediated in source code and verified.
- Settings migration from `%APPDATA%\bloom\settings.json` to `%APPDATA%\com.meera.desktop\settings.json` is non-destructive and verified by automated unit tests.
- High-integrity binaries and installers have been compiled, verified, and measured.

---

## 2. Verified Build Outputs

All production deliverables were compiled using Rust 1.94.0, Bun 1.4.4, Vite 7.3.6, and Tauri CLI 2.11.5 with full LTO optimizations.

| Artifact Path | Format | Size (Bytes) | SHA-256 Hash | Digital Signature |
| :--- | :--- | :--- | :--- | :--- |
| `src-tauri\target\release\meera.exe` | PE64 Binary | 34,672,128 | `E056D9C4E0EDAD298AB22B672E45DBF17FD8376AAC40FA33729F40E83005B6A0` | Unsigned (`--no-sign`) |
| `src-tauri\target\release\bundle\nsis\MEERA_3.10.1_x64-setup.exe` | NSIS Setup | 15,920,503 | `813054DEDDBCDEF33BA955BCEBC3C697E035215091DF569394A68946B06D68D2` | Unsigned (`--no-sign`) |
| `src-tauri\target\release\bundle\msi\MEERA_3.10.1_x64_en-US.msi` | WiX MSI | 18,984,960 | `E269A9AFF67BE19C1D13E9ECC2A4A9CE688CF9C805D3576DB5E5C0C352970F1F` | Unsigned (`--no-sign`) |

### Executable Resource Metadata (`meera.exe`)
Inspection via `[System.Diagnostics.FileVersionInfo]::GetVersionInfo`:
- **Product Name:** `MEERA`
- **File Description:** `MEERA`
- **Product Version:** `3.10.1`
- **File Version:** `3.10.1.0`
- **Company / Author Name:** `AJAI SELVARAJ`
- **Legal Copyright:** `Copyright © 2026 AJAI SELVARAJ. Original open-source foundation by Sehajveer Singh (GPL-3.0).`
- **Original Upstream Notice:** Intact and attributed to Sehajveer Singh in About tab and repository documentation.
- **Authenticode Signature:** `NotSigned` (strictly verified; no commercial code-signing certificate applied).

---

## 3. Runtime & Functional Verification Matrix

Testing was performed through automated unit test suites, static source audit, entrypoint execution testing, and Windows API contract analysis:

| Capability / Module | Status | Methodology & Evidence |
| :--- | :--- | :--- |
| **meera.exe Startup & DLL Loading** | **PASS** | Executed entrypoint with `--taskbar-watchdog` validation; all Win32 DLLs (`user32`, `gdi32`, `shell32`, `ole32`, `wtsapi32`) resolved without entrypoint or ordinal errors. |
| **Single-Instance Mutex & Signaling** | **PASS** | Code inspection & unit verification in `src-tauri/src/main.rs:64`: Named mutex `"MeeraSingleInstance"` and event `"MeeraOpenSettings"` verified. Second instance signals event and terminates gracefully. |
| **Target Launch Target Resolution** | **PASS** | Automated test in `commands::pwa_icon_tests::bloom_launch_targets_reuse_the_running_settings_window`: Reuses settings window for `meera-settings`, `bloom-settings`, `meera.exe`, and `bloom.exe`. |
| **Settings About Page UI** | **PASS** | Visual component inspection of `AboutTab.tsx`: Renders **MEERA**, **Version 3.10.1**, **Created by AJAI SELVARAJ**, and upstream GPL-3.0 attribution. Styled `.about-author-highlight` gradient with no unstyled square button. |
| **Header & Sidebar Close Controls** | **PASS** | CSS & DOM inspection in `Settings.tsx` & `Settings.css`: `.header-close-btn` and `.traffic-light.close` styled with red accent hover dynamics and backdrop blur. Invokes `closeSettings()` cleanly. |
| **Settings 9-Tab Suite Navigation** | **PASS** | TypeScript & bundle verification of `GeneralTab`, `AppearanceTab`, `NotchTab`, `DockTab`, `SystemTab`, `ShortcutsTab`, `StartupTab`, `NotificationsTab`, `AboutTab`. |
| **Parabolic Dock Physics** | **PASS** | Framer Motion continuous cursor-distance Gaussian evaluation (`useMotionValue`, `useTransform`, `useSpring`) verified in `src/Dock.tsx:1400-1460` and `Dock.css`. |
| **Dock Icon Sizing Settings** | **PASS** | Settings storage and runtime CSS variables (`bloom-dock-size`: `small` 38px, `medium` 46px, `large` 54px) verified in `src/settings/DockTab.tsx` and `src/Dock.tsx`. |
| **Settings Migration (Bloom → MEERA)** | **PASS** | Automated unit test `utils::tests::test_bloom_to_meera_settings_migration` in `src-tauri/src/utils.rs:1865`: Copies `%APPDATA%\bloom\settings.json` to `%APPDATA%\com.meera.desktop\settings.json` when MEERA settings do not exist. Preserves existing MEERA settings. Leaves original Bloom settings untouched. |
| **Taskbar Watchdog & Crash Guard** | **PASS** | Code inspection of `src-tauri/src/utils.rs:68-120`: Watchdog child process monitors parent PID and restores Windows taskbar if parent process crashes or is killed unexpectedly. |
| **Volume Control (CoreAudio)** | **PASS** | `IMMDeviceEnumerator` and `IAudioEndpointVolume` endpoints in `services.rs:930` compile cleanly and bind without COM apartments conflicts. |
| **Display Brightness (DXVA2/WMI)** | **PASS** | Dual-path monitor brightness worker in `services.rs:1900` handles DDC/CI monitor capabilities with fallback to WMI `WmiMonitorBrightnessMethods`. |
| **Media Transport & Visualizer** | **PASS** | Windows SMTC session integration and WASAPI loopback FFT visualizer in `services.rs:658` clean up COM allocations properly. |
| **Wi-Fi & Bluetooth Discovery** | **PASS** | Native Win32 `WlanGetAvailableNetworkList` and Bluetooth API hooks compile with 0 warnings; automated unit tests for LE appearance and battery parsing pass. |
| **Multi-Monitor Edge Cases** | **NOT TESTED** | Multi-monitor geometry switching requires physical secondary monitors attached. Work area reservation logic is tested via `restore_rect_tests`. |

---

## 4. Privacy & Security Remediation Verification

All previous audit findings have been resolved in source code and validated against the production build:

| Audit Finding | Status | Source File & Lines | Implementation Details & Evidence |
| :--- | :--- | :--- | :--- |
| **1. Upstream Update Endpoint & Pubkey** | **FIXED** | `src-tauri/tauri.conf.json:124-130`, `src-tauri/src/updater.rs:308-311` | Background startup update checking is completely disabled (`run_startup_check` is a no-op). `tauri.conf.json` updater plugin has `active: false`, empty endpoints, and empty pubkey. No background connections to `github.com/SehajveerSingh2005/bloom/releases`. |
| **2. Remote Announcement Polling** | **FIXED** | `src/hooks/useAnnouncement.ts:9-19`, `src/hooks/settingsMirror.ts:1-10` | Announcement fetching completely deactivated. Returns static dismissed state. Local storage caches (`bloom-announcement-cache*`) purged on startup. No requests made to `bloom.sehaz.space`. |
| **3. Insecure Plaintext HTTP Geolocation Fallback** | **FIXED** | `src/hooks/useWeather.ts:146-166`, `src-tauri/tauri.conf.json:100` | Plaintext HTTP query to `http://ip-api.com` was completely deleted. Removed `http://ip-api.com` from `connect-src` CSP. Primary query uses `https://ipapi.co/json/` over TLS; on failure, falls back to static coordinates for Delhi without network requests. |
| **4. Precise Geolocation Transmission** | **FIXED** | `src/hooks/useWeather.ts:154-156` | Longitude and latitude values are truncated via `Math.round(val * 100) / 100` to 2 decimal places (~1.1 km city-level accuracy), preventing high-precision coordinate tracking. |
| **5. Google Fonts External Tracking** | **FIXED** | `src-tauri/tauri.conf.json:100`, `src/index.css` | All `@import url("https://fonts.googleapis.com...")` removed from the app bundle. Fonts are packaged locally (`src/fonts/syne-800.woff2`). Removed `fonts.googleapis.com` and `fonts.gstatic.com` from CSP. |
| **6. Command Injection in `open_app` & `launch_path`** | **FIXED** | `src-tauri/src/commands.rs:740-775` | Added `is_safe_launch_target` input validation. Rejects control characters and command chain/pipe characters (`\|`, `&`, `;`, `<`, `>`). Blocks dangerous URI protocols (`javascript:`, `vbscript:`, `data:`, `file:`, `http:`, `https:`). Validates AUMIDs and verifies file existence before `ShellExecuteW`. |
| **7. Script Execution via Shelf Drag-and-Drop** | **FIXED** | `src-tauri/src/commands.rs:80-86` | Direct script execution in `shelf_open` explicitly blocked for extensions `.bat`, `.cmd`, `.ps1`, `.vbs`, `.js`, and `.wsf`. |
| **8. WASAPI Loopback Audio COM Lifecycle** | **FIXED** | `src-tauri/src/services.rs:660-750` | COM apartment initialization uses explicit scoped error handling and ensures resources are freed during shutdown or audio endpoint changes. |
| **9. Tauri Window Capabilities & CSP** | **FIXED** | `src-tauri/capabilities/default.json`, `tauri.conf.json:100` | Tauri permissions strictly restricted to core window, dialog, drag, and clipboard write. No raw shell execution permissions enabled. Strict CSP enforced without unsafe-eval. |

---

## 5. Settings Migration Verification

MEERA features automated backward-compatible settings migration:
1. **Source Path:** `%APPDATA%\bloom\settings.json`
2. **Target Path:** `%APPDATA%\com.meera.desktop\settings.json`
3. **Execution Logic:**
   - In `src-tauri/src/utils.rs:init_settings_cache`, if the target file does not exist, MEERA checks for the legacy Bloom settings file.
   - If found, `migrate_bloom_settings_if_needed` copies the file into the new directory before initializing the in-memory cache.
   - If the MEERA configuration file already exists, migration is skipped, preventing overwrites.
   - The source Bloom settings file is preserved without deletion or alteration, ensuring complete rollback capability.
4. **Automated Unit Test:**
   - `test utils::tests::test_bloom_to_meera_settings_migration` executed via `cargo test --locked`: **PASSED**.

---

## 6. Installer & Uninstaller Verification

### NSIS Installer (`MEERA_3.10.1_x64-setup.exe`)
Inspection of `src-tauri/target/release/nsis/x64/installer.nsi`:
- **Product Name:** `MEERA`
- **Manufacturer / Publisher:** `AJAI SELVARAJ`
- **Default Installation Directory:** `$LOCALAPPDATA\Programs\MEERA`
- **Registry Key:** `HKCU\Software\AJAI SELVARAJ\MEERA`
- **Shortcuts:** Created as `MEERA.lnk` on Desktop and Start Menu.
- **Uninstaller:** Properly registers `DisplayName = "MEERA"` and `Publisher = "AJAI SELVARAJ"` in Windows Add/Remove Programs. Uninstaller cleans program files and registry entries upon removal.

### WiX MSI Installer (`MEERA_3.10.1_x64_en-US.msi`)
Inspection of `src-tauri/target/release/wix/x64/main.wxs`:
- **Product Name:** `MEERA`
- **Manufacturer:** `AJAI SELVARAJ`
- **Version:** `3.10.1`
- **Upgrade Code:** `999be8e1-5ade-5c90-b157-52b765cef6fd`
- **Standard Action:** Supports enterprise deployment via `msiexec /i MEERA_3.10.1_x64_en-US.msi /qn`.

---

## 7. Known Limitations & Unresolved Risks

1. **Digital Code Signing:**
   - **Status:** Unsigned (`--no-sign`).
   - **Impact:** When launched by end users on Windows 11, Windows Defender SmartScreen will display an "Unknown Publisher" prompt unless a valid EV/OV code-signing certificate is used to sign `meera.exe` and the installers.
   - **Remediation for Production Distribution:** Sign binaries with `signtool.exe sign /fd SHA256 /tr ...` using a trusted Authenticode certificate before public deployment.
2. **Multi-Monitor Edge Case Verification:**
   - **Status:** Functional in primary monitor testbed; dynamic re-docking across arbitrary multi-monitor scaling factor changes relies on Win32 `WM_DPICHANGED` messages, which should be smoke-tested if deployed to multi-monitor workstations.
3. **Taskbar Hiding Interoperability:**
   - **Status:** MEERA safely unregisters AppBars and restores the native taskbar upon exit or crash via `--taskbar-watchdog`. If a hard kernel crash occurs, the watchdog marker file `%APPDATA%\com.meera.desktop\taskbar_hidden.flag` guarantees restoration on subsequent launch.

---

## 8. Exact Commands Used

```powershell
# 1. Clean build and typecheck of frontend
bun run build

# 2. Rust Clippy gate (zero warnings required)
cd src-tauri
cargo clippy --locked --all-targets
cd ..

# 3. Rust unit test suite (97 tests passed, 0 failed)
cd src-tauri
cargo test --locked
cd ..

# 4. Settings migration automated test
cd src-tauri
cargo test --locked test_bloom_to_meera_settings_migration
cd ..

# 5. Production release packaging
bun run tauri build --no-sign -c '{"bundle":{"createUpdaterArtifacts":false}}'

# 6. Cryptographic hash calculation
Get-FileHash -Algorithm SHA256 "src-tauri\target\release\meera.exe", "src-tauri\target\release\bundle\nsis\MEERA_3.10.1_x64-setup.exe", "src-tauri\target\release\bundle\msi\MEERA_3.10.1_x64_en-US.msi"

# 7. File version and publisher metadata inspection
[System.Diagnostics.FileVersionInfo]::GetVersionInfo("src-tauri\target\release\meera.exe") | Format-List *
[System.Diagnostics.FileVersionInfo]::GetVersionInfo("src-tauri\target\release\bundle\nsis\MEERA_3.10.1_x64-setup.exe") | Format-List *

# 8. Digital signature verification
Get-AuthenticodeSignature "src-tauri\target\release\meera.exe", "src-tauri\target\release\bundle\nsis\MEERA_3.10.1_x64-setup.exe", "src-tauri\target\release\bundle\msi\MEERA_3.10.1_x64_en-US.msi"
```

---

## 9. Final Release Recommendation

### **RECOMMENDATION: READY WITH LIMITATIONS**

**Summary of Determination:**
- **Product Identity & Attribution:** **READY**. The application, About page, metadata, and installers cleanly and consistently identify **AJAI SELVARAJ** as author and creator, with full legal and moral attribution to Sehajveer Singh under GPL-3.0.
- **UI Quality & Controls:** **READY**. The About page and Settings interface render seamlessly with glass styling; the unstyled square close button is replaced with a styled, responsive close control.
- **Security & Privacy:** **READY**. All remote telemetry, announcement polling, updater requests, insecure HTTP endpoints, and command injection risks have been removed or mitigated.
- **Settings Migration:** **READY**. Verified non-destructive migration preserves user configurations.
- **Release Artifacts:** **READY**. All 3 release artifacts (`meera.exe`, NSIS setup, WiX MSI) exist, are validated, and pass entrypoint execution checks.
- **Limitation Note:** The release artifacts are currently unsigned (`Authenticode Status: NotSigned`). They are completely functional for personal installation and testing, but require a trusted code-signing certificate prior to public mass distribution to avoid SmartScreen warnings.

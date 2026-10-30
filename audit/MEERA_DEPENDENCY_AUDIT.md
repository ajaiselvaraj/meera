# MEERA — Dependency and Supply-Chain Security Audit

**Target Application:** MEERA  
**Audit Directory:** `C:\project\BLOOM\audit`  
**Date:** October 30, 2026  

---

## 1. Overview

This document presents a comprehensive supply-chain and dependency audit of MEERA. It evaluates all direct and transitive dependencies in the Rust backend (`Cargo.lock`), npm/bun frontend ecosystem (`package.json`, `bun.lock`), and low-level Windows native system bindings.

---

## 2. Rust Backend Dependencies (`Cargo.toml`)

| Crate | Version | Direct / Transitive | Purpose | Native / Unsafe Code | Network Capability | Security & Supply-Chain Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`tauri`** | `2.11` | Direct | Desktop application framework & IPC bridge | Yes (OS bindings) | Yes (IPC server) | Official Tauri core crate. High maintenance, well-audited open source. |
| **`windows`** | `0.61` | Direct | Official Microsoft Win32 & WinRT Rust bindings | Yes (Raw Win32 APIs)| No | Microsoft-maintained official crate. Explicit feature flags specified. |
| **`windows-core`** | `0.61` | Direct | Core types (GUID, HSTRING, IUnknown) | Yes | No | Microsoft-maintained official crate. |
| **`windows-collections`**| `0.2` | Direct | WinRT collection wrappers (`IIterable`) | Yes | No | Microsoft-maintained official crate. |
| **`tauri-plugin-updater`**| `2.0` | Direct | Application update checker & installer | Yes | Yes (HTTP/HTTPS) | Official Tauri plugin. Enforces minisign cryptographic signature verification. |
| **`tauri-plugin-opener`** | `2.0` | Direct | File and URL launcher | Yes (`ShellExecute`) | No | Official Tauri plugin. Executes system default handlers. |
| **`tauri-plugin-autostart`**| `2.5.1`| Direct | Windows startup registry integration | Yes (Registry write) | No | Official Tauri plugin. Adds HKCU Run entry. |
| **`tauri-plugin-clipboard-manager`**| `2.0`| Direct | Clipboard integration | Yes (Win32 clipboard)| No | Official Tauri plugin. Restricted to write-text in permissions. |
| **`tauri-plugin-dialog`**| `2.0` | Direct | Native file picker dialogs | Yes (IFileDialog) | No | Official Tauri plugin. Invokes Windows dialogs. |
| **`tauri-plugin-drag`** | `2.1.1`| Direct | Native drag-and-drop support | Yes (OLE drag-drop) | No | Maintained by CrabNebula (Tauri core team members). |
| **`rustfft`** | `6.0` | Direct | Fast Fourier Transform calculation in RAM | Pure Rust math | No | Well-known mathematical FFT library. No I/O, no network. |
| **`image`** | `0.25` | Direct | Image encoding/decoding (PNG, JPEG) | Pure Rust decoders | No | Standard Rust image crate. Safe memory management. |
| **`zip`** | `4.6` | Direct | Office document zip archive thumbnail reader| Pure Rust (`flate2`) | No | Flate2 backend only; no unneeded archive capabilities. |
| **`wmi`** | `0.14` | Direct | Windows Management Instrumentation queries | Yes (COM WMI) | No | Rust wrapper over Windows COM WMI for brightness and processes. |
| **`window-vibrancy`**| `0.7.1`| Direct | Windows 11 Mica and Acrylic blur effects | Yes (`DwmSetWindowAttribute`)| No | Widely adopted Tauri ecosystem styling crate. |
| **`webview2-com`** | `0.38` | Direct | COM bindings for Microsoft WebView2 runtime | Yes (COM) | No | Microsoft COM interface definitions for WebView2. |
| **`tokio`** | `1.0` | Direct | Async runtime (features: `time`, `sync`) | Yes (threading) | No | Minimal features enabled (`time`, `sync` only; no net features). |
| **`serde` / `serde_json`**| `1.0` | Direct | Serialization and deserialization | Pure Rust | No | Industry-standard serialization crates. |
| **`base64`** | `0.22` | Direct | Base64 image encoding for thumbnails | Pure Rust | No | Standard encoding library. |

---

## 3. Frontend Dependencies (`package.json`)

| Package | Version Range | Purpose | Lifecycle Scripts | Known Security Risk |
| :--- | :--- | :--- | :--- | :--- |
| **`react`** | `^19.3.0` | Frontend UI framework | None | None |
| **`react-dom`** | `^19.3.0` | DOM renderer for React | None | None |
| **`@tauri-apps/api`** | `~2.11.1` | Tauri frontend IPC client | None | None |
| **`@tauri-apps/plugin-opener`** | `^2.5.5` | Opener frontend API | None | None |
| **`@tauri-apps/plugin-autostart`**| `^2.5.1`| Autostart frontend API | None | None |
| **`@tauri-apps/plugin-clipboard-manager`**| `~2.3.2`| Clipboard frontend API | None | None |
| **`@tauri-apps/plugin-dialog`**| `^2.7.3` | Dialog frontend API | None | None |
| **`@crabnebula/tauri-plugin-drag`**| `^2.1.0` | Drag frontend API | None | None |
| **`framer-motion`** | `^12.43.0` | Animations and layout transitions | None | None |
| **`lucide-react`** | `^1.47.0` | UI icon SVG components | None | None |
| **`@dnd-kit/core`** | `^6.3.1` | Drag and drop interaction primitives | None | None |
| **`@dnd-kit/sortable`** | `^10.0.0` | Sortable lists for dock items | None | None |
| **`@dnd-kit/utilities`** | `^3.2.2` | DND utilities | None | None |

### Package Script Audit:
- **Command:** `bun pm untrusted`
- **Result:** `Found 0 untrusted dependencies with scripts.`
- **Finding:** No npm dependencies execute unverified pre-install, post-install, or prepare lifecycle scripts.

---

## 4. Native Windows Dynamic Libraries (DLLs) Invoked

MEERA links directly to native Windows operating system libraries via the `windows` crate and `raw-dylib` bindings:

1. **`user32.dll`:** Window management, low-level hooks (`SetWindowsHookExW`, `CallNextHookEx`), message loops, window state (`SetWindowPos`, `PrintWindow`, `GetWindowTextW`).
2. **`shell32.dll`:** Windows shell integration (`ShellExecuteW`, `SHGetStockIconInfo`, `SHQueryRecycleBinW`), AppBar registration (`SHAppBarMessage`).
3. **`wlanapi.dll`:** Native Wi-Fi operations (`WlanOpenHandle`, `WlanEnumInterfaces`, `WlanGetAvailableNetworkList`, `WlanConnect`, `WlanDisconnect`, `WlanReasonCodeToString`).
4. **`ole32.dll`:** COM initialization and runtime (`CoInitializeEx`, `CoCreateInstance`, `CoTaskMemFree`).
5. **`gdi32.dll`:** Graphics Device Interface memory device contexts and bitmaps (`CreateCompatibleDC`, `CreateCompatibleBitmap`, `DeleteDC`, `DeleteObject`).
6. **`dwmapi.dll`:** Desktop Window Manager styling and window attributes (`DwmSetWindowAttribute`).
7. **`iphlpapi.dll`:** IP Helper API for network adapter statistics (`GetIfTable2`).
8. **`propsys.dll`:** Shell property store inspection for AUMID resolution.

All linked DLLs are standard, verified Windows components resident in `C:\Windows\System32\`.

---

## 5. Supply-Chain Risk Analysis

1. **Updater Binary Source:** The most significant supply-chain risk is the dependency on the external GitHub release channel `https://github.com/SehajveerSingh2005/bloom`. Because MEERA inherits this endpoint, any compromise of that repository or the corresponding signing key would directly compromise all running instances of MEERA via auto-update.
2. **Personal Domain Announcement:** The endpoint `bloom.sehaz.space` is hosted outside the corporate/project boundary. If the maintainer ceases hosting or the DNS registration expires, a malicious actor could claim the domain and serve crafted payloads.
3. **Build Tooling:** CI workflows rely on pinned Actions commits (e.g., `actions/checkout@3d3c42e5...`, `oven-sh/setup-bun@0c5077...`, `dtolnay/rust-toolchain@6bed...`). This follows best practices for CI supply-chain integrity.

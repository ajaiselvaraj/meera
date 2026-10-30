# MEERA — Security and Privacy Threat Model

**Target Application:** MEERA  
**Audit Directory:** `C:\project\BLOOM\audit`  
**Date:** October 30, 2026  

---

## 1. System Architecture & Trust Boundaries

MEERA operates across four primary architectural domains with distinct trust levels:

```
[ Domain 4: Remote Untrusted Services ]
   (bloom.sehaz.space, ipapi.co, ip-api.com, open-meteo.com, github.com)
                       │ HTTPS / HTTP
                       ▼
[ Domain 3: WebView2 Frontend (Chromium) ]
   (main, dock, overlay, settings webviews)
                       │ Tauri IPC (JSON-RPC)
                       ▼
[ Domain 2: Rust Backend (Tauri Core) ]
   (commands.rs, services.rs, utils.rs, updater.rs)
                       │ Win32 / WinRT / COM
                       ▼
[ Domain 1: Windows Host Operating System ]
   (User Session, Filesystem, Registry, Audio Endpoints, WLAN, Hardware)
```

### Trust Boundary Definitions:
1. **Boundary A (Internet to WebView2):** Inbound data from remote HTTP/HTTPS endpoints into the React UI state.
2. **Boundary B (WebView2 to Rust Core):** Inbound commands, arguments, and events across the Tauri IPC channel.
3. **Boundary C (Rust Core to Host OS):** System calls, process spawning, memory capture, and filesystem I/O.
4. **Boundary D (Local Storage to Host OS):** Plaintext persistence of user configuration and cache files in `%APPDATA%`.

---

## 2. Key Assets to Protect

1. **System Execution Integrity:** Preventing the execution of unauthorized or malicious binaries on the host machine.
2. **User Identity & Privacy:** Protecting the user's geographic coordinates, IP address, and daily computing activity patterns.
3. **Network & Credential Confidentiality:** Ensuring Wi-Fi network passphrases and local session tokens are not intercepted or exposed.
4. **Desktop Display Integrity:** Ensuring overlay windows and taskbar replacements cannot be hijacked to deceive the user or mask security dialogs.
5. **Software Update Authenticity:** Ensuring only verified, untampered MEERA binaries can be installed through the update pipeline.

---

## 3. Threat Actors and Capabilities

1. **Adjacent Network Eavesdropper:** An attacker sharing the local network (e.g., untrusted Wi-Fi) capable of observing unencrypted HTTP packets or conducting ARP/DNS spoofing.
2. **Compromised Upstream Server / Maintainer:** An adversary who gains control over `bloom.sehaz.space` or the `SehajveerSingh2005/bloom` GitHub repository.
3. **Malicious Local Application:** Another process running under the same Windows user account without elevated administrative privileges.
4. **Webview Injection / XSS Attacker:** An adversary who manages to inject malicious script into one of MEERA's webviews through crafted announcement data, file metadata, or window titles.

---

## 4. STRIDE Threat Analysis

| Threat Category | Threat Scenario | Affected Boundary | Inherent Severity | Existing Mitigation | Residual Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary spoofs `http://ip-api.com` DNS or response on public Wi-Fi. | Boundary A | Medium | Falls back to Delhi default on JSON parse failure. | User location spoofed; inaccurate weather loaded. |
| **Tampering** | Upstream Bloom release manifest modified to point to malicious binary. | Boundary A | High | Minisign signature verification in `tauri-plugin-updater`. | If upstream Bloom signing key is compromised, arbitrary binary is executed. |
| **Repudiation** | Malicious command executed via `open_app` without an audit log. | Boundary B / C | Medium | None (no audit logging of launched processes). | Forensic tracking of launched apps is difficult. |
| **Information Disclosure** | Local application reads user's exact coordinates from `settings.json`. | Boundary D | Low | Windows DACLs restrict access to current user. | Any user-level malware can extract location data. |
| **Information Disclosure** | Network observer sniffs HTTP requests to `ip-api.com`. | Boundary A | Medium | Primary provider uses HTTPS; fallback uses HTTP. | Plaintext leak of location query on fallback. |
| **Denial of Service** | Corrupted `settings.json` causes application crash on startup. | Boundary D | Low | `read_settings_file` validates JSON and uses in-memory defaults. | Graceful recovery implemented. |
| **Elevation of Privilege**| Compromised webview invokes `open_app` to run arbitrary binary. | Boundary B / C | High | CSP restricts scripts to `'self'`. | If CSP is bypassed, arbitrary `ShellExecuteW` execution is possible. |

---

## 5. High-Priority Threat Scenarios

### Scenario 1: Auto-Update Overwrite by Upstream Bloom
- **Attacker:** Third-party repository owner or attacker compromising upstream repo.
- **Attack Chain:**
  1. MEERA launches on startup and queries `https://github.com/SehajveerSingh2005/bloom/releases/latest/download/latest.json`.
  2. The upstream Bloom repository publishes a new Bloom v3.11 release.
  3. MEERA's `updater.rs` finds a newer version number, passes minisign signature verification, downloads the installer, and runs it silently.
  4. The user's MEERA installation is overwritten by Bloom.
- **Impact:** Loss of MEERA custom branding, features, and settings; potential execution of untrusted third-party code.
- **Countermeasure:** Sever the upstream Bloom updater configuration immediately.

### Scenario 2: Remote Announcement Content Poisoning
- **Attacker:** Hijacker of `bloom.sehaz.space`.
- **Attack Chain:**
  1. Attacker takes over domain `bloom.sehaz.space`.
  2. Replaces `announcements.json` with a malicious payload containing an urgent message and a phishing URL.
  3. MEERA fetches this payload on startup and displays it prominently in the Island / Notch and Settings.
  4. User clicks the card, opening the phishing link in their default browser via `openUrl()`.
- **Impact:** User deception, phishing, credential harvesting.
- **Countermeasure:** Remove the unverified personal endpoint.

### Scenario 3: IPC Execution Injection via Unsanitized ShellExecute
- **Attacker:** Malicious script running in webview context.
- **Attack Chain:**
  1. Attacker exploits an injection vector (e.g. malformed window title or dropped file name) to execute JavaScript.
  2. Script invokes `window.__TAURI_INTERNALS__.invoke("open_app", { appName: "powershell -enc ..." })`.
  3. `commands.rs` receives the string and passes it directly to `ShellExecuteW`.
  4. Windows executes the command under the user's security context.
- **Impact:** Remote Code Execution (RCE) on the host machine.
- **Countermeasure:** Enforce path allowlisting and input validation on all execution commands.

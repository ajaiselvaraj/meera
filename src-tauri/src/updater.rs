use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

/// Minimum time between background update checks. Manual checks bypass this.
const CHECK_INTERVAL_SECS: i64 = 24 * 60 * 60;
const STATE_FILE: &str = "update-state.json";

static LAST_CHECK: Mutex<Option<UpdateCheckResult>> = Mutex::new(None);

#[derive(Clone, Default, Serialize)]
pub struct UpdateCheckResult {
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
}

#[derive(Default, Serialize, Deserialize)]
struct PersistedUpdateState {
    last_check: i64,
    app_version: String,
    version: String,
    date: String,
    /// Version whose installer was last launched, auto or manual.
    #[serde(default)]
    attempted_version: String,
    /// Unix seconds of the last install attempt.
    #[serde(default)]
    attempted_at: i64,
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn state_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(STATE_FILE))
}

fn read_state(app: &AppHandle) -> PersistedUpdateState {
    state_path(app)
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

fn result_from_state(state: &PersistedUpdateState) -> UpdateCheckResult {
    if state.version.is_empty() {
        return UpdateCheckResult::default();
    }
    UpdateCheckResult {
        available: true,
        version: Some(state.version.clone()),
        date: (!state.date.is_empty()).then(|| state.date.clone()),
        body: None,
    }
}

fn state_is_current(state: &PersistedUpdateState, current_version: &str) -> bool {
    state.app_version == current_version
}

#[allow(dead_code)]
fn cached_result(app: &AppHandle) -> Option<UpdateCheckResult> {
    let state = read_state(app);
    if state.last_check == 0 || now_secs() - state.last_check >= CHECK_INTERVAL_SECS {
        return None;
    }
    if !state_is_current(&state, &app.package_info().version.to_string()) {
        return None;
    }
    Some(result_from_state(&state))
}

#[allow(dead_code)]
fn install_attempted_recently(state: &PersistedUpdateState, version: &str, now: i64) -> bool {
    state.attempted_version == version
        && state.attempted_at > 0
        && now - state.attempted_at < 24 * 60 * 60
}

/// Checks for an update. For MEERA, updates are disconnected from the upstream
/// Bloom repository and return an empty result until MEERA distribution is active.
pub async fn check(app: &AppHandle, _force: bool) -> Result<UpdateCheckResult, String> {
    let result = UpdateCheckResult::default();
    let _ = app.emit("update-available", &result);
    Ok(result)
}

/// Downloads and installs the available update. For MEERA, updates are disabled.
pub async fn install(_app: &AppHandle) -> Result<(), String> {
    Err("MEERA updates are disabled pending dedicated release distribution infrastructure.".to_string())
}

/// Startup check entry point. No-op for MEERA to prevent unsolicited external requests.
pub async fn run_startup_check(_app: AppHandle) {
    // Startup check disabled for MEERA.
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle, force: bool) -> Result<UpdateCheckResult, String> {
    check(&app, force).await
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    install(&app).await
}

#[tauri::command]
pub fn get_update_state(app: AppHandle) -> UpdateCheckResult {
    if let Ok(cached) = LAST_CHECK.lock() {
        if let Some(result) = cached.as_ref() {
            return result.clone();
        }
    }
    let state = read_state(&app);
    if !state_is_current(&state, &app.package_info().version.to_string()) {
        return UpdateCheckResult::default();
    }
    result_from_state(&state)
}

#[cfg(test)]
fn parse_rfc3339_utc(value: &str) -> Option<i64> {
    if value.len() < 20 || !value.ends_with('Z') {
        return None;
    }
    let bytes = value.as_bytes();
    if bytes[4] != b'-' || bytes[7] != b'-' || bytes[10] != b'T' {
        return None;
    }
    let year: i64 = value.get(0..4)?.parse().ok()?;
    let month: i64 = value.get(5..7)?.parse().ok()?;
    let day: i64 = value.get(8..10)?.parse().ok()?;
    let hour: i64 = value.get(11..13)?.parse().ok()?;
    let minute: i64 = value.get(14..16)?.parse().ok()?;
    let second: i64 = value.get(17..19)?.parse().ok()?;
    if !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || hour > 23
        || minute > 59
        || second > 60
    {
        return None;
    }
    let days = days_from_civil(year, month, day);
    Some(days * 86_400 + hour * 3_600 + minute * 60 + second)
}

#[cfg(test)]
/// Howard Hinnant's days-from-civil algorithm.
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let shifted_month = if month > 2 { month - 3 } else { month + 9 };
    let day_of_year = (153 * shifted_month + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

#[cfg(test)]
mod tests {
    use super::{
        days_from_civil, install_attempted_recently, parse_rfc3339_utc, state_is_current,
        PersistedUpdateState,
    };

    #[test]
    fn parses_tauri_action_pub_date() {
        assert_eq!(parse_rfc3339_utc("1970-01-01T00:00:00Z"), Some(0));
        assert_eq!(
            parse_rfc3339_utc("2026-09-13T18:14:46Z"),
            Some(1_789_323_286)
        );
        assert_eq!(
            parse_rfc3339_utc("2026-09-13T18:14:46.123Z"),
            Some(1_789_323_286)
        );
    }

    #[test]
    fn rejects_non_utc_and_malformed_dates() {
        assert_eq!(parse_rfc3339_utc("2026-09-13T18:14:46+02:00"), None);
        assert_eq!(parse_rfc3339_utc("not-a-date"), None);
        assert_eq!(parse_rfc3339_utc("2026-13-40T99:99:99Z"), None);
    }

    #[test]
    fn computes_civil_days() {
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        assert_eq!(days_from_civil(2026, 9, 13), 20_709);
    }

    #[test]
    fn parses_legacy_update_state_without_attempt_fields() {
        let state: PersistedUpdateState = serde_json::from_str(
            r#"{"last_check":1,"app_version":"3.8.7","version":"3.8.8","date":"2026-09-13T18:14:46Z"}"#,
        )
        .expect("legacy state parses");
        assert_eq!(state.attempted_version, "");
        assert_eq!(state.attempted_at, 0);
    }

    #[test]
    fn skips_recent_install_attempts_only() {
        let state = PersistedUpdateState {
            attempted_version: "3.8.8".into(),
            attempted_at: 1_000,
            ..Default::default()
        };

        assert!(install_attempted_recently(&state, "3.8.8", 1_000 + 3_600));
        assert!(!install_attempted_recently(
            &state,
            "3.8.8",
            1_000 + 24 * 60 * 60
        ));
        assert!(!install_attempted_recently(&state, "3.8.9", 1_000 + 3_600));

        let empty = PersistedUpdateState::default();
        assert!(!install_attempted_recently(&empty, "3.8.8", 1_000));
    }

    #[test]
    fn persisted_state_only_applies_to_the_version_that_wrote_it() {
        let state = PersistedUpdateState {
            app_version: "3.8.7".into(),
            version: "3.9.1".into(),
            ..Default::default()
        };

        assert!(state_is_current(&state, "3.8.7"));
        assert!(!state_is_current(&state, "3.9.1"));
    }
}

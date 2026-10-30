import { Power, ShieldCheck, RefreshCw, RotateCcw } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface StartupTabProps {
	autostart: boolean;
	toggleAutostart: () => void;
	restartBloom: () => void;
	resetToDefaults: () => void;
}

export function StartupTab({
	autostart,
	toggleAutostart,
	restartBloom,
	resetToDefaults
}: StartupTabProps) {
	return (
		<>
			<div className="setting-group-label">Startup & Background Execution</div>
			<div className="setting-group">
				<SettingRow
					icon={Power}
					label="Launch at Login"
					desc="Start Bloom automatically when signing in to Windows"
				>
					<label className="toggle-switch">
						<input type="checkbox" checked={autostart} onChange={toggleAutostart} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={ShieldCheck}
					label="Single-Instance Guard"
					desc="Named Windows mutex ensures only one Bloom process runs at a time"
				>
					<span style={{ fontSize: "12px", opacity: 0.7, color: "var(--bloom-accent, #007aff)" }}>
						Active
					</span>
				</SettingRow>

				<SettingRow
					icon={ShieldCheck}
					label="Taskbar Watchdog"
					desc="Monitors process lifecycle to guarantee Windows taskbar restoration on exit or crash"
					divider={false}
				>
					<span style={{ fontSize: "12px", opacity: 0.7, color: "var(--bloom-accent, #007aff)" }}>
						Guarded
					</span>
				</SettingRow>
			</div>

			<div className="setting-group-label">Recovery & Maintenance</div>
			<div className="setting-group">
				<SettingRow
					icon={RefreshCw}
					label="Restart Bloom"
					desc="Re-registers AppBars, hooks, and reloads all webview windows"
					action
					onClick={restartBloom}
				/>
				<SettingRow
					icon={RotateCcw}
					label="Reset to Defaults"
					desc="Restore all configurations to their original factory defaults"
					action
					danger
					divider={false}
					onClick={resetToDefaults}
				/>
			</div>
		</>
	);
}


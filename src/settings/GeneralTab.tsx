import { Clock, RefreshCw, RotateCcw, LogOut } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface GeneralTabProps {
	timeFormat24h: boolean;
	toggleTimeFormat24h: () => void;
	restartBloom: () => void;
	resetToDefaults: () => void;
	quitBloom: () => void;
}

export function GeneralTab({
	timeFormat24h,
	toggleTimeFormat24h,
	restartBloom,
	resetToDefaults,
	quitBloom
}: GeneralTabProps) {
	return (
		<>
			<div className="setting-group-label">Clock & Regional</div>
			<div className="setting-group">
				<SettingRow
					icon={Clock}
					label="24-Hour Time"
					desc="Display time in 24-hour format across the notch and widgets"
					divider={false}
				>
					<label className="toggle-switch">
						<input type="checkbox" checked={timeFormat24h} onChange={toggleTimeFormat24h} />
						<span className="slider"></span>
					</label>
				</SettingRow>
			</div>

			<div className="setting-group-label">Application Control</div>
			<div className="setting-group">
				<SettingRow
					icon={RefreshCw}
					label="Restart MEERA"
					desc="Reinitialize all desktop components"
					action
					onClick={restartBloom}
				/>
				<SettingRow
					icon={RotateCcw}
					label="Reset MEERA Settings"
					desc="Restore all settings and restart"
					action
					danger
					onClick={resetToDefaults}
				/>
				<SettingRow
					icon={LogOut}
					label="Quit MEERA"
					desc="Safely restore native Windows taskbar and exit"
					action
					danger
					divider={false}
					onClick={quitBloom}
				/>
			</div>
		</>
	);
}

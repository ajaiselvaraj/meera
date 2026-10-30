import { BatteryWarning, Download, BellRing, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { SettingRow } from "./SettingRow";

interface NotificationsTabProps {
	lowBatteryThreshold: number;
	handleThresholdChange: (val: number) => void;
	showUpdateIndicator: boolean;
	toggleUpdateIndicator: () => void;
}

export function NotificationsTab({
	lowBatteryThreshold,
	handleThresholdChange,
	showUpdateIndicator,
	toggleUpdateIndicator
}: NotificationsTabProps) {
	return (
		<>
			<div className="setting-group-label">System Alerts</div>
			<div className="setting-group">
				<SettingRow
					icon={BatteryWarning}
					label="Low Battery Warning"
					desc={`Alert in Dynamic Island when battery drops below ${lowBatteryThreshold}%`}
				>
					<input
						type="range"
						min="5"
						max="50"
						step="5"
						value={lowBatteryThreshold}
						onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
						className="settings-slider"
					/>
				</SettingRow>

				<SettingRow
					icon={Download}
					label="Update Available Badge"
					desc="Display indicator on dock and settings when a software update is available"
					divider={false}
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={showUpdateIndicator}
							onChange={toggleUpdateIndicator}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>
			</div>

			<div className="setting-group-label">Windows Notifications</div>
			<div className="setting-group">
				<SettingRow
					icon={BellRing}
					label="Windows Notification Center"
					desc="Open Windows 11 action and notification panel"
					action
					divider={false}
					onClick={() => invoke("open_notification_center").catch(console.error)}
				>
					<ExternalLink size={16} style={{ opacity: 0.6 }} />
				</SettingRow>
			</div>
		</>
	);
}

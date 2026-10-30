import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
	Volume2,
	Sun,
	ArrowLeftToLine,
	ArrowRightToLine,
	Wifi,
	Bluetooth,
	BatteryCharging,
	Sliders,
	ExternalLink
} from "lucide-react";
import { SettingRow } from "./SettingRow";

interface SystemTabProps {
	volumeOverlayEnabled: boolean;
	toggleVolumeOverlay: () => void;
	volumeEdgeEnabled: boolean;
	toggleVolumeEdge: () => void;
	brightnessOverlayEnabled: boolean;
	toggleBrightnessOverlay: () => void;
	brightnessEdgeEnabled: boolean;
	toggleBrightnessEdge: () => void;
}

export function SystemTab({
	volumeOverlayEnabled,
	toggleVolumeOverlay,
	volumeEdgeEnabled,
	toggleVolumeEdge,
	brightnessOverlayEnabled,
	toggleBrightnessOverlay,
	brightnessEdgeEnabled,
	toggleBrightnessEdge
}: SystemTabProps) {
	const [volume, setVolume] = useState<number | null>(null);
	const [brightness, setBrightness] = useState<number | null>(null);

	useEffect(() => {
		invoke<number>("get_volume")
			.then(setVolume)
			.catch(() => {});
		invoke<number>("get_brightness")
			.then(setBrightness)
			.catch(() => {});
	}, []);

	return (
		<>
			<div className="setting-group-label">Audio & Display Overlays</div>
			<div className="setting-group">
				<SettingRow
					icon={Volume2}
					label="Volume HUD"
					desc={volume !== null ? `Current volume: ${Math.round(volume * 100)}% • Replaces native Windows OSD` : "Refined Apple-style volume overlay replacing Windows OSD"}
				>
					<label className="toggle-switch">
						<input type="checkbox" checked={volumeOverlayEnabled} onChange={toggleVolumeOverlay} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				{volumeOverlayEnabled && (
					<SettingRow
						icon={ArrowLeftToLine}
						label="Volume Edge Hover"
						desc="Slide in volume HUD when cursor hovers left screen edge"
					>
						<label className="toggle-switch">
							<input type="checkbox" checked={volumeEdgeEnabled} onChange={toggleVolumeEdge} />
							<span className="slider"></span>
						</label>
					</SettingRow>
				)}

				<SettingRow
					icon={Sun}
					label="Brightness HUD"
					desc={brightness !== null ? `Current display brightness: ${brightness}% • External monitor support` : "Smooth brightness overlay with external monitor support"}
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={brightnessOverlayEnabled}
							onChange={toggleBrightnessOverlay}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				{brightnessOverlayEnabled && (
					<SettingRow
						icon={ArrowRightToLine}
						label="Brightness Edge Hover"
						desc="Slide in brightness HUD when cursor hovers right screen edge"
						divider={false}
					>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={brightnessEdgeEnabled}
								onChange={toggleBrightnessEdge}
							/>
							<span className="slider"></span>
						</label>
					</SettingRow>
				)}
			</div>

			<div className="setting-group-label">Quick System Access</div>
			<div className="setting-group">
				<SettingRow
					icon={Wifi}
					label="Network & Internet"
					desc="Manage Wi-Fi adapters and connections"
					action
					onClick={() => invoke("open_wifi_settings").catch(console.error)}
				>
					<ExternalLink size={16} style={{ opacity: 0.6 }} />
				</SettingRow>

				<SettingRow
					icon={Bluetooth}
					label="Bluetooth & Devices"
					desc="Manage paired devices and accessories"
					action
					onClick={() => invoke("open_bluetooth_settings").catch(console.error)}
				>
					<ExternalLink size={16} style={{ opacity: 0.6 }} />
				</SettingRow>

				<SettingRow
					icon={Sliders}
					label="Windows Sound Settings"
					desc="Configure output devices and spatial audio"
					action
					onClick={() => invoke("open_sound_settings").catch(console.error)}
				>
					<ExternalLink size={16} style={{ opacity: 0.6 }} />
				</SettingRow>

				<SettingRow
					icon={BatteryCharging}
					label="Power & Battery Settings"
					desc="Adjust sleep timers and battery saver mode"
					action
					divider={false}
					onClick={() => invoke("open_battery_saver_settings").catch(console.error)}
				>
					<ExternalLink size={16} style={{ opacity: 0.6 }} />
				</SettingRow>
			</div>
		</>
	);
}

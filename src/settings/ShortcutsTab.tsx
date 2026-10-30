import { Keyboard, MousePointer, Hand, Sparkles } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface ShortcutsTabProps {
	dockWinNumberEnabled: boolean;
	toggleDockWinNumber: () => void;
}

export function ShortcutsTab({
	dockWinNumberEnabled,
	toggleDockWinNumber
}: ShortcutsTabProps) {
	return (
		<>
			<div className="setting-group-label">Keyboard Shortcuts</div>
			<div className="setting-group">
				<SettingRow
					icon={Keyboard}
					label="Win + 1 … 9 Quick Launch"
					desc="Activate matching pinned dock app (focus, minimize or launch)"
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={dockWinNumberEnabled}
							onChange={toggleDockWinNumber}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Keyboard}
					label="Win Key"
					desc="Toggles Windows Start Menu while replacing native taskbar"
				>
					<span className="settings-shortcut-badge">Win</span>
				</SettingRow>

				<SettingRow
					icon={Keyboard}
					label="Task View"
					desc="Overview of all open windows and virtual desktops"
				>
					<span className="settings-shortcut-badge">Win + Tab</span>
				</SettingRow>

				<SettingRow
					icon={Sparkles}
					label="Media Keys"
					desc="Seamless integration with Windows Media Transport (Play, Pause, Skip, Prev)"
					divider={false}
				>
					<span className="settings-shortcut-badge">Fn + Media</span>
				</SettingRow>
			</div>

			<div className="setting-group-label">Screen Edge Gestures & Actions</div>
			<div className="setting-group">
				<SettingRow
					icon={MousePointer}
					label="Bottom Edge"
					desc="Move cursor to bottom screen edge to reveal the Dock in Smart/Peek mode"
				>
					<span className="settings-shortcut-badge">Bottom Edge</span>
				</SettingRow>

				<SettingRow
					icon={MousePointer}
					label="Top Edge"
					desc="Move cursor to top screen edge to expand the Dynamic Island Notch"
				>
					<span className="settings-shortcut-badge">Top Edge</span>
				</SettingRow>

				<SettingRow
					icon={Hand}
					label="Left / Right Edges"
					desc="Hover left screen edge for Volume HUD; right edge for Brightness HUD"
				>
					<span className="settings-shortcut-badge">Left / Right</span>
				</SettingRow>

				<SettingRow
					icon={Hand}
					label="Drag to Dynamic Island"
					desc="Drag files or text onto the notch to park them on the Shelf for quick transfer"
					divider={false}
				>
					<span className="settings-shortcut-badge">Drag & Drop</span>
				</SettingRow>
			</div>
		</>
	);
}


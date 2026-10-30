import { Download, RefreshCw, FileDown, Upload, Cpu, FolderOpen } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { GithubIcon } from "../icons";
import { SettingRow } from "./SettingRow";

interface AboutTabProps {
	appVersion: string;
	autoUpdate: boolean;
	toggleAutoUpdate: () => void;
	updateStatus: string;
	updateVersion: string;
	checkForUpdates: () => void;
	installUpdate: () => void;
	exportStatus: string;
	importStatus: string;
	handleExportSettings: () => void;
	handleImportSettings: () => void;
}

export function AboutTab({
	appVersion,
	autoUpdate,
	toggleAutoUpdate,
	updateStatus,
	updateVersion,
	checkForUpdates,
	installUpdate,
	exportStatus,
	importStatus,
	handleExportSettings,
	handleImportSettings
}: AboutTabProps) {
	const getUpdateLabel = () => {
		switch (updateStatus) {
			case "checking":
				return "Checking...";
			case "available":
				return `Update Available (v${updateVersion})`;
			case "uptodate":
				return "MEERA is up to date";
			case "downloading":
				return "Downloading Update...";
			case "installing":
				return "Installing...";
			case "error":
				return "No updates found";
			default:
				return "Check for Updates";
		}
	};

	const getUpdateDesc = () =>
		updateStatus === "available"
			? "Click to install and restart"
			: `Currently running v${appVersion}`;

	const getExportLabel = () => {
		if (exportStatus === "exporting") return "Exporting...";
		if (exportStatus === "success") return "Exported!";
		if (exportStatus === "error") return "Export failed. Try again.";
		return "Export Settings";
	};

	const getImportLabel = () => {
		if (importStatus === "importing") return "Importing...";
		if (importStatus === "success") return "Imported!";
		if (importStatus === "error") return "Import failed. Check the file and try again.";
		return "Import Settings";
	};

	const openConfigDir = () => {
		invoke("open_app", { appName: "explorer.exe %APPDATA%\\com.meera.desktop" }).catch(console.error);
	};

	return (
		<div className="about-tab-container">
			<div className="about-header">
				<img src="/meera.png" className="about-logo" alt="MEERA Logo" draggable={false} />
				<h1 className="about-title">MEERA</h1>
				<p className="about-version">Desktop Companion • Version {appVersion}</p>
				<p className="about-credit">
					Engineered with Rust, Tauri v2 & React for Windows 11.
					<br />
					Built upon open-source foundations by{" "}
					<button
						className="about-author"
						onClick={() => openUrl("https://github.com/SehajveerSingh2005/bloom")}
						title="Sehajveer Singh on GitHub"
					>
						<GithubIcon size={12} />
						<span>Sehajveer Singh</span>
					</button>{" "}
					(GPL-3.0)
				</p>
			</div>

			<div className="setting-group-label">Architecture & Platform</div>
			<div className="setting-group">
				<SettingRow
					icon={Cpu}
					label="Platform & Target"
					desc="Windows 11 x64 Native Binaries • Tauri v2.11 • React 19"
				>
					<span style={{ fontSize: "12px", opacity: 0.75 }}>x86_64-pc-windows-msvc</span>
				</SettingRow>

				<SettingRow
					icon={FolderOpen}
					label="Settings Configuration File"
					desc="Stored in %APPDATA%\com.meera.desktop\settings.json"
					action
					divider={false}
					onClick={openConfigDir}
				>
					<span style={{ fontSize: "12px", color: "var(--bloom-accent, #007aff)" }}>
						Open Folder
					</span>
				</SettingRow>
			</div>

			<div className="setting-group-label">Software Updates</div>
			<div className="setting-group">
				<SettingRow icon={Download} label="Auto Update" desc="Check for updates on launch">
					<label className="toggle-switch">
						<input type="checkbox" checked={autoUpdate} onChange={toggleAutoUpdate} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={RefreshCw}
					label={getUpdateLabel()}
					desc={getUpdateDesc()}
					action
					divider={false}
					onClick={() => (updateStatus === "available" ? installUpdate() : checkForUpdates())}
				/>
			</div>

			<div className="setting-group-label setting-group-label--spaced">Backup & Restore</div>
			<div className="setting-group">
				<SettingRow
					icon={FileDown}
					label={getExportLabel()}
					desc="Backup your personalized settings to a JSON file"
					action
					onClick={handleExportSettings}
				/>
				<SettingRow
					icon={Upload}
					label={getImportLabel()}
					desc="Restore previously saved settings from a file"
					action
					divider={false}
					onClick={handleImportSettings}
				/>
			</div>
		</div>
	);
}

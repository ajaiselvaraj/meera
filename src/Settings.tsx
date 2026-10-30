import { StrictMode, useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Effect } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	X,
	Settings,
	Palette,
	PanelTop,
	Monitor,
	Sliders,
	Keyboard,
	Power,
	Bell,
	Info,
	Megaphone
} from "lucide-react";
import {
	useSettings,
	GeneralTab,
	AppearanceTab,
	NotchTab,
	DockTab,
	SystemTab,
	ShortcutsTab,
	StartupTab,
	NotificationsTab,
	AboutTab
} from "./settings/index";
import type { SettingsTab } from "./settings/index";
import { useAnnouncement } from "./hooks/useAnnouncement";
import { initTheme } from "./theme";
import { FeaturePreview } from "./settings/FeaturePreview";
import "./Settings.css";

const appWindow = getCurrentWebviewWindow();

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "appearance", label: "Appearance", icon: Palette },
	{ id: "notch", label: "Dynamic Island", icon: PanelTop },
	{ id: "dock", label: "Dock", icon: Monitor },
	{ id: "system", label: "System", icon: Sliders },
	{ id: "shortcuts", label: "Shortcuts", icon: Keyboard },
	{ id: "startup", label: "Startup", icon: Power },
	{ id: "notifications", label: "Notifications", icon: Bell },
	{ id: "about", label: "About", icon: Info }
];

const TAB_COPY: Record<SettingsTab, string> = {
	general: "The essentials for how MEERA starts and runs.",
	appearance: "Make every surface feel at home on your desktop.",
	notch: "Choose what appears at the top of your screen.",
	dock: "Shape the taskbar replacement around your workflow.",
	system: "Native audio, display, and quick system access.",
	shortcuts: "Keyboard hotkeys and screen edge triggers.",
	startup: "Windows login launch and watchdog protection.",
	notifications: "Battery warnings, update alerts, and toasts.",
	overlays: "Native audio and display controls.",
	about: "Platform architecture, updates, and your settings data."
};

function SettingsApp() {
	const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
		try {
			const param = new URLSearchParams(window.location.search).get("tab") as SettingsTab;
			if (param && TABS.some((t) => t.id === param)) return param;
			const stored = localStorage.getItem("meera-settings-tab") as SettingsTab;
			if (stored && TABS.some((t) => t.id === stored)) return stored;
		} catch {}
		return "general";
	});
	const [previewFocus] = useState("");
	const contentRef = useRef<HTMLDivElement>(null);
	const settings = useSettings();
	useEffect(() => {
		if (!settings.isLoaded) return;
		document.documentElement.dataset.settingsReady = "true";
		document.getElementById("settings-loading")?.setAttribute("aria-hidden", "true");
		document.getElementById("root")?.setAttribute("aria-busy", "false");
	}, [settings.isLoaded]);
	const closingRef = useRef(false);
	const [isClosing, setIsClosing] = useState(false);
	const { flushPendingSaves } = settings;
	const closeSettings = useCallback(async () => {
		if (closingRef.current) return;
		closingRef.current = true;
		setIsClosing(true);
		try {
			if (await flushPendingSaves()) await invoke("close_settings_window");
		} catch (error) {
			console.error("Failed to close Settings:", error);
		} finally {
			closingRef.current = false;
			setIsClosing(false);
		}
	}, [flushPendingSaves]);

	useEffect(() => {
		const unlisten = appWindow.onCloseRequested((event) => {
			event.preventDefault();
			return closeSettings();
		});
		return () => { void unlisten.then((fn) => fn()); };
	}, [closeSettings]);
	const { announcement, dismissed, dismiss } = useAnnouncement();

	useEffect(() => {
		return initTheme();
	}, []);

	useEffect(() => {
		const preventContext = (e: MouseEvent) => e.preventDefault();
		document.addEventListener("contextmenu", preventContext as any);

		appWindow
			.setEffects({
				effects: ["mica" as Effect],
				state: "active" as any
			})
			.catch(() => {});

		return () => {
			document.removeEventListener("contextmenu", preventContext as any);
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeSettings();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closeSettings]);

	const currentTabLabel = TABS.find((t) => t.id === activeTab)?.label ?? "Settings";

	return (
		<div
			className="settings-window settings-container"
			style={{ zoom: settings.scale }}
			inert={isClosing}
		>
			<div className="settings-sidebar" data-tauri-drag-region>
				<div className="settings-sidebar-intro" data-tauri-drag-region>
					<strong>MEERA</strong>
					<span>Desktop Companion</span>
				</div>

				<div className="sidebar-tabs">
					{TABS.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								type="button"
								key={tab.id}
								className={`sidebar-tab ${isActive ? "active" : ""}`}
								onClick={() => {
									setActiveTab(tab.id);
									try { localStorage.setItem("meera-settings-tab", tab.id); } catch {}
									contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
								}}
							>
								<Icon size={16} strokeWidth={2} />
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="settings-main">
				<div className="settings-header" data-tauri-drag-region>
					<div className="settings-title-group" data-tauri-drag-region>
						<h1 className="settings-title" data-tauri-drag-region>
							{currentTabLabel}
						</h1>
						<p className="settings-subtitle" data-tauri-drag-region>
							{TAB_COPY[activeTab]}
						</p>
					</div>
					<button
						type="button"
						className="header-close-btn"
						onClick={closeSettings}
						aria-label="Close settings"
						title="Close settings"
						disabled={isClosing}
					>
						<X size={15} strokeWidth={2} />
					</button>
				</div>

				<div className="settings-content" ref={contentRef}>
					{announcement && !dismissed && (
						<div
							className="settings-announcement-card"
							onClick={() => announcement.url && openUrl(announcement.url)}
							style={{ cursor: announcement.url ? "pointer" : "default" }}
						>
							<div className="announcement-icon-badge">
								<Megaphone size={16} />
							</div>
							<div className="announcement-text">
								<div className="announcement-title">{announcement.title}</div>
								<div className="announcement-message">{announcement.body}</div>
							</div>
							<button
								className="announcement-close-btn"
								onClick={(e) => {
									e.stopPropagation();
									dismiss();
								}}
								aria-label="Dismiss announcement"
							>
								<X size={14} />
							</button>
						</div>
					)}
					{settings.saveError && (
						<div className="settings-save-error" role="alert">
							<span>Settings could not be saved to disk.</span>
							{settings.saveErrorDetail && (
								<span className="settings-save-error-detail">
									{settings.saveErrorDetail}
								</span>
							)}
							<button
								type="button"
								className="settings-save-error-dismiss"
								onClick={settings.dismissSaveError}
							>
								Dismiss
							</button>
						</div>
					)}
					{(activeTab === "appearance" || activeTab === "dock" || activeTab === "notch") && (
						<FeaturePreview
							tab={activeTab}
							settings={settings}
							focus={previewFocus}
						/>
					)}
					{activeTab === "general" && (
						<GeneralTab
							timeFormat24h={settings.timeFormat24h}
							toggleTimeFormat24h={settings.toggleTimeFormat24h}
							restartBloom={settings.restartBloom}
							resetToDefaults={settings.resetToDefaults}
							quitBloom={settings.quitBloom}
						/>
					)}
					{activeTab === "appearance" && (
						<AppearanceTab
							themeMode={settings.themeMode}
							handleThemeModeChange={settings.handleThemeModeChange}
							themeColor={settings.themeColor}
							handleThemeColorChange={settings.handleThemeColorChange}
							themeOpacity={settings.themeOpacity}
							handleOpacityChange={settings.handleOpacityChange}
							themeSaturation={settings.themeSaturation}
							handleSaturationChange={settings.handleSaturationChange}
							themeBrightness={settings.themeBrightness}
							handleBrightnessChange={settings.handleBrightnessChange}
							scale={settings.scale}
							handleScaleChange={settings.handleScaleChange}
							cornersEnabled={settings.cornersEnabled}
							toggleCorners={settings.toggleCorners}
						/>
					)}
					{activeTab === "notch" && (
						<NotchTab
							notchMode={settings.notchMode}
							setNotchModeValue={settings.setNotchModeValue}
							notchEdgeDelay={settings.notchEdgeDelay}
							handleNotchEdgeDelayChange={settings.handleNotchEdgeDelayChange}
							calendarEnabled={settings.calendarEnabled}
							toggleCalendar={settings.toggleCalendar}
							controlsPanelEnabled={settings.controlsPanelEnabled}
							toggleControlsPanel={settings.toggleControlsPanel}
							devicesPanelEnabled={settings.devicesPanelEnabled}
							toggleDevicesPanel={settings.toggleDevicesPanel}
							enabledPanelCount={settings.enabledPanelCount}
							notchRememberPanel={settings.notchRememberPanel}
							toggleNotchRememberPanel={settings.toggleNotchRememberPanel}
							notchDefaultPanel={settings.notchDefaultPanel}
							changeNotchDefaultPanel={settings.changeNotchDefaultPanel}
							timerSoundEnabled={settings.timerSoundEnabled}
							toggleTimerSound={settings.toggleTimerSound}
							musicModeEnabled={settings.musicModeEnabled}
							toggleMusicMode={settings.toggleMusicMode}
							musicCompactNotch={settings.musicCompactNotch}
							toggleMusicCompactNotch={settings.toggleMusicCompactNotch}
							shelfPersist={settings.shelfPersist}
							toggleShelfPersist={settings.toggleShelfPersist}
							mediaLayout={settings.mediaLayout}
							toggleMediaLayout={settings.toggleMediaLayout}
							mediaAmbienceEnabled={settings.mediaAmbienceEnabled}
							toggleAmbience={settings.toggleAmbience}
							mediaCompactGlowEnabled={settings.mediaCompactGlowEnabled}
							toggleCompactGlow={settings.toggleCompactGlow}
							weatherEnabled={settings.weatherEnabled}
							toggleWeather={settings.toggleWeather}
							tempUnitFahrenheit={settings.tempUnitFahrenheit}
							toggleTempUnit={settings.toggleTempUnit}
							cityName={settings.cityName}
							setCityName={settings.setCityName}
							citySearchResults={settings.citySearchResults}
							showCityDropdown={settings.showCityDropdown}
							setShowCityDropdown={settings.setShowCityDropdown}
							selectCity={settings.selectCity}
							handleCityClear={settings.handleCityClear}
							statusWidgets={settings.statusWidgets}
							handleWidgetsChange={settings.handleWidgetsChange}
						/>
					)}
					{activeTab === "dock" && (
						<DockTab
							dockEnabled={settings.dockEnabled}
							toggleDock={settings.toggleDock}
							dockMode={settings.dockMode}
							setDockModeValue={settings.setDockModeValue}
							dockEdgeDelay={settings.dockEdgeDelay}
							handleDockEdgeDelayChange={settings.handleDockEdgeDelayChange}
							dockPreviewEnabled={settings.dockPreviewEnabled}
							toggleDockPreview={settings.toggleDockPreview}
							dockIconOnly={settings.dockIconOnly}
							toggleDockIconOnly={settings.toggleDockIconOnly}
							dockSeparatorEnabled={settings.dockSeparatorEnabled}
							toggleDockSeparator={settings.toggleDockSeparator}
							dockAdaptive={settings.dockAdaptive}
							toggleDockAdaptive={settings.toggleDockAdaptive}
							dockWinNumberEnabled={settings.dockWinNumberEnabled}
							toggleDockWinNumber={settings.toggleDockWinNumber}
							dockExtrasPosition={settings.dockExtrasPosition}
							handleDockExtrasPositionChange={settings.handleDockExtrasPositionChange}
							dockExtrasDrives={settings.dockExtrasDrives}
							toggleDockExtrasDrives={settings.toggleDockExtrasDrives}
							dockExtrasHiddenDrives={settings.dockExtrasHiddenDrives}
							toggleDockExtrasDrive={settings.toggleDockExtrasDrive}
							dockExtrasRecycleBin={settings.dockExtrasRecycleBin}
							toggleDockExtrasRecycleBin={settings.toggleDockExtrasRecycleBin}
							dockTaskView={settings.dockTaskView}
							toggleDockTaskView={settings.toggleDockTaskView}
							dockExtrasFolders={settings.dockExtrasFolders}
							toggleDockExtraFolder={settings.toggleDockExtraFolder}
							dockExtrasCustomFolders={settings.dockExtrasCustomFolders}
							handleAddDockExtraFolder={settings.handleAddDockExtraFolder}
							handleRemoveDockExtraFolder={settings.handleRemoveDockExtraFolder}
							startIcon={settings.startIcon}
							handleStartIconChange={settings.handleStartIconChange}
							dockMagnificationEnabled={settings.dockMagnificationEnabled}
							toggleDockMagnification={settings.toggleDockMagnification}
							dockMagnificationScale={settings.dockMagnificationScale}
							handleDockMagnificationScaleChange={settings.handleDockMagnificationScaleChange}
							dockIconSize={settings.dockIconSize}
							handleDockIconSizeChange={settings.handleDockIconSizeChange}
						/>
					)}
					{activeTab === "system" && (
						<SystemTab
							volumeOverlayEnabled={settings.volumeOverlayEnabled}
							toggleVolumeOverlay={settings.toggleVolumeOverlay}
							volumeEdgeEnabled={settings.volumeEdgeEnabled}
							toggleVolumeEdge={settings.toggleVolumeEdge}
							brightnessOverlayEnabled={settings.brightnessOverlayEnabled}
							toggleBrightnessOverlay={settings.toggleBrightnessOverlay}
							brightnessEdgeEnabled={settings.brightnessEdgeEnabled}
							toggleBrightnessEdge={settings.toggleBrightnessEdge}
						/>
					)}
					{activeTab === "shortcuts" && (
						<ShortcutsTab
							dockWinNumberEnabled={settings.dockWinNumberEnabled}
							toggleDockWinNumber={settings.toggleDockWinNumber}
						/>
					)}
					{activeTab === "startup" && (
						<StartupTab
							autostart={settings.autostart}
							toggleAutostart={settings.toggleAutostart}
							restartBloom={settings.restartBloom}
							resetToDefaults={settings.resetToDefaults}
						/>
					)}
					{activeTab === "notifications" && (
						<NotificationsTab
							lowBatteryThreshold={settings.lowBatteryThreshold}
							handleThresholdChange={settings.handleThresholdChange}
							showUpdateIndicator={settings.showUpdateIndicator}
							toggleUpdateIndicator={settings.toggleUpdateIndicator}
						/>
					)}
					{activeTab === "about" && (
						<AboutTab
							appVersion={settings.appVersion}
							autoUpdate={settings.autoUpdate}
							toggleAutoUpdate={settings.toggleAutoUpdate}
							updateStatus={settings.updateStatus}
							updateVersion={settings.updateVersion}
							checkForUpdates={settings.checkForUpdates}
							installUpdate={settings.installUpdate}
							exportStatus={settings.exportStatus}
							importStatus={settings.importStatus}
							handleExportSettings={settings.handleExportSettings}
							handleImportSettings={settings.handleImportSettings}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<SettingsApp />
	</StrictMode>
);

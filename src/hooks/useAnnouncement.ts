export interface Announcement {
	id: string;
	severity: "info" | "warning";
	title: string;
	body: string;
	url?: string;
}

/**
 * Announcement polling service completely removed for MEERA.
 * No external network connections are initiated.
 */
export function useAnnouncement() {
	return {
		announcement: null as Announcement | null,
		dismissed: true,
		dismiss: () => {}
	};
}

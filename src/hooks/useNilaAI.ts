import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export type AIConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type AIAssistantState =
	| "IDLE"
	| "WAKE_DETECTED"
	| "LISTENING"
	| "THINKING"
	| "PLANNING"
	| "EXECUTING"
	| "SUCCESS"
	| "ERROR"
	| "CONFIRMATION_REQUIRED";

export interface AIConfirmationRequest {
	requestId: string;
	tool: string;
	riskLevel: string;
	description: string;
}

export interface AIMessage {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	timestamp: number;
	plan?: string[];
	action?: string;
}

export interface UseNilaAIReturn {
	connectionStatus: AIConnectionStatus;
	aiState: AIAssistantState;
	audioLevel: number;
	plan: string[];
	currentAction: string;
	confirmation: AIConfirmationRequest | null;
	conversation: AIMessage[];
	isProcessing: boolean;
	error: string | null;
	model: string;
	sendMessage: (text: string) => boolean;
	cancelTask: () => void;
	respondConfirmation: (requestId: string, approved: boolean) => void;
	reconnect: () => void;
	startBackendService: () => Promise<void>;
	clearConversation: () => void;
}

const WS_URL = "ws://127.0.0.1:8765/ws";

export function useNilaAI(): UseNilaAIReturn {
	const [connectionStatus, setConnectionStatus] = useState<AIConnectionStatus>("connecting");
	const [aiState, setAiState] = useState<AIAssistantState>("IDLE");
	const [audioLevel, setAudioLevel] = useState<number>(0);
	const [plan, setPlan] = useState<string[]>([]);
	const [currentAction, setCurrentAction] = useState<string>("");
	const [confirmation, setConfirmation] = useState<AIConfirmationRequest | null>(null);
	const [conversation, setConversation] = useState<AIMessage[]>(() => {
		try {
			const saved = localStorage.getItem("meera-ai-conversation");
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	});
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [model, setModel] = useState<string>("qwen2.5:3b");

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<number | null>(null);
	const intentionalCloseRef = useRef<boolean>(false);

	// Persist conversation to localStorage
	useEffect(() => {
		try {
			// Keep last 30 messages max
			const trimmed = conversation.slice(-30);
			localStorage.setItem("meera-ai-conversation", JSON.stringify(trimmed));
		} catch {}
	}, [conversation]);

	const connect = useCallback(() => {
		if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
			return;
		}

		intentionalCloseRef.current = false;
		setConnectionStatus("connecting");
		setError(null);

		try {
			const ws = new WebSocket(WS_URL);
			wsRef.current = ws;

			ws.onopen = () => {
				setConnectionStatus("connected");
				setError(null);
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					const eventType = data.event;

					if (eventType === "assistant.ready") {
						setConnectionStatus("connected");
						if (data.config?.model) {
							setModel(data.config.model);
						}
					} else if (eventType === "assistant.state") {
						const state = (data.state as AIAssistantState) || "IDLE";
						setAiState(state);

						if (state === "WAKE_DETECTED" || state === "LISTENING") {
							setIsProcessing(false);
							setError(null);
						} else if (state === "THINKING" || state === "PLANNING" || state === "EXECUTING") {
							setIsProcessing(true);
						} else if (state === "SUCCESS") {
							setIsProcessing(false);
							const resp = data.response;
							if (resp) {
								setConversation((prev) => {
									const last = prev[prev.length - 1];
									if (last && last.role === "assistant" && last.text === resp) {
										return prev;
									}
									return [
										...prev,
										{
											id: Math.random().toString(36).slice(2),
											role: "assistant",
											text: resp,
											timestamp: Date.now()
										}
									];
								});
							}
						} else if (state === "ERROR") {
							setIsProcessing(false);
							setError(data.error || "An error occurred in AI assistant");
						} else if (state === "CONFIRMATION_REQUIRED") {
							setIsProcessing(false);
							setConfirmation({
								requestId: data.request_id,
								tool: data.tool,
								riskLevel: data.risk_level,
								description: data.description
							});
						} else if (state === "IDLE") {
							setIsProcessing(false);
						}
					} else if (eventType === "assistant.plan") {
						if (Array.isArray(data.plan)) {
							setPlan(data.plan);
						}
					} else if (eventType === "assistant.action") {
						setCurrentAction(data.action || "");
					} else if (eventType === "assistant.audio_level") {
						setAudioLevel(typeof data.level === "number" ? data.level : 0);
					} else if (eventType === "voice.error") {
						setError(data.error || "AI Voice Error");
						setIsProcessing(false);
					}
				} catch (err) {
					console.error("[useNilaAI] Failed to parse message:", err);
				}
			};

			ws.onerror = () => {
				setConnectionStatus("error");
			};

			ws.onclose = () => {
				wsRef.current = null;
				setConnectionStatus("disconnected");
				if (!intentionalCloseRef.current) {
					// Schedule automatic reconnection attempt in 3s
					if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
					reconnectTimerRef.current = window.setTimeout(() => {
						connect();
					}, 3000);
				}
			};
		} catch (err) {
			setConnectionStatus("error");
			setError(String(err));
		}
	}, []);

	useEffect(() => {
		connect();
		return () => {
			intentionalCloseRef.current = true;
			if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, [connect]);

	const sendMessage = useCallback(
		(text: string): boolean => {
			const trimmed = text.trim();
			if (!trimmed) return false;
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				setError("NILA AI backend is not connected (port 8765)");
				return false;
			}

			// Add to conversation
			setConversation((prev) => [
				...prev,
				{
					id: Math.random().toString(36).slice(2),
					role: "user",
					text: trimmed,
					timestamp: Date.now()
				}
			]);

			setIsProcessing(true);
			setError(null);
			setPlan([]);
			setCurrentAction("");
			setConfirmation(null);

			wsRef.current.send(
				JSON.stringify({
					event: "user_input",
					text: trimmed
				})
			);
			return true;
		},
		[]
	);

	const cancelTask = useCallback(() => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ event: "cancel_task" }));
		}
		setIsProcessing(false);
		setPlan([]);
		setCurrentAction("");
	}, []);

	const respondConfirmation = useCallback((requestId: string, approved: boolean) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					event: "confirm_response",
					request_id: requestId,
					approved
				})
			);
		}
		setConfirmation(null);
	}, []);

	const reconnect = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		connect();
	}, [connect]);

	const startBackendService = useCallback(async () => {
		try {
			setError(null);
			setConnectionStatus("connecting");
			await invoke("start_ai_service");
			// Wait 1.5s for uvicorn to bind and then connect
			setTimeout(() => {
				reconnect();
			}, 1500);
		} catch (err) {
			setError(String(err));
			setConnectionStatus("error");
		}
	}, [reconnect]);

	const clearConversation = useCallback(() => {
		setConversation([]);
		localStorage.removeItem("meera-ai-conversation");
	}, []);

	return {
		connectionStatus,
		aiState,
		audioLevel,
		plan,
		currentAction,
		confirmation,
		conversation,
		isProcessing,
		error,
		model,
		sendMessage,
		cancelTask,
		respondConfirmation,
		reconnect,
		startBackendService,
		clearConversation
	};
}


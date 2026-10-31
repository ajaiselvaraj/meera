import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
	Sparkles,
	Send,
	Square,
	RefreshCw,
	Power,
	Trash2,
	ChevronUp,
	ShieldAlert,
	CheckCircle2,
	AlertCircle
} from "lucide-react";
import type { UseNilaAIReturn } from "../hooks/useNilaAI";
import "./AIIslandPanel.css";

interface AIIslandPanelProps {
	ai: UseNilaAIReturn;
	onClose: () => void;
	onPinChange?: (pinned: boolean) => void;
}

export const AIIslandPanel = memo(function AIIslandPanel({
	ai,
	onClose,
	onPinChange
}: AIIslandPanelProps) {
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const {
		connectionStatus,
		aiState,
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
	} = ai;

	// Keep island pinned while user is typing
	useEffect(() => {
		onPinChange?.(true);
		return () => {
			onPinChange?.(false);
		};
	}, [onPinChange]);

	const focusInput = useCallback(() => {
		getCurrentWebviewWindow().setFocus().catch(() => {});
		inputRef.current?.focus();
	}, []);

	// Auto-focus input when panel opens
	useEffect(() => {
		const timer = setTimeout(focusInput, 120);
		return () => clearTimeout(timer);
	}, [focusInput]);

	// Scroll to bottom when conversation updates or during processing
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [conversation, isProcessing, plan, currentAction]);

	const handleSend = async () => {
		if (!input.trim() || isProcessing) return;
		const isConnected = connectionStatus === "connected";
		if (!isConnected) {
			const textToSend = input;
			setInput("");
			await startBackendService();
			setTimeout(() => {
				sendMessage(textToSend);
			}, 2000);
			return;
		}
		const sent = sendMessage(input);
		if (sent) {
			setInput("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSend();
		} else if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		}
	};

	const isConnected = connectionStatus === "connected";

	return (
		<div className="ai-island-panel" onClick={(e) => e.stopPropagation()}>
			{/* Header */}
			<div className="ai-island-header">
				<div className="ai-island-brand">
					<div className="ai-island-spark-icon">
						<Sparkles size={14} className="ai-spark-anim" />
					</div>
					<div className="ai-island-title-group">
						<span className="ai-island-title">MEERA AI</span>
						<span className="ai-island-model-badge">{model}</span>
					</div>
				</div>

				<div className="ai-island-actions">
					<div
						className={`ai-island-status-dot ${isConnected ? "online" : "offline"}`}
						title={isConnected ? `Connected (port 8765)` : `Offline`}
					/>

					{conversation.length > 0 && (
						<button
							type="button"
							className="ai-island-btn-icon"
							onClick={clearConversation}
							title="Clear conversation"
							aria-label="Clear conversation"
						>
							<Trash2 size={13} />
						</button>
					)}

					<button
						type="button"
						className="ai-island-btn-icon"
						onClick={onClose}
						title="Collapse Dynamic Island"
						aria-label="Collapse Dynamic Island"
					>
						<ChevronUp size={15} />
					</button>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="ai-island-body">
				{/* Connection Error Banner */}
				{!isConnected && (
					<div className="ai-island-banner offline">
						<div className="ai-banner-content">
							<AlertCircle size={15} className="ai-banner-icon" />
							<div className="ai-banner-text">
								<strong>NILA AI Service Offline</strong>
								<span>FastAPI backend not responding on 127.0.0.1:8765</span>
							</div>
						</div>
						<div className="ai-banner-buttons">
							<button
								type="button"
								className="ai-banner-action-btn primary"
								onClick={() => startBackendService()}
							>
								<Power size={12} />
								<span>Start AI Service</span>
							</button>
							<button
								type="button"
								className="ai-banner-action-btn secondary"
								onClick={() => reconnect()}
								title="Retry connection"
							>
								<RefreshCw size={12} />
							</button>
						</div>
					</div>
				)}

				{/* Security Confirmation Request */}
				{confirmation && (
					<div className="ai-island-banner confirmation">
						<div className="ai-banner-content">
							<ShieldAlert size={16} className="ai-confirm-icon" />
							<div className="ai-banner-text">
								<strong className="ai-confirm-tool">{confirmation.tool.replace(/_/g, " ")}</strong>
								<span className="ai-confirm-desc">{confirmation.description}</span>
								<span className="ai-confirm-risk">Risk level: {confirmation.riskLevel}</span>
							</div>
						</div>
						<div className="ai-banner-buttons">
							<button
								type="button"
								className="ai-banner-action-btn approve"
								onClick={() => respondConfirmation(confirmation.requestId, true)}
							>
								<span>Approve</span>
							</button>
							<button
								type="button"
								className="ai-banner-action-btn deny"
								onClick={() => respondConfirmation(confirmation.requestId, false)}
							>
								<span>Deny</span>
							</button>
						</div>
					</div>
				)}

				{/* Empty State / Suggestions */}
				{conversation.length === 0 && !isProcessing && isConnected && !confirmation && (
					<div className="ai-island-empty">
						<p className="ai-empty-prompt">What would you like me to do?</p>
						<div className="ai-suggestions-row">
							<button
								type="button"
								className="ai-suggestion-chip"
								onClick={() => sendMessage("What is my CPU and RAM usage?")}
							>
								System telemetry
							</button>
							<button
								type="button"
								className="ai-suggestion-chip"
								onClick={() => sendMessage("Open Chrome and VS Code")}
							>
								Open apps
							</button>
							<button
								type="button"
								className="ai-suggestion-chip"
								onClick={() => sendMessage("Look at my screen and summarize it")}
							>
								Screen vision
							</button>
						</div>
					</div>
				)}

				{/* Conversation Turns */}
				<div className="ai-island-messages">
					{conversation.map((msg) => (
						<div key={msg.id} className={`ai-message-bubble ${msg.role}`}>
							<div className="ai-message-text">{msg.text}</div>
						</div>
					))}

					{/* Live Processing Indicator */}
					{isProcessing && (
						<div className="ai-message-bubble assistant processing">
							<div className="ai-processing-header">
								<div className="ai-pulse-dot" />
								<span className="ai-processing-state">{aiState}</span>
								{currentAction && <span className="ai-current-action">— {currentAction}</span>}
								<button
									type="button"
									className="ai-cancel-task-btn"
									onClick={cancelTask}
									title="Cancel active task"
								>
									<Square size={10} />
									<span>Cancel</span>
								</button>
							</div>

							{/* Step-by-step Plan */}
							{plan.length > 0 && (
								<div className="ai-plan-steps">
									{plan.map((step, idx) => (
										<div key={idx} className="ai-plan-step">
											<CheckCircle2 size={11} className="ai-step-check" />
											<span>{step}</span>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Error message */}
					{error && isConnected && (
						<div className="ai-message-bubble error">
							<AlertCircle size={13} />
							<span>{error}</span>
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* Input Bar */}
			<div className="ai-island-footer">
				<div className="ai-input-wrapper">
					<input
						ref={inputRef}
						type="text"
						className="ai-island-input"
						placeholder={
							isConnected
								? "Ask MEERA AI or command your PC..."
								: "AI backend offline — click Start above or type here..."
						}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onFocus={() => {
							onPinChange?.(true);
							getCurrentWebviewWindow().setFocus().catch(() => {});
						}}
						onBlur={() => onPinChange?.(false)}
						onClick={focusInput}
						onKeyDown={handleKeyDown}
						disabled={isProcessing}
					/>
					<button
						type="button"
						className={`ai-island-send-btn ${input.trim() && !isProcessing ? "active" : ""}`}
						onClick={() => void handleSend()}
						disabled={!input.trim() || isProcessing}
						aria-label="Send message"
						title="Send (Enter)"
					>
						<Send size={13} />
					</button>
				</div>
			</div>
		</div>
	);
});


"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import EmptyState from "@/components/EmptyState";
import MessageBubble from "@/components/MessageBubble";
import LoadingDots from "@/components/LoadingDots";
import ToolDetailsModal from "@/components/ToolDetailsModal";
import ChatInput from "@/components/ChatInput";

enum LLMType {
  GEMINI = "gemini",
  CLAUDE = "claude",
  OPENAI = "openai",
}

export default function ChatPage() {
  const [selectedLLM] = useState<LLMType>(LLMType.OPENAI);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [activeToolPopupMessageId, setActiveToolPopupMessageId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, status, setMessages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { llmType: selectedLLM },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Embedded mode detection + escape key
  useEffect(() => {
    setIsEmbedded(window !== window.parent);
  }, []);

  useEffect(() => {
    if (!isEmbedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.parent.postMessage({ type: "close-chat" }, "*");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isEmbedded]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const showLoadingDots =
    isLoading &&
    !messages.some(
      (m) =>
        m.role === "assistant" &&
        m.parts.some((p) => p.type === "text" && p.text && p.text.length > 0)
    );

  const activeToolMessage = activeToolPopupMessageId
    ? messages.find((m) => m.id === activeToolPopupMessageId)
    : undefined;

  return (
    <div className="flex flex-col h-screen bg-black/70 text-foreground">
      {/* Header */}
      <div className="px-4 py-4">
        <div className="max-w-4xl mx-auto flex justify-end">
          <div className="flex gap-2">
            <button
              onClick={() => { setMessages([]); setInput(""); }}
              className="p-2 text-white/70 hover:text-white rounded-lg transition-colors"
              title="Restart chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            {isEmbedded && (
              <button
                onClick={() => window.parent.postMessage({ type: "close-chat" }, "*")}
                className="p-2 text-white/70 hover:text-white rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onToggleTools={(id) =>
                  setActiveToolPopupMessageId((prev) =>
                    prev === id ? null : id
                  )
                }
              />
            ))}
            {showLoadingDots && <LoadingDots />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Tool Details Popup */}
      <ToolDetailsModal
        message={activeToolMessage}
        onClose={() => setActiveToolPopupMessageId(null)}
      />

      {/* Input */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        disabled={isLoading}
      />
    </div>
  );
}

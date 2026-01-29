"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import {
  IconMicrophone,
  IconPaperclip,
  IconArrowUp,
  IconUserFilled,
  IconSettings,
} from "@tabler/icons-react";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "../contexts/ThemeContext";
import { Message, ChatResponse } from "../mcp/types";
import ReactMarkdown from "react-markdown";
import Lottie from "react-lottie";
import AgentName from "@/components/AgentName";

enum LLMType {
  GEMINI = "gemini",
  CLAUDE = "claude",
  OPENAI = "openai",
}
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [selectedLLM, _setSelectedLLM] = useState<LLMType>(LLMType.OPENAI);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme: _theme, toggleTheme: _toggleTheme } = useTheme();
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [activeToolPopupMessageId, setActiveToolPopupMessageId] = useState<
    string | null
  >(null);

  useEffect(() => {
    // Check if we're running in an iframe
    setIsEmbedded(window !== window.parent);

    // Add escape key listener for embedded mode
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEmbedded) {
        window.parent.postMessage({ type: "close-chat" }, "*");
      }
    };

    if (isEmbedded) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [isEmbedded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          messages: messages,
          llmType: selectedLLM,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      const data: ChatResponse = await response.json();

      // Add tool messages first
      if (data.toolMessages && data.toolMessages.length > 0) {
        const toolMessagesWithDates = data.toolMessages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages((prev) => [...prev, ...toolMessagesWithDates]);
      }

      // Then add the assistant response
      const assistantMessage: Message = {
        id: uuidv4(),
        content:
          data.message ||
          "I apologize, but I encountered an error processing your request.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (_error) {
      const errorMessage: Message = {
        id: uuidv4(),
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const _toggleToolExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedTools(newExpanded);
  };

  const toggleToolPopup = (messageId: string) => {
    setActiveToolPopupMessageId((prev) =>
      prev === messageId ? null : messageId
    );
  };

  const formatJson = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black/70 text-foreground">
      {/* Header */}
      <div className="px-4 py-4">
        <div className="max-w-4xl mx-auto flex  justify-end">
          <div className="flex gap-2">
            {/* Restart chat button */}
            <button
              onClick={() => {
                setMessages([]);
                setInput("");
              }}
              className="p-2 text-white/70 hover:text-white rounded-lg transition-colors"
              title="Restart chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            {/* Close button for embedded mode */}
            {isEmbedded && (
              <button
                onClick={() => {
                  window.parent.postMessage({ type: "close-chat" }, "*");
                }}
                className="p-2 text-white/70 hover:text-white rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1  overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-5 flex items-center justify-center mb-4">
              <Lottie
                options={{
                  path: "/dabber-blink.json",
                  loop: true,
                  autoplay: true,
                }}
                height={120}
                width={120}
              />
            </div>
            <h2 className="text-6xl font-semibold text-white mb-2">
              Hi How can i help you today?
            </h2>
            <p className="text-white mb-2 max-w-md">
              Chat with our AI agent for instant support, answers to your
              questions, and personalized assistance
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages
              .filter((msg) => msg.role !== "mcp-tool")
              .map((message) => (
                <div
                  key={message.id}
                  className={`flex w-full ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-3xl  ${
                      message.role === "user" ? "flex-row-reverse" : "flex-col"
                    }`}
                  >
                    <div className="flex-shrink-0 ">
                      {message.role === "user" ? (
                        <div className="bg-[#009975] text-white p-2 rounded-2xl w-10 h-10 flex items-center justify-center">
                          <IconUserFilled className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <img
                            src="/Dabber-face.svg"
                            alt="Assistant"
                            className="w-10 h-10 flex-shrink-0"
                          />
                          <AgentName />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col  gap-2 min-w-0 flex-1">
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.role === "user"
                            ? "text-primary-foreground"
                            : "text-white"
                        }`}
                      >
                        <div className="markdown-content">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-2xl font-bold mb-4 text-white">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-xl font-bold mb-3 text-white">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-lg font-bold mb-2 text-white">
                                  {children}
                                </h3>
                              ),
                              h4: ({ children }) => (
                                <h4 className="text-base font-bold mb-2 text-white">
                                  {children}
                                </h4>
                              ),
                              p: ({ children }) => (
                                <p className="mb-3 text-white">{children}</p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-bold text-white">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic text-white">
                                  {children}
                                </em>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-3 space-y-1 text-white">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-3 space-y-1 text-white">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-white">{children}</li>
                              ),
                              code: ({ children }) => (
                                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-white">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3 text-sm font-mono text-white">
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-primary pl-4 italic mb-3 text-muted-foreground">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      {/* Settings icon button for assistant messages only */}
                      {message.role === "assistant" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            toggleToolPopup(message.id);
                          }}
                          className="self-start bg-white/5 hover:bg-white/15 rounded-xl p-2 flex items-center justify-center transition cursor-pointer relative z-10"
                          title="View Tool Details"
                          style={{ pointerEvents: "auto" }}
                        >
                          <IconSettings className="w-4 h-4 text-white/70" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                    <img
                      src="/Dabber-face.svg"
                      alt="Assistant"
                      className="w-22 h-22"
                    />
                  </div>
                  <div className=" px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Tool Details Popup */}
      {activeToolPopupMessageId &&
        (() => {
          const assistantMessageIndex = messages.findIndex(
            (m) => m.id === activeToolPopupMessageId
          );

          if (assistantMessageIndex === -1) {
            return null;
          }

          // Find all tool messages before this assistant message (since last user message)
          const toolMessages: Message[] = [];
          for (let i = assistantMessageIndex - 1; i >= 0; i--) {
            if (messages[i].role === "user") break;
            if (messages[i].role === "mcp-tool") {
              toolMessages.unshift(messages[i]);
            }
          }

          return (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
              style={{ position: "fixed" }}
            >
              <div
                className="bg-[#0c0c0c] border border-[#262626] rounded-[28px] p-6 max-w-2xl w-full mx-4 shadow-lg relative overflow-auto"
                style={{ maxHeight: "90vh" }}
              >
                {/* Close button */}
                <button
                  onClick={() => setActiveToolPopupMessageId(null)}
                  className="absolute top-3 right-3 text-white/70 hover:text-gray-300"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 m-2" />
                </button>

                {/* Popup content */}
                <div className="space-y-6">
                  {toolMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <h2 className="text-lg font-semibold text-white mb-2">
                        No Tools Used
                      </h2>
                      <p className="text-gray-400 text-sm">
                        This response did not use any tools.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-center text-white mb-4">
                        Tool Details ({toolMessages.length} tool
                        {toolMessages.length > 1 ? "s" : ""} used)
                      </h2>

                      {toolMessages.map((toolMsg, idx) => (
                        <div
                          key={toolMsg.id}
                          className="border-b border-[#262626] pb-4 last:border-b-0"
                        >
                          <h3 className="text-base font-semibold text-white mb-3">
                            Tool #{idx + 1}: {toolMsg.toolName}
                          </h3>

                          {toolMsg.toolArgs && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-400 mb-1">
                                Arguments
                              </h4>
                              <pre
                                className="bg-[#262626] p-3 rounded-[12px] text-sm text-gray-300 overflow-auto custom-scrollbar"
                                style={{ maxHeight: "150px" }}
                              >
                                {formatJson(toolMsg.toolArgs)}
                              </pre>
                            </div>
                          )}

                          {toolMsg.toolStatus === "success" &&
                            toolMsg.toolResult !== undefined && (
                              <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-400 mb-1">
                                  Result
                                </h4>
                                <pre
                                  className="bg-[#262626] p-3 rounded-xl text-sm text-gray-300 overflow-auto custom-scrollbar"
                                  style={{ maxHeight: "150px" }}
                                >
                                  {typeof toolMsg.toolResult === "string" ||
                                  typeof toolMsg.toolResult === "number"
                                    ? String(toolMsg.toolResult)
                                    : formatJson(toolMsg.toolResult)}
                                </pre>
                              </div>
                            )}

                          {toolMsg.toolStatus === "error" &&
                            toolMsg.toolError && (
                              <div>
                                <h4 className="text-sm font-medium text-red-500 mb-1">
                                  Error
                                </h4>
                                <p className="text-sm text-red-400">
                                  {toolMsg.toolError}
                                </p>
                              </div>
                            )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Input Area */}

      <div className="px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-[28px] p-5 w-full">
            <div className="flex flex-col gap-2.5 items-end">
              {/* Input Field */}
              <div className="w-full">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full bg-transparent text-white placeholder:text-gray-400 resize-none focus:outline-none custom-scrollbar border-0 p-0 text-sm leading-relaxed"
                  rows={1}
                  style={{
                    minHeight: "47px",
                    maxHeight: "200px",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    const newHeight = Math.min(target.scrollHeight, 200);
                    target.style.height = newHeight + "px";

                    // Enable scrollbar when content exceeds max height
                    if (target.scrollHeight > 200) {
                      target.style.overflowY = "auto";
                    } else {
                      target.style.overflowY = "hidden";
                    }
                  }}
                />
              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 items-center">
                {/* Microphone Button */}
                <button
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-[19px]  transition-colors group"
                  aria-label="Voice input"
                >
                  <IconMicrophone
                    size={18}
                    className="text-white/70 group-hover:text-[#009975] transition-colors"
                  />
                </button>

                {/* Attachment Button */}
                <button
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-[19px]  transition-colors group"
                  aria-label="Attach file"
                >
                  <IconPaperclip
                    size={18}
                    className="text-white/70 group-hover:text-[#009975] transition-colors"
                  />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-[#009975] border border-[#11d8a9] px-3 py-1 rounded-xl h-8 flex items-center gap-1 hover:bg-[#00a67d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold"
                  aria-label="Send message"
                >
                  <span>Send</span>
                  <IconArrowUp size={18} color="#ffffff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

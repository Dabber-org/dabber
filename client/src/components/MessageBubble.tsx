import { IconUserFilled, IconSettings } from "@tabler/icons-react";
import type { UIMessage } from "ai";
import AgentName from "./AgentName";
import Markdown from "./Markdown";

interface Props {
  message: UIMessage;
  onToggleTools: (id: string) => void;
}

export default function MessageBubble({ message, onToggleTools }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex gap-3 max-w-3xl ${isUser ? "flex-row-reverse" : "flex-col"}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
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

        {/* Content */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div
            className={`px-4 py-3 rounded-2xl ${isUser ? "text-primary-foreground" : "text-white"}`}
          >
            <div className="markdown-content">
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <Markdown key={`${message.id}-${i}`}>{part.text}</Markdown>
                ) : null
              )}
            </div>
          </div>

          {!isUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTools(message.id);
              }}
              className="self-start bg-white/5 hover:bg-white/15 rounded-xl p-2 flex items-center justify-center transition cursor-pointer relative z-10"
              title="View Tool Details"
            >
              <IconSettings className="w-4 h-4 text-white/70" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

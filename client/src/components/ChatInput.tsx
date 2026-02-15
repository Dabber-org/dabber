"use client";

import {
  IconMicrophone,
  IconPaperclip,
  IconArrowUp,
} from "@tabler/icons-react";

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export default function ChatInput({
  input,
  onInputChange,
  onSend,
  disabled,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleAutoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    target.style.overflowY = target.scrollHeight > 200 ? "auto" : "hidden";
  };

  return (
    <div className="px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#0c0c0c] border border-[#262626] rounded-[28px] p-5 w-full">
          <div className="flex flex-col gap-2.5 items-end">
            <div className="w-full">
              <textarea
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleAutoResize}
                placeholder="Type your message..."
                className="w-full bg-transparent text-white placeholder:text-gray-400 resize-none focus:outline-none custom-scrollbar border-0 p-0 text-sm leading-relaxed"
                rows={1}
                style={{ minHeight: "47px", maxHeight: "200px" }}
              />
            </div>

            <div className="flex gap-3 items-center">
              <button
                className="w-[30px] h-[30px] flex items-center justify-center rounded-[19px] transition-colors group"
                aria-label="Voice input"
              >
                <IconMicrophone
                  size={18}
                  className="text-white/70 group-hover:text-[#009975] transition-colors"
                />
              </button>

              <button
                className="w-[30px] h-[30px] flex items-center justify-center rounded-[19px] transition-colors group"
                aria-label="Attach file"
              >
                <IconPaperclip
                  size={18}
                  className="text-white/70 group-hover:text-[#009975] transition-colors"
                />
              </button>

              <button
                onClick={onSend}
                disabled={!input.trim() || disabled}
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
  );
}

"use client";

// import { MessageCircle } from 'lucide-react';

export default function WidgetPage() {
  return (
    <button
      onClick={() => {
        window.parent.postMessage({ type: "open-chat" }, "*");
      }}
      className="bg-black/70 backdrop-blur-xl rounded-[19px]  flex items-center justify-center gap-3 w-full h-full cursor-pointer hover:bg-black/80 hover:scale-105 hover:shadow-xl transition-all duration-500 ease-out group shadow-lg active:scale-125 active:shadow-2xl active:bg-black/90"
      data-name="frame"
      data-node-id="438:2614"
    >
      <div className="flex flex-col justify-center">
        <p className="text-white text-sm font-semibold  whitespace-nowrap m-0 group-hover:text-gray-100 transition-colors duration-300">
          Ask Dabber AI
        </p>
      </div>
    </button>
  );
}

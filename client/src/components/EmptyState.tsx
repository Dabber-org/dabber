"use client";

import Lottie from "react-lottie";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="p-5 flex items-center justify-center mb-4">
        <Lottie
          options={{ path: "/dabber-blink.json", loop: true, autoplay: true }}
          height={120}
          width={120}
        />
      </div>
      <h2 className="text-6xl font-semibold text-white mb-2">
        Hi How can i help you today?
      </h2>
      <p className="text-white mb-2 max-w-md">
        Chat with our AI agent for instant support, answers to your questions,
        and personalized assistance
      </p>
    </div>
  );
}

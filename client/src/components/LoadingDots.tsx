export default function LoadingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-3 max-w-3xl">
        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <img src="/Dabber-face.svg" alt="Assistant" className="w-22 h-22" />
        </div>
        <div className="px-4 py-3 rounded-2xl">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

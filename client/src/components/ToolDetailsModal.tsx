import { X } from "lucide-react";
import type { UIMessage } from "ai";

interface Props {
  message: UIMessage | undefined;
  onClose: () => void;
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function ToolDetailsModal({ message, onClose }: Props) {
  if (!message) return null;

  const toolParts = message.parts.filter(
    (p) => p.type === "dynamic-tool" || p.type.startsWith("tool-")
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      style={{ position: "fixed" }}
    >
      <div
        className="bg-[#0c0c0c] border border-[#262626] rounded-[28px] p-6 max-w-2xl w-full mx-4 shadow-lg relative overflow-auto"
        style={{ maxHeight: "90vh" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/70 hover:text-gray-300"
          aria-label="Close"
        >
          <X className="w-5 h-5 m-2" />
        </button>

        <div className="space-y-6">
          {toolParts.length === 0 ? (
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
                Tool Details ({toolParts.length} tool
                {toolParts.length > 1 ? "s" : ""} used)
              </h2>

              {toolParts.map((part, idx) => {
                const toolName =
                  part.type === "dynamic-tool"
                    ? part.toolName
                    : part.type.replace("tool-", "");
                const toolCallId =
                  "toolCallId" in part ? part.toolCallId : `tool-${idx}`;
                const toolInput = "input" in part ? part.input : undefined;
                const toolOutput = "output" in part ? part.output : undefined;
                const toolError =
                  "errorText" in part ? part.errorText : undefined;
                const toolState = "state" in part ? part.state : undefined;

                return (
                  <div
                    key={toolCallId}
                    className="border-b border-[#262626] pb-4 last:border-b-0"
                  >
                    <h3 className="text-base font-semibold text-white mb-3">
                      Tool #{idx + 1}: {toolName}
                    </h3>

                    {toolInput !== undefined && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">
                          Arguments
                        </h4>
                        <pre
                          className="bg-[#262626] p-3 rounded-[12px] text-sm text-gray-300 overflow-auto custom-scrollbar"
                          style={{ maxHeight: "150px" }}
                        >
                          {formatJson(toolInput)}
                        </pre>
                      </div>
                    )}

                    {toolState === "output-available" &&
                      toolOutput !== undefined && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-400 mb-1">
                            Result
                          </h4>
                          <pre
                            className="bg-[#262626] p-3 rounded-xl text-sm text-gray-300 overflow-auto custom-scrollbar"
                            style={{ maxHeight: "150px" }}
                          >
                            {typeof toolOutput === "string" ||
                            typeof toolOutput === "number"
                              ? String(toolOutput)
                              : formatJson(toolOutput)}
                          </pre>
                        </div>
                      )}

                    {toolState === "output-error" && toolError && (
                      <div>
                        <h4 className="text-sm font-medium text-red-500 mb-1">
                          Error
                        </h4>
                        <p className="text-sm text-red-400">{toolError}</p>
                      </div>
                    )}

                    {(toolState === "input-streaming" ||
                      toolState === "input-available") && (
                      <div className="text-sm text-gray-500 italic">
                        Executing...
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Execution } from "@/lib/types/dag";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface ExecutionResultProps {
  execution: Execution | null;
  onClose: () => void;
}

export function ExecutionResult({ execution, onClose }: ExecutionResultProps) {
  if (!execution) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-300";
      case "RUNNING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-300";
      case "PENDING":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDuration = () => {
    if (!execution.started_at || !execution.finished_at) return "N/A";
    const start = new Date(execution.started_at).getTime();
    const end = new Date(execution.finished_at).getTime();
    const duration = (end - start) / 1000;
    return `${duration.toFixed(2)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Execution Result
            </h2>
            <p className="text-sm text-gray-600 mt-1">ID: {execution.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(
                  execution.status
                )}`}
              >
                {execution.status}
              </span>
              <span className="text-sm text-gray-600">
                Duration: {formatDuration()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Started:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(execution.started_at).toLocaleString()}
                </span>
              </div>
              {execution.finished_at && (
                <div>
                  <span className="text-gray-600">Finished:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(execution.finished_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {execution.status === "FAILED" && execution.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
              <pre className="text-sm text-red-800 whitespace-pre-wrap">
                {execution.error}
              </pre>
            </div>
          )}

          {/* Result Display */}
          {execution.result !== undefined && execution.result !== null && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Result</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(execution.result, null, 2)
                    );
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  Copy
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SyntaxHighlighter
                  language="json"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    fontSize: "0.875rem",
                    maxHeight: "400px",
                  }}
                >
                  {JSON.stringify(execution.result, null, 2)}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          {!execution.result && execution.status !== "FAILED" && (
            <div className="text-center py-8 text-gray-500">
              No result available yet
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

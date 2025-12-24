"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { ExecutionResultProps } from "./interface";
import { getStatusColor, formatDuration } from "./controller";

export function ExecutionResult({ execution, onClose }: ExecutionResultProps) {
  if (!execution) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200/80 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Execution Result
              </h2>
              <p className="text-sm text-gray-600 mt-1 font-mono">
                ID: {execution.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <span
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 shadow-sm ${getStatusColor(
                  execution.status
                )}`}
              >
                {execution.status}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">
                  Duration: {formatDuration(execution)}
                </span>
              </div>
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
            <div className="mb-6 p-5 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-lg font-bold text-red-900">Error</h3>
              </div>
              <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono bg-white/50 p-3 rounded border border-red-200">
                {execution.error}
              </pre>
            </div>
          )}

          {/* Result Display */}
          {execution.result !== undefined && execution.result !== null && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Result
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(execution.result, null, 2)
                    );
                  }}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-lg text-gray-700 font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <SyntaxHighlighter
                  language="json"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: "1.25rem",
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
        <div className="px-6 py-4 border-t border-gray-200/80 bg-gray-50/50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}



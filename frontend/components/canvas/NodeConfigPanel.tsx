"use client";

import { useState, useEffect, useRef } from "react";
import {
  Node,
  NodeData,
  StartNodeData,
  HttpNodeData,
  OutputNodeData,
} from "@/lib/types/dag";
import { isStartNode, isHttpNode, isOutputNode } from "@/lib/types/dag";

interface NodeConfigPanelProps {
  node: Node | null;
  onSave: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
}

export function NodeConfigPanel({
  node,
  onSave,
  onClose,
}: NodeConfigPanelProps) {
  // Initialize form data from node prop
  const [formData, setFormData] = useState<NodeData | null>(
    node ? { ...node.data } : null
  );
  const prevNodeIdRef = useRef<string | null>(node?.id || null);

  // Local state for JSON textareas to allow free typing
  const [headersText, setHeadersText] = useState<string>("");
  const [queryText, setQueryText] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");

  // Update form data when node changes (using ref to track changes)
  useEffect(() => {
    if (node && node.id !== prevNodeIdRef.current) {
      prevNodeIdRef.current = node.id;
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        const newData = { ...node.data };
        setFormData(newData);

        // Initialize textarea states for HTTP nodes
        if (isHttpNode(node)) {
          setHeadersText(
            JSON.stringify((newData as HttpNodeData)?.headers || {}, null, 2)
          );
          setQueryText(
            JSON.stringify((newData as HttpNodeData)?.query || {}, null, 2)
          );
          if (typeof (newData as HttpNodeData)?.body === "string") {
            setBodyText((newData as HttpNodeData).body as string);
          } else {
            setBodyText(
              JSON.stringify((newData as HttpNodeData)?.body || {}, null, 2)
            );
          }
        }
      });
    }
  }, [node]);

  if (!node || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (node && formData) {
      // For HTTP nodes, ensure headers, query, and body are properly parsed from textareas
      if (isHttpNode(node)) {
        const httpData = formData as HttpNodeData;
        const finalData: HttpNodeData = {
          ...httpData,
        };

        // Parse headers from textarea
        try {
          const parsedHeaders = JSON.parse(headersText);
          if (
            typeof parsedHeaders === "object" &&
            parsedHeaders !== null &&
            !Array.isArray(parsedHeaders)
          ) {
            finalData.headers = parsedHeaders;
          } else {
            finalData.headers = {};
          }
        } catch {
          // If invalid JSON, try to use existing headers or empty object
          finalData.headers = httpData.headers || {};
        }

        // Parse query from textarea
        try {
          const parsedQuery = JSON.parse(queryText);
          if (
            typeof parsedQuery === "object" &&
            parsedQuery !== null &&
            !Array.isArray(parsedQuery)
          ) {
            finalData.query = parsedQuery;
          } else {
            finalData.query = {};
          }
        } catch {
          // If invalid JSON, try to use existing query or empty object
          finalData.query = httpData.query || {};
        }

        // Parse body from textarea (for POST, PUT, PATCH)
        if (
          httpData.method === "POST" ||
          httpData.method === "PUT" ||
          httpData.method === "PATCH"
        ) {
          try {
            const parsedBody = JSON.parse(bodyText);
            finalData.body = parsedBody;
          } catch {
            // If not valid JSON, store as string
            finalData.body = bodyText;
          }
        }

        onSave(node.id, finalData);
      } else {
        onSave(node.id, formData);
      }
      onClose();
    }
  };

  const handleChange = (
    field: string,
    value: string | Record<string, string> | unknown
  ) => {
    console.log("handleChange", field, value);
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-sm shadow-2xl z-50 border-l border-gray-200/80 overflow-y-auto animate-slide-in-right">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Configure Node
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                {node.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors"
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {isStartNode(node) && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Label (optional)
              </label>
              <input
                type="text"
                value={(formData as StartNodeData)?.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                placeholder="Start"
              />
            </div>
          )}

          {isHttpNode(node) && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  Method *
                </label>
                <select
                  value={(formData as HttpNodeData)?.method || "GET"}
                  onChange={(e) => handleChange("method", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all bg-white text-gray-900"
                  required
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  URL *
                </label>
                <input
                  type="url"
                  value={(formData as HttpNodeData)?.url || ""}
                  onChange={(e) => handleChange("url", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-gray-900 bg-white"
                  placeholder="https://api.example.com/endpoint"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Headers (JSON)
                </label>
                <textarea
                  value={headersText}
                  onChange={(e) => {
                    setHeadersText(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (
                        typeof parsed === "object" &&
                        parsed !== null &&
                        !Array.isArray(parsed)
                      ) {
                        handleChange("headers", parsed);
                      }
                    } catch {
                      // Invalid JSON, allow user to continue typing
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm shadow-sm transition-all bg-gray-50 text-gray-900"
                  rows={4}
                  placeholder='{\n  "Content-Type": "application/json"\n}'
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Query Parameters (JSON)
                </label>
                <textarea
                  value={queryText}
                  onChange={(e) => {
                    setQueryText(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (
                        typeof parsed === "object" &&
                        parsed !== null &&
                        !Array.isArray(parsed)
                      ) {
                        handleChange("query", parsed);
                      }
                    } catch {
                      // Invalid JSON, allow user to continue typing
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm shadow-sm transition-all bg-gray-50 text-gray-900"
                  rows={3}
                  placeholder='{\n  "key": "value"\n}'
                />
              </div>

              {((formData as HttpNodeData)?.method === "POST" ||
                (formData as HttpNodeData)?.method === "PUT" ||
                (formData as HttpNodeData)?.method === "PATCH") && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                    Request Body (JSON)
                  </label>
                  <textarea
                    value={bodyText}
                    onChange={(e) => {
                      setBodyText(e.target.value);
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleChange("body", parsed);
                      } catch {
                        // If not valid JSON, store as string
                        handleChange("body", e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm shadow-sm transition-all bg-gray-50 text-gray-900"
                    rows={6}
                    placeholder='{\n  "key": "value"\n}'
                  />
                </div>
              )}
            </>
          )}

          {isOutputNode(node) && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={(formData as OutputNodeData)?.label || ""}
                  onChange={(e) => handleChange("label", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                  placeholder="Output"
                />
              </div>
              {(formData as OutputNodeData)?.result && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                    Execution Result
                  </label>
                  <pre className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs overflow-auto max-h-64 shadow-sm">
                    {JSON.stringify(
                      (formData as OutputNodeData).result,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-95"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

  // Update form data when node changes (using ref to track changes)
  useEffect(() => {
    if (node && node.id !== prevNodeIdRef.current) {
      prevNodeIdRef.current = node.id;
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        setFormData({ ...node.data });
      });
    }
  }, [node]);

  if (!node || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (node && formData) {
      onSave(node.id, formData);
      onClose();
    }
  };

  const handleChange = (
    field: string,
    value: string | Record<string, string> | unknown
  ) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Configure {node.type} Node
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isStartNode(node) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (optional)
              </label>
              <input
                type="text"
                value={(formData as StartNodeData)?.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start"
              />
            </div>
          )}

          {isHttpNode(node) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Method *
                </label>
                <select
                  value={(formData as HttpNodeData)?.method || "GET"}
                  onChange={(e) => handleChange("method", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={(formData as HttpNodeData)?.url || ""}
                  onChange={(e) => handleChange("url", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com/endpoint"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Headers (JSON)
                </label>
                <textarea
                  value={JSON.stringify(
                    (formData as HttpNodeData)?.headers || {},
                    null,
                    2
                  )}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange("headers", parsed);
                    } catch {
                      // Invalid JSON, keep as is
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={4}
                  placeholder='{\n  "Content-Type": "application/json"\n}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Query Parameters (JSON)
                </label>
                <textarea
                  value={JSON.stringify(
                    (formData as HttpNodeData)?.query || {},
                    null,
                    2
                  )}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange("query", parsed);
                    } catch {
                      // Invalid JSON, keep as is
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  placeholder='{\n  "key": "value"\n}'
                />
              </div>

              {((formData as HttpNodeData)?.method === "POST" ||
                (formData as HttpNodeData)?.method === "PUT" ||
                (formData as HttpNodeData)?.method === "PATCH") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Body (JSON)
                  </label>
                  <textarea
                    value={
                      typeof (formData as HttpNodeData)?.body === "string"
                        ? ((formData as HttpNodeData).body as string)
                        : JSON.stringify(
                            (formData as HttpNodeData)?.body || {},
                            null,
                            2
                          )
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleChange("body", parsed);
                      } catch {
                        handleChange("body", e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={(formData as OutputNodeData)?.label || ""}
                  onChange={(e) => handleChange("label", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Output"
                />
              </div>
              {(formData as OutputNodeData)?.result && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Execution Result
                  </label>
                  <pre className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-xs overflow-auto max-h-64">
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

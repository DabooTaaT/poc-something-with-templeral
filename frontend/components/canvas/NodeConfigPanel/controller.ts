import { useState, useEffect, useRef } from "react";
import {
  Node,
  NodeData,
  HttpNodeData,
  isHttpNode,
} from "@/lib/types/dag";
import { NodeConfigPanelProps } from "./interface";

export function useNodeConfigController({
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

  return {
    formData,
    headersText,
    queryText,
    bodyText,
    setHeadersText,
    setQueryText,
    setBodyText,
    handleChange,
    handleSubmit,
  };
}


import { useState, useCallback, useEffect, useRef } from "react";
import { Execution } from "@/lib/types/dag";
import { apiClient } from "@/lib/api/client";

export function useExecution() {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [status, setStatus] = useState<
    "idle" | "running" | "completed" | "failed"
  >("idle");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const pollExecution = useCallback(
    async (execId: string) => {
      try {
        const exec = await apiClient.getExecution(execId);
        
        // Parse result_json if it exists (it's a JSON string from backend)
        let parsedResult = exec.result;
        console.log(exec,"exec");
        
        if (exec.result_json) {
          try {
            parsedResult = JSON.parse(exec.result_json);
            // Update exec with parsed result body (fallback to entire result if body is missing)
            if (
              parsedResult &&
              typeof parsedResult === "object" &&
              "body" in parsedResult
            ) {
              const { body } = parsedResult as { body?: unknown };
              if (typeof body === "string") {
                try {
                  exec.result = JSON.parse(body);
                } catch {
                  exec.result = body;
                }
              } else {
                exec.result = body ?? parsedResult;
              }
            } else {
              exec.result = parsedResult;
            }
          } catch (parseError) {
            console.warn("Failed to parse result_json:", parseError);
            // Keep original result_json as string if parsing fails
          }
        }
        
        setExecution(exec);
        
        if (exec.status === "COMPLETED") {
          setStatus("completed");
          setResult(parsedResult);
          stopPolling();
        } else if (exec.status === "FAILED") {
          setStatus("failed");
          setError(exec.error || "Execution failed");
          stopPolling();
        } else if (exec.status === "RUNNING") {
          setStatus("running");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to poll execution:", errorMessage);
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (execId: string) => {
      // Clear any existing interval
      stopPolling();

      // Poll immediately
      pollExecution(execId);

      // Set up interval to poll every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollExecution(execId);
      }, 2000);
    },
    [pollExecution, stopPolling]
  );

  const runWorkflow = useCallback(
    async (workflowId: string) => {
      setIsLoading(true);
      setError(null);
      setStatus("running");
      try {
        const response = await apiClient.runWorkflow(workflowId);
        setExecutionId(response.execution_id);
        // Start polling for status
        startPolling(response.execution_id);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to run workflow";
        setError(errorMessage);
        setStatus("failed");
      } finally {
        setIsLoading(false);
      }
    },
    [startPolling]
  );

  const clearExecution = useCallback(() => {
    stopPolling();
    setExecutionId(null);
    setExecution(null);
    setStatus("idle");
    setResult(null);
    setError(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    executionId,
    execution,
    status,
    result,
    error,
    isLoading,
    runWorkflow,
    pollExecution,
    clearExecution,
  };
}



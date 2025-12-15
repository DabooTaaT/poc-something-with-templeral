package temporal

import (
	"encoding/json"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"

	"github.com/your-org/n8n-clone/internal/db/models"
	"github.com/your-org/n8n-clone/pkg/dag"
)

// WorkflowInput represents input to the workflow
type WorkflowInput struct {
	WorkflowID  string `json:"workflow_id"`
	ExecutionID string `json:"execution_id"`
}

// WorkflowResult represents the workflow execution result
type WorkflowResult struct {
	ExecutionID string      `json:"execution_id"`
	Result      interface{} `json:"result"`
	Error       string      `json:"error,omitempty"`
}

// DAGWorkflow executes a workflow DAG
func DAGWorkflow(ctx workflow.Context, input WorkflowInput) (*WorkflowResult, error) {
	// Set activity options
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			MaximumAttempts: 3,
		},
	}
	activityCtx := workflow.WithActivityOptions(ctx, ao)

	result := &WorkflowResult{
		ExecutionID: input.ExecutionID,
	}

	// Load DAG JSON
	var dagJSON string
	if err := workflow.ExecuteActivity(activityCtx, (*Activities).LoadDAGActivity, input.WorkflowID).Get(activityCtx, &dagJSON); err != nil {
		return nil, err
	}

	// Parse DAG
	var dagStruct models.DAGStructure
	if err := json.Unmarshal([]byte(dagJSON), &dagStruct); err != nil {
		return nil, err
	}

	// Validate DAG
	validation := dag.ValidateDAG(&dagStruct)
	if !validation.Valid {
		// mark failed
		_ = workflow.ExecuteActivity(activityCtx, (*Activities).UpdateExecutionStatusActivity, input.ExecutionID, string(models.StatusFailed)).Get(activityCtx, nil)
		return nil, temporal.NewApplicationError("dag validation failed", "ValidationError", validation.Errors)
	}

	// Mark execution as RUNNING
	_ = workflow.ExecuteActivity(activityCtx, (*Activities).UpdateExecutionStatusActivity, input.ExecutionID, string(models.StatusRunning)).Get(activityCtx, nil)

	// Topological sort
	order, err := dag.TopologicalSort(dagStruct.Nodes, dagStruct.Edges)
	if err != nil {
		_ = workflow.ExecuteActivity(activityCtx, (*Activities).UpdateExecutionStatusActivity, input.ExecutionID, string(models.StatusFailed)).Get(activityCtx, nil)
		return nil, err
	}

	var lastResult interface{}

	// Execute nodes in order
	for _, nodeID := range order {
		node := dag.GetNodeByID(nodeID, dagStruct.Nodes)
		if node == nil {
			continue
		}

		switch node.Type {
		case "start":
			lastResult = map[string]interface{}{"start": node.ID}
		case "http":
			httpData, err := parseHTTPData(node.Data)
			if err != nil {
				_ = workflow.ExecuteActivity(activityCtx, (*Activities).UpdateExecutionStatusActivity, input.ExecutionID, string(models.StatusFailed)).Get(activityCtx, nil)
				return nil, err
			}
			var httpResp HttpRequestOutput
			err = workflow.ExecuteActivity(activityCtx, (*Activities).HttpRequestActivity, HttpRequestInput{
				Method:  httpData.Method,
				URL:     httpData.URL,
				Headers: httpData.Headers,
				Query:   httpData.Query,
				Body:    httpData.Body,
			}).Get(activityCtx, &httpResp)
			if err != nil {
				_ = workflow.ExecuteActivity(activityCtx, (*Activities).UpdateExecutionStatusActivity, input.ExecutionID, string(models.StatusFailed)).Get(activityCtx, nil)
				return nil, err
			}
			lastResult = httpResp
		case "output":
			// No-op, but we keep lastResult
		default:
			// unknown node type
		}
	}

	// Store result
	if lastResult != nil {
		_ = workflow.ExecuteActivity(activityCtx, (*Activities).StoreExecutionResultActivity, input.ExecutionID, lastResult).Get(activityCtx, nil)
	}

	result.Result = lastResult
	return result, nil
}

func parseHTTPData(data interface{}) (*models.HttpNodeData, error) {
	switch v := data.(type) {
	case models.HttpNodeData:
		return &v, nil
	case map[string]interface{}:
		b, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		var parsed models.HttpNodeData
		if err := json.Unmarshal(b, &parsed); err != nil {
			return nil, err
		}
		if parsed.Method == "" {
			parsed.Method = "GET"
		}
		return &parsed, nil
	default:
		return nil, temporal.NewApplicationError("invalid http node data", "InvalidData", data)
	}
}

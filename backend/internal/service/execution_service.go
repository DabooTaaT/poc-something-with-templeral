package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"go.temporal.io/sdk/client"

	"github.com/your-org/n8n-clone/internal/db/models"
	temporalwf "github.com/your-org/n8n-clone/internal/temporal"
)

// ExecutionService coordinates execution persistence and Temporal starts
type ExecutionService struct {
	DB             *sql.DB
	TemporalClient client.Client
}

func NewExecutionService(db *sql.DB, temporalClient client.Client) *ExecutionService {
	return &ExecutionService{DB: db, TemporalClient: temporalClient}
}

// StartExecution creates an execution record and triggers Temporal workflow
func (s *ExecutionService) StartExecution(ctx context.Context, workflowID string) (string, error) {
	// ensure workflow exists
	var exists bool
	if err := s.DB.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workflows WHERE id = $1)`, workflowID).Scan(&exists); err != nil {
		return "", err
	}
	if !exists {
		return "", ErrWorkflowNotFound
	}

	execID := uuid.New().String()
	now := time.Now().UTC()
	_, err := s.DB.ExecContext(ctx, `INSERT INTO executions (id, workflow_id, status, started_at) VALUES ($1, $2, $3, $4)`,
		execID, workflowID, models.StatusPending, now)
	if err != nil {
		return "", err
	}

	options := client.StartWorkflowOptions{
		ID:        execID,
		TaskQueue: "workflow-task-queue",
	}

	_, err = s.TemporalClient.ExecuteWorkflow(ctx, options, temporalwf.DAGWorkflow, temporalwf.WorkflowInput{
		WorkflowID:  workflowID,
		ExecutionID: execID,
	})
	if err != nil {
		return "", err
	}

	return execID, nil
}

// GetExecution fetches execution by ID
func (s *ExecutionService) GetExecution(ctx context.Context, executionID string) (*models.Execution, error) {
	row := s.DB.QueryRowContext(ctx, `SELECT id, workflow_id, status, result_json, error, started_at, finished_at FROM executions WHERE id = $1`, executionID)
	var exec models.Execution
	if err := row.Scan(&exec.ID, &exec.WorkflowID, &exec.Status, &exec.ResultJson, &exec.Error, &exec.StartedAt, &exec.FinishedAt); err != nil {
		return nil, err
	}
	return &exec, nil
}

// ListExecutions returns executions for a workflow with pagination
func (s *ExecutionService) ListExecutions(ctx context.Context, workflowID string, limit, offset int) ([]models.Execution, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.DB.QueryContext(ctx, `SELECT id, workflow_id, status, result_json, error, started_at, finished_at FROM executions WHERE workflow_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`, workflowID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Execution
	for rows.Next() {
		var exec models.Execution
		if err := rows.Scan(&exec.ID, &exec.WorkflowID, &exec.Status, &exec.ResultJson, &exec.Error, &exec.StartedAt, &exec.FinishedAt); err != nil {
			return nil, err
		}
		result = append(result, exec)
	}
	return result, rows.Err()
}

// UpdateExecutionStatus updates status and finished_at (if applicable)
func (s *ExecutionService) UpdateExecutionStatus(ctx context.Context, executionID string, status models.ExecutionStatus) error {
	var err error
	now := time.Now().UTC()
	if status == models.StatusCompleted || status == models.StatusFailed {
		_, err = s.DB.ExecContext(ctx, `UPDATE executions SET status = $1, finished_at = $2 WHERE id = $3`, status, now, executionID)
	} else {
		_, err = s.DB.ExecContext(ctx, `UPDATE executions SET status = $1 WHERE id = $2`, status, executionID)
	}
	return err
}

// StoreExecutionResult saves result and marks completion
func (s *ExecutionService) StoreExecutionResult(ctx context.Context, executionID string, result interface{}) error {
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	_, err = s.DB.ExecContext(ctx, `UPDATE executions SET status = $1, result_json = $2, finished_at = $3 WHERE id = $4`, models.StatusCompleted, string(resultJSON), now, executionID)
	return err
}

// StoreExecutionError saves error details and marks failed
func (s *ExecutionService) StoreExecutionError(ctx context.Context, executionID string, errMsg string) error {
	now := time.Now().UTC()
	_, err := s.DB.ExecContext(ctx, `UPDATE executions SET status = $1, error = $2, finished_at = $3 WHERE id = $4`, models.StatusFailed, errMsg, now, executionID)
	return err
}

// DecodeResult parses result_json into interface{}
func (s *ExecutionService) DecodeResult(exec *models.Execution) (interface{}, error) {
	if exec.ResultJson == nil {
		return nil, nil
	}
	var out interface{}
	if err := json.Unmarshal([]byte(*exec.ResultJson), &out); err != nil {
		return nil, err
	}
	return out, nil
}

// Helper to handle missing workflow
var ErrWorkflowNotFound = errors.New("workflow not found")

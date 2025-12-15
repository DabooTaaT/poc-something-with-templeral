package models

import (
	"time"
)

// ExecutionStatus represents the status of a workflow execution
type ExecutionStatus string

const (
	StatusPending   ExecutionStatus = "PENDING"
	StatusRunning   ExecutionStatus = "RUNNING"
	StatusCompleted ExecutionStatus = "COMPLETED"
	StatusFailed    ExecutionStatus = "FAILED"
)

// Execution represents a workflow execution record
type Execution struct {
	ID         string          `json:"id" db:"id"`
	WorkflowID string          `json:"workflow_id" db:"workflow_id"`
	Status     ExecutionStatus `json:"status" db:"status"`
	ResultJson *string         `json:"result_json,omitempty" db:"result_json"` // nullable
	Error      *string         `json:"error,omitempty" db:"error"`              // nullable
	StartedAt  time.Time       `json:"started_at" db:"started_at"`
	FinishedAt *time.Time      `json:"finished_at,omitempty" db:"finished_at"` // nullable
}


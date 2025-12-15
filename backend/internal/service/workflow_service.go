package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/your-org/n8n-clone/internal/db/models"
	"github.com/your-org/n8n-clone/pkg/dag"
)

// WorkflowService handles workflow CRUD and validation
type WorkflowService struct {
	DB *sql.DB
}

func NewWorkflowService(db *sql.DB) *WorkflowService {
	return &WorkflowService{DB: db}
}

// CreateWorkflow validates and persists a workflow
func (s *WorkflowService) CreateWorkflow(ctx context.Context, name string, dagStruct models.DAGStructure) (*models.Workflow, error) {
	validation := dag.ValidateDAG(&dagStruct)
	if !validation.Valid {
		return nil, errors.New(joinErrors(validation.Errors))
	}

	dagJSON, err := json.Marshal(dagStruct)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	id := uuid.New().String()

	_, err = s.DB.ExecContext(
		ctx,
		`INSERT INTO workflows (id, name, dag_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
		id,
		name,
		string(dagJSON),
		now,
		now,
	)
	if err != nil {
		return nil, err
	}

	return &models.Workflow{
		ID:        id,
		Name:      name,
		DAGJson:   string(dagJSON),
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// GetWorkflow returns a workflow by ID
func (s *WorkflowService) GetWorkflow(ctx context.Context, id string) (*models.Workflow, error) {
	row := s.DB.QueryRowContext(ctx, `SELECT id, name, dag_json, created_at, updated_at FROM workflows WHERE id = $1`, id)
	var wf models.Workflow
	if err := row.Scan(&wf.ID, &wf.Name, &wf.DAGJson, &wf.CreatedAt, &wf.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}
	return &wf, nil
}

// ListWorkflows returns workflows with simple pagination
func (s *WorkflowService) ListWorkflows(ctx context.Context, limit, offset int) ([]models.Workflow, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.DB.QueryContext(ctx, `SELECT id, name, dag_json, created_at, updated_at FROM workflows ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Workflow
	for rows.Next() {
		var wf models.Workflow
		if err := rows.Scan(&wf.ID, &wf.Name, &wf.DAGJson, &wf.CreatedAt, &wf.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, wf)
	}
	return result, rows.Err()
}

// UpdateWorkflow updates a workflow record and re-validates the DAG
func (s *WorkflowService) UpdateWorkflow(ctx context.Context, id, name string, dagStruct *models.DAGStructure) (*models.Workflow, error) {
	var dagJSON string
	if dagStruct != nil {
		validation := dag.ValidateDAG(dagStruct)
		if !validation.Valid {
			return nil, errors.New(joinErrors(validation.Errors))
		}
		bytes, err := json.Marshal(dagStruct)
		if err != nil {
			return nil, err
		}
		dagJSON = string(bytes)
	}

	now := time.Now().UTC()
	// Build dynamic update
	if dagJSON != "" {
		_, err := s.DB.ExecContext(ctx, `UPDATE workflows SET name = $1, dag_json = $2, updated_at = $3 WHERE id = $4`, name, dagJSON, now, id)
		if err != nil {
			return nil, err
		}
	} else {
		_, err := s.DB.ExecContext(ctx, `UPDATE workflows SET name = $1, updated_at = $2 WHERE id = $3`, name, now, id)
		if err != nil {
			return nil, err
		}
	}

	return s.GetWorkflow(ctx, id)
}

// ParseWorkflowDAG parses dag_json from workflow to structure
func (s *WorkflowService) ParseWorkflowDAG(wf *models.Workflow) (*models.DAGStructure, error) {
	var dagStruct models.DAGStructure
	if err := json.Unmarshal([]byte(wf.DAGJson), &dagStruct); err != nil {
		return nil, err
	}
	return &dagStruct, nil
}

func joinErrors(errs []string) string {
	if len(errs) == 0 {
		return ""
	}
	return strings.Join(errs, "; ")
}

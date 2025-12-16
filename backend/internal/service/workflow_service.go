package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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

// ListWorkflows returns workflow summaries with pagination and optional search
func (s *WorkflowService) ListWorkflows(ctx context.Context, limit, offset int, search string) ([]models.WorkflowSummary, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	filterClause := ""
	filterArgs := []interface{}{}
	if search != "" {
		filterClause = "WHERE w.name ILIKE $1"
		filterArgs = append(filterArgs, "%"+search+"%")
	}

	limitPlaceholder := len(filterArgs) + 1
	offsetPlaceholder := len(filterArgs) + 2

	query := fmt.Sprintf(`
		SELECT
			w.id,
			w.name,
			w.updated_at,
			COALESCE(jsonb_array_length(w.dag_json->'nodes'), 0) AS node_count,
			COALESCE(jsonb_array_length(w.dag_json->'edges'), 0) AS edge_count,
			e.id AS last_exec_id,
			e.status AS last_exec_status,
			e.finished_at AS last_exec_finished_at
		FROM workflows w
		LEFT JOIN LATERAL (
			SELECT id, status, finished_at
			FROM executions
			WHERE workflow_id = w.id
			ORDER BY finished_at DESC NULLS LAST, started_at DESC
			LIMIT 1
		) e ON true
		%s
		ORDER BY w.updated_at DESC
		LIMIT $%d OFFSET $%d
	`, filterClause, limitPlaceholder, offsetPlaceholder)

	args := append([]interface{}{}, filterArgs...)
	args = append(args, limit, offset)

	rows, err := s.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var summaries []models.WorkflowSummary
	for rows.Next() {
		var summary models.WorkflowSummary
		var lastExecID sql.NullString
		var lastExecStatus sql.NullString
		var lastExecFinished sql.NullTime

		if err := rows.Scan(
			&summary.ID,
			&summary.Name,
			&summary.UpdatedAt,
			&summary.NodeCount,
			&summary.EdgeCount,
			&lastExecID,
			&lastExecStatus,
			&lastExecFinished,
		); err != nil {
			return nil, 0, err
		}

		if lastExecID.Valid {
			execSummary := &models.ExecutionSummary{
				ID:     lastExecID.String,
				Status: models.ExecutionStatus(lastExecStatus.String),
			}
			if lastExecFinished.Valid {
				execSummary.FinishedAt = &lastExecFinished.Time
			}
			summary.LastExecution = execSummary
		}

		summaries = append(summaries, summary)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM workflows w %s", filterClause)
	var total int
	if err := s.DB.QueryRowContext(ctx, countQuery, filterArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return summaries, total, nil
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

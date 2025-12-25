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

	// Create version 1 for the newly created workflow
	wf := &models.Workflow{
		ID:        id,
		Name:      name,
		DAGJson:   string(dagJSON),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.saveWorkflowVersion(ctx, wf); err != nil {
		// Log error but don't fail the creation
		// Version creation failure shouldn't prevent workflow creation
		return nil, fmt.Errorf("failed to create initial version: %w", err)
	}

	return wf, nil
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

	// Get current version number
	currentVersion, err := s.getCurrentVersionNumber(ctx, id)
	if err == nil && currentVersion > 0 {
		wf.Version = &currentVersion
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

// getCurrentVersionNumber returns the current version number for a workflow
func (s *WorkflowService) getCurrentVersionNumber(ctx context.Context, workflowID string) (int, error) {
	var maxVersion sql.NullInt64
	err := s.DB.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(version_number), 0) FROM workflow_versions WHERE workflow_id = $1`,
		workflowID,
	).Scan(&maxVersion)
	if err != nil {
		return 0, err
	}
	if !maxVersion.Valid {
		return 0, nil
	}
	return int(maxVersion.Int64), nil
}

// saveWorkflowVersion saves the current state of a workflow as a version
func (s *WorkflowService) saveWorkflowVersion(ctx context.Context, wf *models.Workflow) error {
	currentVersion, err := s.getCurrentVersionNumber(ctx, wf.ID)
	if err != nil {
		return err
	}

	newVersion := currentVersion + 1
	versionID := uuid.New().String()

	_, err = s.DB.ExecContext(ctx,
		`INSERT INTO workflow_versions (id, workflow_id, version_number, name, dag_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
		versionID,
		wf.ID,
		newVersion,
		wf.Name,
		wf.DAGJson,
		time.Now().UTC(),
	)
	return err
}

// normalizeJSON normalizes JSON string by parsing and re-marshaling it
// This ensures consistent comparison regardless of formatting differences
func normalizeJSON(jsonStr string) (string, error) {
	if jsonStr == "" {
		return "", nil
	}
	var v interface{}
	if err := json.Unmarshal([]byte(jsonStr), &v); err != nil {
		return "", err
	}
	normalized, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(normalized), nil
}

// UpdateWorkflow updates a workflow record and re-validates the DAG
// It automatically saves the current state as a version before updating (only if DAG has changed)
func (s *WorkflowService) UpdateWorkflow(ctx context.Context, id, name string, dagStruct *models.DAGStructure) (*models.Workflow, error) {
	// Get current workflow to save as version
	currentWF, err := s.GetWorkflow(ctx, id)
	if err != nil {
		return nil, err
	}

	// Check if any versions exist - if not, create version 1
	currentVersion, err := s.getCurrentVersionNumber(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get current version: %w", err)
	}
	if currentVersion == 0 {
		// Create version 1 if it doesn't exist
		if err := s.saveWorkflowVersion(ctx, currentWF); err != nil {
			return nil, fmt.Errorf("failed to create initial version: %w", err)
		}
	}

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
		
		// Only save version if DAG has actually changed
		// Normalize both JSON strings for accurate comparison
		normalizedNew, err := normalizeJSON(dagJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to normalize new DAG JSON: %w", err)
		}
		normalizedCurrent, err := normalizeJSON(currentWF.DAGJson)
		if err != nil {
			return nil, fmt.Errorf("failed to normalize current DAG JSON: %w", err)
		}
		
		if normalizedNew != normalizedCurrent {
			// Save current state as a new version before updating
			if err := s.saveWorkflowVersion(ctx, currentWF); err != nil {
				return nil, fmt.Errorf("failed to save workflow version: %w", err)
			}
		}
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

	updatedWF, err := s.GetWorkflow(ctx, id)
	if err != nil {
		return nil, err
	}

	// Set current version number
	currentVersion, err = s.getCurrentVersionNumber(ctx, id)
	if err == nil && currentVersion > 0 {
		updatedWF.Version = &currentVersion
	}

	return updatedWF, nil
}

// ParseWorkflowDAG parses dag_json from workflow to structure
func (s *WorkflowService) ParseWorkflowDAG(wf *models.Workflow) (*models.DAGStructure, error) {
	var dagStruct models.DAGStructure
	if err := json.Unmarshal([]byte(wf.DAGJson), &dagStruct); err != nil {
		return nil, err
	}
	return &dagStruct, nil
}

// ListWorkflowVersions returns all versions for a workflow
func (s *WorkflowService) ListWorkflowVersions(ctx context.Context, workflowID string) ([]models.WorkflowVersion, int, error) {
	rows, err := s.DB.QueryContext(ctx,
		`SELECT id, workflow_id, version_number, name, dag_json, created_at 
		 FROM workflow_versions 
		 WHERE workflow_id = $1 
		 ORDER BY version_number DESC`,
		workflowID,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var versions []models.WorkflowVersion
	for rows.Next() {
		var v models.WorkflowVersion
		if err := rows.Scan(&v.ID, &v.WorkflowID, &v.VersionNumber, &v.Name, &v.DAGJson, &v.CreatedAt); err != nil {
			return nil, 0, err
		}
		versions = append(versions, v)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// Get current version number
	currentVersion, err := s.getCurrentVersionNumber(ctx, workflowID)
	if err != nil {
		currentVersion = 0
	}

	return versions, currentVersion, nil
}

// GetWorkflowVersion returns a specific version of a workflow
func (s *WorkflowService) GetWorkflowVersion(ctx context.Context, workflowID string, versionNumber int) (*models.WorkflowVersion, error) {
	row := s.DB.QueryRowContext(ctx,
		`SELECT id, workflow_id, version_number, name, dag_json, created_at 
		 FROM workflow_versions 
		 WHERE workflow_id = $1 AND version_number = $2`,
		workflowID,
		versionNumber,
	)

	var v models.WorkflowVersion
	if err := row.Scan(&v.ID, &v.WorkflowID, &v.VersionNumber, &v.Name, &v.DAGJson, &v.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, sql.ErrNoRows
		}
		return nil, err
	}

	return &v, nil
}

// RestoreWorkflowVersion restores a workflow to a specific version
// It saves the current state as a new version before restoring
func (s *WorkflowService) RestoreWorkflowVersion(ctx context.Context, workflowID string, versionNumber int) (*models.Workflow, error) {
	// Get the version to restore
	versionToRestore, err := s.GetWorkflowVersion(ctx, workflowID, versionNumber)
	if err != nil {
		return nil, err
	}

	// Get current workflow and save it as a version
	currentWF, err := s.GetWorkflow(ctx, workflowID)
	if err != nil {
		return nil, err
	}

	// Save current state as version before restoring
	if err := s.saveWorkflowVersion(ctx, currentWF); err != nil {
		return nil, fmt.Errorf("failed to save current workflow as version: %w", err)
	}

	// Restore the workflow from the version
	now := time.Now().UTC()
	_, err = s.DB.ExecContext(ctx,
		`UPDATE workflows SET name = $1, dag_json = $2, updated_at = $3 WHERE id = $4`,
		versionToRestore.Name,
		versionToRestore.DAGJson,
		now,
		workflowID,
	)
	if err != nil {
		return nil, err
	}

	// Get updated workflow
	restoredWF, err := s.GetWorkflow(ctx, workflowID)
	if err != nil {
		return nil, err
	}

	// Set current version number
	currentVersion, err := s.getCurrentVersionNumber(ctx, workflowID)
	if err == nil && currentVersion > 0 {
		restoredWF.Version = &currentVersion
	}

	return restoredWF, nil
}

func joinErrors(errs []string) string {
	if len(errs) == 0 {
		return ""
	}
	return strings.Join(errs, "; ")
}

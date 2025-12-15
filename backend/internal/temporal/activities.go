package temporal

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/your-org/n8n-clone/internal/db/models"
)

// Activities struct holds dependencies for activities
type Activities struct {
	DB *sql.DB
}

// HttpRequestInput represents input for HTTP request activity
type HttpRequestInput struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
	Query   map[string]string `json:"query,omitempty"`
	Body    interface{}       `json:"body,omitempty"`
}

// HttpRequestOutput represents output from HTTP request activity
type HttpRequestOutput struct {
	StatusCode int                    `json:"status_code"`
	Headers    map[string][]string    `json:"headers"`
	Body       string                 `json:"body"`
	Data       map[string]interface{} `json:"data,omitempty"`
}

// HttpRequestActivity performs an HTTP request
func (a *Activities) HttpRequestActivity(ctx context.Context, input HttpRequestInput) (*HttpRequestOutput, error) {
	// Build request body
	var bodyReader io.Reader
	if input.Body != nil {
		bodyJSON, err := json.Marshal(input.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal body: %w", err)
		}
		bodyReader = strings.NewReader(string(bodyJSON))
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, input.Method, input.URL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	for key, value := range input.Headers {
		req.Header.Set(key, value)
	}

	// Add query parameters
	if len(input.Query) > 0 {
		q := req.URL.Query()
		for key, value := range input.Query {
			q.Add(key, value)
		}
		req.URL.RawQuery = q.Encode()
	}

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	output := &HttpRequestOutput{
		StatusCode: resp.StatusCode,
		Headers:    resp.Header,
		Body:       string(respBody),
	}

	// Try to parse JSON response
	var data map[string]interface{}
	if err := json.Unmarshal(respBody, &data); err == nil {
		output.Data = data
	}

	return output, nil
}

// LoadDAGActivity loads a workflow DAG from the database
func (a *Activities) LoadDAGActivity(ctx context.Context, workflowID string) (string, error) {
	row := a.DB.QueryRowContext(ctx, `SELECT dag_json FROM workflows WHERE id = $1`, workflowID)
	var dagJSON string
	if err := row.Scan(&dagJSON); err != nil {
		return "", err
	}
	return dagJSON, nil
}

// StoreExecutionResultActivity stores execution result in the database
func (a *Activities) StoreExecutionResultActivity(ctx context.Context, executionID string, result interface{}) error {
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	_, err = a.DB.ExecContext(ctx, `UPDATE executions SET status = $1, result_json = $2, finished_at = $3 WHERE id = $4`,
		models.StatusCompleted, string(resultJSON), now, executionID)
	return err
}

// UpdateExecutionStatusActivity updates execution status in the database
func (a *Activities) UpdateExecutionStatusActivity(ctx context.Context, executionID string, status string) error {
	now := time.Now().UTC()
	if status == string(models.StatusCompleted) || status == string(models.StatusFailed) {
		_, err := a.DB.ExecContext(ctx, `UPDATE executions SET status = $1, finished_at = $2 WHERE id = $3`, status, now, executionID)
		return err
	}
	_, err := a.DB.ExecContext(ctx, `UPDATE executions SET status = $1 WHERE id = $2`, status, executionID)
	return err
}

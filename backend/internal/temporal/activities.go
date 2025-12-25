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

	"github.com/dop251/goja"

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
	StatusCode int                 `json:"status_code"`
	Headers     map[string][]string `json:"headers"`
	Body        string              `json:"body"`
	Data        interface{}         `json:"data,omitempty"` // Can be object or array
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

	// Try to parse JSON response (can be object or array)
	var data interface{}
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

// StoreExecutionErrorActivity stores error message and marks execution as failed
func (a *Activities) StoreExecutionErrorActivity(ctx context.Context, executionID string, errMsg string) error {
	now := time.Now().UTC()
	_, err := a.DB.ExecContext(ctx, `UPDATE executions SET status = $1, error = $2, finished_at = $3 WHERE id = $4`,
		models.StatusFailed, errMsg, now, executionID)
	return err
}

// CodeExecutionInput represents input for code execution activity
type CodeExecutionInput struct {
	Code  string      `json:"code"`
	Input interface{} `json:"input"` // Response from previous node
}

// CodeExecutionOutput represents output from code execution activity
type CodeExecutionOutput struct {
	Result interface{} `json:"result"`
	Error  string      `json:"error,omitempty"`
}

// CodeExecutionActivity executes JavaScript code using goja
func (a *Activities) CodeExecutionActivity(ctx context.Context, input CodeExecutionInput) (*CodeExecutionOutput, error) {
	// If code is empty, passthrough
	if strings.TrimSpace(input.Code) == "" {
		return &CodeExecutionOutput{
			Result: input.Input,
		}, nil
	}

	// Create JavaScript runtime
	vm := goja.New()

	// Convert input to JSON string for injection
	inputJSON, err := json.Marshal(input.Input)
	if err != nil {
		return &CodeExecutionOutput{
			Error: fmt.Sprintf("failed to marshal input: %v", err),
		}, nil
	}

	// Parse input JSON to interface{} for goja
	var inputObj interface{}
	if err := json.Unmarshal(inputJSON, &inputObj); err != nil {
		return &CodeExecutionOutput{
			Error: fmt.Sprintf("failed to unmarshal input: %v", err),
		}, nil
	}

	// Set response and data variables in JavaScript context
	// Use ToValue to properly convert Go values to JavaScript values
	responseVal := vm.ToValue(inputObj)
	vm.Set("response", responseVal)
	vm.Set("data", responseVal)

	// Wrap code to ensure it returns a value
	// Check if code has return statement (simple check)
	codeTrimmed := strings.TrimSpace(input.Code)
	hasReturn := strings.Contains(codeTrimmed, "return")
	
	var wrappedCode string
	if hasReturn {
		// Code has return, wrap in IIFE with proper formatting
		wrappedCode = fmt.Sprintf("(function() {\n%s\n})()", input.Code)
	} else {
		// No return, add default return
		wrappedCode = fmt.Sprintf("(function() {\n%s\nreturn response;\n})()", input.Code)
	}

	// Execute code with timeout (5 seconds max)
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	done := make(chan bool, 1)
	var result goja.Value
	var execErr error

	go func() {
		defer func() {
			if r := recover(); r != nil {
				execErr = fmt.Errorf("panic during execution: %v", r)
			}
			done <- true
		}()
		// Try to compile first to get better error messages
		program, compileErr := goja.Compile("code-node", wrappedCode, false)
		if compileErr != nil {
			execErr = fmt.Errorf("syntax error: %v", compileErr)
			return
		}
		// Run the compiled program
		result, execErr = vm.RunProgram(program)
		if execErr != nil {
			// Extract more detailed error information
			errStr := execErr.Error()
			// Check if it's a TypeError (common JavaScript errors)
			if strings.Contains(errStr, "TypeError") || strings.Contains(errStr, "Cannot read property") {
				execErr = fmt.Errorf("runtime error: %v", execErr)
			} else {
				execErr = fmt.Errorf("runtime error: %v", execErr)
			}
			return
		}
	}()

	// Wait for execution or timeout
	select {
	case <-timeoutCtx.Done():
		return &CodeExecutionOutput{
			Error: "code execution timeout (5s)",
		}, nil
	case <-done:
		if execErr != nil {
			return &CodeExecutionOutput{
				Error: fmt.Sprintf("code execution error: %v", execErr),
			}, nil
		}

		// Check if result is valid
		if result == nil {
			return &CodeExecutionOutput{
				Error: "code must return a value (result is nil)",
			}, nil
		}

		// Check for undefined or null
		if goja.IsUndefined(result) {
			return &CodeExecutionOutput{
				Error: "code must return a value (result is undefined)",
			}, nil
		}

		if goja.IsNull(result) {
			// Null is a valid return value, export it
			var goResult interface{}
			if err := vm.ExportTo(result, &goResult); err != nil {
				return &CodeExecutionOutput{
					Error: fmt.Sprintf("failed to export null result: %v", err),
				}, nil
			}
			return &CodeExecutionOutput{
				Result: goResult,
			}, nil
		}

		// Export result to Go value
		var goResult interface{}
		if err := vm.ExportTo(result, &goResult); err != nil {
			return &CodeExecutionOutput{
				Error: fmt.Sprintf("failed to export result: %v", err),
			}, nil
		}

		return &CodeExecutionOutput{
			Result: goResult,
		}, nil
	}
}

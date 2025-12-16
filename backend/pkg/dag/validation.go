package dag

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/your-org/n8n-clone/internal/db/models"
)

// ValidationResult holds validation results
type ValidationResult struct {
	Valid  bool
	Errors []string
}

// ValidateDAG validates a workflow DAG structure
func ValidateDAG(dag *models.DAGStructure) ValidationResult {
	result := ValidationResult{Valid: true, Errors: []string{}}

	// Check for at least one start node
	startNodes := filterNodesByType(dag.Nodes, "start")
	if len(startNodes) == 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "DAG must have at least one start node")
	}

	// Check that start nodes have no incoming edges
	for _, startNode := range startNodes {
		if hasIncomingEdge(startNode.ID, dag.Edges) {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Start node '%s' cannot have incoming edges", startNode.ID))
		}
	}

	// Check for at least one output node
	outputNodes := filterNodesByType(dag.Nodes, "output")
	if len(outputNodes) == 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "DAG must have at least one output node")
	}

	// Check for cycles
	if hasCycle(dag.Nodes, dag.Edges) {
		result.Valid = false
		result.Errors = append(result.Errors, "DAG contains a cycle")
	}

	// Check connectivity from start to output
	for _, startNode := range startNodes {
		hasPath := false
		for _, outputNode := range outputNodes {
			if findPath(startNode.ID, outputNode.ID, dag.Edges) {
				hasPath = true
				break
			}
		}
		if !hasPath {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Start node '%s' has no path to any output node", startNode.ID))
		}
	}

	// Validate node-specific data
	for _, node := range dag.Nodes {
		nodeErrors := validateNodeData(node)
		result.Errors = append(result.Errors, nodeErrors...)
		if len(nodeErrors) > 0 {
			result.Valid = false
		}
	}

	return result
}

// TopologicalSort performs topological sorting on the DAG
func TopologicalSort(nodes []models.Node, edges []models.Edge) ([]string, error) {
	inDegree := make(map[string]int)
	graph := make(map[string][]string)

	for _, node := range nodes {
		inDegree[node.ID] = 0
	}

	for _, edge := range edges {
		graph[edge.Source] = append(graph[edge.Source], edge.Target)
		inDegree[edge.Target]++
	}

	var queue []string
	for id, deg := range inDegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	var order []string
	for len(queue) > 0 {
		// pop first
		current := queue[0]
		queue = queue[1:]
		order = append(order, current)

		for _, neighbor := range graph[current] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	if len(order) != len(nodes) {
		return nil, errors.New("topological sort failed: graph may contain cycles")
	}

	return order, nil
}

// GetNodeByID retrieves a node by its ID
func GetNodeByID(nodeID string, nodes []models.Node) *models.Node {
	for i := range nodes {
		if nodes[i].ID == nodeID {
			return &nodes[i]
		}
	}
	return nil
}

// Helper functions

func filterNodesByType(nodes []models.Node, nodeType string) []models.Node {
	var result []models.Node
	for _, node := range nodes {
		if node.Type == nodeType {
			result = append(result, node)
		}
	}
	return result
}

func hasIncomingEdge(nodeID string, edges []models.Edge) bool {
	for _, edge := range edges {
		if edge.Target == nodeID {
			return true
		}
	}
	return false
}

func hasCycle(nodes []models.Node, edges []models.Edge) bool {
	graph := make(map[string][]string)
	for _, edge := range edges {
		graph[edge.Source] = append(graph[edge.Source], edge.Target)
	}

	visited := make(map[string]bool)
	recStack := make(map[string]bool)

	var dfs func(string) bool
	dfs = func(node string) bool {
		if recStack[node] {
			return true
		}
		if visited[node] {
			return false
		}

		visited[node] = true
		recStack[node] = true

		for _, neighbor := range graph[node] {
			if dfs(neighbor) {
				return true
			}
		}

		recStack[node] = false
		return false
	}

	for _, node := range nodes {
		if dfs(node.ID) {
			return true
		}
	}

	return false
}

func findPath(sourceID, targetID string, edges []models.Edge) bool {
	graph := make(map[string][]string)
	for _, edge := range edges {
		graph[edge.Source] = append(graph[edge.Source], edge.Target)
	}

	visited := make(map[string]bool)
	var dfs func(string) bool
	dfs = func(current string) bool {
		if current == targetID {
			return true
		}
		if visited[current] {
			return false
		}
		visited[current] = true
		for _, neighbor := range graph[current] {
			if dfs(neighbor) {
				return true
			}
		}
		return false
	}

	return dfs(sourceID)
}

func validateNodeData(node models.Node) []string {
	var errors []string

	switch node.Type {
	case "http":
		if node.Data == nil {
			errors = append(errors, fmt.Sprintf("HTTP node '%s' missing data", node.ID))
			return errors
		}

		httpData, err := parseHttpNodeData(node.Data)
		if err != nil {
			errors = append(errors, fmt.Sprintf("HTTP node '%s' invalid data: %v", node.ID, err))
			return errors
		}

		if strings.TrimSpace(httpData.URL) == "" {
			errors = append(errors, fmt.Sprintf("HTTP node '%s' requires a URL", node.ID))
		}

		if !isValidHTTPMethod(httpData.Method) {
			errors = append(errors, fmt.Sprintf("HTTP node '%s' has invalid method '%s'", node.ID, httpData.Method))
		}

	case "code":
		// Code nodes are optional - if data is nil, it's passthrough mode
		if node.Data != nil {
			_, err := parseCodeNodeData(node.Data)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Code node '%s' invalid data: %v", node.ID, err))
			}
		}
		// Code is optional, so empty code is valid (passthrough mode)
	case "start":
		// Start nodes typically don't need validation
	case "output":
		// Output nodes typically don't need validation
	default:
		errors = append(errors, fmt.Sprintf("Unknown node type '%s' for node '%s'", node.Type, node.ID))
	}

	return errors
}

func parseHttpNodeData(data interface{}) (*models.HttpNodeData, error) {
	switch v := data.(type) {
	case models.HttpNodeData:
		return &v, nil
	case map[string]interface{}:
		bytes, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		var parsed models.HttpNodeData
		if err := json.Unmarshal(bytes, &parsed); err != nil {
			return nil, err
		}
		// Default method
		if parsed.Method == "" {
			parsed.Method = "GET"
		}
		parsed.Method = strings.ToUpper(parsed.Method)
		return &parsed, nil
	default:
		return nil, fmt.Errorf("unsupported http node data type %T", data)
	}
}

func isValidHTTPMethod(method string) bool {
	switch strings.ToUpper(method) {
	case "GET", "POST", "PUT", "DELETE", "PATCH":
		return true
	default:
		return false
	}
}

func parseCodeNodeData(data interface{}) (*models.CodeNodeData, error) {
	switch v := data.(type) {
	case models.CodeNodeData:
		return &v, nil
	case map[string]interface{}:
		bytes, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		var parsed models.CodeNodeData
		if err := json.Unmarshal(bytes, &parsed); err != nil {
			return nil, err
		}
		return &parsed, nil
	default:
		return nil, fmt.Errorf("unsupported code node data type %T", data)
	}
}

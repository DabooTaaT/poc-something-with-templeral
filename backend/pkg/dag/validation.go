package dag

import (
	"fmt"
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
	// TODO: Implement Kahn's algorithm or DFS-based topological sort
	// This is a placeholder implementation
	nodeIDs := make([]string, len(nodes))
	for i, node := range nodes {
		nodeIDs[i] = node.ID
	}
	return nodeIDs, nil
}

// GetNodeByID retrieves a node by its ID
func GetNodeByID(nodeID string, nodes []models.Node) *models.Node {
	for _, node := range nodes {
		if node.ID == nodeID {
			return &node
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
	// TODO: Implement cycle detection using DFS
	// Placeholder: return false for now
	return false
}

func findPath(sourceID, targetID string, edges []models.Edge) bool {
	// TODO: Implement path finding using BFS or DFS
	// Placeholder: return true for now
	return true
}

func validateNodeData(node models.Node) []string {
	var errors []string

	switch node.Type {
	case "http":
		// TODO: Parse node.Data as HttpNodeData and validate
		// Check: URL not empty, method is valid HTTP method
		// For now, basic validation
		if node.Data == nil {
			errors = append(errors, fmt.Sprintf("HTTP node '%s' missing data", node.ID))
		}
	case "start":
		// Start nodes typically don't need validation
	case "output":
		// Output nodes typically don't need validation
	default:
		errors = append(errors, fmt.Sprintf("Unknown node type '%s' for node '%s'", node.Type, node.ID))
	}

	return errors
}


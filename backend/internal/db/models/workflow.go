package models

import (
	"time"
)

// Workflow represents a workflow definition in the database
type Workflow struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	DAGJson   string    `json:"dag_json" db:"dag_json"` // JSON string containing nodes and edges
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// DAGStructure represents the structure of a workflow DAG
type DAGStructure struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

// Node represents a workflow node
type Node struct {
	ID       string      `json:"id"`
	Type     string      `json:"type"` // "start", "http", "output"
	Position Position    `json:"position"`
	Data     interface{} `json:"data"`
}

// Edge represents a connection between nodes
type Edge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

// Position represents node position on canvas
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// StartNodeData represents data for start node
type StartNodeData struct {
	Label string `json:"label,omitempty"`
}

// HttpNodeData represents data for HTTP node
type HttpNodeData struct {
	URL     string                 `json:"url"`
	Method  string                 `json:"method"`
	Headers map[string]string      `json:"headers,omitempty"`
	Query   map[string]string      `json:"query,omitempty"`
	Body    interface{}            `json:"body,omitempty"`
}

// OutputNodeData represents data for output node
type OutputNodeData struct {
	Label string `json:"label,omitempty"`
}


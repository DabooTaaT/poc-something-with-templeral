-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create executions table
CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    result_json JSONB,
    error TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON executions(started_at DESC);


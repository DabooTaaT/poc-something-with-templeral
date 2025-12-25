-- Create workflow_versions table for version history
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, version_number)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_version ON workflow_versions(workflow_id, version_number);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_created_at ON workflow_versions(created_at DESC);


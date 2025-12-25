package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/your-org/n8n-clone/internal/db/models"
	"github.com/your-org/n8n-clone/internal/service"
)

// WorkflowHandler handles workflow-related requests
type WorkflowHandler struct {
	WorkflowService *service.WorkflowService
}

type workflowResponse struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Nodes     []models.Node `json:"nodes"`
	Edges     []models.Edge `json:"edges"`
	Version   *int          `json:"version"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

func (h *WorkflowHandler) toWorkflowResponse(wf *models.Workflow) (*workflowResponse, error) {
	dagStruct, err := h.WorkflowService.ParseWorkflowDAG(wf)
	if err != nil {
		return nil, err
	}

	// Default to version 1 if Version is nil or empty
	version := wf.Version
	if version == nil {
		defaultVersion := 1
		version = &defaultVersion
	}

	return &workflowResponse{
		ID:        wf.ID,
		Name:      wf.Name,
		Nodes:     dagStruct.Nodes,
		Edges:     dagStruct.Edges,
		Version:   version,
		CreatedAt: wf.CreatedAt,
		UpdatedAt: wf.UpdatedAt,
	}, nil
}

// CreateWorkflow handles POST /workflows
func (h *WorkflowHandler) CreateWorkflow(c *gin.Context) {
	var req struct {
		Name  string        `json:"name" binding:"required"`
		Nodes []models.Node `json:"nodes" binding:"required"`
		Edges []models.Edge `json:"edges" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	wf, err := h.WorkflowService.CreateWorkflow(c.Request.Context(), req.Name, models.DAGStructure{
		Nodes: req.Nodes,
		Edges: req.Edges,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.toWorkflowResponse(wf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse workflow dag"})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetWorkflow handles GET /workflows/:id
func (h *WorkflowHandler) GetWorkflow(c *gin.Context) {
	workflowID := c.Param("id")

	wf, err := h.WorkflowService.GetWorkflow(c.Request.Context(), workflowID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.toWorkflowResponse(wf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to parse workflow dag",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateWorkflow handles PUT /workflows/:id
func (h *WorkflowHandler) UpdateWorkflow(c *gin.Context) {
	workflowID := c.Param("id")

	var req struct {
		Name  string        `json:"name"`
		Nodes []models.Node `json:"nodes"`
		Edges []models.Edge `json:"edges"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var dagStruct *models.DAGStructure
	if req.Nodes != nil || req.Edges != nil {
		ds := models.DAGStructure{Nodes: req.Nodes, Edges: req.Edges}
		dagStruct = &ds
	}

	wf, err := h.WorkflowService.UpdateWorkflow(c.Request.Context(), workflowID, req.Name, dagStruct)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.toWorkflowResponse(wf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse workflow dag"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ListWorkflows handles GET /workflows
func (h *WorkflowHandler) ListWorkflows(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	search := c.Query("search")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	workflows, total, err := h.WorkflowService.ListWorkflows(c.Request.Context(), limit, offset, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items":  workflows,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ListVersions handles GET /workflows/:id/versions
func (h *WorkflowHandler) ListVersions(c *gin.Context) {
	workflowID := c.Param("id")

	versions, currentVersion, err := h.WorkflowService.ListWorkflowVersions(c.Request.Context(), workflowID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	type versionResponse struct {
		ID            string    `json:"id"`
		WorkflowID    string    `json:"workflowId"`
		VersionNumber int       `json:"versionNumber"`
		Name          string    `json:"name"`
		CreatedAt     time.Time `json:"createdAt"`
	}

	versionResponses := make([]versionResponse, len(versions))
	for i, v := range versions {
		versionResponses[i] = versionResponse{
			ID:            v.ID,
			WorkflowID:    v.WorkflowID,
			VersionNumber: v.VersionNumber,
			Name:          v.Name,
			CreatedAt:     v.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"versions":      versionResponses,
		"total":         len(versions),
		"currentVersion": currentVersion,
	})
}

// GetVersion handles GET /workflows/:id/versions/:version
func (h *WorkflowHandler) GetVersion(c *gin.Context) {
	workflowID := c.Param("id")
	versionStr := c.Param("version")

	versionNumber, err := strconv.Atoi(versionStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version number"})
		return
	}

	version, err := h.WorkflowService.GetWorkflowVersion(c.Request.Context(), workflowID, versionNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse DAG structure
	var dagStruct models.DAGStructure
	if err := json.Unmarshal([]byte(version.DAGJson), &dagStruct); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse version dag"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            version.ID,
		"workflowId":    version.WorkflowID,
		"versionNumber": version.VersionNumber,
		"name":          version.Name,
		"nodes":         dagStruct.Nodes,
		"edges":         dagStruct.Edges,
		"createdAt":     version.CreatedAt,
	})
}

// RestoreVersion handles POST /workflows/:id/restore/:version
func (h *WorkflowHandler) RestoreVersion(c *gin.Context) {
	workflowID := c.Param("id")
	versionStr := c.Param("version")

	versionNumber, err := strconv.Atoi(versionStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version number"})
		return
	}

	wf, err := h.WorkflowService.RestoreWorkflowVersion(c.Request.Context(), workflowID, versionNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.toWorkflowResponse(wf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse workflow dag"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

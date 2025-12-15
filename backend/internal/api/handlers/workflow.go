package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/your-org/n8n-clone/internal/db/models"
	"github.com/your-org/n8n-clone/internal/service"
)

// WorkflowHandler handles workflow-related requests
type WorkflowHandler struct {
	WorkflowService *service.WorkflowService
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

	c.JSON(http.StatusCreated, wf)
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
	c.JSON(http.StatusOK, wf)
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

	c.JSON(http.StatusOK, wf)
}

// ListWorkflows handles GET /workflows
func (h *WorkflowHandler) ListWorkflows(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	workflows, err := h.WorkflowService.ListWorkflows(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"items": workflows,
		"total": len(workflows),
	})
}

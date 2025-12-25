package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/your-org/n8n-clone/internal/service"
)

// ExecutionHandler handles execution-related requests
type ExecutionHandler struct {
	ExecutionService *service.ExecutionService
}

// RunWorkflow handles POST /workflows/:id/run
func (h *ExecutionHandler) RunWorkflow(c *gin.Context) {
	workflowID := c.Param("id")

	execID, err := h.ExecutionService.StartExecution(c.Request.Context(), workflowID)
	if err != nil {
		if err == service.ErrWorkflowNotFound || err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"execution_id": execID,
		"workflow_id":  workflowID,
		"status":       "PENDING",
	})
}

// GetExecution handles GET /executions/:id
func (h *ExecutionHandler) GetExecution(c *gin.Context) {
	executionID := c.Param("id")

	exec, err := h.ExecutionService.GetExecution(c.Request.Context(), executionID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, exec)
}

// ListExecutions handles GET /workflows/:id/executions
func (h *ExecutionHandler) ListExecutions(c *gin.Context) {
	workflowID := c.Param("id")

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	execs, err := h.ExecutionService.ListExecutions(c.Request.Context(), workflowID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workflow_id": workflowID,
		"executions":  execs,
		"total":       len(execs),
	})
}

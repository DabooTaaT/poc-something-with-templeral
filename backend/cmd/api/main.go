package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/your-org/n8n-clone/internal/api/handlers"
	"github.com/your-org/n8n-clone/internal/api/middleware"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Get configuration from environment
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	// TODO: Initialize database connection
	// db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	// if err != nil {
	//     log.Fatal("Failed to connect to database:", err)
	// }
	// defer db.Close()

	// TODO: Initialize Temporal client
	// temporalHost := os.Getenv("TEMPORAL_HOST")
	// if temporalHost == "" {
	//     temporalHost = "localhost:7233"
	// }
	// temporalClient, err := client.Dial(client.Options{HostPort: temporalHost})
	// if err != nil {
	//     log.Fatal("Failed to connect to Temporal:", err)
	// }
	// defer temporalClient.Close()

	// Setup Gin router
	router := gin.Default()

	// Add middleware
	router.Use(middleware.CORS())

	// Initialize handlers
	workflowHandler := &handlers.WorkflowHandler{}
	executionHandler := &handlers.ExecutionHandler{}

	// Register routes
	v1 := router.Group("/api/v1")
	{
		// Workflow routes
		v1.POST("/workflows", workflowHandler.CreateWorkflow)
		v1.GET("/workflows/:id", workflowHandler.GetWorkflow)
		v1.PUT("/workflows/:id", workflowHandler.UpdateWorkflow)
		v1.GET("/workflows", workflowHandler.ListWorkflows)

		// Execution routes
		v1.POST("/workflows/:id/run", executionHandler.RunWorkflow)
		v1.GET("/executions/:id", executionHandler.GetExecution)
		v1.GET("/workflows/:id/executions", executionHandler.ListExecutions)
	}

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Start server
	log.Printf("Starting API server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}


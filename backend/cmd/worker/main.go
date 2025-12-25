package main

import (
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"github.com/your-org/n8n-clone/internal/temporal"

	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Get Temporal host from environment
	temporalHost := os.Getenv("TEMPORAL_HOST")
	if temporalHost == "" {
		temporalHost = "localhost:7233"
	}

	// Database connection (used by activities)
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal("Database ping failed:", err)
	}
	defer db.Close()

	// Connect to Temporal server
	temporalClient, err := client.Dial(client.Options{
		HostPort: temporalHost,
	})
	if err != nil {
		log.Fatal("Failed to connect to Temporal:", err)
	}
	defer temporalClient.Close()

	// Create worker
	w := worker.New(temporalClient, "workflow-task-queue", worker.Options{})

	// Register workflows
	w.RegisterWorkflow(temporal.DAGWorkflow)

	// Register activities
	activities := &temporal.Activities{DB: db}
	w.RegisterActivity(activities.HttpRequestActivity)
	w.RegisterActivity(activities.LoadDAGActivity)
	w.RegisterActivity(activities.StoreExecutionResultActivity)
	w.RegisterActivity(activities.UpdateExecutionStatusActivity)
	w.RegisterActivity(activities.StoreExecutionErrorActivity)
	w.RegisterActivity(activities.CodeExecutionActivity)

	// Start worker
	log.Println("Starting Temporal worker...")
	err = w.Start()
	if err != nil {
		log.Fatal("Failed to start worker:", err)
	}

	// Wait for interrupt signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	// Graceful shutdown
	log.Println("Shutting down worker...")
	w.Stop()
	log.Println("Worker stopped")
}

package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"github.com/your-org/n8n-clone/internal/temporal"
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
	activities := &temporal.Activities{}
	w.RegisterActivity(activities.HttpRequestActivity)
	w.RegisterActivity(activities.LoadDAGActivity)
	w.RegisterActivity(activities.StoreExecutionResultActivity)
	w.RegisterActivity(activities.UpdateExecutionStatusActivity)

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


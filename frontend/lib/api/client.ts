import axios, { AxiosInstance } from 'axios';
import { Workflow, Execution } from '../types/dag';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Workflow API methods

  async createWorkflow(workflow: Workflow): Promise<{ id: string }> {
    const response = await this.client.post('/workflows', workflow);
    return response.data;
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await this.client.get(`/workflows/${id}`);
    return response.data;
  }

  async updateWorkflow(id: string, workflow: Workflow): Promise<Workflow> {
    const response = await this.client.put(`/workflows/${id}`, workflow);
    return response.data;
  }

  async listWorkflows(): Promise<{ workflows: Workflow[]; total: number }> {
    const response = await this.client.get('/workflows');
    return response.data;
  }

  // Execution API methods

  async runWorkflow(workflowId: string): Promise<{ execution_id: string }> {
    const response = await this.client.post(`/workflows/${workflowId}/run`);
    return response.data;
  }

  async getExecution(executionId: string): Promise<Execution> {
    const response = await this.client.get(`/executions/${executionId}`);
    return response.data;
  }

  async listExecutions(workflowId: string): Promise<{ executions: Execution[]; total: number }> {
    const response = await this.client.get(`/workflows/${workflowId}/executions`);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();


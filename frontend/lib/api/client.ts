import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Workflow, Execution, WorkflowListResponse } from '../types/dag';

// Error response type from backend
interface ErrorResponse {
  message?: string;
  code?: string;
  details?: unknown;
}

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, ''); // strip trailing slash
const API_WITH_CREDENTIALS = process.env.NEXT_PUBLIC_API_WITH_CREDENTIALS === 'true';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

// Runtime guard to surface misconfig early
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[apiClient] NEXT_PUBLIC_API_URL not set, defaulting to http://localhost:8080');
} else if (!/^https?:\/\//i.test(API_BASE_URL)) {
  console.warn(`[apiClient] NEXT_PUBLIC_API_URL looks invalid: ${API_BASE_URL}`);
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: API_TIMEOUT,
      withCredentials: API_WITH_CREDENTIALS,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor - add logging and headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            params: config.params,
          });
        }

        // Add timestamp to request
        config.headers['X-Request-Time'] = new Date().toISOString();

        // Add custom headers if needed
        if (typeof window !== 'undefined') {
          config.headers['X-Client-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        return config;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response;
      },
      (error: AxiosError) => {
        // Enhanced error handling
        if (!error.response) {
          // Network error or CORS issue
          const message = error.message || 'Network error';
          console.log('[API Network Error]', {
            message,
            url: error.config?.url,
            method: error.config?.method,
          });
          console.error('[API Network Error]', {
            message,
            url: error.config?.url,
            method: error.config?.method,
          });
          return Promise.reject(new Error(`Network error: ${message}. Please check your connection and CORS settings.`));
        }

        // Server error
        const status = error.response.status;
        const data = error.response.data as ErrorResponse;

        console.error('[API Server Error]', {
          status,
          url: error.config?.url,
          method: error.config?.method,
          data,
        });

        // Handle specific error codes
        switch (status) {
          case 400:
            return Promise.reject(new Error(data?.message || 'Bad request. Please check your input.'));
          case 401:
            return Promise.reject(new Error('Unauthorized. Please login again.'));
          case 403:
            return Promise.reject(new Error('Forbidden. You do not have permission to access this resource.'));
          case 404:
            return Promise.reject(new Error(data?.message || 'Resource not found.'));
          case 409:
            return Promise.reject(new Error(data?.message || 'Conflict. The resource already exists.'));
          case 422:
            return Promise.reject(new Error(data?.message || 'Validation error. Please check your input.'));
          case 429:
            return Promise.reject(new Error('Too many requests. Please try again later.'));
          case 500:
            return Promise.reject(new Error('Internal server error. Please try again later.'));
          case 503:
            return Promise.reject(new Error('Service unavailable. Please try again later.'));
          default:
            return Promise.reject(new Error(data?.message || `Server error: ${status}`));
        }
      }
    );
  }

  // Workflow API methods

  async createWorkflow(workflow: Workflow): Promise<Workflow> {
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

  async listWorkflows(params?: { limit?: number; offset?: number; search?: string }): Promise<WorkflowListResponse> {
    const response = await this.client.get('/workflows', { params });
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


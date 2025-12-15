/**
 * API Client Middleware Utilities
 * 
 * This module provides reusable middleware functions for the API client.
 * These match the behavior of the backend middleware.
 */

export interface RequestConfig {
  url?: string;
  method?: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
}

export interface ResponseData {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

/**
 * Request Logger Middleware
 * Logs all outgoing API requests
 */
export const requestLogger = (config: RequestConfig): RequestConfig => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] API Request:`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data,
      params: config.params,
    });
  }
  return config;
};

/**
 * Response Logger Middleware
 * Logs all incoming API responses
 */
export const responseLogger = (response: ResponseData): ResponseData => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] API Response:`, {
      status: response.status,
      data: response.data,
    });
  }
  return response;
};

/**
 * Add Standard Headers Middleware
 * Adds standard headers to match backend expectations
 */
export const addStandardHeaders = (config: RequestConfig): RequestConfig => {
  if (!config.headers) {
    config.headers = {};
  }

  // Add headers that match backend CORS configuration
  config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
  config.headers['Accept'] = config.headers['Accept'] || 'application/json';
  config.headers['X-Request-Time'] = new Date().toISOString();

  // Add client info
  if (typeof window !== 'undefined') {
    config.headers['X-Client-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    config.headers['X-Client-Language'] = navigator.language;
  }

  return config;
};

/**
 * Error Handler Middleware
 * Normalizes error responses to match backend error format
 */
export const errorHandler = (error: any): never => {
  const errorResponse = {
    message: 'An error occurred',
    status: 500,
    code: 'UNKNOWN_ERROR',
    details: null as any,
  };

  if (error.response) {
    // Server responded with error
    errorResponse.status = error.response.status;
    errorResponse.message = error.response.data?.message || error.message;
    errorResponse.code = error.response.data?.code || `HTTP_${error.response.status}`;
    errorResponse.details = error.response.data;
  } else if (error.request) {
    // Request made but no response
    errorResponse.status = 0;
    errorResponse.message = 'Network error: No response from server';
    errorResponse.code = 'NETWORK_ERROR';
  } else {
    // Something else happened
    errorResponse.message = error.message || 'Unknown error occurred';
    errorResponse.code = 'CLIENT_ERROR';
  }

  console.error('[API Error]', errorResponse);
  throw new Error(errorResponse.message);
};

/**
 * Retry Middleware Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatuses: number[];
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Check if request should be retried
 */
export const shouldRetry = (error: any, config: RetryConfig = defaultRetryConfig): boolean => {
  if (!error.response) {
    // Network errors should be retried
    return true;
  }

  const status = error.response.status;
  return config.retryableStatuses.includes(status);
};

/**
 * Timeout Configuration
 */
export const TIMEOUT_CONFIG = {
  default: 30000, // 30 seconds
  long: 60000,    // 60 seconds for long-running operations
  short: 10000,   // 10 seconds for quick operations
};

/**
 * Get timeout for specific operations
 */
export const getTimeout = (operation: 'workflow' | 'execution' | 'default'): number => {
  switch (operation) {
    case 'workflow':
      return TIMEOUT_CONFIG.default;
    case 'execution':
      return TIMEOUT_CONFIG.long; // Executions might take longer
    default:
      return TIMEOUT_CONFIG.default;
  }
};


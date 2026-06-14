/**
 * API Client — Centralized fetch wrapper for Laravel + Supabase backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ApiConfig {
  baseUrl: string;
  credentials: RequestCredentials;
  defaultHeaders: Record<string, string>;
}

const defaultConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  credentials: "include",
  defaultHeaders: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig = defaultConfig) {
    this.config = config;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const headers = {
      ...this.config.defaultHeaders,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: this.config.credentials,
      });

      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed"
      );
    }
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const searchParams = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return this.request<T>(`${path}${searchParams}`);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();

const USE_LIVE_API = process.env.NEXT_PUBLIC_USE_LIVE_API === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const FETCH_TIMEOUT_MS = 10_000; // 10 s per request
const MAX_RETRIES = 1;

import { resolveMockData } from './mock-adapter';

/**
 * Fetch with per-attempt timeout (AbortSignal.timeout) and one automatic retry
 * on network errors or 5xx responses.
 */
async function fetchWithRetry(
  url: string,
  options: Omit<RequestInit, 'signal'>,
  timeoutMs = FETCH_TIMEOUT_MS,
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Retry on server errors only (not 4xx client errors)
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchWithRetry(url, options, timeoutMs, retries - 1);
    }
    return res;
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    // Retry on network errors, not timeouts
    if (!isTimeout && retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchWithRetry(url, options, timeoutMs, retries - 1);
    }
    throw err;
  }
}

class APIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!USE_LIVE_API) {
      return Promise.resolve(resolveMockData<T>(endpoint, params));
    }
    const url = params
      ? `${API_BASE}${endpoint}?${new URLSearchParams(params)}`
      : `${API_BASE}${endpoint}`;
    const res = await fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    if (!USE_LIVE_API) {
      return Promise.resolve(this.handleMockWrite<T>(endpoint, body));
    }
    const res = await fetchWithRetry(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    if (!USE_LIVE_API) {
      return Promise.resolve(this.handleMockWrite<T>(endpoint, body));
    }
    const res = await fetchWithRetry(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    if (!USE_LIVE_API) {
      return Promise.resolve({ success: true } as T);
    }
    const res = await fetchWithRetry(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }

  private handleMockWrite<T>(_endpoint: string, body: unknown): T {
    return { success: true, ...(typeof body === 'object' && body !== null ? body : {}) } as T;
  }
}

export const api = new APIClient();

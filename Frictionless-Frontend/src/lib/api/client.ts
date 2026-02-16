const USE_LIVE_API = process.env.NEXT_PUBLIC_USE_LIVE_API === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

import { resolveMockData } from './mock-adapter';

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
    const res = await fetch(url, {
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
    const res = await fetch(`${API_BASE}${endpoint}`, {
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
    const res = await fetch(`${API_BASE}${endpoint}`, {
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
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }

  private handleMockWrite<T>(endpoint: string, body: unknown): T {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mock API] POST/PUT ${endpoint}`, body);
    }
    return { success: true, ...(typeof body === 'object' && body !== null ? body : {}) } as T;
  }
}

export const api = new APIClient();

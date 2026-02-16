/**
 * API request and response types for the Frictionless Intelligence platform.
 * Used for HTTP client calls, API routes, and data fetching.
 */

import type { AIExtraction } from './database';

// ---------------------------------------------------------------------------
// Generic API Response
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  pagination?: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  org_name?: string;
  org_type?: 'startup' | 'capital_provider' | 'accelerator';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    org_id: string;
    org_type: string;
    org_name: string;
    role: string;
  };
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Task Completion
// ---------------------------------------------------------------------------

export type TaskCompletionSource = 'ai_file_upload' | 'ai_chat' | 'manual';

export interface TaskCompleteRequest {
  completion_source: TaskCompletionSource;
  ai_extractions?: AIExtraction[];
  file_asset_id?: string;
  ai_summary?: string;
  requires_rescore: boolean;
  completed_by: string;
}

// ---------------------------------------------------------------------------
// Paginated List Requests
// ---------------------------------------------------------------------------

export interface ListParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StartupListParams extends ListParams {
  sector?: string;
  stage?: string;
  min_score?: number;
  search?: string;
}

export interface MatchListParams extends ListParams {
  status?: string;
  min_score?: number;
}

// ---------------------------------------------------------------------------
// Update Requests
// ---------------------------------------------------------------------------

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: string | null;
}

export interface AddTaskCommentRequest {
  content: string;
  author: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  avatar_url?: string;
}

// ---------------------------------------------------------------------------
// Document Upload
// ---------------------------------------------------------------------------

export interface DocumentUploadRequest {
  name: string;
  category: string;
  file: File | Blob;
}

// ---------------------------------------------------------------------------
// Webhook / Event Payloads
// ---------------------------------------------------------------------------

export interface WebhookPayload<T = unknown> {
  event: string;
  timestamp: string;
  data: T;
}

/**
 * Mock data resolver - returns appropriate data based on endpoint patterns.
 * Used when USE_LIVE_API is false.
 * Imports from dummy-data folder and lib/dummy-data.ts for full coverage.
 */

import { dummyStartups } from '../dummy-data/startups';
import { dummyInvestors } from '../dummy-data/investors';
import { dummyMatches } from '../dummy-data/matches';
import {
  MOCK_TASK_GROUPS,
  MOCK_DOCUMENTS,
  MOCK_METRICS_HISTORY,
  MOCK_CHAT_THREADS,
  MOCK_CHAT_MESSAGES,
  MOCK_NOTIFICATIONS,
  MOCK_PROGRAMS,
  MOCK_DEAL_FLOW,
  MOCK_SETTINGS,
} from '../dummy-data';

/**
 * Resolves a GET endpoint to mock data.
 * Endpoint patterns are matched in order of specificity.
 */
export function resolveMockData<T>(
  endpoint: string,
  _params?: Record<string, string> // eslint-disable-line @typescript-eslint/no-unused-vars
): T {
  const normalized = endpoint.replace(/\?.*$/, '').trim();

  // Startup endpoints
  if (/^\/startups\/[^/]+\/profile$/.test(normalized)) {
    return dummyStartups[0] as T;
  }
  if (/^\/startups\/[^/]+\/assessments\/latest$/.test(normalized)) {
    const startup = dummyStartups[0];
    return {
      id: 'a-latest',
      startup_org_id: startup.org_id,
      run_number: 1,
      overall_score: startup.assessment.overall_score,
      badge: startup.assessment.badge,
      scored_at: new Date().toISOString(),
      categories: startup.assessment.categories,
      delta_from_previous: startup.score_delta,
    } as T;
  }
  if (/^\/startups\/[^/]+\/assessments$/.test(normalized)) {
    const startup = dummyStartups[0];
    return [
      {
        id: 'a-001',
        startup_org_id: startup.org_id,
        run_number: 1,
        overall_score: startup.assessment.overall_score,
        badge: startup.assessment.badge,
        scored_at: new Date().toISOString(),
        categories: startup.assessment.categories,
        delta_from_previous: startup.score_delta,
      },
    ] as T;
  }
  if (/^\/startups\/[^/]+\/matches$/.test(normalized)) {
    return dummyMatches as T;
  }
  if (/^\/startups\/[^/]+\/tasks$/.test(normalized)) {
    const allTasks = MOCK_TASK_GROUPS.flatMap((g) => g.tasks);
    return { task_groups: MOCK_TASK_GROUPS, tasks: allTasks } as T;
  }
  if (/^\/startups\/[^/]+\/documents$/.test(normalized)) {
    return MOCK_DOCUMENTS as T;
  }
  if (/^\/startups\/[^/]+\/metrics$/.test(normalized)) {
    return MOCK_METRICS_HISTORY as T;
  }
  if (/^\/startups\/[^/]+\/analytics$/.test(normalized)) {
    const startup = dummyStartups[0];
    return {
      score_trend: [
        { date: new Date(Date.now() - 86400000 * 60).toISOString(), score: startup.assessment.overall_score - 5 },
        { date: new Date(Date.now() - 86400000 * 30).toISOString(), score: startup.assessment.overall_score - 8 },
        { date: new Date().toISOString(), score: startup.assessment.overall_score },
      ],
      completion_rate: 0.68,
    } as T;
  }

  // Capital endpoints
  if (normalized === '/capital/deal-flow') {
    return MOCK_DEAL_FLOW as T;
  }
  if (/^\/capital\/[^/]+\/profile$/.test(normalized)) {
    return dummyInvestors[0] as T;
  }
  if (/^\/capital\/[^/]+\/funds$/.test(normalized)) {
    return (dummyInvestors[0]?.funds ?? []) as T;
  }
  if (/^\/capital\/[^/]+\/team$/.test(normalized)) {
    return (dummyInvestors[0]?.team_members ?? []) as T;
  }

  // Chat endpoints
  if (normalized === '/chat/threads') {
    return MOCK_CHAT_THREADS as T;
  }
  const chatMsgMatch = normalized.match(/^\/chat\/threads\/([^/]+)\/messages$/);
  if (chatMsgMatch) {
    const threadId = chatMsgMatch[1];
    return (MOCK_CHAT_MESSAGES[threadId] ?? []) as T;
  }

  // Programs
  if (normalized === '/programs') {
    return MOCK_PROGRAMS as T;
  }
  if (/^\/programs\/[^/]+$/.test(normalized)) {
    return MOCK_PROGRAMS[0] as T;
  }
  if (/^\/programs\/[^/]+\/startups$/.test(normalized)) {
    return [] as T; // ProgramStartup[]
  }

  // Notifications
  if (normalized === '/notifications') {
    return MOCK_NOTIFICATIONS as T;
  }

  // Settings
  if (normalized === '/settings') {
    return MOCK_SETTINGS as T;
  }
  if (normalized === '/settings/team') {
    return { members: [] } as T;
  }
  if (normalized === '/settings/billing') {
    return { plan: 'pro', status: 'active' } as T;
  }

  return {} as T;
}

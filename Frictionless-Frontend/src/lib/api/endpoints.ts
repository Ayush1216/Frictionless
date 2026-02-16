export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',

  // Startup
  STARTUP_PROFILE: (orgId: string) => `/startups/${orgId}/profile`,
  STARTUP_ASSESSMENT: (orgId: string) => `/startups/${orgId}/assessments/latest`,
  STARTUP_ASSESSMENT_HISTORY: (orgId: string) => `/startups/${orgId}/assessments`,
  STARTUP_MATCHES: (orgId: string) => `/startups/${orgId}/matches`,
  STARTUP_TASKS: (orgId: string) => `/startups/${orgId}/tasks`,
  STARTUP_DOCUMENTS: (orgId: string) => `/startups/${orgId}/documents`,
  STARTUP_METRICS: (orgId: string) => `/startups/${orgId}/metrics`,
  STARTUP_ANALYTICS: (orgId: string) => `/startups/${orgId}/analytics`,

  // Tasks
  TASK_COMPLETE: (taskId: string) => `/tasks/${taskId}/complete`,
  TASK_UPDATE: (taskId: string) => `/tasks/${taskId}`,
  TASK_COMMENTS: (taskId: string) => `/tasks/${taskId}/comments`,

  // Capital
  DEAL_FLOW: '/capital/deal-flow',
  CAPITAL_PROFILE: (orgId: string) => `/capital/${orgId}/profile`,
  FUNDS: (orgId: string) => `/capital/${orgId}/funds`,
  TEAM: (orgId: string) => `/capital/${orgId}/team`,

  // Chat
  CHAT_THREADS: '/chat/threads',
  CHAT_MESSAGES: (threadId: string) => `/chat/threads/${threadId}/messages`,

  // Programs
  PROGRAMS: '/programs',
  PROGRAM_DETAIL: (programId: string) => `/programs/${programId}`,
  PROGRAM_STARTUPS: (programId: string) => `/programs/${programId}/startups`,

  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,

  // Settings
  SETTINGS: '/settings',
  TEAM_SETTINGS: '/settings/team',
  BILLING: '/settings/billing',
};

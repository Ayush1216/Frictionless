export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  org_id: string;
  org_type: 'startup' | 'capital_provider' | 'accelerator';
  org_name: string;
  role: 'owner' | 'admin' | 'member';
}

const DEMO_USERS: Record<string, MockUser> = {
  startup: {
    id: 'u-001',
    email: 'sarah@neuralpay.io',
    full_name: 'Sarah Chen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    org_id: 's-001',
    org_type: 'startup',
    org_name: 'NeuralPay',
    role: 'owner',
  },
  investor: {
    id: 'u-010',
    email: 'hemant@generalcatalyst.com',
    full_name: 'Hemant Taneja',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hemant',
    org_id: 'c-001',
    org_type: 'capital_provider',
    org_name: 'General Catalyst',
    role: 'owner',
  },
  accelerator: {
    id: 'u-020',
    email: 'lisa@sku.org',
    full_name: 'Lisa Wang',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
    org_id: 'a-001',
    org_type: 'accelerator',
    org_name: 'SKU Accelerator',
    role: 'owner',
  },
};

export function mockLogin(type: 'startup' | 'investor' | 'accelerator'): MockUser {
  return DEMO_USERS[type];
}

export function getDemoUsers(): Record<string, MockUser> {
  return DEMO_USERS;
}

export function getDemoUser(type: string): MockUser | undefined {
  return DEMO_USERS[type];
}

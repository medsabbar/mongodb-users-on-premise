export interface ApiConfig {
  isConnected: boolean;
  demoMode: boolean;
  hasAdminPassword: boolean;
  adminUsername: string;
  mongoUriFromEnv: string | null;
  serverName?: string | null;
}

export interface ApiUserRole {
  role: string;
  db: string;
}

export interface ApiUser {
  _id: string;
  name: string;
  createdAt: string | Date;
  isTemporary?: boolean;
  expiresAt?: string | Date | null;
  roles?: ApiUserRole[];
}

export interface UsersResponse {
  users: ApiUser[];
  isConnected: boolean;
  demoMode: boolean;
}

export interface DashboardStats {
  total: number;
  permanent: number;
  temporary: number;
}

export type ToastTone = 'success' | 'error';

export interface ToastState {
  message: string;
  tone: ToastTone;
}

export type ActionNodeType = 'action' | 'role';

export interface ActionsTreeNode {
  name: string;
  type?: ActionNodeType;
  children?: ActionsTreeNode[];
}

export interface CustomRoleSummary {
  role: string;
  privileges?: Array<{
    resource: { db: string; collection?: string };
    actions: string[];
  }>;
}

export interface CustomRolesResponse {
  roles: CustomRoleSummary[];
}


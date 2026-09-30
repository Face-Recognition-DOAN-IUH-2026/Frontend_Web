export type SystemResource =
  | 'books'
  | 'patrons'
  | 'borrows'
  | 'schedules'
  | 'ai_tools'
  | 'settings'
  | 'stats';

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export const ALL_RESOURCES: SystemResource[] = [
  'books',
  'patrons',
  'borrows',
  'schedules',
  'ai_tools',
  'settings',
  'stats',
];

export const RESOURCE_LABELS: Record<SystemResource, string> = {
  books: 'Kho sách (Books)',
  patrons: 'Độc giả (Patrons)',
  borrows: 'Mượn / Trả (Borrows)',
  schedules: 'Lịch trực (Schedules)',
  ai_tools: 'Công cụ AI (AI Assistant)',
  settings: 'Cài đặt hệ thống (Settings)',
  stats: 'Báo cáo thống kê (Stats)',
};

export const ACTION_LABELS: Record<CrudAction, string> = {
  create: 'Tạo mới (Create)',
  read: 'Xem dữ liệu (Read)',
  update: 'Chỉnh sửa (Update)',
  delete: 'Xóa (Delete)',
};

export const ALL_ACTIONS: CrudAction[] = ['create', 'read', 'update', 'delete'];

export interface ResourceCrudPermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface RolePermissionConfig {
  role: string;
  label: string;
  description?: string;
  allowedPages: string[];
  crud: Record<SystemResource, ResourceCrudPermission>;
}

export interface UserPermissionOverride {
  enabled: boolean;
  grantedPages: string[];
  revokedPages: string[];
  grantedCrud: Partial<Record<SystemResource, Partial<ResourceCrudPermission>>>;
  revokedCrud: Partial<Record<SystemResource, Partial<ResourceCrudPermission>>>;
}

export interface EffectivePermissions {
  role: string;
  isCustom: boolean;
  allowedPages: string[];
  crud: Record<SystemResource, ResourceCrudPermission>;
}

export interface RoutePermissionInfo {
  path: string;
  label: string;
}

export const ALL_ROUTES: RoutePermissionInfo[] = [
  { path: '/dashboard', label: 'Tổng quan (Dashboard)' },
  { path: '/books', label: 'Kho sách' },
  { path: '/patrons', label: 'Độc giả' },
  { path: '/borrow', label: 'Mượn sách' },
  { path: '/return', label: 'Trả sách' },
  { path: '/gate', label: 'Cổng ra vào' },
  { path: '/history', label: 'Lịch sử' },
  { path: '/staff-schedules', label: 'Lịch trực' },
  { path: '/ai-assistant', label: 'Trợ lý AI' },
  { path: '/enroll', label: 'Đăng ký khuôn mặt' },
  { path: '/dynamic-admin', label: 'Quản trị phân quyền (RBAC)' },
  { path: '/settings', label: 'Cài đặt' },
  { path: '/stats', label: 'Thống kê' },
];

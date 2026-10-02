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
  books: 'Kho sách & Tài liệu',
  patrons: 'Hồ sơ Độc giả',
  borrows: 'Mượn & Trả sách',
  schedules: 'Lịch trực & Ca làm',
  ai_tools: 'Trợ lý AI & Nhận diện',
  settings: 'Cài đặt Hệ thống',
  stats: 'Báo cáo & Thống kê',
};

export const ACTION_LABELS: Record<CrudAction, string> = {
  create: 'Thêm mới',
  read: 'Xem thông tin',
  update: 'Chỉnh sửa',
  delete: 'Xóa dữ liệu',
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
  { path: '/dashboard', label: 'Bàn làm việc & Tổng quan' },
  { path: '/books', label: 'Quản lý Kho sách & Tài liệu' },
  { path: '/patrons', label: 'Quản lý Độc giả & Bạn đọc' },
  { path: '/borrow', label: 'Quầy Mượn sách' },
  { path: '/return', label: 'Quầy Trả sách' },
  { path: '/gate', label: 'Kiosk Cổng kiểm soát ra vào' },
  { path: '/history', label: 'Nhật ký Lịch sử mượn trả' },
  { path: '/staff-schedules', label: 'Phân ca & Lịch trực thư viện' },
  { path: '/ai-assistant', label: 'Trợ lý AI Hỗ trợ thủ thư' },
  { path: '/enroll', label: 'Đăng ký nhận diện khuôn mặt' },
  { path: '/dynamic-admin', label: 'Phân quyền & Vai trò nhân viên' },
  { path: '/settings', label: 'Cài đặt cấu hình hệ thống' },
  { path: '/stats', label: 'Báo cáo thống kê hoạt động' },
];

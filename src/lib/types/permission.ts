export type SystemResource =
  | 'books'
  | 'patrons'
  | 'borrows'
  | 'schedules'
  | 'ai_tools'
  | 'settings'
  | 'stats';

export type CrudAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'print';

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
  read: 'Chỉ xem',
  create: 'Thêm mới',
  update: 'Chỉnh sửa',
  approve: 'Phê duyệt',
  print: 'In ấn',
  delete: 'Xóa dữ liệu',
};

export const ALL_ACTIONS: CrudAction[] = ['create', 'read', 'update', 'delete', 'approve', 'print'];

export interface ResourceCrudPermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  approve?: boolean;
  print?: boolean;
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

export type RouteCategory =
  | 'library'       // Thư viện & Bạn đọc
  | 'circulation'   // Lưu hành & Mượn trả
  | 'personnel'     // Lịch trực & Nhân sự
  | 'ai_vision'     // Sinh trắc học & Camera AI
  | 'admin';        // Quản trị hệ thống

export const CATEGORY_LABELS: Record<RouteCategory, string> = {
  library: 'Thư viện & Bạn đọc',
  circulation: 'Lưu hành & Mượn trả',
  personnel: 'Lịch trực & Nhân sự',
  ai_vision: 'Sinh trắc học & Camera AI',
  admin: 'Quản trị hệ thống',
};

export interface RoutePermissionInfo {
  path: string;
  label: string;
  category: RouteCategory;
  area: string;
}

export type SystemRoute = RoutePermissionInfo;

export const ALL_ROUTES: RoutePermissionInfo[] = [
  // 1. Thư viện & Bạn đọc
  {
    path: '/dashboard',
    label: 'Tổng quan thư viện',
    category: 'library',
    area: 'Bảng điều khiển trung tâm & Chỉ số KPI',
  },
  {
    path: '/patrons',
    label: 'Quản lý bạn đọc',
    category: 'library',
    area: 'Hồ sơ, mã thẻ thư viện & Bạn đọc',
  },
  {
    path: '/active',
    label: 'Bạn đọc đang có mặt',
    category: 'library',
    area: 'Giám sát độc giả đang hiện diện trong thư viện',
  },
  {
    path: '/gate',
    label: 'Cổng kiểm soát Kiosk',
    category: 'library',
    area: 'Trạm Kiosk quét thẻ & Nhận diện khuôn mặt',
  },
  {
    path: '/history',
    label: 'Nhật ký vào ra & Mượn trả',
    category: 'library',
    area: 'Sổ theo dõi nhật ký quét cổng & Hoạt động',
  },
  {
    path: '/library/vr-tour',
    label: 'Tham quan 3D Thư viện',
    category: 'library',
    area: 'Mô phỏng 3D bản đồ không gian số thư viện',
  },

  // 2. Lưu hành & Mượn trả
  {
    path: '/borrow',
    label: 'Quầy mượn sách',
    category: 'circulation',
    area: 'Quầy phục vụ mượn sách & Giao dịch',
  },
  {
    path: '/return',
    label: 'Quầy trả sách',
    category: 'circulation',
    area: 'Quầy tiếp nhận trả & Gia hạn sách',
  },
  {
    path: '/books',
    label: 'Kho sách & Tài liệu',
    category: 'circulation',
    area: 'Kho tư liệu, ấn phẩm & Quản lý danh mục',
  },

  // 3. Lịch trực & Nhân sự
  {
    path: '/staff-schedules',
    label: 'Lịch trực thủ thư',
    category: 'personnel',
    area: 'Bảng phân ca & Lịch công tác thủ thư',
  },
  {
    path: '/profile',
    label: 'Hồ sơ & Tài khoản cá nhân',
    category: 'personnel',
    area: 'Thông tin cá nhân & Thiết lập mật khẩu',
  },
  {
    path: '/notifications',
    label: 'Trung tâm thông báo',
    category: 'personnel',
    area: 'Thông báo nhắc nợ, quá hạn & Cảnh báo',
  },

  // 4. Sinh trắc học & Camera AI
  {
    path: '/ai-assistant',
    label: 'Trợ lý AI Thủ thư',
    category: 'ai_vision',
    area: 'Trợ lý ảo & Tư vấn nghiệp vụ thông minh',
  },
  {
    path: '/enroll',
    label: 'Đăng ký khuôn mặt',
    category: 'ai_vision',
    area: 'Thu thập & Đăng ký dữ liệu sinh trắc học',
  },
  {
    path: '/verify',
    label: 'Xác thực khuôn mặt (1:1)',
    category: 'ai_vision',
    area: 'Đối soát khuôn mặt 1:1 với thẻ sinh viên',
  },
  {
    path: '/identify',
    label: 'Nhận diện bạn đọc (1:N)',
    category: 'ai_vision',
    area: 'Quét camera tìm kiếm hồ sơ bạn đọc 1:N',
  },
  {
    path: '/liveness',
    label: 'Kiểm tra thực thể sống',
    category: 'ai_vision',
    area: 'Anti-spoofing kiểm tra khuôn mặt thật',
  },

  // 5. Quản trị hệ thống
  {
    path: '/dashboard/admin',
    label: 'Quản trị người dùng',
    category: 'admin',
    area: 'Quản lý tài khoản cán bộ, thủ thư & bạn đọc',
  },
  {
    path: '/dynamic-admin',
    label: 'Phân quyền & Vai trò',
    category: 'admin',
    area: 'Ma trận phân quyền động (Enterprise RBAC)',
  },
  {
    path: '/settings',
    label: 'Cài đặt hệ thống',
    category: 'admin',
    area: 'Cấu hình tham số mượn trả & Thư viện',
  },
  {
    path: '/stats',
    label: 'Báo cáo & Thống kê',
    category: 'admin',
    area: 'Báo cáo số liệu lưu lượng & Ấn phẩm',
  },
];

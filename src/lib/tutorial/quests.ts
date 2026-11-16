import type { TutorialQuest } from "./types";

export const TUTORIAL_QUESTS: TutorialQuest[] = [
  {
    id: "staff-welcome",
    role: "all",
    title: "1. Làm quen Giao diện Làm việc",
    subtitle: "Tìm hiểu thanh điều hướng, bảng điều khiển và công cụ thông báo",
    badgeLabel: "Cơ bản",
    xp: 0,
    estimatedMinutes: 1,
    matchRoutes: ["/dashboard"],
    steps: [
      {
        id: "sw-1",
        route: "/dashboard",
        targetSelector: `[data-tour="sidebar-nav"]`,
        title: "Thanh Điều hướng Chức năng",
        content:
          "Thanh bên trái chứa toàn bộ các phân hệ làm việc: Quầy Mượn/Trả, Kho sách, Lịch trực và Công cụ Nhận diện.",
        hint: "Trên màn hình nhỏ hoặc điện thoại, bạn có thể mở thanh này qua nút Menu ở góc trên bên trái.",
        placement: "right",
      },
      {
        id: "sw-2",
        route: "/dashboard",
        targetSelector: `[data-tour="topbar-notifications"]`,
        title: "Thông báo Hệ thống",
        content:
          "Biểu tượng chuông hiển thị các thông báo mới về sách quá hạn, lịch đặt trước và cập nhật ca trực.",
        placement: "bottom",
      },
      {
        id: "sw-3",
        route: "/dashboard",
        targetSelector: `[data-tour="topbar-theme"]`,
        title: "Chuyển đổi Giao diện Sáng / Tối",
        content:
          "Nhấn vào đây để chuyển nhanh giữa chế độ Sáng, Tối hoặc Tự động theo thiết bị.",
        placement: "bottom",
      },
      {
        id: "sw-4",
        route: "/dashboard",
        targetSelector: `[data-tour="topbar-quest-hub"]`,
        title: "Mở lại Hướng dẫn bất cứ lúc nào",
        content:
          "Khi cần xem lại cách thao tác, hãy nhấn biểu tượng dấu hỏi (?) tại đây để mở danh sách hướng dẫn hoặc hướng dẫn riêng cho trang hiện tại.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "staff-circulation",
    role: "staff",
    title: "2. Quy trình Mượn & Trả sách",
    subtitle: "Hướng dẫn quét thẻ/khuôn mặt bạn đọc, lập phiếu mượn và thu hồi sách",
    badgeLabel: "Lưu thông",
    xp: 0,
    estimatedMinutes: 2,
    matchRoutes: ["/borrow", "/return", "/books"],
    steps: [
      {
        id: "sc-1",
        route: "/dashboard",
        targetSelector: `[data-tour="nav-/borrow"]`,
        title: "Bước 1: Mở Quầy Mượn Sách",
        content:
          "Khi sinh viên đến mượn sách, chọn mục 'Quầy mượn sách' trên thanh điều hướng bên trái.",
        hint: "Bạn có thể nhấn trực tiếp vào mục được đánh dấu hoặc bấm Tiếp theo.",
        placement: "right",
        actionMode: "click-target",
      },
      {
        id: "sc-2",
        route: "/borrow",
        targetSelector: `[data-tour="page-header"]`,
        title: "Bước 2: Xác thực Bạn đọc & Quét Sách",
        content:
          "Nhập MSSV, quét mã vạch thẻ sinh viên hoặc nhận diện khuôn mặt để chọn bạn đọc. Sau đó quét mã vạch từng cuốn sách để hoàn tất phiếu mượn.",
        placement: "bottom",
      },
      {
        id: "sc-3",
        route: "/return",
        targetSelector: `[data-tour="page-header"]`,
        title: "Bước 3: Quầy Trả Sách & Kiểm tra Tình trạng",
        content:
          "Quét mã bản sao sách khi bạn đọc trả. Hệ thống tự động tính số ngày trễ hạn (nếu có) và cho phép ghi nhận tình trạng hư hỏng trước khi xác nhận.",
        placement: "bottom",
      },
      {
        id: "sc-4",
        route: "/books",
        targetSelector: `[data-tour="page-header"]`,
        title: "Bước 4: Tra cứu Kho Sách & Bản sao",
        content:
          "Vào Kho sách & Tài liệu để kiểm tra số lượng bản sao khả dụng, vị trí kệ hoặc in mã vạch.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "staff-schedule",
    role: "all",
    title: "3. Xem Lịch trực & Điểm danh GPS",
    subtitle: "Cách xem ca trực cá nhân, check-in Geofence và chuyển chế độ Nhật ký ngày",
    badgeLabel: "Lịch trực",
    xp: 0,
    estimatedMinutes: 2,
    matchRoutes: ["/staff-schedules"],
    steps: [
      {
        id: "ss-1",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-my-shift"]`,
        title: "Khung Điểm danh Ca trực của Tôi",
        content:
          "Hiển thị các ca trực hôm nay của bạn kèm nút Check-in / Check-out GPS và bản đồ khu vực hợp lệ.",
        placement: "bottom",
      },
      {
        id: "ss-2",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-filter-bar"]`,
        title: "Tìm kiếm & Lọc 'Ca của tôi'",
        content:
          "Nhập tên nhân viên vào ô tìm kiếm hoặc bật nút 'Ca của tôi' để chỉ hiển thị lịch trực của riêng bạn.",
        placement: "bottom",
      },
      {
        id: "ss-3",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-view-toggle"]`,
        title: "Chuyển Lưới Tuần ⟷ Nhật ký Ngày",
        content:
          "Trên điện thoại hoặc khi cần xem theo dòng thời gian từng ngày, hãy chọn chế độ 'Nhật ký ngày' thay cho bảng lưới 7 cột.",
        placement: "left",
      },
    ],
  },
  {
    id: "staff-kiosk-ai",
    role: "staff",
    title: "4. Giám sát Cổng & Trợ lý AI",
    subtitle: "Theo dõi lượt ra/vào thư viện và tra cứu thông tin qua Trợ lý AI",
    badgeLabel: "Vận hành",
    xp: 0,
    estimatedMinutes: 1,
    matchRoutes: ["/gate", "/active", "/ai-assistant"],
    steps: [
      {
        id: "sk-1",
        route: "/active",
        targetSelector: `[data-tour="page-header"]`,
        title: "Theo dõi Bạn đọc Đang có mặt",
        content:
          "Hiển thị danh sách sinh viên/giảng viên đang có mặt trong thư viện theo dữ liệu thời gian thực từ cổng kiểm soát.",
        placement: "bottom",
      },
      {
        id: "sk-2",
        route: "/ai-assistant",
        targetSelector: `[data-tour="page-header"]`,
        title: "Sử dụng Trợ lý AI Thư viện",
        content:
          "Đặt câu hỏi trực tiếp để tra cứu nhanh quy định mượn trả, hướng dẫn xử lý sự cố hoặc số liệu tổng hợp.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-users-face",
    role: "admin",
    permission: "admin:users",
    title: "Admin 1: Quản lý Nhân sự & Khuôn mặt",
    subtitle: "Tạo tài khoản nhân viên/bạn đọc và đăng ký dữ liệu khuôn mặt",
    badgeLabel: "Quản trị",
    xp: 0,
    estimatedMinutes: 2,
    matchRoutes: ["/dashboard/admin", "/enroll"],
    steps: [
      {
        id: "au-1",
        route: "/dashboard/admin",
        targetSelector: `[data-tour="page-header"]`,
        title: "Quản trị Tài khoản Người dùng",
        content:
          "Tạo mới tài khoản Thủ thư hoặc Sinh viên, cập nhật vai trò, khóa tài khoản hoặc đặt lại mật khẩu.",
        placement: "bottom",
      },
      {
        id: "au-2",
        route: "/enroll",
        targetSelector: `[data-tour="page-header"]`,
        title: "Đăng ký Khuôn mặt Sinh trắc học",
        content:
          "Chụp các góc khuôn mặt theo hướng dẫn trên màn hình để hệ thống trích xuất vector phục vụ mở cổng và xác thực mượn sách.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-rbac",
    role: "admin",
    permission: "admin:settings",
    title: "Admin 2: Phân quyền Động (RBAC)",
    subtitle: "Tạo vai trò và cấu hình quyền truy cập chi tiết theo từng phân hệ",
    badgeLabel: "Phân quyền",
    xp: 0,
    estimatedMinutes: 2,
    matchRoutes: ["/dynamic-admin"],
    steps: [
      {
        id: "ar-1",
        route: "/dynamic-admin",
        targetSelector: `[data-tour="page-header"]`,
        title: "Cấu hình Vai trò & Quyền hạn",
        content:
          "Tạo vai trò tùy biến và bật/tắt chi tiết quyền xem, tạo, sửa, xóa cho từng chức năng như Lịch trực, Kho sách, Bạn đọc.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-schedule-ops",
    role: "admin",
    title: "Admin 3: Xếp lịch Tuần & Cấu hình Geofence",
    subtitle: "Sao chép lịch tuần trước, xếp lịch tự động và thiết lập vùng GPS",
    badgeLabel: "Điều phối",
    xp: 0,
    estimatedMinutes: 2,
    matchRoutes: ["/staff-schedules"],
    steps: [
      {
        id: "aso-1",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-copy-week"]`,
        title: "Sao chép Lịch tuần trước",
        content:
          "Nhấn nút này để sao chép nhanh phân công ca trực từ tuần trước sang tuần đang xem và tự động bỏ qua các ca trùng lặp.",
        placement: "bottom",
      },
      {
        id: "aso-2",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-date-jump"]`,
        title: "Chuyển nhanh tới Tuần bất kỳ",
        content:
          "Chọn một ngày trên lịch để nhảy thẳng tới tuần tương ứng mà không cần bấm chuyển từng tuần.",
        placement: "bottom",
      },
      {
        id: "aso-3",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-auto-btn"]`,
        title: "Gợi ý Lịch Tự động & Geofence",
        content:
          "Dùng nút Gợi ý tự động để phân công cân bằng ca trực, và nút Bản đồ bên cạnh để cấu hình tọa độ/bán kính điểm danh GPS cho từng khu vực.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-settings-rag",
    role: "admin",
    permission: "admin:settings",
    title: "Admin 4: Cấu hình Hệ thống & Kho Tri thức AI",
    subtitle: "Thiết lập biểu phí phạt, máy chủ Email SMTP và tài liệu cho Trợ lý AI",
    badgeLabel: "Hệ thống",
    xp: 0,
    estimatedMinutes: 2,
    matchRoutes: ["/settings", "/knowledge-base"],
    steps: [
      {
        id: "asr-1",
        route: "/settings",
        targetSelector: `[data-tour="page-header"]`,
        title: "Cấu hình Tham số & Biểu phí",
        content:
          "Thiết lập số sách/ngày mượn tối đa, biểu phí phạt trễ hạn, tỉ lệ đền bù hư hỏng và kiểm tra gửi Email SMTP.",
        placement: "bottom",
      },
      {
        id: "asr-2",
        route: "/knowledge-base",
        targetSelector: `[data-tour="page-header"]`,
        title: "Cập nhật Kho Tri thức AI (RAG)",
        content:
          "Tải lên các tài liệu quy chế, nội quy thư viện để Trợ lý AI trả lời chính xác cho người dùng.",
        placement: "bottom",
      },
    ],
  },
];

export function getQuestsForUser(
  role?: string,
  canFn?: (resource: any, action: any) => boolean,
): TutorialQuest[] {
  const isAdmin = role === "admin";
  return TUTORIAL_QUESTS.filter((quest) => {
    if (quest.role === "admin" && !isAdmin) return false;
    if (quest.permission && !isAdmin && canFn) {
      const [resource, action] = quest.permission.split(":");
      if (!canFn(resource, action)) return false;
    }
    return true;
  });
}

export function getRankTitle(completedCount: number, totalCount: number, role?: string): string {
  if (totalCount === 0 || completedCount === 0) {
    return role === "admin" ? "Quản trị viên Mới" : "Thủ thư Tân binh";
  }
  const ratio = completedCount / totalCount;
  if (ratio >= 1) {
    return role === "admin" ? "Tổng quản Tinh anh" : "Bậc thầy Thư viện";
  }
  if (ratio >= 0.5) {
    return role === "admin" ? "Điều phối viên Cấp cao" : "Thủ thư Thành thạo";
  }
  return role === "admin" ? "Quản trị viên Tập sự" : "Thủ thư Tập sự";
}

import type { TutorialQuest } from "./types";

export const TUTORIAL_QUESTS: TutorialQuest[] = [
  {
    id: "staff-welcome",
    role: "all",
    title: "Nhiệm vụ 1: Khám phá Trạm Làm việc",
    subtitle: "Làm quen thanh điều hướng, bảng điều khiển và công cụ thông báo",
    badgeLabel: "Tân binh Thư viện",
    xp: 100,
    estimatedMinutes: 1,
    matchRoutes: ["/dashboard"],
    steps: [
      {
        id: "sw-1",
        route: "/dashboard",
        targetSelector: `[data-tour="sidebar-nav"]`,
        title: "Bản đồ Điều hướng Thư viện",
        content:
          "Thanh bên trái là trung tâm điều hướng toàn bộ hệ thống: từ Quầy Mượn/Trả, Kho sách, Lịch trực đến Công cụ Nhận diện AI.",
        hint: "Trên điện thoại, bạn có thể mở thanh này qua nút Menu ở góc trên bên trái.",
        placement: "right",
      },
      {
        id: "sw-2",
        route: "/dashboard",
        targetSelector: `[data-tour="topbar-notifications"]`,
        title: "Trung tâm Thông báo Realtime",
        content:
          "Chuông thông báo cập nhật ngay các cảnh báo quá hạn, yêu cầu đặt trước và biến động ca trực.",
        placement: "bottom",
      },
      {
        id: "sw-3",
        route: "/dashboard",
        targetSelector: `[data-tour="topbar-theme"]`,
        title: "Chuyển đổi Giao diện Sáng / Tối",
        content:
          "Nhấn vào đây để chuyển nhanh giữa chế độ Sáng, Tối hoặc Tự động theo hệ thống để bảo vệ mắt khi trực ca tối.",
        placement: "bottom",
      },
      {
        id: "sw-4",
        route: "/dashboard",
        targetSelector: `[data-tour="topbar-quest-hub"]`,
        title: "Sổ tay Nhiệm vụ (Mở lại bất cứ lúc nào)",
        content:
          "Bất kỳ lúc nào quên thao tác, hãy bấm nút dấu hỏi (?) tại đây để mở lại Sổ tay Nhiệm vụ hoặc xem hướng dẫn riêng của trang đang đứng!",
        placement: "bottom",
      },
    ],
  },
  {
    id: "staff-circulation",
    role: "staff",
    title: "Nhiệm vụ 2: Nghiệp vụ Mượn & Trả sách",
    subtitle: "Thành thạo quy trình quét thẻ/khuôn mặt, phát hành phiếu và thu hồi sách",
    badgeLabel: "Thủ thư Lưu thông",
    xp: 150,
    estimatedMinutes: 2,
    matchRoutes: ["/borrow", "/return", "/books"],
    steps: [
      {
        id: "sc-1",
        route: "/dashboard",
        targetSelector: `[data-tour="nav-/borrow"]`,
        title: "Bước 1: Mở Quầy Mượn Sách",
        content:
          "Khi sinh viên đến quầy mượn giáo trình, hãy chọn 'Quầy mượn sách' trên thanh điều hướng.",
        hint: "Bạn có thể bấm trực tiếp vào mục đang sáng hoặc nhấn Tiếp theo.",
        placement: "right",
        actionMode: "click-target",
      },
      {
        id: "sc-2",
        route: "/borrow",
        targetSelector: `[data-tour="page-header"]`,
        title: "Bước 2: Xác thực Bạn đọc & Quét Sách",
        content:
          "Tại Quầy mượn sách, bạn có thể nhập MSSV, quét mã vạch thẻ sinh viên hoặc nhận diện khuôn mặt. Sau đó quét mã vạch từng cuốn sách để tạo phiếu mượn.",
        placement: "bottom",
      },
      {
        id: "sc-3",
        route: "/return",
        targetSelector: `[data-tour="page-header"]`,
        title: "Bước 3: Quầy Trả Sách & Kiểm tra Tình trạng",
        content:
          "Khi nhận lại sách, quét mã bản sao sách tại Quầy trả. Hệ thống tự tính số ngày trễ hạn và cho phép ghi nhận mức hư hại (nếu có) trước khi hoàn tất.",
        placement: "bottom",
      },
      {
        id: "sc-4",
        route: "/books",
        targetSelector: `[data-tour="page-header"]`,
        title: "Bước 4: Tra cứu Kho Sách & Bản sao",
        content:
          "Dùng Kho sách & Tài liệu để kiểm tra nhanh số lượng bản sao sẵn sàng, vị trí kệ hoặc in lại mã vạch sách.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "staff-schedule",
    role: "all",
    title: "Nhiệm vụ 3: Lịch trực & Điểm danh GPS",
    subtitle: "Xem lịch trực cá nhân, check-in Geofence và theo dõi Nhật ký ngày",
    badgeLabel: "Chiến binh Đúng giờ",
    xp: 120,
    estimatedMinutes: 2,
    matchRoutes: ["/staff-schedules"],
    steps: [
      {
        id: "ss-1",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-my-shift"]`,
        title: "Bảng Điểm danh Ca của Tôi",
        content:
          "Ngay đầu trang Lịch trực, khung này hiển thị ca trực hôm nay của bạn kèm nút Check-in / Check-out GPS và bản đồ vùng hợp lệ.",
        placement: "bottom",
      },
      {
        id: "ss-2",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-filter-bar"]`,
        title: "Tìm nhanh & Lọc 'Ca của tôi'",
        content:
          "Gõ tên đồng nghiệp vào ô tìm kiếm hoặc bật nút 'Ca của tôi' để ẩn lịch người khác, tập trung vào ca trực của riêng bạn.",
        placement: "bottom",
      },
      {
        id: "ss-3",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-view-toggle"]`,
        title: "Chuyển Lưới Tuần ⟷ Nhật ký Ngày",
        content:
          "Khi xem trên điện thoại hoặc muốn nhìn gọn theo dòng thời gian, hãy chuyển sang chế độ 'Nhật ký ngày' thay cho lưới 7 cột.",
        placement: "left",
      },
    ],
  },
  {
    id: "staff-kiosk-ai",
    role: "staff",
    title: "Nhiệm vụ 4: Giám sát Cổng & Trợ lý AI",
    subtitle: "Theo dõi bạn đọc ra/vào realtime và tra cứu quy định bằng AI",
    badgeLabel: "Người gác cổng Thông minh",
    xp: 120,
    estimatedMinutes: 1,
    matchRoutes: ["/gate", "/active", "/ai-assistant"],
    steps: [
      {
        id: "sk-1",
        route: "/active",
        targetSelector: `[data-tour="page-header"]`,
        title: "Theo dõi Bạn đọc Đang có mặt",
        content:
          "Trang này liệt kê danh sách sinh viên/giảng viên hiện đang ở trong thư viện theo thời gian thực từ cổng kiểm soát khuôn mặt.",
        placement: "bottom",
      },
      {
        id: "sk-2",
        route: "/ai-assistant",
        targetSelector: `[data-tour="page-header"]`,
        title: "Hỏi Trợ lý AI Thư viện",
        content:
          "Cần tra cứu nhanh nội quy thư viện, quy trình xử lý mất sách hay số liệu thống kê? Hãy đặt câu hỏi trực tiếp cho Trợ lý AI!",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-users-face",
    role: "admin",
    permission: "admin:users",
    title: "Nhiệm vụ Admin 1: Nhân sự & Sinh trắc học",
    subtitle: "Quản lý tài khoản nhân viên/bạn đọc và đăng ký khuôn mặt đa góc",
    badgeLabel: "Chỉ huy Nhân sự",
    xp: 180,
    estimatedMinutes: 2,
    matchRoutes: ["/dashboard/admin", "/enroll"],
    steps: [
      {
        id: "au-1",
        route: "/dashboard/admin",
        targetSelector: `[data-tour="page-header"]`,
        title: "Quản trị Tài khoản & Vai trò",
        content:
          "Tại đây Admin tạo mới tài khoản Thủ thư/Sinh viên, khóa tài khoản vi phạm hoặc đặt lại mật khẩu.",
        placement: "bottom",
      },
      {
        id: "au-2",
        route: "/enroll",
        targetSelector: `[data-tour="page-header"]`,
        title: "Đăng ký Khuôn mặt Chuẩn xác",
        content:
          "Hướng dẫn chụp đủ các góc mặt để hệ thống Milvus trích xuất vector đặc trưng, phục vụ mở cổng Kiosk và xác thực mượn sách.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-rbac",
    role: "admin",
    permission: "admin:settings",
    title: "Nhiệm vụ Admin 2: Phân quyền Động (RBAC)",
    subtitle: "Tùy chỉnh quyền hạn chi tiết cho từng vai trò mà không cần sửa code",
    badgeLabel: "Kiến trúc sư Bảo mật",
    xp: 150,
    estimatedMinutes: 2,
    matchRoutes: ["/dynamic-admin"],
    steps: [
      {
        id: "ar-1",
        route: "/dynamic-admin",
        targetSelector: `[data-tour="page-header"]`,
        title: "Ma trận Phân quyền Động",
        content:
          "Tạo các vai trò tùy biến (vd: Thủ thư Kho, Cộng tác viên) và gán chính xác quyền đọc/tạo/sửa/xóa cho từng phân hệ như Lịch trực, Kho sách, Bạn đọc.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-schedule-ops",
    role: "admin",
    title: "Nhiệm vụ Admin 3: Điều phối Lịch tuần & Geofence",
    subtitle: "Sao chép lịch tuần trước, xếp lịch tự động và thiết lập vùng GPS",
    badgeLabel: "Bậc thầy Điều phối",
    xp: 200,
    estimatedMinutes: 2,
    matchRoutes: ["/staff-schedules"],
    steps: [
      {
        id: "aso-1",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-copy-week"]`,
        title: "Sao chép Lịch tuần trước (1-Click)",
        content:
          "Tiết kiệm 90% thời gian xếp lịch đầu tuần! Bấm nút này để nhân bản toàn bộ ca trực tuần trước sang tuần đang xem và tự động bỏ qua ca trùng.",
        placement: "bottom",
      },
      {
        id: "aso-2",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-date-jump"]`,
        title: "Nhảy nhanh tới Tuần bất kỳ",
        content:
          "Chọn một ngày trên lịch mini để nhảy thẳng tới tuần thi cử hoặc tuần lễ cần lập kế hoạch trước.",
        placement: "bottom",
      },
      {
        id: "aso-3",
        route: "/staff-schedules",
        targetSelector: `[data-tour="schedule-auto-btn"]`,
        title: "Gợi ý Lịch Tự động & Geofence",
        content:
          "Dùng nút Tia sáng (Gợi ý tự động) để hệ thống đề xuất phân công cân bằng giờ trực, và nút Bản đồ để cấu hình bán kính GPS cho từng khu vực.",
        placement: "bottom",
      },
    ],
  },
  {
    id: "admin-settings-rag",
    role: "admin",
    permission: "admin:settings",
    title: "Nhiệm vụ Admin 4: Cấu hình Hệ thống & Tri thức AI",
    subtitle: "Thiết lập biểu phí phạt, máy chủ Email SMTP và kho tài liệu RAG",
    badgeLabel: "Tổng quản Hệ thống",
    xp: 180,
    estimatedMinutes: 2,
    matchRoutes: ["/settings", "/knowledge-base"],
    steps: [
      {
        id: "asr-1",
        route: "/settings",
        targetSelector: `[data-tour="page-header"]`,
        title: "Tham số Nghiệp vụ & Biểu phí",
        content:
          "Điều chỉnh số sách mượn tối đa, biểu phí phạt theo bậc ngày trễ hạn, tỉ lệ đền bù hư hỏng và kiểm tra kết nối SMTP gửi email tự động.",
        placement: "bottom",
      },
      {
        id: "asr-2",
        route: "/knowledge-base",
        targetSelector: `[data-tour="page-header"]`,
        title: "Kho Tri thức RAG cho AI",
        content:
          "Tải lên hoặc cập nhật văn bản quy chế thư viện tại đây để Trợ lý AI trả lời chính xác cho cả sinh viên và thủ thư.",
        placement: "bottom",
      },
    ],
  },
];

export function getQuestsForUser(
  role?: string,
  canFn?: (resource: string, action: string) => boolean,
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

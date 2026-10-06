jest.unmock("@/lib/toast-context");

import React from "react";
import { render as rtlRender, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(dashboard)/settings/page";
import * as apiClient from "@/lib/api-client";
import { ToastProvider } from "@/lib/toast-context";

const render = (ui: React.ReactElement, options?: any) =>
  rtlRender(<ToastProvider>{ui}</ToastProvider>, options);

let mockSettingsVal: any;
let mockUserRole = "admin";

jest.mock("@/lib/api-client", () => {
  const mockObj = {
    getAdminSettings: jest.fn(() => Promise.resolve(mockSettingsVal)),
    updateAdminSettings: jest.fn(() => Promise.resolve([])),
    testSmtpConfig: jest.fn(() => Promise.resolve({ success: true, message: "OK" })),
  };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { role: mockUserRole, email: "admin@test.com" },
    isLoading: false,
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("antd/es/notification", () => ({
  useNotification: () => [
    { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    <div key="context" />,
  ],
}));

const mockApi = apiClient.api as any;

const sampleSettings = {
  borrow: [
    { id: "1", category: "borrow", config_key: "max_borrow_days", config_value: 14, label: "Số ngày mượn tối đa", description: "Thời gian mượn sách tối đa (ngày)", is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
    { id: "2", category: "borrow", config_key: "max_borrow_books", config_value: 3, label: "Số sách mượn tối đa", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
  ],
  fine: [
    { id: "3", category: "fine", config_key: "fine_per_day", config_value: 5000, label: "Phí phạt mỗi ngày", description: "Chi phí mỗi ngày quá hạn", is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
  ],
  smtp: [
    { id: "4", category: "smtp", config_key: "host", config_value: "smtp.gmail.com", label: "SMTP Host", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
    { id: "5", category: "smtp", config_key: "pass", config_value: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", label: "SMTP Password", description: null, is_encrypted: true, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
  ],
  automation: [],
  access: [],
};

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRole = "admin";
    mockSettingsVal = sampleSettings;
  });

  it("blocks non-admin users with a no-permission state", async () => {
    mockUserRole = "staff";
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Không có quyền truy cập")).toBeInTheDocument();
    });
    expect(screen.getByText(/Chỉ quản trị viên/i)).toBeInTheDocument();
    expect(mockApi.getAdminSettings).not.toHaveBeenCalled();
  });

  it("renders header and tabs", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Cài đặt hệ thống")).toBeInTheDocument();
    });
    expect(screen.getByText("Mượn trả")).toBeInTheDocument();
    expect(screen.getByText("Phí phạt")).toBeInTheDocument();
    expect(screen.getByText("Email SMTP")).toBeInTheDocument();
    expect(screen.getByText("Tác vụ tự động")).toBeInTheDocument();
    expect(screen.getByText("Ra vào")).toBeInTheDocument();
  });

  it("loads and displays settings for default tab", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(mockApi.getAdminSettings).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Số ngày mượn tối đa")).toBeInTheDocument();
    expect(screen.getByText("Số sách mượn tối đa")).toBeInTheDocument();
  });

  it("switches tabs and shows correct fields", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mượn trả")).toBeInTheDocument();
    });

    const fineTab = screen.getByText("Phí phạt");
    await userEvent.click(fineTab);

    await waitFor(() => {
      expect(screen.getByText("Phí phạt mỗi ngày")).toBeInTheDocument();
    });
  });

  it("renders damage fee objects as per-key fields and saves the merged object", async () => {
    mockSettingsVal = {
      borrow: [],
      fine: [
        { id: "10", category: "fine", config_key: "damage_fee_pct", config_value: { minor: 30, major: 70, lost: 100 }, label: "Tỉ lệ phí hư hỏng (%)", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
        { id: "11", category: "fine", config_key: "fallback_book_price", config_value: 100000, label: "Giá bìa mặc định", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
      ],
      smtp: [],
      automation: [],
      access: [],
    };
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mượn trả")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Phí phạt"));

    await waitFor(() => {
      expect(screen.getByText("Tỉ lệ phí hư hỏng (%)")).toBeInTheDocument();
    });
    const minorInput = screen.getByLabelText(/Hư nhẹ/) as HTMLInputElement;
    expect(minorInput.value).toBe("30");

    await userEvent.clear(minorInput);
    await userEvent.type(minorInput, "25");
    await userEvent.click(screen.getByText("Lưu thay đổi"));

    await waitFor(() => {
      expect(mockApi.updateAdminSettings).toHaveBeenCalledWith("fine", {
        damage_fee_pct: { minor: 25, major: 70, lost: 100 },
      });
    });
  });

  it("warns when per-slip cap exceeds the total borrow cap", async () => {
    mockSettingsVal = {
      borrow: [
        { id: "1", category: "borrow", config_key: "max_borrow_books", config_value: 3, label: "Số sách mượn tối đa", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
        { id: "2", category: "borrow", config_key: "max_borrow_books_per_slip", config_value: 5, label: "Số sách tối đa mỗi phiếu", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
      ],
      fine: [],
      smtp: [],
      automation: [],
      access: [],
    };
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/không bao giờ có tác dụng/i)).toBeInTheDocument();
    });
  });

  it("shows no warning when per-slip cap fits within the total cap", async () => {
    mockSettingsVal = {
      borrow: [
        { id: "1", category: "borrow", config_key: "max_borrow_books", config_value: 4, label: "Số sách mượn tối đa", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
        { id: "2", category: "borrow", config_key: "max_borrow_books_per_slip", config_value: 4, label: "Số sách tối đa mỗi phiếu", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
      ],
      fine: [],
      smtp: [],
      automation: [],
      access: [],
    };
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Số sách mượn tối đa")).toBeInTheDocument();
    });
    expect(screen.queryByText(/không bao giờ có tác dụng/i)).not.toBeInTheDocument();
  });

  it("calls updateAdminSettings on save", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("14")).toBeInTheDocument();
    });

    const targetInput = screen.getByDisplayValue("14");
    await userEvent.clear(targetInput);
    await userEvent.type(targetInput, "21");

    const saveBtn = screen.getByText("Lưu thay đổi");
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockApi.updateAdminSettings).toHaveBeenCalledWith("borrow", { max_borrow_days: 21 });
    });
  });

  it("renders bracket columns in logical order even when stored keys are reversed", async () => {
    mockSettingsVal = {
      borrow: [],
      fine: [
        { id: "20", category: "fine", config_key: "fine_brackets", config_value: [{ to: 7, from: 1, amount: 10000 }], label: "Biểu phí phạt theo bậc", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
      ],
      smtp: [],
      automation: [],
      access: [],
    };
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mượn trả")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Phí phạt"));

    await waitFor(() => {
      expect(screen.getByText("Biểu phí phạt theo bậc")).toBeInTheDocument();
    });
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.indexOf("Từ ngày")).toBeGreaterThanOrEqual(0);
    expect(headers.indexOf("Từ ngày")).toBeLessThan(headers.indexOf("Đến ngày"));
    expect(headers.indexOf("Đến ngày")).toBeLessThan(headers.indexOf("Số tiền (VNĐ)"));
  });

  it("blocks saving incomplete fine brackets with an error", async () => {
    mockSettingsVal = {
      borrow: [],
      fine: [
        { id: "20", category: "fine", config_key: "fine_brackets", config_value: [{ from: 1, to: 7, amount: 10000 }], label: "Biểu phí phạt theo bậc", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
      ],
      smtp: [],
      automation: [],
      access: [],
    };
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mượn trả")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Phí phạt"));
    await waitFor(() => {
      expect(screen.getByDisplayValue("10000")).toBeInTheDocument();
    });

    await userEvent.clear(screen.getByDisplayValue("10000"));
    await userEvent.click(screen.getByText("Lưu thay đổi"));

    await waitFor(() => {
      expect(screen.getByText(/"Số tiền" phải là số từ 0 trở lên/)).toBeInTheDocument();
    });
    expect(mockApi.updateAdminSettings).not.toHaveBeenCalled();
  });

  it("warns instead of sending a masked SMTP password for test email", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Email SMTP")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Email SMTP"));
    await userEvent.click(screen.getByText("Gửi email test"));

    const emailInput = screen.getByLabelText("Địa chỉ email nhận");
    await userEvent.type(emailInput, "a@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));

    await waitFor(() => {
      expect(screen.getByText(/nhập mật khẩu SMTP mới/i)).toBeInTheDocument();
    });
    expect(mockApi.testSmtpConfig).not.toHaveBeenCalled();
  });

  it("clamps negative damage object values to zero on save", async () => {
    mockSettingsVal = {
      borrow: [],
      fine: [
        { id: "10", category: "fine", config_key: "damage_fee_pct", config_value: { minor: 30, major: 70, lost: 100 }, label: "Tỉ lệ phí hư hỏng (%)", description: null, is_encrypted: false, updated_at: "2025-01-01T00:00:00Z", updated_by: null },
      ],
      smtp: [],
      automation: [],
      access: [],
    };
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Mượn trả")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Phí phạt"));
    await waitFor(() => {
      expect(screen.getByLabelText(/Hư nhẹ/)).toBeInTheDocument();
    });

    const minorInput = screen.getByLabelText(/Hư nhẹ/);
    fireEvent.change(minorInput, { target: { value: "-5" } });
    await userEvent.click(screen.getByText("Lưu thay đổi"));

    await waitFor(() => {
      expect(mockApi.updateAdminSettings).toHaveBeenCalledWith("fine", {
        damage_fee_pct: { minor: 0, major: 70, lost: 100 },
      });
    });
  });

  it("shows test email dialog for SMTP tab", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Email SMTP")).toBeInTheDocument();
    });

    const smtpTab = screen.getByText("Email SMTP");
    await userEvent.click(smtpTab);

    await waitFor(() => {
      expect(screen.getByText("SMTP Host")).toBeInTheDocument();
    });

    const testBtn = screen.getByText("Gửi email test");
    await userEvent.click(testBtn);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("Gửi")).toBeInTheDocument();
    });
  });

  it("shows empty state when no configs for a category", async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Tác vụ tự động")).toBeInTheDocument();
    });

    const autoTab = screen.getByText("Tác vụ tự động");
    await userEvent.click(autoTab);

    await waitFor(() => {
      expect(screen.getByText("Chưa có cài đặt")).toBeInTheDocument();
    });
  });

  it("shows error state when API fails", async () => {
    mockApi.getAdminSettings.mockRejectedValueOnce({
      response: { data: { detail: "Lỗi kết nối" } },
    });
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Lỗi kết nối")).toBeInTheDocument();
    });
    expect(screen.getByText("Thử lại")).toBeInTheDocument();
  });
});

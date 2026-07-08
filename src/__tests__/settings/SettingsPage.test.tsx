import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(dashboard)/settings/page";
import * as apiClient from "@/lib/api-client";

let mockSettingsVal: any;

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
    user: { role: "admin", email: "admin@test.com" },
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
    mockSettingsVal = sampleSettings;
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

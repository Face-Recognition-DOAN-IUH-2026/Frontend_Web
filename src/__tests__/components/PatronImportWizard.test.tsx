import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PatronImportWizard from "@/app/(dashboard)/_components/ui/PatronImportWizard";
import api from "@/lib/api-client";

// Mock api
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    downloadPatronTemplate: jest.fn(),
    previewPatronImport: jest.fn(),
    executePatronImport: jest.fn(),
  },
  getErrorMessage: (err: any) => err?.message || "Error",
}));

describe("PatronImportWizard", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders upload step initially and handles template download", async () => {
    (api.downloadPatronTemplate as jest.Mock).mockResolvedValueOnce(new Blob(["test"]));

    window.URL.createObjectURL = jest.fn(() => "blob:http://localhost/test");
    window.URL.revokeObjectURL = jest.fn();

    render(
      <PatronImportWizard
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Import Độc Giả Hàng Loạt Bằng Excel")).toBeInTheDocument();
    expect(screen.getByText("Tải file Excel mẫu (.xlsx)")).toBeInTheDocument();
    expect(screen.getByText(/Kéo thả file Excel vào đây/i)).toBeInTheDocument();

    const downloadBtn = screen.getByText("Tải file Excel mẫu (.xlsx)");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadPatronTemplate).toHaveBeenCalledTimes(1);
    });
  });

  it("handles preview and switches to preview step", async () => {
    const mockPreviewData = {
      total_rows: 2,
      summary: {
        new: 1,
        exists: 1,
        error: 0,
      },
      preview: [
        {
          row: 2,
          student_code: "20012345",
          full_name: "Nguyễn Văn A",
          class_name: "DHKTPM16A",
          course: "2020-2024",
          email: "20012345@library.local",
          phone: "0912345678",
          identity_number: "079201000001",
          membership_expiry: "2024-09-01T00:00:00.000Z",
          status: "new" as const,
          errors: [],
        },
        {
          row: 3,
          student_code: "20012346",
          full_name: "Trần Thị B",
          class_name: "DHKTPM16B",
          course: "2020-2024",
          email: "20012346@library.local",
          phone: "0912345679",
          identity_number: "079201000002",
          membership_expiry: "2024-09-01T00:00:00.000Z",
          status: "exists" as const,
          errors: ["Mã sinh viên đã tồn tại trong hệ thống"],
        },
      ],
    };

    (api.previewPatronImport as jest.Mock).mockResolvedValueOnce(mockPreviewData);

    render(
      <PatronImportWizard
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const file = new File(["dummy content"], "patrons.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for button to be enabled after file state update
    const previewBtn = screen.getByRole("button", { name: /Xem trước dữ liệu/i });
    await waitFor(() => {
      expect(previewBtn).not.toBeDisabled();
    });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(api.previewPatronImport).toHaveBeenCalledWith(file);
    });

    // Check preview step content
    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
      expect(screen.getByText("Trần Thị B")).toBeInTheDocument();
      expect(screen.getByText(/Mới: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Đã có sẵn: 1/i)).toBeInTheDocument();
    });

    // Verify mode toggle radio buttons exist
    expect(screen.getByText(/Bỏ qua \(Giữ nguyên độc giả cũ\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Cập nhật \(Lớp, Khóa học/i)).toBeInTheDocument();
  });

  it("executes import and renders execution report", async () => {
    const mockPreviewData = {
      total_rows: 1,
      summary: {
        new: 1,
        exists: 0,
        error: 0,
      },
      preview: [
        {
          row: 2,
          student_code: "20012345",
          full_name: "Nguyễn Văn A",
          class_name: "DHKTPM16A",
          course: "2020-2024",
          email: "20012345@library.local",
          phone: "0912345678",
          identity_number: "079201000001",
          membership_expiry: "2024-09-01T00:00:00.000Z",
          status: "new" as const,
          errors: [],
        },
      ],
    };

    const mockImportResponse = {
      total_rows: 1,
      imported: 1,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    (api.previewPatronImport as jest.Mock).mockResolvedValueOnce(mockPreviewData);
    (api.executePatronImport as jest.Mock).mockResolvedValueOnce(mockImportResponse);

    render(
      <PatronImportWizard
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const file = new File(["dummy"], "patrons.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for button to be enabled
    const previewBtn = screen.getByRole("button", { name: /Xem trước dữ liệu/i });
    await waitFor(() => {
      expect(previewBtn).not.toBeDisabled();
    });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    });

    const executeBtn = screen.getByRole("button", { name: /Xác nhận Import/i });
    await waitFor(() => {
      expect(executeBtn).not.toBeDisabled();
    });
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(api.executePatronImport).toHaveBeenCalledWith(file, "skip");
      expect(screen.getByText(/Hoàn tất quá trình import dữ liệu/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: /Đóng/i });
    fireEvent.click(closeBtn);
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

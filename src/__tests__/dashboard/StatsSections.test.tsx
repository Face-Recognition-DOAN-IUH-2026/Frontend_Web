import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FinanceSection from "@/app/(dashboard)/_components/stats/FinanceSection";
import InventorySection from "@/app/(dashboard)/_components/stats/InventorySection";
import RecognitionSection from "@/app/(dashboard)/_components/stats/RecognitionSection";
import api from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const mockObj = {
    getFinanceStats: jest.fn(),
    getInventoryStats: jest.fn(),
    getRecognitionStats: jest.fn(),
    getHourlyStats: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

describe("FinanceSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders finance stats with formatted currency and breakdown", async () => {
    (api.getFinanceStats as jest.Mock).mockResolvedValue({
      collected_total: 100000,
      by_method: { cash: 80000, qr: 20000 },
      outstanding_total: 40000,
      paid_count: 10,
      unpaid_count: 1,
      monthly: [
        { month: "2026-10", collected: 100000, outstanding_snapshot: 40000 },
      ],
    });

    render(<FinanceSection />);

    expect(screen.getByTestId("stat-section-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("stat-section-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText(/100\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40\.000/).length).toBeGreaterThan(0);
  });

  it("shows empty state when no finance records exist", async () => {
    (api.getFinanceStats as jest.Mock).mockResolvedValue({
      collected_total: 0,
      by_method: { cash: 0, qr: 0 },
      outstanding_total: 0,
      paid_count: 0,
      unpaid_count: 0,
      monthly: [],
    });

    render(<FinanceSection />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có dữ liệu tài chính/i)).toBeInTheDocument();
    });
  });

  it("shows error state with retry on failure", async () => {
    (api.getFinanceStats as jest.Mock).mockRejectedValueOnce(new Error("Lỗi mạng"));

    render(<FinanceSection />);

    await waitFor(() => {
      expect(screen.getByText(/Lỗi mạng/i)).toBeInTheDocument();
    });

    (api.getFinanceStats as jest.Mock).mockResolvedValueOnce({
      collected_total: 50000,
      by_method: { cash: 50000, qr: 0 },
      outstanding_total: 0,
      paid_count: 5,
      unpaid_count: 0,
      monthly: [],
    });

    fireEvent.click(screen.getByRole("button", { name: /Thử lại/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/50\.000/).length).toBeGreaterThan(0);
    });
  });
});

describe("InventorySection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders inventory stats, categories, and condition breakdowns", async () => {
    (api.getInventoryStats as jest.Mock).mockResolvedValue({
      books_total: 50,
      copies_total: 120,
      copies_by_status: { available: 80, borrowed: 30, maintenance: 5, disposed: 5 },
      copies_by_condition: { new: 20, good: 70, minor_damage: 15, major_damage: 10, lost: 5 },
      categories: [
        { name: "Công nghệ thông tin", count: 25 },
        { name: "Kinh tế", count: 15 },
      ],
      price_coverage: { priced: 40, unpriced: 10 },
      imports_last_30d: 12,
    });

    render(<InventorySection />);

    expect(screen.getByTestId("stat-section-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("stat-section-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("120").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Công nghệ thông tin/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kinh tế/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Đã định giá: 40/i).length).toBeGreaterThan(0);
  });

  it("shows empty state when no copies in library", async () => {
    (api.getInventoryStats as jest.Mock).mockResolvedValue({
      books_total: 0,
      copies_total: 0,
      copies_by_status: {},
      copies_by_condition: {},
      categories: [],
      price_coverage: { priced: 0, unpriced: 0 },
      imports_last_30d: 0,
    });

    render(<InventorySection />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có dữ liệu kho sách/i)).toBeInTheDocument();
    });
  });
});

describe("RecognitionSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders recognition stats, accuracy percentage and counts", async () => {
    (api.getRecognitionStats as jest.Mock).mockResolvedValue([
      { date: "2026-10-04", granted: 10, spoof: 1, no_match: 1, other: 0, accuracy: 0.833 },
      { date: "2026-10-05", granted: 20, spoof: 0, no_match: 2, other: 0, accuracy: 0.909 },
    ]);

    render(<RecognitionSection />);

    expect(screen.getByTestId("stat-section-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("stat-section-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Độ chính xác/i).length).toBeGreaterThan(0);
  });

  it("shows empty state when no recognition events", async () => {
    (api.getRecognitionStats as jest.Mock).mockResolvedValue([]);

    render(<RecognitionSection />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có dữ liệu nhận diện/i)).toBeInTheDocument();
    });
  });
});

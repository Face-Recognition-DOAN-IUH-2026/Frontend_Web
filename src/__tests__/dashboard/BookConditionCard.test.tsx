import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import BookConditionCard from "@/app/(dashboard)/_components/dashboard/BookConditionCard";
import { api } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const mockObj = { getConditionDistribution: jest.fn() };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

const mockedApi = api as unknown as { getConditionDistribution: jest.Mock };

describe("BookConditionCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders condition counts with total", async () => {
    mockedApi.getConditionDistribution.mockResolvedValue({
      conditions: { new: 10, good: 80, minor_damage: 5, major_damage: 3, lost: 2 },
      statuses: { available: 70, borrowed: 30 },
      total_copies: 100,
    });

    render(<BookConditionCard />);

    await waitFor(() => expect(screen.getByText("Tình trạng sách")).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText("100 bản sao").length).toBeGreaterThan(0));
    expect(screen.getByText("Bình thường")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("Hư nặng")).toBeInTheDocument();
    expect(screen.getByText("Thất lạc")).toBeInTheDocument();
  });

  it("shows an empty state when there are no copies", async () => {
    mockedApi.getConditionDistribution.mockResolvedValue({
      conditions: {},
      statuses: {},
      total_copies: 0,
    });

    render(<BookConditionCard />);

    await waitFor(() =>
      expect(screen.getByText(/Chưa có dữ liệu tình trạng sách/i)).toBeInTheDocument()
    );
  });
});

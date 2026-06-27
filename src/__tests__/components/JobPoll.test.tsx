import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobPoll from "@/components/job-poll";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const mockApi = {
    getTaskStatus: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockApi,
    api: mockApi,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

const mockApi = apiClient.api as jest.Mocked<typeof apiClient.api>;

describe("JobPoll Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders pending state with spinner", async () => {
    mockApi.getTaskStatus.mockResolvedValueOnce({
      task_id: "test-task",
      status: "PENDING",
      result: null,
    });

    render(<JobPoll jobId="test-task" />);

    expect(screen.getByText("Đang xử lý...")).toBeInTheDocument();
    expect(screen.getByText(/Job ID: test-task/)).toBeInTheDocument();
  });

  it("renders success state with verification result", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "test-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "test-task",
        status: "SUCCESS",
        result: {
          status: "success",
          verified: true,
          score: 0.9523,
        },
      });

    render(<JobPoll jobId="test-task" />);

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
    });
  });

  it("renders success with liveness result", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "liveness-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "liveness-task",
        status: "SUCCESS",
        result: {
          status: "success",
          is_live: true,
          liveness_score: 0.9876,
        },
      });

    render(<JobPoll jobId="liveness-task" />);

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
      expect(screen.getByText(/Khuôn mặt thật: Có/)).toBeInTheDocument();
    });
  });

  it("renders failure state with error message", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "fail-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "fail-task",
        status: "FAILURE",
        result: {
          error: "NO_FACE_DETECTED",
          type: "task_failure",
        } as any,
      });

    render(<JobPoll jobId="fail-task" />);

    await waitFor(() => {
      expect(screen.getByText("Lỗi")).toBeInTheDocument();
      expect(screen.getByText(/NO_FACE_DETECTED/)).toBeInTheDocument();
    });
  });

  it("calls onComplete callback on success", async () => {
    const onComplete = jest.fn();
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "callback-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "callback-task",
        status: "SUCCESS",
        result: { status: "success", is_live: true },
      });

    render(<JobPoll jobId="callback-task" onComplete={onComplete} />);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({ status: "success", is_live: true });
    });
  });

  it("calls onError callback on failure", async () => {
    const onError = jest.fn();
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "error-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "error-task",
        status: "FAILURE",
        result: { error: "LOW_QUALITY" } as any,
      });

    render(<JobPoll jobId="error-task" onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("LOW_QUALITY");
    });
  });

  it("handles NULL confidence edge case", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "null-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "null-task",
        status: "SUCCESS",
        result: {
          status: "success",
          is_live: undefined,
          score: 0,
        } as any,
      });

    render(<JobPoll jobId="null-task" />);

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
    });
  });

  it("handles empty result object", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "empty-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "empty-task",
        status: "SUCCESS",
        result: { status: "success" } as any,
      });

    render(<JobPoll jobId="empty-task" />);

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
    });
  });

  it("handles is_live false (spoof detected)", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "spoof-task",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "spoof-task",
        status: "SUCCESS",
        result: {
          status: "success",
          is_live: false,
          liveness_score: 0.1234,
        },
      });

    render(<JobPoll jobId="spoof-task" />);

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
      expect(screen.getByText(/Khuôn mặt thật: Không/)).toBeInTheDocument();
    });
  });
});
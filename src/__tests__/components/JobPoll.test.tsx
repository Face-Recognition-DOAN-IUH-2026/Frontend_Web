import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import JobPoll from "@/app/(dashboard)/_components/job-poll";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const listeners: Record<string, (event: any) => void> = {};
  const mockApi = {
    connectFaceResultSSE: jest.fn((onEvent: (event: any) => void, onConnectionChange?: (connected: boolean) => void) => {
      // Simulate SSE connection
      onConnectionChange?.(true);
      // Store event listener so tests can trigger it
      const key = `_listener_${Object.keys(listeners).length}`;
      listeners[key] = onEvent;
      return () => {
        delete listeners[key];
      };
    }),
  };
  return {
    __esModule: true,
    default: mockApi,
    api: mockApi,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

const mockApi = apiClient.api as jest.Mocked<typeof apiClient.api>;

// Helper to trigger SSE event to all listeners
function triggerSSEEvent(event: any) {
  // Access the listeners via the mock
  const call = mockApi.connectFaceResultSSE.mock.calls[0];
  if (call) {
    (call[0] as Function)(event);
  }
}

describe("JobPoll Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders pending state with spinner", async () => {
    render(<JobPoll jobId="test-task" />);

    expect(screen.getByText("Đang xử lý...")).toBeInTheDocument();
    expect(screen.getByText(/Job ID: test-task/)).toBeInTheDocument();
  });

  it("renders success state with verification result", async () => {
    render(<JobPoll jobId="test-task" />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "test-task",
      status: "SUCCESS",
      result: { status: "success", verified: true, score: 0.9523 },
    });

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
    });
  });

  it("renders success with liveness result", async () => {
    render(<JobPoll jobId="liveness-task" />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "liveness-task",
      status: "SUCCESS",
      result: { status: "success", is_live: true, liveness_score: 0.9876 },
    });

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
      expect(screen.getByText(/Khuôn mặt thật: Có/)).toBeInTheDocument();
    });
  });

  it("renders failure state with error message", async () => {
    render(<JobPoll jobId="fail-task" />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "fail-task",
      status: "FAILURE",
      result: { error: "NO_FACE_DETECTED", type: "task_failure" },
    });

    await waitFor(() => {
      expect(screen.getByText("Lỗi")).toBeInTheDocument();
      expect(screen.getByText(/NO_FACE_DETECTED/)).toBeInTheDocument();
    });
  });

  it("calls onComplete callback on success", async () => {
    const onComplete = jest.fn();
    render(<JobPoll jobId="callback-task" onComplete={onComplete} />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "callback-task",
      status: "SUCCESS",
      result: { status: "success", is_live: true },
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({ status: "success", is_live: true });
    });
  });

  it("calls onError callback on failure", async () => {
    const onError = jest.fn();
    render(<JobPoll jobId="error-task" onError={onError} />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "error-task",
      status: "FAILURE",
      result: { error: "LOW_QUALITY" },
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("LOW_QUALITY");
    });
  });

  it("handles NULL confidence edge case", async () => {
    render(<JobPoll jobId="null-task" />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "null-task",
      status: "SUCCESS",
      result: { status: "success", is_live: undefined, score: 0 },
    });

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
    });
  });

  it("handles empty result object", async () => {
    render(<JobPoll jobId="empty-task" />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "empty-task",
      status: "SUCCESS",
      result: { status: "success" },
    });

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
    });
  });

  it("handles is_live false (spoof detected)", async () => {
    render(<JobPoll jobId="spoof-task" />);

    triggerSSEEvent({
      event_type: "face_result",
      task_id: "spoof-task",
      status: "SUCCESS",
      result: { status: "success", is_live: false, liveness_score: 0.1234 },
    });

    await waitFor(() => {
      expect(screen.getByText("Thành công")).toBeInTheDocument();
      expect(screen.getByText(/Khuôn mặt thật: Không/)).toBeInTheDocument();
    });
  });
});

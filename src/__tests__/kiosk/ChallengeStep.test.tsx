import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChallengeStep from "@/app/(kiosk)/gate/_components/ChallengeStep";
import { api } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const mockObj = {
    kioskLivenessActive: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err: any) => err?.response?.data?.detail || err?.message || "Unknown error"),
  };
});

const mockedApi = api as unknown as { kioskLivenessActive: jest.Mock };

function makeFile(name: string): File {
  return new File(["frame-bytes"], name, { type: "image/jpeg" });
}

const baseProps = {
  studentCode: "SV001",
  patronId: "pat-1",
  captureFrame: jest.fn(async () => makeFile("f.jpg")),
  frameCount: 3,
  intervalMs: 1000,
  maxAttempts: 3,
  onLive: jest.fn(),
  onSpoof: jest.fn(),
  onDisabled: jest.fn(),
  onCancel: jest.fn(),
};

describe("ChallengeStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    baseProps.captureFrame = jest.fn(async () => makeFile("f.jpg"));
    baseProps.onLive = jest.fn();
    baseProps.onSpoof = jest.fn();
    baseProps.onDisabled = jest.fn();
    baseProps.onCancel = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function runCountdownAndCapture(extraMs = 6000) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(extraMs);
    });
  }

  it("shows a blink/turn instruction and calls live after a live verdict", async () => {
    mockedApi.kioskLivenessActive.mockResolvedValue({
      is_live: true,
      liveness_score: 0.7,
      verdict: "live",
      frames_evaluated: 3,
      detail: "ok",
    });

    render(<ChallengeStep {...baseProps} />);

    expect(screen.getByText(/Quay đầu|Gật đầu/)).toBeInTheDocument();

    await runCountdownAndCapture();

    await waitFor(() => expect(baseProps.onLive).toHaveBeenCalledTimes(1));
    expect(baseProps.captureFrame).toHaveBeenCalledTimes(3);
    expect(baseProps.onSpoof).not.toHaveBeenCalled();
    const frames = baseProps.onLive.mock.calls[0][0] as File[];
    expect(frames).toHaveLength(3);
  });

  it("reports spoof without calling live on a spoof verdict", async () => {
    mockedApi.kioskLivenessActive.mockResolvedValue({
      is_live: false,
      liveness_score: 0.2,
      verdict: "spoof",
      frames_evaluated: 3,
      detail: "spoof",
    });

    render(<ChallengeStep {...baseProps} />);

    await runCountdownAndCapture();

    await waitFor(() => expect(baseProps.onSpoof).toHaveBeenCalledTimes(1));
    expect(baseProps.onLive).not.toHaveBeenCalled();
  });

  it("retries on inconclusive and gives up as spoof after max attempts", async () => {
    mockedApi.kioskLivenessActive.mockResolvedValue({
      is_live: false,
      liveness_score: 0.5,
      verdict: "inconclusive",
      frames_evaluated: 3,
      detail: "unclear",
    });

    render(<ChallengeStep {...baseProps} maxAttempts={2} />);

    await runCountdownAndCapture(12000);

    await waitFor(() => expect(mockedApi.kioskLivenessActive).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(baseProps.onSpoof).toHaveBeenCalledTimes(1));
    expect(baseProps.onLive).not.toHaveBeenCalled();
  });

  it("calls onDisabled when the feature is turned off server-side", async () => {
    const err: any = new Error("disabled");
    err.response = { data: { detail: "Active liveness challenge is disabled" } };
    mockedApi.kioskLivenessActive.mockRejectedValue(err);

    render(<ChallengeStep {...baseProps} />);

    await runCountdownAndCapture();

    await waitFor(() => expect(baseProps.onDisabled).toHaveBeenCalledTimes(1));
    expect(baseProps.onLive).not.toHaveBeenCalled();
    expect(baseProps.onSpoof).not.toHaveBeenCalled();
  });

  it("shows a retry option on server error", async () => {
    mockedApi.kioskLivenessActive.mockRejectedValueOnce(new Error("boom"));
    mockedApi.kioskLivenessActive.mockResolvedValue({
      is_live: true,
      liveness_score: 0.8,
      verdict: "live",
      frames_evaluated: 3,
      detail: "ok",
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<ChallengeStep {...baseProps} />);

    await runCountdownAndCapture();

    await waitFor(() => expect(screen.getByRole("button", { name: /thử lại/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /thử lại/i }));
    await runCountdownAndCapture();

    await waitFor(() => expect(baseProps.onLive).toHaveBeenCalledTimes(1));
  });

  it("calls onCancel when the user cancels", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<ChallengeStep {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /hủy/i }));

    expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    expect(mockedApi.kioskLivenessActive).not.toHaveBeenCalled();
  });
});

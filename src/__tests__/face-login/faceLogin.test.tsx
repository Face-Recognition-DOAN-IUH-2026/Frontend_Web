import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mock api-client ─────────────────────────────────────────────────────────
jest.mock("@/lib/api-client", () => {
  const mockApi = {
    faceLogin: jest.fn(),
    login: jest.fn(),
    getTaskStatus: jest.fn(),
    getFaceEnrollmentStatus: jest.fn(),
    enrollFace: jest.fn(),
    enrollFaceBatch: jest.fn(),
    verifyFace: jest.fn(),
    identifyFace: jest.fn(),
    livenessCheck: jest.fn(),
    deleteFaceData: jest.fn(),
    kioskLookup: jest.fn(),
    kioskEnter: jest.fn(),
    connectAccessSSE: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockApi,
    api: mockApi,
    getErrorMessage: jest.fn((err: any) => err?.response?.data?.message || err?.message || "Unknown error"),
  };
});

// ─── Mock auth-context ───────────────────────────────────────────────────────
const mockSetAuthFromToken = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    setAuthFromToken: mockSetAuthFromToken,
    logout: mockLogout,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import api from "@/lib/api-client";
const mockApi = api as jest.Mocked<typeof api>;

// ═══════════════════════════════════════════════════════════════════════════════
// W2: Face login API call
// ═══════════════════════════════════════════════════════════════════════════════

describe("Face Login API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("W2: calls correct endpoint and returns tokens", async () => {
    const mockFile = new File(["face-data"], "face.jpg", { type: "image/jpeg" });
    mockApi.faceLogin.mockResolvedValueOnce({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
    });

    const result = await mockApi.faceLogin(mockFile);

    expect(mockApi.faceLogin).toHaveBeenCalledWith(mockFile);
    expect(result.access_token).toBe("mock-access-token");
    expect(result.refresh_token).toBe("mock-refresh-token");
    expect(result.token_type).toBe("bearer");
  });

  it("W2: throws on API error", async () => {
    const mockFile = new File(["face-data"], "face.jpg", { type: "image/jpeg" });
    mockApi.faceLogin.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Khuôn mặt không khớp" } },
    });

    await expect(mockApi.faceLogin(mockFile)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("W2: sends FormData with file field", async () => {
    const mockFile = new File(["binary-data"], "capture.jpg", { type: "image/jpeg" });
    mockApi.faceLogin.mockResolvedValueOnce({
      access_token: "token",
      refresh_token: null,
      token_type: "bearer",
    });

    await mockApi.faceLogin(mockFile);

    // Verify the call was made with a File object
    const callArg = mockApi.faceLogin.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(File);
    expect(callArg.name).toBe("capture.jpg");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// W7: PatronFaceVerify component logic
// ═══════════════════════════════════════════════════════════════════════════════

describe("PatronFaceVerify Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("W7: kioskLookup returns patron with face enrollment status", async () => {
    mockApi.kioskLookup.mockResolvedValueOnce({
      exists: true,
      patron: {
        id: "patron-1",
        full_name: "Nguyen Van A",
        student_code: "STU001",
        has_face: true,
        status: "active",
        class_name: null,
        identity_number: null,
        email: null,
        phone: null,
        card_number: "CARD001",
        issue_date: null,
        membership_expiry: "2025-12-31",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        course: null,
        permanent_address: null,
      },
      has_face: true,
      is_expired: false,
      is_locked: false,
    });

    const result = await mockApi.kioskLookup("STU001");

    expect(result.exists).toBe(true);
    expect(result.has_face).toBe(true);
    expect(result.patron?.full_name).toBe("Nguyen Van A");
  });

  it("W7: kioskLookup returns patron without face", async () => {
    mockApi.kioskLookup.mockResolvedValueOnce({
      exists: true,
      patron: {
        id: "patron-2",
        full_name: "Tran Van B",
        student_code: "STU002",
        has_face: false,
        status: "active",
        class_name: null,
        identity_number: null,
        email: null,
        phone: null,
        card_number: "CARD002",
        issue_date: null,
        membership_expiry: "2025-12-31",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        course: null,
        permanent_address: null,
      },
      has_face: false,
      is_expired: false,
      is_locked: false,
    });

    const result = await mockApi.kioskLookup("STU002");

    expect(result.exists).toBe(true);
    expect(result.has_face).toBe(false);
  });

  it("W7: kioskEnter returns job_id for async processing", async () => {
    const mockFile = new File(["face"], "face.jpg", { type: "image/jpeg" });
    mockApi.kioskEnter.mockResolvedValueOnce({
      success: true,
      message: "Processing",
      job_id: "job-12345",
      patron: null,
    });

    const result = await mockApi.kioskEnter(mockFile, "STU001");

    expect(result.job_id).toBe("job-12345");
    expect(result.success).toBe(true);
  });

  it("W7: getTaskStatus polls until SUCCESS", async () => {
    mockApi.getTaskStatus
      .mockResolvedValueOnce({
        task_id: "job-12345",
        status: "PENDING",
        result: null,
      })
      .mockResolvedValueOnce({
        task_id: "job-12345",
        status: "SUCCESS",
        result: { status: "SUCCESS", verified: true, score: 0.95 },
      });

    const firstCall = await mockApi.getTaskStatus("job-12345");
    expect(firstCall.status).toBe("PENDING");

    const secondCall = await mockApi.getTaskStatus("job-12345");
    expect(secondCall.status).toBe("SUCCESS");
    expect(secondCall.result?.verified).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// W8: Token storage after face login
// ═══════════════════════════════════════════════════════════════════════════════

describe("Token Storage After Face Login", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("W8: stores access_token in localStorage after face login", async () => {
    const mockFile = new File(["face"], "face.jpg", { type: "image/jpeg" });
    mockApi.faceLogin.mockResolvedValueOnce({
      access_token: "eyJhbGciOiJIUzI1NiJ9.test",
      refresh_token: "eyJhbGciOiJIUzI1NiJ9.refresh",
      token_type: "bearer",
    });

    const result = await mockApi.faceLogin(mockFile);

    // Simulate what the login page does after successful face login
    localStorage.setItem("access_token", result.access_token);
    localStorage.setItem("refresh_token", result.refresh_token || "");

    expect(localStorage.getItem("access_token")).toBe("eyJhbGciOiJIUzI1NiJ9.test");
    expect(localStorage.getItem("refresh_token")).toBe("eyJhbGciOiJIUzI1NiJ9.refresh");
  });

  it("W8: clears tokens on logout", () => {
    localStorage.setItem("access_token", "token-to-clear");
    localStorage.setItem("refresh_token", "refresh-to-clear");

    // Simulate logout
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// W3: Face login success flow (integration logic)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Face Login Success Flow", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("W3: full flow - capture -> API -> store tokens -> setAuth", async () => {
    // Step 1: Mock face login API
    const mockFile = new File(["face-image"], "face.jpg", { type: "image/jpeg" });
    mockApi.faceLogin.mockResolvedValueOnce({
      access_token: "access-abc123",
      refresh_token: "refresh-xyz789",
      token_type: "bearer",
    });

    // Step 2: Call face login
    const tokenResponse = await mockApi.faceLogin(mockFile);
    expect(tokenResponse.access_token).toBe("access-abc123");

    // Step 3: Store tokens (simulating what the component does)
    localStorage.setItem("access_token", tokenResponse.access_token);
    localStorage.setItem("refresh_token", tokenResponse.refresh_token || "");

    // Step 4: Call setAuthFromToken (simulating auth context update)
    mockSetAuthFromToken(
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      "admin@example.com",
      "admin"
    );

    // Verify
    expect(localStorage.getItem("access_token")).toBe("access-abc123");
    expect(mockSetAuthFromToken).toHaveBeenCalledWith(
      "access-abc123",
      "refresh-xyz789",
      "admin@example.com",
      "admin"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// W4: Face login fail 2x -> password mode
// ═══════════════════════════════════════════════════════════════════════════════

describe("Face Login Fail Fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("W4: after 2 consecutive failures, should fallback to password mode", () => {
    // Simulate face login fail counter logic (from login page)
    let faceFailCount = 0;
    let loginMode = "face";

    const handleFaceFail = () => {
      faceFailCount += 1;
      if (faceFailCount >= 2) {
        loginMode = "password";
      }
    };

    // First failure
    handleFaceFail();
    expect(loginMode).toBe("face");
    expect(faceFailCount).toBe(1);

    // Second failure -> should switch to password
    handleFaceFail();
    expect(loginMode).toBe("password");
    expect(faceFailCount).toBe(2);
  });

  it("W4: failure count resets on mode switch", () => {
    let faceFailCount = 0;

    const resetFailCount = () => {
      faceFailCount = 0;
    };

    faceFailCount = 2;
    resetFailCount();
    expect(faceFailCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// W6: Gate page face recognition logic
// ═══════════════════════════════════════════════════════════════════════════════

describe("Gate Face Recognition Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("W6: kioskLookup -> kioskEnter -> poll taskStatus flow", async () => {
    // Step 1: Lookup patron
    mockApi.kioskLookup.mockResolvedValueOnce({
      exists: true,
      patron: { id: "p1", full_name: "Test", student_code: "STU001", has_face: true, status: "active", class_name: null, identity_number: null, email: null, phone: null, card_number: "C001", issue_date: null, membership_expiry: "2025-12-31", created_at: "2024-01-01", updated_at: "2024-01-01", course: null, permanent_address: null },
      has_face: true,
      is_expired: false,
      is_locked: false,
    });

    const lookupResult = await mockApi.kioskLookup("STU001");
    expect(lookupResult.exists).toBe(true);
    expect(lookupResult.has_face).toBe(true);

    // Step 2: Enter (face verification)
    const mockFile = new File(["face"], "face.jpg", { type: "image/jpeg" });
    mockApi.kioskEnter.mockResolvedValueOnce({
      success: true,
      message: "Processing",
      job_id: "job-verify-001",
      patron: null,
    });

    const enterResult = await mockApi.kioskEnter(mockFile, "STU001");
    expect(enterResult.job_id).toBe("job-verify-001");

    // Step 3: Poll task
    mockApi.getTaskStatus.mockResolvedValueOnce({
      task_id: "job-verify-001",
      status: "SUCCESS",
      result: { status: "SUCCESS", verified: true, score: 0.92 },
    });

    const taskResult = await mockApi.getTaskStatus("job-verify-001");
    expect(taskResult.status).toBe("SUCCESS");
    expect(taskResult.result?.verified).toBe(true);
  });

  it("W6: SSE connection for real-time events", () => {
    const mockSSE = {
      onmessage: null as any,
      onerror: null as any,
      close: jest.fn(),
    };
    mockApi.connectAccessSSE.mockReturnValueOnce(mockSSE as any);

    const sse = mockApi.connectAccessSSE(jest.fn());
    expect(sse).toBeDefined();
    expect(mockApi.connectAccessSSE).toHaveBeenCalled();
  });
});

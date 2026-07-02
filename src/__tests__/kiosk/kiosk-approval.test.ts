import { api } from "@/lib/api-client";

jest.mock("axios", () => {
  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    default: {
      create: jest.fn(() => mockAxiosInstance),
    },
  };
});

describe("KIOSK-1 API methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createKioskApprovalRequest should call POST with correct payload", async () => {
    const axios = require("axios");
    axios.create().post.mockResolvedValue({
      data: { event_code: "A45", device_auth_token: "tok1", status: "pending", expires_at: "2026-07-02T12:00:00Z" },
    });

    const result = await api.createKioskApprovalRequest({
      device_id: "kiosk-1",
      patron_id: "patron-uuid",
      student_code: "SV001",
    });

    expect(axios.create().post).toHaveBeenCalledWith("/api/access/kiosk/approval-request", {
      device_id: "kiosk-1",
      patron_id: "patron-uuid",
      student_code: "SV001",
    });
    expect(result.event_code).toBe("A45");
  });

  it("getPendingApprovalRequests should call GET", async () => {
    const axios = require("axios");
    axios.create().get.mockResolvedValue({ data: [{ event_code: "A45", status: "pending" }] });

    const result = await api.getPendingApprovalRequests();
    expect(axios.create().get).toHaveBeenCalledWith("/api/access/kiosk/approval-requests/pending");
    expect(result[0].event_code).toBe("A45");
  });

  it("approveKioskRequest should call POST approve", async () => {
    const axios = require("axios");
    axios.create().post.mockResolvedValue({ data: { status: "approved", event_code: "A45" } });

    const result = await api.approveKioskRequest("A45", "staff-uuid");
    expect(axios.create().post).toHaveBeenCalledWith("/api/access/kiosk/approval-requests/A45/approve", { approved_by: "staff-uuid" });
    expect(result.status).toBe("approved");
  });

  it("rejectKioskRequest should call POST reject", async () => {
    const axios = require("axios");
    axios.create().post.mockResolvedValue({ data: { status: "rejected", event_code: "A45" } });

    const result = await api.rejectKioskRequest("A45", "staff-uuid", "Hình ảnh không rõ");
    expect(axios.create().post).toHaveBeenCalledWith("/api/access/kiosk/approval-requests/A45/reject", {
      approved_by: "staff-uuid",
      reason: "Hình ảnh không rõ",
    });
    expect(result.status).toBe("rejected");
  });

  it("getApprovalRequestStatus should call GET with code", async () => {
    const axios = require("axios");
    axios.create().get.mockResolvedValue({ data: { event_code: "A45", status: "pending" } });

    const result = await api.getApprovalRequestStatus("A45");
    expect(axios.create().get).toHaveBeenCalledWith("/api/access/kiosk/approval-requests/A45");
    expect(result.event_code).toBe("A45");
  });
});

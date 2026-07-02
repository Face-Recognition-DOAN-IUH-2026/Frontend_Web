import { api } from "@/lib/api-client";

// Mock axios at the module level so the ApiClient can be instantiated
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

describe("kioskPresence API method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should exist on api client", () => {
    expect(typeof api.kioskPresence).toBe("function");
  });

  it("should call POST /api/access/kiosk/presence with correct payload", async () => {
    const axios = require("axios");
    const mockResponse = { data: { current_status: "inside", message: "Đã ghi nhận" } };
    axios.create().post.mockResolvedValue(mockResponse);

    const result = await api.kioskPresence("patron-uuid", "SV001", "kiosk-1");

    expect(axios.create().post).toHaveBeenCalledWith(
      "/api/access/kiosk/presence",
      { patron_id: "patron-uuid", student_code: "SV001", device_id: "kiosk-1" }
    );
    expect(result.current_status).toBe("inside");
  });

  it("should propagate error when API fails", async () => {
    const axios = require("axios");
    axios.create().post.mockRejectedValue(new Error("Network error"));

    await expect(api.kioskPresence("patron-uuid", "SV001", "kiosk-1")).rejects.toThrow("Network error");
  });
});

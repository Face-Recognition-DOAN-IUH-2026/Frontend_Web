import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { bus } from "@/lib/event-bus";

const mockLogin = jest.fn();
const mockFaceLogin = jest.fn();
const mockRetry = jest.fn();
const mockCancel = jest.fn();
const mockLogout = jest.fn();

jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    login: (...args: any[]) => mockLogin(...args),
    faceLogin: (...args: any[]) => mockFaceLogin(...args),
    client: {
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    },
  },
  api: {
    login: (...args: any[]) => mockLogin(...args),
    faceLogin: (...args: any[]) => mockFaceLogin(...args),
    client: {
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    },
  },
  retryPendingRequests: (...args: any[]) => mockRetry(...args),
  cancelPendingRequests: (...args: any[]) => mockCancel(...args),
  getErrorMessage: jest.fn((err: any) => err?.message || "Unknown error"),
}));

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", email: "admin@test.com", role: "admin" },
    logout: (...args: any[]) => mockLogout(...args),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ReauthOverlay from "@/app/_components/ReauthOverlay";

function emitAuthRequired() {
  act(() => { bus.emit("auth:required"); });
}

describe("ReauthOverlay", () => {
  beforeEach(() => {
    bus["listeners"] = {};
    jest.clearAllMocks();
  });

  it("should not render when auth:required has not been emitted", () => {
    const { container } = render(<ReauthOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("should render blurred overlay when auth:required event is emitted", async () => {
    render(<ReauthOverlay />);
    emitAuthRequired();
    await waitFor(() => {
      expect(screen.getByText(/phiên đăng nhập hết hạn/i)).toBeInTheDocument();
    });
  });

  it("should show the user email in password mode", async () => {
    render(<ReauthOverlay />);
    emitAuthRequired();
    await waitFor(() => {
      expect(screen.getByDisplayValue("admin@test.com")).toBeInTheDocument();
    });
  });

  it("should call retryPendingRequests on successful re-login", async () => {
    mockLogin.mockResolvedValue({ access_token: "new-token", refresh_token: "new-refresh" });

    render(<ReauthOverlay />);
    emitAuthRequired();

    await waitFor(() => {
      expect(screen.getByText(/phiên đăng nhập hết hạn/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/mật khẩu/i);
    await userEvent.type(passwordInput, "newpass123");

    const loginButton = screen.getByRole("button", { name: /^đăng nhập$/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalledWith("new-token");
    });
  });

  it("should call cancelPendingRequests on close", async () => {
    render(<ReauthOverlay />);
    emitAuthRequired();

    await waitFor(() => {
      expect(screen.getByText(/phiên đăng nhập hết hạn/i)).toBeInTheDocument();
    });

    act(() => { bus.emit("auth:cancelled"); });

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  it("should show error on failed re-login", async () => {
    mockLogin.mockRejectedValue({ response: { data: { detail: "Sai mật khẩu" } } });

    render(<ReauthOverlay />);
    emitAuthRequired();

    await waitFor(() => {
      expect(screen.getByText(/phiên đăng nhập hết hạn/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/mật khẩu/i);
    await userEvent.type(passwordInput, "wrongpass");

    const loginButton = screen.getByRole("button", { name: /^đăng nhập$/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/sai mật khẩu/i)).toBeInTheDocument();
    });
  });

  it("should have a face login button", async () => {
    render(<ReauthOverlay />);
    emitAuthRequired();

    await waitFor(() => {
      expect(screen.getByText(/đăng nhập bằng khuôn mặt/i)).toBeInTheDocument();
    });
  });

  it("should have a logout button", async () => {
    render(<ReauthOverlay />);
    emitAuthRequired();

    await waitFor(() => {
      expect(screen.getByText(/đăng xuất/i)).toBeInTheDocument();
    });
  });
});

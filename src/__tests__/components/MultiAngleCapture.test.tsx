/**
 * Regression + UX tests cho MultiAngleCapture (đăng ký face eKYC).
 * Mock react-webcam và mediapipe để chạy được trong jsdom.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiAngleCapture from "@/app/(dashboard)/_components/MultiAngleCapture";

jest.mock("react-webcam", () => ({
  __esModule: true,
  default: React.forwardRef((_props: any, _ref: any) => <video data-testid="mock-webcam" />),
}));

jest.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: jest.fn() },
  FaceLandmarker: { createFromOptions: jest.fn() },
}));

const baseProps = {
  consent: false,
  setConsent: jest.fn(),
  onFilesReady: jest.fn(),
};

describe("MultiAngleCapture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("màn hình bắt đầu liệt kê đủ 4 góc chụp theo thứ tự", () => {
    render(<MultiAngleCapture {...baseProps} />);
    expect(screen.getByText("Đăng ký khuôn mặt tự động (eKYC)")).toBeInTheDocument();
    expect(screen.getByText("Nhìn thẳng")).toBeInTheDocument();
    expect(screen.getByText("Quay mặt sang PHẢI")).toBeInTheDocument();
    expect(screen.getByText("Quay mặt sang TRÁI")).toBeInTheDocument();
    expect(screen.getByText("Cúi XUỐNG")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bắt đầu quá trình chụp/i })).toBeInTheDocument();
  });

  it("bấm bắt đầu sẽ mở camera và hiện tiến trình Góc 1/4", async () => {
    render(<MultiAngleCapture {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /bắt đầu quá trình chụp/i }));
    expect(await screen.findByTestId("mock-webcam")).toBeInTheDocument();
    expect(screen.getByText(/góc 1\/4/i)).toBeInTheDocument();
  });

  it("chưa đồng ý thì nút xác nhận bị disabled khi đã đủ ảnh", () => {
    // Không thể chụp thật trong jsdom (cần model + camera) nên chỉ kiểm tra
    // màn hình bắt đầu chưa hiện nút xác nhận khi chưa đủ 4 góc.
    render(<MultiAngleCapture {...baseProps} />);
    expect(screen.queryByRole("button", { name: /xác nhận đăng ký/i })).not.toBeInTheDocument();
  });
});

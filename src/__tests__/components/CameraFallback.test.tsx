import { fireEvent, render, screen } from "@testing-library/react";
import CameraFallback from "@/app/_components/CameraFallback";

describe("CameraFallback", () => {
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows camera disconnected message when lastFrameUrl is provided", () => {
    render(<CameraFallback lastFrameUrl="data:image/jpeg;base64,test" onRetry={onRetry} />);
    expect(screen.getByText("Camera đã ngắt kết nối")).toBeInTheDocument();
  });

  it("shows cannot start camera message when no lastFrameUrl", () => {
    render(<CameraFallback onRetry={onRetry} />);
    expect(screen.getByText("Không thể khởi động camera")).toBeInTheDocument();
  });

  it("shows retry button and calls onRetry on click", () => {
    render(<CameraFallback onRetry={onRetry} />);
    const retryBtn = screen.getByText("Thử lại camera");
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows manual input when showManualInput is true", () => {
    render(<CameraFallback onRetry={onRetry} showManualInput />);
    expect(screen.getByPlaceholderText("Nhập tại đây...")).toBeInTheDocument();
  });

  it("calls onManualSubmit when manual input form is submitted", () => {
    const onManualSubmit = jest.fn();
    render(<CameraFallback onRetry={onRetry} showManualInput onManualSubmit={onManualSubmit} />);
    const input = screen.getByPlaceholderText("Nhập tại đây...");
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.submit(input.closest("form")!);
    expect(onManualSubmit).toHaveBeenCalledWith("test@example.com");
  });

  it("shows file upload button when showFileUpload is true", () => {
    render(<CameraFallback onRetry={onRetry} showFileUpload />);
    expect(screen.getByText("Tải ảnh lên")).toBeInTheDocument();
  });

  it("calls onFileUpload when a file is selected", () => {
    const onFileUpload = jest.fn();
    render(<CameraFallback onRetry={onRetry} showFileUpload onFileUpload={onFileUpload} />);
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByTestId("file-input");
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onFileUpload).toHaveBeenCalledWith(file);
  });

  it("does not show manual input or file upload by default", () => {
    render(<CameraFallback onRetry={onRetry} />);
    expect(screen.queryByText("Nhập thông tin thủ công")).not.toBeInTheDocument();
    expect(screen.queryByText("Tải ảnh lên")).not.toBeInTheDocument();
  });
});

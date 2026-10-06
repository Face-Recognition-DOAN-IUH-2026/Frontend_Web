jest.unmock("@/lib/toast-context");

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/lib/toast-context";

function Trigger() {
  const { toast } = useToast();
  return (
    <>
      <button onClick={() => toast("Đăng ký khuôn mặt thành công", "success")}>ok</button>
      <button onClick={() => toast("Đăng ký thất bại", "error")}>fail</button>
      <button onClick={() => toast.success("Thao tác thành công helper")}>helper-ok</button>
      <button onClick={() => toast.error("Thao tác lỗi helper")}>helper-err</button>
      <button onClick={() => toast("warning", "Cảnh báo đổi vị trí tham số")}>swap-args</button>
    </>
  );
}

describe("ToastProvider (global top-right toast)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("hiển thị thông báo ở góc phải trên khi gọi toast()", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("ok"));
    expect(screen.getByText("Đăng ký khuôn mặt thành công")).toBeInTheDocument();
  });

  it("hỗ trợ các helper methods toast.success và toast.error", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("helper-ok"));
    expect(screen.getByText("Thao tác thành công helper")).toBeInTheDocument();

    fireEvent.click(screen.getByText("helper-err"));
    expect(screen.getByText("Thao tác lỗi helper")).toBeInTheDocument();
  });

  it("auto-detect và tự đảo thứ tự tham số nếu gọi toast(severity, message)", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("swap-args"));
    expect(screen.getByText("Cảnh báo đổi vị trí tham số")).toBeInTheDocument();
  });

  it("toast lỗi tự đóng sau một thời gian và có thể đóng tay", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("fail"));
    expect(screen.getByText("Đăng ký thất bại")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(7000);
    });
    // Chờ nốt transition exit của Snackbar
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("Đăng ký thất bại")).not.toBeInTheDocument();
  });

  it("ném lỗi rõ ràng khi dùng useToast ngoài Provider", () => {
    const Bad = () => {
      useToast();
      return null;
    };
    expect(() => render(<Bad />)).toThrow(/ToastProvider/i);
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MobileAppDownload from "@/app/_components/landing/MobileAppDownload";
import { MOBILE_APP } from "@/lib/mobileApp";

describe("MobileAppDownload", () => {
  it("trỏ nút tải tới file APK trên GitHub Release", () => {
    render(<MobileAppDownload />);

    const link = screen.getByRole("link", { name: /Tải APK về máy/i });
    expect(link).toHaveAttribute("href", MOBILE_APP.apkUrl);
    expect(MOBILE_APP.apkUrl).toContain("/releases/latest/download/");
  });

  it("render mã QR có nhãn truy cập được", () => {
    const { container } = render(<MobileAppDownload />);

    const qr = screen.getByRole("img", { name: /Mã QR tải ứng dụng/i });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it("hiển thị phiên bản, dung lượng và yêu cầu Android", () => {
    render(<MobileAppDownload />);

    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/197 MB/)).toBeInTheDocument();
    expect(screen.getByText(/Android 7\.0\+/)).toBeInTheDocument();
  });

  it("có liên kết tới danh sách phiên bản", () => {
    render(<MobileAppDownload />);

    const link = screen.getByRole("link", { name: /Xem tất cả phiên bản/i });
    expect(link).toHaveAttribute("href", MOBILE_APP.releasesUrl);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("cảnh báo APK không mở được trực tiếp trong trình duyệt", () => {
    render(<MobileAppDownload />);

    expect(
      screen.getByText(/không mở xem được trong trình duyệt/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tải về/i)).toBeInTheDocument();
  });

  it("mở hộp thoại hướng dẫn cài đặt kèm 4 bước", () => {
    render(<MobileAppDownload />);

    expect(screen.queryByText(/Cài đặt ứng dụng trên Android/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Hướng dẫn cài đặt/i }));

    expect(
      screen.getByRole("dialog", { name: /Cài đặt ứng dụng trên Android/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tải file về máy/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Mở thư mục Tải về — đừng bấm file trong trình duyệt/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cài đặt từ nguồn không xác định \(chỉ làm một lần\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cài đặt và mở ứng dụng/i)).toBeInTheDocument();
  });

  it("giải thích rõ lỗi định dạng không hỗ trợ là hành vi bình thường", () => {
    render(<MobileAppDownload />);

    fireEvent.click(screen.getByRole("button", { name: /Hướng dẫn cài đặt/i }));

    // Cụm từ này xuất hiện ở cả Alert của hộp thoại và bước 2
    expect(
      screen.getAllByText(/Định dạng tệp tin không được hỗ trợ/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/hành vi bình thường, không phải lỗi tải/i)).toBeInTheDocument();
  });

  it("đóng hộp thoại hướng dẫn khi bấm Đã hiểu", async () => {
    render(<MobileAppDownload />);

    fireEvent.click(screen.getByRole("button", { name: /Hướng dẫn cài đặt/i }));
    expect(
      screen.getByRole("dialog", { name: /Cài đặt ứng dụng trên Android/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Đã hiểu/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Cài đặt ứng dụng trên Android/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("có id tai-app để nút trên thanh điều hướng nhảy đúng chỗ", () => {
    const { container } = render(<MobileAppDownload />);

    expect(container.querySelector("section#tai-app")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Thư Viện IUH Trong Tầm Tay Bạn" }),
    ).toBeInTheDocument();
  });
});

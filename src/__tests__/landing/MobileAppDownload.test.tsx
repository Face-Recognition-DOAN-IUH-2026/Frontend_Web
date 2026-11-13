import React from "react";
import { render, screen } from "@testing-library/react";
import MobileAppDownload from "@/app/_components/landing/MobileAppDownload";
import { MOBILE_APP } from "@/lib/mobileApp";

describe("MobileAppDownload", () => {
  it("trỏ nút tải tới file APK trên GitHub Release", () => {
    render(<MobileAppDownload />);

    const link = screen.getByRole("link", { name: /Tải APK cho Android/i });
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

  it("có id tai-app để nút trên thanh điều hướng nhảy đúng chỗ", () => {
    const { container } = render(<MobileAppDownload />);

    expect(container.querySelector("section#tai-app")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Thư Viện IUH Trong Tầm Tay Bạn" }),
    ).toBeInTheDocument();
  });
});

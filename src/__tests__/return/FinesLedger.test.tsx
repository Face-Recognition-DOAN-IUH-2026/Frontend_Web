import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinesLedger from "@/app/(dashboard)/_components/return/FinesLedger";

jest.mock("@/lib/permission-context", () => ({
  usePermission: () => ({ can: () => true }),
  getPermissionDeniedReason: () => "",
}));

const items = [
  {
    record_id: "rec-1",
    patron: { id: "pat-1", full_name: "Nguyen Van A", student_code: "SV001" },
    book: { title: "Clean Code", isbn: "9780132350884" },
    barcode: "LIB-9780132350884-001",
    overdue_fine: 20000,
    damage_fee: 0,
    total: 20000,
    return_at: "2026-10-01T00:00:00.000Z",
  },
];

const baseProps = {
  items,
  payingFineId: null as string | null,
  canUpdateBorrow: true,
  onRefresh: jest.fn(),
  onPayCash: jest.fn(),
  onOpenQr: jest.fn(),
};

describe("FinesLedger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders unpaid rows with totals", () => {
    render(<FinesLedger {...baseProps} />);

    expect(screen.getByText("Khoản phí chưa thu (Sổ nợ)")).toBeInTheDocument();
    expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getAllByText("20.000 đ").length).toBeGreaterThan(0);
  });

  it("shows an empty state when there is no debt", () => {
    render(<FinesLedger {...baseProps} items={[]} />);

    expect(screen.getByText(/Hiện không có khoản phí/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thu phí" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before collecting cash", async () => {
    const user = userEvent.setup();
    const onPayCash = jest.fn();
    render(<FinesLedger {...baseProps} onPayCash={onPayCash} />);

    await user.click(screen.getByRole("button", { name: "Thu phí" }));
    await user.click(screen.getByRole("menuitem", { name: "Tiền mặt" }));

    expect(screen.getByText("Xác nhận thu phí")).toBeInTheDocument();
    expect(screen.getByText(/Thu 20\.000 đ tiền mặt cho Nguyen Van A \(SV001\)/)).toBeInTheDocument();
    expect(onPayCash).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Thu phí" }));

    expect(onPayCash).toHaveBeenCalledWith("rec-1");
  });

  it("opens the VietQR flow directly without a confirm step", async () => {
    const user = userEvent.setup();
    const onOpenQr = jest.fn();
    render(<FinesLedger {...baseProps} onOpenQr={onOpenQr} />);

    await user.click(screen.getByRole("button", { name: "Thu phí" }));
    await user.click(screen.getByRole("menuitem", { name: /Mã VietQR/ }));

    expect(onOpenQr).toHaveBeenCalledWith(items[0]);
  });

  it("disables the action when the user lacks permission", () => {
    render(<FinesLedger {...baseProps} canUpdateBorrow={false} />);

    expect(screen.getByRole("button", { name: "Thu phí" })).toBeDisabled();
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BorrowSlipReceipt, { toSlipReceiptItems } from "@/app/(dashboard)/_components/borrow/BorrowSlipReceipt";

const items = [
  { title: "Fantastic Mr. Fox", barcode: "LIB-9780140328721-001", author: "Roald Dahl" },
  { title: "Clean Code", barcode: "LIB-9780132350884-001", author: "Robert C. Martin" },
];

const baseProps = {
  open: true,
  patronName: "Nguyen Van A",
  patronCode: "SV001",
  borrowDateStr: "05/10/2026",
  dueDateStr: "19/10/2026",
  items,
  onClose: jest.fn(),
};

describe("BorrowSlipReceipt", () => {
  it("renders the slip header, patron, dates and numbered book rows", () => {
    render(<BorrowSlipReceipt {...baseProps} />);

    expect(screen.getByText(/PHIẾU MƯỢN SÁCH/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyen Van A/)).toBeInTheDocument();
    expect(screen.getByText(/SV001/)).toBeInTheDocument();
    expect(screen.getByText("05/10/2026")).toBeInTheDocument();
    expect(screen.getByText("19/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Fantastic Mr. Fox")).toBeInTheDocument();
    expect(screen.getByText("LIB-9780140328721-001")).toBeInTheDocument();
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText(/2 cuốn/)).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<BorrowSlipReceipt {...baseProps} open={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("calls window.print when the print button is clicked", () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
    render(<BorrowSlipReceipt {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: /in phiếu/i }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("closes via the close button", () => {
    const onClose = jest.fn();
    render(<BorrowSlipReceipt {...baseProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("toSlipReceiptItems", () => {
  it("maps scanned dialog items to receipt rows preferring copy barcode", () => {
    expect(
      toSlipReceiptItems([
        { book: { title: "A", author: "Au A" }, barcode: "9780000000001", copy_barcode: "LIB-9780000000001-001" },
        { book: null, barcode: "9780000000002" },
      ])
    ).toEqual([
      { title: "A", barcode: "LIB-9780000000001-001", author: "Au A" },
      { title: "9780000000002", barcode: "9780000000002", author: null },
    ]);
  });
});

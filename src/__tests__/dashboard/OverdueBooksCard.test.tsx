import React from "react";
import { render, screen } from "@testing-library/react";
import OverdueBooksCard from "@/app/(dashboard)/_components/dashboard/OverdueBooksCard";
import type { BorrowRecord } from "@/lib/types";

const DAY = 86400000;
const HOUR = 3600000;
const now = Date.now();

const borrows = [
  {
    id: "r1",
    patron_id: "p1",
    book_id: "b1",
    due_at: new Date(now - 5 * DAY - HOUR).toISOString(),
    status: "borrowed",
    book: { title: "Late Book A" },
    copy: { barcode: "LIB-A-001" },
  },
  {
    id: "r2",
    patron_id: "p2",
    book_id: "b2",
    due_at: new Date(now + 5 * DAY).toISOString(),
    status: "borrowed",
    book: { title: "Ontime Book" },
    copy: { barcode: "LIB-B-001" },
  },
  {
    id: "r3",
    patron_id: "p3",
    book_id: "b3",
    due_at: new Date(now - 12 * DAY - HOUR).toISOString(),
    status: "borrowed",
    book: { title: "Late Book B" },
    copy: null,
  },
] as unknown as BorrowRecord[];

describe("OverdueBooksCard", () => {
  it("lists only overdue borrows sorted by most overdue days", () => {
    render(<OverdueBooksCard borrows={borrows} />);

    expect(screen.getByText("Sách quá hạn")).toBeInTheDocument();
    expect(screen.getByText("Late Book A")).toBeInTheDocument();
    expect(screen.getByText("Late Book B")).toBeInTheDocument();
    expect(screen.queryByText("Ontime Book")).not.toBeInTheDocument();
    expect(screen.getByText(/quá hạn 13 ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/quá hạn 6 ngày/i)).toBeInTheDocument();

    const rows = screen.getAllByText(/quá hạn \d+ ngày/i);
    expect(rows[0]).toHaveTextContent("13 ngày");
  });

  it("shows an empty state when nothing is overdue", () => {
    render(<OverdueBooksCard borrows={[borrows[1]]} />);

    expect(screen.getByText(/Không có sách quá hạn/i)).toBeInTheDocument();
  });

  it("links to the return page", () => {
    render(<OverdueBooksCard borrows={borrows} />);

    expect(screen.getByRole("link", { name: /trả sách/i })).toHaveAttribute("href", "/return");
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookLocationCard from "@/app/(dashboard)/_components/AIWidget/cards/BookLocationCard";

const baseData = {
  title: "Test Book",
  author: "Test Author",
  isbn: "978-0-1234-5678-9",
  categories: "Fiction",
  source: "database" as const,
  shelf_location: "A1-3-5",
};

describe("BookLocationCard", () => {
  it("renders title and author", () => {
    render(<BookLocationCard data={baseData} />);
    expect(screen.getByText("Test Book")).toBeInTheDocument();
    expect(screen.getByText("Tác giả: Test Author")).toBeInTheDocument();
  });

  it("renders ISBN and categories chips", () => {
    render(<BookLocationCard data={baseData} />);
    expect(screen.getByText("ISBN: 978-0-1234-5678-9")).toBeInTheDocument();
    expect(screen.getByText("Fiction")).toBeInTheDocument();
  });

  it("shows 'Trong thư viện' for database source", () => {
    render(<BookLocationCard data={baseData} />);
    expect(screen.getByText("Trong thư viện")).toBeInTheDocument();
  });

  it("shows 'Google Books' for google_books source", () => {
    render(
      <BookLocationCard data={{ ...baseData, source: "google_books", shelf_location: undefined }} />
    );
    expect(screen.getByText("Google Books")).toBeInTheDocument();
  });

  it("renders shelf_location with Vị trí label", () => {
    render(<BookLocationCard data={baseData} />);
    expect(screen.getByText("A1-3-5")).toBeInTheDocument();
    expect(screen.getByText(/Vị trí:/)).toBeInTheDocument();
  });

  it("shows floor chip when shelf_location starts with a floor code", () => {
    render(<BookLocationCard data={baseData} />);
    expect(screen.getByText("Tầng A1")).toBeInTheDocument();
  });

  it("does not render shelf section when shelf_location is empty", () => {
    render(<BookLocationCard data={{ ...baseData, shelf_location: undefined }} />);
    expect(screen.queryByText("Vị trí:")).not.toBeInTheDocument();
  });

  it("map button is disabled when no shelf_location", () => {
    render(<BookLocationCard data={{ ...baseData, shelf_location: undefined }} />);
    expect(screen.getByRole("button", { name: /xem trên bản đồ/i })).toBeDisabled();
  });

  it("map button is disabled when shelf_location has no digit floor prefix", () => {
    render(<BookLocationCard data={{ ...baseData, shelf_location: "NoDigit" }} />);
    expect(screen.getByRole("button", { name: /xem trên bản đồ/i })).toBeDisabled();
  });

  it("map button is enabled when shelf_location has floor prefix", () => {
    render(<BookLocationCard data={baseData} />);
    expect(screen.getByRole("button", { name: /xem trên bản đồ/i })).toBeEnabled();
  });

  it("opens dialog with title and shelf location on map button click", () => {
    render(<BookLocationCard data={baseData} />);
    fireEvent.click(screen.getByRole("button", { name: /xem trên bản đồ/i }));
    expect(screen.getByText("Test Book — Tầng A1")).toBeInTheDocument();
    expect(screen.getByText(/Bản đồ tầng đang được tải/)).toBeInTheDocument();
  });

  it("closes dialog when close icon is clicked", async () => {
    render(<BookLocationCard data={baseData} />);
    fireEvent.click(screen.getByRole("button", { name: /xem trên bản đồ/i }));
    expect(screen.getByText("Test Book — Tầng A1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("CloseIcon"));
    await waitFor(() => {
      expect(screen.queryByText("Test Book — Tầng A1")).not.toBeInTheDocument();
    });
  });

  it("renders without author, isbn, categories gracefully", () => {
    render(<BookLocationCard data={{ title: "Minimal", source: "not_found" }} />);
    expect(screen.getByText("Minimal")).toBeInTheDocument();
  });
});

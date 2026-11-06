import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { api } from '@/lib/api-client';
import { BorrowStepScanBooks } from '@/app/(dashboard)/_components/borrow/BorrowStepScanBooks';

jest.mock('@/lib/api-client', () => ({
  api: { quickSearchCopies: jest.fn() },
}));

const baseProps = {
  manualIsbn: "",
  setManualIsbn: jest.fn(),
  isLookingUpBook: false,
  cartItems: [] as any[],
  remaining: 3,
  handleAddBookToCart: jest.fn(),
  handleRemoveFromCart: jest.fn(),
  setWebcamScannerOpen: jest.fn(),
  setIpScannerOpen: jest.fn(),
  borrowCamUrl: null,
  setCurrentStep: jest.fn(),
  patronCode: "",
};

describe('BorrowStepScanBooks input', () => {
  it('labels the manual barcode/ISBN input for assistive technology', () => {
    render(<BorrowStepScanBooks {...baseProps} />);
    expect(screen.getByLabelText(/mã sách.*barcode.*isbn/i)).toBeInTheDocument();
  });
});

describe('BorrowStepScanBooks quick search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.quickSearchCopies as jest.Mock).mockResolvedValue([
      {
        id: "c1",
        book_id: "b1",
        barcode: "LIB-001",
        is_available: true,
        shelf_location: "Kệ A-01-02",
        condition: "good",
        status: "available",
        book: { id: "b1", isbn: "978-001", title: "Clean Code", author: "Robert C. Martin", shelf_location: "Kệ A-01-02" },
      },
    ]);
  });

  it('calls quick search API with debounce and shows suggestions', async () => {
    render(<BorrowStepScanBooks {...baseProps} />);
    const input = screen.getByLabelText(/mã sách.*barcode.*isbn/i);

    fireEvent.input(input, { target: { value: "clean" } });

    // debounce is 300ms; wait for the async state update + Menu render
    await waitFor(() => expect(api.quickSearchCopies).toHaveBeenCalledWith("clean", 10), { timeout: 2000 });
    await waitFor(() => expect(screen.getByText("Clean Code")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText(/Kệ: Kệ A-01-02/)).toBeInTheDocument();
    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
  });

  it('selecting a suggestion sets manualIsbn and calls handleAddBookToCart', async () => {
    const setManualIsbn = jest.fn();
    const handleAddBookToCart = jest.fn();
    render(<BorrowStepScanBooks {...baseProps} setManualIsbn={setManualIsbn} handleAddBookToCart={handleAddBookToCart} />);
    const input = screen.getByLabelText(/mã sách.*barcode.*isbn/i);

    fireEvent.input(input, { target: { value: "clean" } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Clean Code/ })).toBeInTheDocument(), { timeout: 2000 });

    const option = screen.getByRole('option', { name: /Clean Code/ });
    fireEvent.click(option);

    expect(setManualIsbn).toHaveBeenCalledWith("LIB-001");
    expect(handleAddBookToCart).toHaveBeenCalledWith("LIB-001");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it('disables unavailable copies in suggestions', async () => {
    (api.quickSearchCopies as jest.Mock).mockResolvedValueOnce([
      {
        id: "c2",
        book_id: "b2",
        barcode: "LIB-UNAVAILABLE",
        is_available: false,
        shelf_location: "Kệ B-01",
        condition: "good",
        status: "borrowed",
        book: { id: "b2", isbn: "978-002", title: "Unavailable Book", author: "Author", shelf_location: "Kệ B-01" },
      },
    ]);
    render(<BorrowStepScanBooks {...baseProps} />);
    const input = screen.getByLabelText(/mã sách.*barcode.*isbn/i);

    fireEvent.input(input, { target: { value: "unavail" } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Unavailable Book/ })).toBeInTheDocument(), { timeout: 2000 });

    const option = screen.getByRole('option', { name: /Unavailable Book/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText("Đã mượn / Bảo trì")).toBeInTheDocument();
  });

  it('keeps accepting further typing while suggestions are open', async () => {
    const setManualIsbn = jest.fn();
    render(<BorrowStepScanBooks {...baseProps} setManualIsbn={setManualIsbn} />);
    const input = screen.getByLabelText(/mã sách.*barcode.*isbn/i);

    fireEvent.input(input, { target: { value: "clean" } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Clean Code/ })).toBeInTheDocument(), { timeout: 2000 });

    // Regression: the old MUI Menu trapped focus, so the input could no longer be typed into.
    fireEvent.input(input, { target: { value: "clean code" } });

    await waitFor(() => expect(api.quickSearchCopies).toHaveBeenLastCalledWith("clean code", 10), { timeout: 2000 });
  });
});

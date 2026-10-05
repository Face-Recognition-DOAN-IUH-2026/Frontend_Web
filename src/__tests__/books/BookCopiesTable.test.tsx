import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookCopiesTable } from '@/app/(dashboard)/_components/books/BookCopiesTable';
import type { BookCopy } from '@/lib/types';
import api from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    createBookCopy: jest.fn(),
    updateBookCopy: jest.fn(),
    deleteBookCopy: jest.fn(),
  },
  getErrorMessage: jest.fn((err: any) => err?.message || 'Error occurred'),
}));

const mockCopies: BookCopy[] = [
  {
    id: 'copy-1',
    book_id: 'book-1',
    barcode: 'LIB-9780132350884-001',
    is_available: true,
    condition: 'new',
    status: 'available',
    imported_at: '2026-03-01T10:00:00Z',
    shelf_location: 'Kệ A1-02',
  },
  {
    id: 'copy-2',
    book_id: 'book-1',
    barcode: 'LIB-9780132350884-002',
    is_available: false,
    condition: 'minor_damage',
    status: 'borrowed',
    imported_at: '2026-03-02T10:00:00Z',
    shelf_location: 'Kệ A1-02',
  },
];

describe('BookCopiesTable', () => {
  const onRefresh = jest.fn();
  const showNotice = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders copies with barcode, condition, status, shelf, and date', () => {
    render(
      <BookCopiesTable
        bookId="book-1"
        isbn="9780132350884"
        copies={mockCopies}
        loading={false}
        onRefresh={onRefresh}
        showNotice={showNotice}
      />
    );

    expect(screen.getByText('LIB-9780132350884-001')).toBeInTheDocument();
    expect(screen.getByText('LIB-9780132350884-002')).toBeInTheDocument();
    expect(screen.getByText('Mới')).toBeInTheDocument();
    expect(screen.getByText('Hư nhẹ')).toBeInTheDocument();
    expect(screen.getByText('Sẵn sàng')).toBeInTheDocument();
    expect(screen.getByText('Đang mượn')).toBeInTheDocument();
  });

  it('renders empty message when no copies exist', () => {
    render(
      <BookCopiesTable
        bookId="book-1"
        isbn="9780132350884"
        copies={[]}
        loading={false}
        onRefresh={onRefresh}
        showNotice={showNotice}
      />
    );

    expect(screen.getByText(/chưa có bản sao nào/i)).toBeInTheDocument();
  });

  it('opens add copy dialog and calls api.createBookCopy on submit', async () => {
    (api.createBookCopy as jest.Mock).mockResolvedValueOnce({ id: 'copy-3' });

    render(
      <BookCopiesTable
        bookId="book-1"
        isbn="9780132350884"
        copies={mockCopies}
        loading={false}
        onRefresh={onRefresh}
        showNotice={showNotice}
      />
    );

    const addButton = screen.getByRole('button', { name: /thêm bản sao/i });
    fireEvent.click(addButton);

    expect(screen.getByRole('heading', { name: /thêm bản sao mới/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /^thêm$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createBookCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          book_id: 'book-1',
          condition: 'new',
          status: 'available',
        })
      );
      expect(showNotice).toHaveBeenCalledWith('success', expect.stringMatching(/thành công/i));
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('opens delete confirmation dialog and calls api.deleteBookCopy', async () => {
    (api.deleteBookCopy as jest.Mock).mockResolvedValueOnce({ success: true });

    render(
      <BookCopiesTable
        bookId="book-1"
        isbn="9780132350884"
        copies={mockCopies}
        loading={false}
        onRefresh={onRefresh}
        showNotice={showNotice}
      />
    );

    const deleteButtons = screen.getAllByLabelText(/xóa bản sao/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText(/bạn có chắc muốn xóa bản sao/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^xóa$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deleteBookCopy).toHaveBeenCalledWith('copy-1');
      expect(showNotice).toHaveBeenCalledWith('success', expect.stringMatching(/thành công/i));
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('handles object with items property without crashing', () => {
    render(
      <BookCopiesTable
        bookId="book-1"
        isbn="9780132350884"
        copies={{ items: mockCopies } as any}
        loading={false}
        onRefresh={onRefresh}
        showNotice={showNotice}
      />
    );

    expect(screen.getByText('LIB-9780132350884-001')).toBeInTheDocument();
  });

  it('handles undefined copies prop gracefully', () => {
    render(
      <BookCopiesTable
        bookId="book-1"
        isbn="9780132350884"
        copies={undefined as any}
        loading={false}
        onRefresh={onRefresh}
        showNotice={showNotice}
      />
    );

    expect(screen.getByText(/chưa có bản sao nào/i)).toBeInTheDocument();
  });
});

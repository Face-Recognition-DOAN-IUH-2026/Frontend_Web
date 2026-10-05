import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReturnConfirmDialog from '@/app/(dashboard)/_components/return/ReturnConfirmDialog';
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from '@/lib/types';

jest.mock('@/lib/permission-context', () => ({
  usePermission: () => ({ can: () => true }),
  getPermissionDeniedReason: () => '',
}));

const mockRecord: BorrowRecord = {
  id: 'record-1',
  patron_id: 'patron-1',
  book_id: 'book-1',
  copy_id: 'copy-1',
  borrow_at: new Date().toISOString(),
  due_at: new Date(Date.now() + 86400000).toISOString(),
  return_at: null,
  shelf_location: 'K-A1',
  status: 'active',
  book: {
    id: 'book-1',
    isbn: '9780132350884',
    title: 'Clean Code',
    subtitle: null,
    author: 'Robert C. Martin',
    cover_url: null,
    publisher: null,
    published_date: null,
    description: null,
    page_count: 464,
    categories: null,
    average_rating: null,
    language: 'en',
    isbn10: null,
    isbn13: null,
    shelf_location: 'K-A1',
    copies: [],
  },
  copy: {
    id: 'copy-1',
    book_id: 'book-1',
    barcode: 'LIB-9780132350884-001',
    is_available: false,
    shelf_location: 'K-A1',
    condition: 'good',
    status: 'borrowed',
  },
};

const mockDetail: StaffPatronActiveBorrowsResponse = {
  patron: {
    id: 'patron-1',
    full_name: 'Nguyen Van A',
    student_code: 'SV001',
    email: 'a@example.com',
    card_number: 'CARD-001',
    current_status: 'active',
  },
  records: [mockRecord],
  total: 1,
  overdue_count: 0,
};

describe('ReturnConfirmDialog with 5 condition codes', () => {
  it('renders the 5 condition codes with Vietnamese labels and an optional note input', () => {
    const onConditionChange = jest.fn();
    const onNoteChange = jest.fn();
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <ReturnConfirmDialog
        record={mockRecord}
        detail={mockDetail}
        condition="good"
        note=""
        onConditionChange={onConditionChange}
        onNoteChange={onNoteChange}
        onClose={onClose}
        onConfirm={onConfirm}
        loading={false}
      />
    );

    // Dialog title
    expect(screen.getByText('Xác nhận trả sách')).toBeInTheDocument();

    // Note field should exist
    expect(screen.getByLabelText(/ghi chú/i)).toBeInTheDocument();

    // Open condition select dropdown
    const select = screen.getByRole('combobox', { name: /tình trạng/i });
    fireEvent.mouseDown(select);

    // Verify 5 code labels exist in dropdown options
    expect(screen.getByRole('option', { name: 'Mới' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bình thường' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hư nhẹ' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hư nặng' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Thất lạc' })).toBeInTheDocument();

    // Old free text options must NOT be present
    expect(screen.queryByRole('option', { name: 'Còn mới' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Rách bìa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ẩm mốc' })).not.toBeInTheDocument();
  });
});

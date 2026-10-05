import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReturnScannerDialog, { RETURN_CONDITION_OPTIONS } from '@/app/(dashboard)/_components/return/ReturnScannerDialog';
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from '@/lib/types';
import type { FineConfigDto } from '@/lib/fee-estimate';

jest.mock('@/lib/api-client', () => ({
  staffReturnBorrowRecord: jest.fn(),
}));

const mockRecord: BorrowRecord = {
  id: 'rec-1',
  patron_id: 'pat-1',
  book_id: 'book-1',
  copy_id: 'copy-1',
  borrow_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  due_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days overdue
  return_at: null,
  shelf_location: 'A1',
  status: 'active',
  book: {
    id: 'book-1',
    isbn: '9780140328721',
    title: 'Matilda',
    price: 100000,
  } as any,
  copy: {
    id: 'copy-1',
    book_id: 'book-1',
    barcode: 'LIB-9780140328721-075',
    is_available: false,
    shelf_location: 'A1',
    condition: 'good',
    status: 'borrowed',
  },
};

const mockDetail: StaffPatronActiveBorrowsResponse = {
  patron: {
    id: 'pat-1',
    full_name: 'Tran Van B',
    student_code: 'SV002',
    email: 'b@example.com',
    card_number: 'CARD-002',
    current_status: 'active',
  },
  records: [mockRecord],
  total: 1,
  overdue_count: 1,
};

const mockFineConfig: FineConfigDto = {
  fine_per_day: 5000,
  fine_brackets: [
    { from: 1, to: 7, amount: 10000 },
    { from: 8, to: 14, amount: 20000 },
  ],
  damage_fee_pct: { minor: 30, major: 70, lost: 100 },
  damage_fee_fixed: { minor: 5000, major: 10000, lost: 10000 },
  fallback_book_price: 100000,
};

describe('ReturnScannerDialog Condition & Fee Estimate', () => {
  it('exports standard 5 condition options with penalty explanations', () => {
    expect(RETURN_CONDITION_OPTIONS).toHaveLength(5);
    const codes = RETURN_CONDITION_OPTIONS.map((o) => o.value);
    expect(codes).toEqual(['good', 'new', 'minor_damage', 'major_damage', 'lost']);
  });

  it('calculates live penalty fees when book is selected and condition changed', () => {
    const onClose = jest.fn();
    const onBatchComplete = jest.fn();
    const showNotice = jest.fn();

    render(
      <ReturnScannerDialog
        open={true}
        onClose={onClose}
        detail={mockDetail}
        fineConfig={mockFineConfig}
        onBatchComplete={onBatchComplete}
        showNotice={showNotice}
      />
    );

    // Click "Chọn trả" for Matilda
    const selectBtn = screen.getByRole('button', { name: /chọn trả/i });
    fireEvent.click(selectBtn);

    // Book is added to scanned list
    expect(screen.getAllByText('Matilda').length).toBeGreaterThanOrEqual(1);

    // Since it is 2 days overdue, overdue fine is 10,000 đ
    expect(screen.getByText(/Trễ: 10\.000 đ/)).toBeInTheDocument();

    // Condition dropdown should be present
    const conditionSelect = screen.getByRole('combobox');
    expect(conditionSelect).toBeInTheDocument();

    // Open dropdown
    fireEvent.mouseDown(conditionSelect);

    // Verify standard options are shown with labels & descriptions
    expect(screen.getByText('Hư hỏng nhẹ')).toBeInTheDocument();
    expect(screen.getByText('Phạt 30% giá sách + 5.000 đ')).toBeInTheDocument();

    // Select "minor_damage"
    const minorOption = screen.getByText('Hư hỏng nhẹ');
    fireEvent.click(minorOption);

    // Fee for minor damage: 30% of 100,000 (30,000) + 5,000 = 35,000 đ damage fee
    // Total for this item = 10,000 (overdue) + 35,000 (damage) = 45,000 đ
    expect(screen.getByText(/Hư hỏng: 35\.000 đ/)).toBeInTheDocument();
    expect(screen.getByText(/Tổng = 45\.000 đ/)).toBeInTheDocument();

    // Footer shows batch total
    expect(screen.getByText(/Tổng phí phạt ước tính: 45\.000 đ/)).toBeInTheDocument();
    expect(screen.getByText('Cần thu phí')).toBeInTheDocument();
  });
});

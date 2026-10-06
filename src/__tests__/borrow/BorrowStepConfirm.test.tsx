import React from 'react';
import { render, screen } from '@testing-library/react';
import { BorrowStepConfirm } from '@/app/(dashboard)/_components/borrow/BorrowStepConfirm';
import type { BorrowCartItem } from '@/app/(dashboard)/_components/borrow/types';

jest.mock('@/lib/permission-context', () => ({
  usePermission: () => ({ can: () => true }),
  getPermissionDeniedReason: () => '',
}));

const cartItem = {
  barcode: 'LIB-9780140328721-001',
  isbn: '9780140328721',
  can_borrow: true,
  reason: null,
  book: { title: 'Fantastic Mr. Fox', author: 'Roald Dahl' },
  copy_id: 'cp-1',
  book_id: 'bk-1',
  copy_barcode: 'LIB-9780140328721-001',
} as unknown as BorrowCartItem;

const baseProps = {
  patronName: 'Nguyen Van A',
  patronCode: 'SV001',
  borrowDateStr: '05/10/2026',
  dueDateStr: '19/10/2026',
  cartItems: [cartItem],
  creatingSlip: false,
  handleConfirmBorrowSlip: jest.fn(),
  setCurrentStep: jest.fn(),
};

describe('BorrowStepConfirm fine display', () => {
  it('renders the bracket-based fine schedule from config instead of a per-day rate', () => {
    render(
      <BorrowStepConfirm
        {...baseProps}
        fineBrackets={[
          { from: 1, to: 7, amount: 10000 },
          { from: 8, to: 14, amount: 20000 },
          { from: 15, to: 30, amount: 50000 },
          { from: 31, to: null, amount: 100000 },
        ]}
      />
    );

    expect(screen.getByText(/1–7 ngày:/)).toBeInTheDocument();
    expect(screen.getByText('10.000đ')).toBeInTheDocument();
    expect(screen.getByText(/31\+ ngày:/)).toBeInTheDocument();
    expect(screen.getByText('100.000đ')).toBeInTheDocument();
    expect(screen.queryByText(/đ\/ngày\/cuốn/)).not.toBeInTheDocument();
  });

  it('falls back to the per-day rate when no brackets are configured', () => {
    render(<BorrowStepConfirm {...baseProps} finePerDay={5000} />);

    expect(screen.getByText(/5\.000 đ\/ngày\/cuốn/)).toBeInTheDocument();
  });

  it('shows the due rule with the configured max borrow days', () => {
    render(<BorrowStepConfirm {...baseProps} maxBorrowDays={21} />);

    expect(screen.getByText(/Hạn trả quy định \(\+21 ngày\)/)).toBeInTheDocument();
  });
});

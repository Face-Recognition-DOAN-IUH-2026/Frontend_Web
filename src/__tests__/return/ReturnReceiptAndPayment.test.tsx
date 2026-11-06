import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReturnReceipt from '@/app/(dashboard)/_components/return/ReturnReceipt';
import ReturnConfirmDialog from '@/app/(dashboard)/_components/return/ReturnConfirmDialog';
import type { BorrowRecord, StaffPatronActiveBorrowsResponse } from '@/lib/types';

jest.mock('@/lib/permission-context', () => ({
  usePermission: () => ({ can: () => true }),
  getPermissionDeniedReason: () => '',
}));

const mockRecord: BorrowRecord = {
  id: 'rec-1',
  patron_id: 'pat-1',
  book_id: 'bk-1',
  copy_id: 'cp-1',
  borrow_at: '2026-09-01T00:00:00.000Z',
  due_at: '2026-09-15T00:00:00.000Z',
  return_at: '2026-09-20T00:00:00.000Z',
  status: 'returned',
  shelf_location: 'A1-01',
  fine_amount: 20000,
  damage_fee: 35000,
  total_due: 55000,
  payment_method: 'cash',
  payment_ref: 'TXN-20260920-ABCD1234',
  fine_paid: true,
  paid_at: '2026-09-20T00:00:00.000Z',
  book: {
    id: 'bk-1',
    title: 'Clean Architecture',
    isbn: '9780134494166',
    price: 100000,
  } as any,
  copy: {
    id: 'cp-1',
    barcode: 'LIB-9780134494166-001',
    condition: 'minor_damage',
  } as any,
};

const mockDetail: StaffPatronActiveBorrowsResponse = {
  patron: {
    id: 'pat-1',
    full_name: 'Tran Van B',
    student_code: 'SV002',
    email: 'b@example.com',
  } as any,
  records: [mockRecord],
  total: 1,
  overdue_count: 1,
};

describe('ReturnReceipt', () => {
  it('renders fee breakdown, patron info, and payment reference', () => {
    const onClose = jest.fn();
    render(
      <ReturnReceipt
        record={mockRecord}
        patron={{ full_name: 'Tran Van B', student_code: 'SV002' }}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/BIÊN LAI TRẢ SÁCH/i)).toBeInTheDocument();
    expect(screen.getByText('Clean Architecture')).toBeInTheDocument();
    expect(screen.getByText(/Tran Van B/)).toBeInTheDocument();
    expect(screen.getByText(/SV002/)).toBeInTheDocument();
    expect(screen.getByText('20.000 đ')).toBeInTheDocument();
    expect(screen.getByText('35.000 đ')).toBeInTheDocument();
    expect(screen.getByText('55.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Tiền mặt')).toBeInTheDocument();
    expect(screen.getAllByText('TXN-20260920-ABCD1234').length).toBeGreaterThan(0);
  });

  it('triggers window.print when clicking print button', () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    render(<ReturnReceipt record={mockRecord} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText(/In biên lai/i));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('hides the QR code and shows a pay-later note for unpaid records', () => {
    const unpaidRecord: BorrowRecord = {
      ...mockRecord,
      id: 'rec-unpaid',
      fine_paid: false,
      payment_method: null,
      payment_ref: null,
      paid_at: null,
    };
    const { container } = render(<ReturnReceipt record={unpaidRecord} onClose={jest.fn()} />);

    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText(/vui lòng thanh toán sau tại quầy/i)).toBeInTheDocument();
  });
});

describe('ReturnConfirmDialog payment flow', () => {
  it('defaults to immediate cash payment and allows toggling to unpaid', () => {
    const onConfirm = jest.fn();

    render(
      <ReturnConfirmDialog
        record={mockRecord}
        detail={mockDetail}
        condition="minor_damage"
        onConditionChange={jest.fn()}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        loading={false}
      />
    );

    const checkbox = screen.getByLabelText('Đã thu phí ngay') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Payment method combobox should be present
    expect(screen.getByRole('combobox', { name: /phương thức thanh toán/i })).toBeInTheDocument();

    // Confirm with default immediate cash
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận trả' }));
    expect(onConfirm).toHaveBeenCalledWith({
      isPaidImmediately: true,
      paymentMethod: 'cash',
    });

    // Uncheck immediate payment
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    // Payment method combobox should now be hidden
    expect(screen.queryByRole('combobox', { name: /phương thức thanh toán/i })).not.toBeInTheDocument();

    // Confirm with unpaid
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận trả' }));
    expect(onConfirm).toHaveBeenLastCalledWith({
      isPaidImmediately: false,
      paymentMethod: 'cash',
    });
  });

  it('shows the payment method select when there is an overdue fee even if condition is normal (good)', () => {
    const onConfirm = jest.fn();

    render(
      <ReturnConfirmDialog
        record={mockRecord}
        detail={mockDetail}
        condition="good"
        onConditionChange={jest.fn()}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        loading={false}
      />
    );

    // Method select is visible so staff can choose cash or QR code for overdue fines
    expect(screen.getByLabelText('Đã thu phí ngay')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /phương thức thanh toán/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận trả' }));
    expect(onConfirm).toHaveBeenCalledWith({
      isPaidImmediately: true,
      paymentMethod: 'cash',
    });
  });

  it('hides the whole payment block and note when there is no fee, with a finish button', () => {
    const onConfirm = jest.fn();
    const noFeeRecord: BorrowRecord = {
      ...mockRecord,
      id: 'rec-nofee',
      due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      fine_amount: 0,
      book: { ...(mockRecord.book as any), price: null },
      copy: { ...(mockRecord.copy as any), condition: 'good' },
    };

    render(
      <ReturnConfirmDialog
        record={noFeeRecord}
        detail={mockDetail}
        condition="good"
        onConditionChange={jest.fn()}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        loading={false}
      />
    );

    expect(screen.getByText(/Không phát sinh phí/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Đã thu phí ngay')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /phương thức thanh toán/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ghi chú thêm nếu sách có hư hỏng/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }));
    expect(onConfirm).toHaveBeenCalledWith({
      isPaidImmediately: true,
      paymentMethod: 'cash',
    });
  });
});

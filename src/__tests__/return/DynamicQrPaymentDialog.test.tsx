import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DynamicQrPaymentDialog from '@/app/(dashboard)/_components/return/DynamicQrPaymentDialog';
import api from '@/lib/api-client';
import type { PaymentOrderResponse } from '@/lib/types/borrow';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    getPaymentOrderStatus: jest.fn(),
  },
}));

describe('DynamicQrPaymentDialog', () => {
  const mockOrder: PaymentOrderResponse = {
    id: 'ord-1',
    orderCode: 'ORD-20261005-TEST01',
    patronId: 'pat-1',
    amount: 55000,
    status: 'pending',
    paymentMethod: 'vietqr',
    qrData: '00020101021238540010A000000727012600069704220112102030405060208QRIBFTTA53037045405550005802VN62250821ORD-20261005-TEST016304ABCD',
    qrUrl: 'https://img.vietqr.io/image/970422-10203040506-compact2.png?amount=55000&addInfo=ORD-20261005-TEST01&accountName=THU%20VIEN%20IUH',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    recordIds: ['rec-1', 'rec-2'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders QR payment dialog with order info, amount, and patron details', () => {
    render(
      <DynamicQrPaymentDialog
        open={true}
        order={mockOrder}
        patronName="Nguyễn Văn A"
        studentCode="20012345"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText('Thanh toán Phí phạt qua VietQR')).toBeInTheDocument();
    expect(screen.getByText('55.000 đ')).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Văn A/)).toBeInTheDocument();
    expect(screen.getByText(/20012345/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-20261005-TEST01/)).toBeInTheDocument();
    expect(screen.getByText(/Hết hạn sau:/)).toBeInTheDocument();

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockOrder.qrUrl);
  });

  it('polls status every 2.5s and calls onSuccess when completed', async () => {
    (api.getPaymentOrderStatus as jest.Mock).mockResolvedValue({
      orderCode: mockOrder.orderCode,
      status: 'completed',
      paidAt: new Date().toISOString(),
    });

    const onSuccess = jest.fn();

    render(
      <DynamicQrPaymentDialog
        open={true}
        order={mockOrder}
        onClose={jest.fn()}
        onSuccess={onSuccess}
      />
    );

    // Fast-forward interval 2500ms
    await act(async () => {
      jest.advanceTimersByTime(2600);
    });

    expect(api.getPaymentOrderStatus).toHaveBeenCalledWith(mockOrder.orderCode);

    // Fast-forward success timeout (1500ms)
    await act(async () => {
      jest.advanceTimersByTime(1600);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockOrder.orderCode);
  });

  it('shows expired message when order is expired', () => {
    const expiredOrder: PaymentOrderResponse = {
      ...mockOrder,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };

    render(
      <DynamicQrPaymentDialog
        open={true}
        order={expiredOrder}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText(/Đơn thanh toán đã hết hạn/i)).toBeInTheDocument();
  });

  it('calls onRegenerate when the regenerate button is clicked on an expired order', () => {
    const expiredOrder: PaymentOrderResponse = {
      ...mockOrder,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const onRegenerate = jest.fn();

    render(
      <DynamicQrPaymentDialog
        open={true}
        order={expiredOrder}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
        onRegenerate={onRegenerate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã mới' }));
    expect(onRegenerate).toHaveBeenCalled();
  });

  it('calls onClose when close/cancel button is clicked', () => {
    const onClose = jest.fn();
    render(
      <DynamicQrPaymentDialog
        open={true}
        order={mockOrder}
        onClose={onClose}
        onSuccess={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hủy bỏ' }));
    expect(onClose).toHaveBeenCalled();
  });
});

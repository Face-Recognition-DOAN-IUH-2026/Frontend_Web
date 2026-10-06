import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PatronDebtSection from '@/app/(dashboard)/_components/profile/PatronDebtSection';
import api from '@/lib/api-client';
import type { PatronFineItem, PaymentOrderResponse } from '@/lib/types';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    getMyUnpaidFines: jest.fn(),
    createPaymentOrder: jest.fn(),
    getPaymentOrderStatus: jest.fn(),
  },
  getErrorMessage: (err: any) => err?.message || 'Error',
}));

describe('PatronDebtSection', () => {
  const mockFines: PatronFineItem[] = [
    {
      record_id: 'rec-1',
      book: { title: 'Lập trình TypeScript', isbn: '9781234567890' },
      barcode: 'LIB-9781234567890-001',
      overdue_fine: 20000,
      damage_fee: 10000,
      total: 30000,
      return_at: '2026-09-25T10:00:00.000Z',
    },
    {
      record_id: 'rec-2',
      book: { title: 'Thiết kế Vi mạch', isbn: '9789876543210' },
      barcode: 'LIB-9789876543210-002',
      overdue_fine: 50000,
      damage_fee: 0,
      total: 50000,
      return_at: '2026-09-28T10:00:00.000Z',
    },
  ];

  const mockOrder: PaymentOrderResponse = {
    id: 'ord-1',
    orderCode: 'ORD-20261005-001',
    patronId: 'pat-1',
    amount: 30000,
    status: 'pending',
    paymentMethod: 'vietqr',
    qrData: 'qr-payload',
    qrUrl: 'https://img.vietqr.io/image/test.png',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    recordIds: ['rec-1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty debt state when patron has no unpaid fines', async () => {
    (api.getMyUnpaidFines as jest.Mock).mockResolvedValue([]);

    render(<PatronDebtSection patronName="Nguyen Van A" studentCode="20012345" />);

    await waitFor(() => {
      expect(screen.getByText('Tài khoản của bạn không có khoản nợ nào!')).toBeInTheDocument();
    });
    expect(screen.getByText('Không có nợ')).toBeInTheDocument();
  });

  it('renders list of unpaid debts with correct fees and totals', async () => {
    (api.getMyUnpaidFines as jest.Mock).mockResolvedValue(mockFines);

    render(<PatronDebtSection patronName="Nguyen Van A" studentCode="20012345" />);

    await waitFor(() => {
      expect(screen.getByText('Lập trình TypeScript')).toBeInTheDocument();
    });
    expect(screen.getByText('Thiết kế Vi mạch')).toBeInTheDocument();
    expect(screen.getByText('20.000 đ')).toBeInTheDocument();
    expect(screen.getByText('30.000 đ')).toBeInTheDocument();
    expect(screen.getAllByText('50.000 đ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Đang nợ: 80.000 đ')).toBeInTheDocument();
    expect(screen.getByText(/Thanh toán tất cả \(80.000 đ\)/)).toBeInTheDocument();
  });

  it('handles single item VietQR creation and opens payment dialog', async () => {
    (api.getMyUnpaidFines as jest.Mock).mockResolvedValue(mockFines);
    (api.createPaymentOrder as jest.Mock).mockResolvedValue(mockOrder);

    render(<PatronDebtSection patronName="Nguyen Van A" studentCode="20012345" />);

    await waitFor(() => {
      expect(screen.getByText('Lập trình TypeScript')).toBeInTheDocument();
    });

    const singlePayButtons = screen.getAllByRole('button', { name: /Quét VietQR/i });
    fireEvent.click(singlePayButtons[0]);

    await waitFor(() => {
      expect(api.createPaymentOrder).toHaveBeenCalledWith({
        record_ids: ['rec-1'],
        payment_method: 'vietqr',
      });
    });

    expect(screen.getByText('Thanh toán Phí phạt qua VietQR')).toBeInTheDocument();
  });

  it('handles bulk payment for all debt records', async () => {
    (api.getMyUnpaidFines as jest.Mock).mockResolvedValue(mockFines);
    (api.createPaymentOrder as jest.Mock).mockResolvedValue({
      ...mockOrder,
      amount: 80000,
      recordIds: ['rec-1', 'rec-2'],
    });

    render(<PatronDebtSection patronName="Nguyen Van A" studentCode="20012345" />);

    await waitFor(() => {
      expect(screen.getByText(/Thanh toán tất cả \(80.000 đ\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Thanh toán tất cả \(80.000 đ\)/));

    await waitFor(() => {
      expect(api.createPaymentOrder).toHaveBeenCalledWith({
        record_ids: ['rec-1', 'rec-2'],
        payment_method: 'vietqr',
      });
    });
  });
});

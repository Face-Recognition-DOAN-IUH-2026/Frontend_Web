import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarcodeRangeList } from '@/app/(dashboard)/_components/books/BarcodeRangeList';

describe('BarcodeRangeList', () => {
  it('renders a dash when barcodes array is empty', () => {
    render(<BarcodeRangeList barcodes={[]} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders single barcode directly without chip or expander', () => {
    render(<BarcodeRangeList barcodes={['LIB-9780132350884-001']} />);
    expect(screen.getByText('LIB-9780132350884-001')).toBeInTheDocument();
    expect(screen.queryByText(/mã/i)).not.toBeInTheDocument();
  });

  it('renders contiguous range with range arrow and count chip', () => {
    const barcodes = Array.from({ length: 15 }, (_, i) => `LIB-9780132350884-${String(i + 1).padStart(3, '0')}`);
    render(<BarcodeRangeList barcodes={barcodes} />);

    // Should show range format: LIB-9780132350884-001 → 015
    expect(screen.getByText(/LIB-9780132350884-001\s*→\s*015/)).toBeInTheDocument();
    // Should show chip with count
    expect(screen.getByText('15 mã')).toBeInTheDocument();

    // Expanded list is not visible initially
    expect(screen.queryByTestId('barcode-expanded-list')).not.toBeInTheDocument();

    // Click chip or expand button to expand
    fireEvent.click(screen.getByText('15 mã'));

    // Now all barcodes should be visible
    expect(screen.getByTestId('barcode-expanded-list')).toBeInTheDocument();
    expect(screen.getByText('LIB-9780132350884-008')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByText('15 mã'));
    expect(screen.queryByTestId('barcode-expanded-list')).not.toBeInTheDocument();
  });

  it('handles non-contiguous barcodes gracefully with count chip and expand', () => {
    const barcodes = ['LIB-9780132350884-001', 'LIB-9780132350884-005', 'LIB-9780132350884-010'];
    render(<BarcodeRangeList barcodes={barcodes} />);

    expect(screen.getByText('3 mã')).toBeInTheDocument();
    fireEvent.click(screen.getByText('3 mã'));
    expect(screen.getByText('LIB-9780132350884-005')).toBeInTheDocument();
  });
});

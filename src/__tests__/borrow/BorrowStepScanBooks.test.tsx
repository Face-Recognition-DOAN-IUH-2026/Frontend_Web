import React from 'react';
import { render, screen } from '@testing-library/react';
import { BorrowStepScanBooks } from '@/app/(dashboard)/_components/borrow/BorrowStepScanBooks';

describe('BorrowStepScanBooks input', () => {
  it('labels the manual barcode/ISBN input for assistive technology', () => {
    render(
      <BorrowStepScanBooks
        manualIsbn=""
        setManualIsbn={jest.fn()}
        isLookingUpBook={false}
        cartItems={[]}
        remaining={3}
        handleAddBookToCart={jest.fn()}
        handleRemoveFromCart={jest.fn()}
        setWebcamScannerOpen={jest.fn()}
        setIpScannerOpen={jest.fn()}
        borrowCamUrl={null}
        setCurrentStep={jest.fn()}
        patronCode="SV001"
      />
    );

    expect(screen.getByLabelText(/mã sách.*barcode.*isbn/i)).toBeInTheDocument();
  });
});

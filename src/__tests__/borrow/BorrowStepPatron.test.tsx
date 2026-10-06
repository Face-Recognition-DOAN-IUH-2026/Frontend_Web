import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BorrowStepPatron } from '@/app/(dashboard)/_components/borrow/BorrowStepPatron';

const baseProps = {
  patronCode: 'SV001',
  setPatronCode: jest.fn(),
  patronId: 'pat-1',
  patronName: 'Nguyen Van A',
  activeCount: 1,
  overdueCount: 2,
  borrowConfig: { max_borrow_books: 3 },
  remaining: 2,
  canBorrow: false,
  faceVerifyDisabled: true,
  handleLookupAndOpenCamera: jest.fn(),
  startWebcam: jest.fn(),
  stopWebcam: jest.fn(),
  handleFaceVerify: jest.fn(),
  setOverdueGuideOpen: jest.fn(),
  setCurrentStep: jest.fn(),
  videoRef: { current: null } as any,
  cameraStarted: false,
  cameraLoading: false,
  cameraReady: false,
  cameraError: '',
  faceScanning: false,
};

describe('BorrowStepPatron overdue flow', () => {
  it('shows a link to the return page when the patron has overdue books', () => {
    render(<BorrowStepPatron {...baseProps} />);

    const link = screen.getByRole('link', { name: /đi đến trang trả sách/i });
    expect(link).toHaveAttribute('href', '/return');
  });

  it('does not show the return link when there is nothing overdue', () => {
    render(<BorrowStepPatron {...baseProps} overdueCount={0} />);

    expect(screen.queryByRole('link', { name: /đi đến trang trả sách/i })).not.toBeInTheDocument();
  });

  it('labels the MSSV input for assistive technology', () => {
    render(<BorrowStepPatron {...baseProps} />);

    expect(screen.getByLabelText(/mã số sinh viên/i)).toBeInTheDocument();
  });

  it('shows a stop-camera button while the camera is running', async () => {
    const user = userEvent.setup();
    const stopWebcam = jest.fn();
    render(<BorrowStepPatron {...baseProps} patronId={null} stopWebcam={stopWebcam} cameraStarted cameraReady patronCode="SV001" />);

    await user.click(screen.getByRole("button", { name: "Tắt camera" }));
    expect(stopWebcam).toHaveBeenCalled();
  });

  it('hides the stop-camera button when the camera is off', () => {
    render(<BorrowStepPatron {...baseProps} patronId={null} cameraStarted={false} cameraReady={false} />);

    expect(screen.queryByRole("button", { name: "Tắt camera" })).not.toBeInTheDocument();
  });

  it('replaces the camera panel with a ready summary once verified', () => {
    render(
      <BorrowStepPatron
        {...baseProps}
        overdueCount={0}
        canBorrow
        borrowConfig={{
          max_borrow_books: 4,
          max_borrow_days: 21,
          fine: {
            fine_brackets: [
              { from: 1, to: 7, amount: 10000 },
              { from: 31, to: null, amount: 100000 },
            ],
            fine_per_day: 5000,
          },
        }}
      />
    );

    expect(screen.queryByText(/Camera xác minh đang ở chế độ chờ/i)).not.toBeInTheDocument();
    expect(screen.getByText("Sẵn sàng quét sách")).toBeInTheDocument();
    expect(screen.getByText(/Đã xác minh khuôn mặt/)).toBeInTheDocument();
    expect(screen.getByText(/21 ngày/)).toBeInTheDocument();
    expect(screen.getByText(/1–7 ngày: 10\.000đ/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Tiếp tục: Quét mã vạch sách/ }).length).toBeGreaterThan(0);
  });
});

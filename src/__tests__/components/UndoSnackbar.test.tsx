import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UndoSnackbar from '@/app/_components/UndoSnackbar';

describe('UndoSnackbar', () => {
  it('renders message and countdown', () => {
    render(<UndoSnackbar open={true} message="Đã xóa" countdown={5} onUndo={jest.fn()} />);
    expect(screen.getByText('Đã xóa')).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('renders undo button', () => {
    render(<UndoSnackbar open={true} message="Đã xóa" countdown={3} onUndo={jest.fn()} />);
    expect(screen.getByText('Hoàn tác')).toBeInTheDocument();
  });

  it('calls onUndo when undo button clicked', () => {
    const onUndo = jest.fn();
    render(<UndoSnackbar open={true} message="Đã xóa" countdown={3} onUndo={onUndo} />);
    fireEvent.click(screen.getByText('Hoàn tác'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    const { container } = render(<UndoSnackbar open={false} message="Đã xóa" countdown={3} onUndo={jest.fn()} />);
    expect(container.querySelector('.MuiSnackbar-root')).toBeFalsy();
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HoldButton from '@/app/_components/HoldButton';

describe('HoldButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with label', () => {
    render(<HoldButton onHoldComplete={jest.fn()}>Xác nhận</HoldButton>);
    expect(screen.getByText('Xác nhận')).toBeInTheDocument();
  });

  it('fires onHoldComplete after holding for duration', () => {
    const onHoldComplete = jest.fn();
    render(<HoldButton onHoldComplete={onHoldComplete} duration={1000}>Xác nhận</HoldButton>);
    const button = screen.getByText('Xác nhận');
    fireEvent.mouseDown(button);
    jest.advanceTimersByTime(1000);
    expect(onHoldComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onHoldComplete if released early', () => {
    const onHoldComplete = jest.fn();
    render(<HoldButton onHoldComplete={onHoldComplete} duration={1000}>Xác nhận</HoldButton>);
    const button = screen.getByText('Xác nhận');
    fireEvent.mouseDown(button);
    jest.advanceTimersByTime(300);
    fireEvent.mouseUp(button);
    jest.advanceTimersByTime(1000);
    expect(onHoldComplete).not.toHaveBeenCalled();
  });
});

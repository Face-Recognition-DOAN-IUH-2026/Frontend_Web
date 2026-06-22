'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: '#0D1117',
      color: '#E6EDF3',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Da xay ra loi
      </h2>
      <p style={{ color: '#8B949E', marginBottom: '1.5rem', maxWidth: '400px' }}>
        {error.message || 'Khong the tai trang. Vui long thu lai.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#1A73E8',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Thu lai
      </button>
    </div>
  );
}

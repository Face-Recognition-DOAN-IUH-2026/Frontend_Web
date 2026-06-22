'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#E6EDF3' }}>
        Loi he thong
      </h2>
      <p style={{ color: '#8B949E', marginBottom: '1.5rem', maxWidth: '400px' }}>
        {error.message || 'Da xay ra loi khong mong muon. Vui long thu lai.'}
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

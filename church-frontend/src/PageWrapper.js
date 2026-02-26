import React from 'react';

export default function PageWrapper({ children }) {
  return (
    <div className="page-wrapper">
      <div className="page-container">{children}</div>

      <style>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: url('/bg.jpg') center/cover no-repeat;
          padding: 20px;
        }
        .page-container {
          background: rgba(255,255,255,0.95);
          padding: 32px;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }

        /* Responsive */
        @media (max-width: 480px) {
          .page-container {
            padding: 24px;
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
}

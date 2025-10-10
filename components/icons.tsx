
import React from 'react';

export const SortIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
  </svg>
);

export const SortUpIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

export const SortDownIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

export const CrownIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9.16 8.34L2 9.5L7.58 14.37L5.92 21L12 17.5L18.08 21L16.42 14.37L22 9.5L14.84 8.34L12 2Z" />
    </svg>
);

export const PrintIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6 3.129M6.72 13.829c.24.03.48.062.72.096m-1.44-2.121a31.942 31.942 0 014.288-1.062M11.378 11.9c.128.02.257.04.386.061m-4.288-1.062a31.942 31.942 0 011.026 4.385L9 19.5m-2.28-5.671a53.903 53.903 0 01-1.44-2.121L6 3.129m2.28 8.141a53.903 53.903 0 011.44 2.121m-1.44-2.121c1.026 1.169 2.213 2.14 3.48 2.871M9 19.5a2.25 2.25 0 002.25 2.25h1.5A2.25 2.25 0 0015 19.5m-6 0h6m-6 0a2.25 2.25 0 01-2.25-2.25V15m10.5 4.5a2.25 2.25 0 002.25-2.25V15m0 0a48.563 48.563 0 00-6-1.125m6 1.125c-.358-.063-.72-.122-1.085-.181M6.72 13.829c.24.03.48.062.72.096m-1.44-2.121a31.942 31.942 0 014.288-1.062M11.378 11.9c.128.02.257.04.386.061M11.378 11.9l-2.28-5.671M11.378 11.9a31.942 31.942 0 004.288-1.062m0 0a42.415 42.415 0 01-10.56 0m10.56 0L18 3.129m-2.28 8.141c.48.621 1.002 1.204 1.554 1.732M18 3.129a2.25 2.25 0 012.25 2.25V15" />
  </svg>
);
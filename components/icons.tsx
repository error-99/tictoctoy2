
import React from 'react';

export const IconX = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    stroke="currentColor"
    strokeWidth="10"
    fill="none"
    strokeLinecap="round"
  >
    <line x1="15" y1="15" x2="85" y2="85" />
    <line x1="85" y1="15" x2="15" y2="85" />
  </svg>
);

export const IconO = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    stroke="currentColor"
    strokeWidth="10"
    fill="none"
    strokeLinecap="round"
  >
    <circle cx="50" cy="50" r="35" />
  </svg>
);

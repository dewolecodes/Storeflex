"use client";
import React from 'react';

type Props = {
  open?: boolean;
  onClick?: () => void;
  className?: string;
};

export default function Hamburger({ open = false, onClick, className = '' }: Props) {
  return (
    <button
      aria-label="Toggle menu"
      aria-expanded={open}
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center ${className}`}
    >
      <span className="relative w-6 h-6 block">
        <span
          className={`absolute left-0 top-0 w-6 h-[2px] bg-current transition-transform duration-300 ${
            open ? 'translate-y-2 rotate-45' : '-translate-y-1.5 rotate-0'
          }`}
        />
        <span
          className={`absolute left-0 top-1/2 w-6 h-[2px] bg-current transition-opacity duration-200 ${
            open ? 'opacity-0' : 'opacity-100 -translate-y-1/2'
          }`}
        />
        <span
          className={`absolute left-0 bottom-0 w-6 h-[2px] bg-current transition-transform duration-300 ${
            open ? '-translate-y-2 -rotate-45' : 'translate-y-1.5 rotate-0'
          }`}
        />
      </span>
    </button>
  );
}

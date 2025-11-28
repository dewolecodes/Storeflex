"use client";
import React, { useState } from 'react';

type Tab = {
  id: string;
  title: string;
  content: React.ReactNode;
};

type Props = {
  tabs: Tab[];
  className?: string;
};

export default function Tabs({ tabs, className = '' }: Props) {
  const [active, setActive] = useState(0);

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <div className="hidden md:flex gap-2 items-center mb-3">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            className={`px-3 py-1 rounded-md text-sm transition-colors duration-150 ${i === active ? 'bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
            aria-pressed={i === active}
          >
            {t.title}
          </button>
        ))}
      </div>

      <div className="hidden md:block">
        {tabs.map((t, i) => (
          <div key={t.id} className={`${i === active ? 'block' : 'hidden'}`}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}

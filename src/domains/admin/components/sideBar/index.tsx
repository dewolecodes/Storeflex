import Link from "next/link";
import Drawer from '@/shared/components/UI/Drawer';
import React from 'react';

type Props = {
  isOpen?: boolean;
  onClose?: () => void;
};

const AdminSidebar: React.FC<Props> = ({ isOpen = false, onClose }) => {
  const navItems = [
    { href: '/admin/categories', label: 'Categories', icon: 'M7 7a7 7 0 110 14A7 7 0 017 7z' },
    { href: '/admin/products', label: 'Products', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { href: '/admin/brands', label: 'Brands', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4' },
    { href: '/admin/orders', label: 'Orders', icon: 'M3 3h18v2H3V3zm2 6h14v12H5V9zm3 3v6h2v-6H8zm4 0v6h2v-6h-2z' },
    { href: '/admin/customers', label: 'Customers', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z' },
    { href: '/admin/payments', label: 'Payments', icon: 'M17 9V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2H3v8h18V9h-4zM9 7h6v2H9V7z' },
    { href: '/admin/media', label: 'Media', icon: 'M4 5h16v14H4V5zm7 3a3 3 0 100 6 3 3 0 000-6z' },
    { href: '/admin/settings', label: 'Settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 6.06a1 1 0 00.06-.94l-1-3a1 1 0 00-.74-.64l-2.3-.38a6.98 6.98 0 00-1.6-.93l-.34-2.36a1 1 0 00-.98-.84h-3.6a1 1 0 00-.98.84l-.34 2.36c-.54.2-1.05.47-1.6.93l-2.3.38a1 1 0 00-.74.64l-1 3a1 1 0 00.06.94l1.7 2.94a1 1 0 00.9.5h11.08a1 1 0 00.9-.5l1.7-2.94z' },
  ];

  const navContent = (
    <nav className="space-y-1">
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-all font-medium text-sm group"
              onClick={onClose}
            >
              <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block md:fixed md:top-0 md:left-0 w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-sm h-screen z-20">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin</h2>
              <p className="text-xs text-gray-500">Manage site</p>
            </div>
          </div>
        </div>
        {navContent}
      </aside>

      {/* Mobile drawer */}
      <Drawer isOpen={isOpen ?? false} onClose={onClose ?? (() => { })} ariaLabel="Admin menu">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin</h2>
              <p className="text-xs text-gray-500">Manage site</p>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={onClose} aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
      </Drawer>
    </>
  );
};

export default AdminSidebar;

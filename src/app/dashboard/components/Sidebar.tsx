"use client";
import Link from 'next/link';
import React from 'react';
import Drawer from '@/shared/components/UI/Drawer';

type Props = {
    isOpen?: boolean;
    onClose?: () => void;
};

const Sidebar: React.FC<Props> = ({ isOpen = false, onClose }) => {
    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:block md:fixed md:top-0 md:left-0 w-64 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-sm h-screen z-20">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            S
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Storeflex</h2>
                            <p className="text-xs text-gray-500">Merchant</p>
                        </div>
                    </div>
                </div>
                <nav className="p-4 space-y-1">
                    <ul className="space-y-1">
                        <li>
                            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-all font-medium text-sm group">
                                <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4" />
                                </svg>
                                Overview
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-all font-medium text-sm group">
                                <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Products
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/orders" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-blue-600 transition-all font-medium text-sm group">
                                <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Orders
                            </Link>
                        </li>
                        <li className="pt-4 mt-4 border-t border-gray-200">
                            <Link href="/auth/logout" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm group">
                                <svg className="w-5 h-5 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign out
                            </Link>
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* Mobile drawer */}
            <Drawer isOpen={isOpen ?? false} onClose={onClose ?? (() => { })} ariaLabel="Dashboard menu">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            S
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Storeflex</h2>
                            <p className="text-xs text-gray-500">Merchant</p>
                        </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={onClose} aria-label="Close menu">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="space-y-1">
                    <ul className="space-y-1">
                        <li>
                            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-all font-medium text-sm" onClick={onClose}>
                                <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4" />
                                </svg>
                                Overview
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-all font-medium text-sm" onClick={onClose}>
                                <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Products
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/orders" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-all font-medium text-sm" onClick={onClose}>
                                <svg className="w-5 h-5 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Orders
                            </Link>
                        </li>
                        <li className="pt-4 mt-4 border-t border-gray-200">
                            <Link href="/auth/logout" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm" onClick={onClose}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign out
                            </Link>
                        </li>
                    </ul>
                </nav>
            </Drawer>
        </>
    );
};

export default Sidebar;

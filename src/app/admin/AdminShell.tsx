"use client";
import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar from '@/domains/admin/components/sideBar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastY = useRef(0);


    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY || 0;
            const delta = y - lastY.current;
            // hide when scrolling down (after a small offset)
            if (delta > 0 && y > 40) {
                setVisible(false);
            }
            // show immediately when scrolling up
            if (delta < 0) {
                setVisible(true);
            }
            lastY.current = y;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);



    return (
        <div className="min-h-screen flex bg-gray-50">
            <AdminSidebar isOpen={open} onClose={() => setOpen(false)} />
            <div className="flex-1 flex flex-col md:ml-64">
                <header className={`bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 transform transition-transform duration-200 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                aria-label="Open menu"
                                onClick={() => setOpen(true)}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage all products</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end">
                                <p className="text-sm font-medium text-gray-900">Welcome back</p>
                                <p className="text-xs text-gray-500">Site administrator</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                A
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}

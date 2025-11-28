"use client";
import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col md:ml-64">
                <Header onOpenSidebar={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full" style={{ paddingTop: 'var(--dashboard-header-height, 64px)' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}

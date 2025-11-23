import React from 'react';

import Header from './components/Header';
import Sidebar from './components/Sidebar';

export const metadata = {
    title: 'Dashboard - Storeflex',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidebar />
            <div className="flex-1">
                <Header />
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

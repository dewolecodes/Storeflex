"use client";
import Link from 'next/link';
import React from 'react';

const Sidebar: React.FC = () => {
    return (
        <aside className="w-64 bg-white border-r shadow-sm">
            <div className="p-4 border-b">
                <h2 className="text-lg font-bold">Storeflex</h2>
                <div className="text-xs text-gray-500">Merchant dashboard</div>
            </div>
            <nav className="p-4">
                <ul className="space-y-2">
                    <li>
                        <Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-gray-100">Overview</Link>
                    </li>
                    <li>
                        <Link href="/dashboard/products" className="block px-3 py-2 rounded hover:bg-gray-100">Products</Link>
                    </li>
                    <li>
                        <Link href="/dashboard/orders" className="block px-3 py-2 rounded hover:bg-gray-100">Orders</Link>
                    </li>
                    <li>
                        <Link href="/auth/logout" className="block px-3 py-2 rounded hover:bg-gray-100">Sign out</Link>
                    </li>
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;

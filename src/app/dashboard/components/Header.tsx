"use client";
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white border-b p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <div className="text-sm text-gray-600">Welcome back</div>
            </div>
        </header>
    );
};

export default Header;

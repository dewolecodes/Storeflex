import React from 'react';

import DashboardShell from './DashboardShell';

export const metadata = {
    title: 'Dashboard - Storeflex',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Keep this file as a server component so `metadata` is supported.
    // The interactive parts (sidebar toggle) live inside DashboardShell (a client component).
    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}

import React from 'react';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded shadow">Total products<br /><strong>—</strong></div>
                <div className="p-4 bg-white rounded shadow">Active orders<br /><strong>—</strong></div>
                <div className="p-4 bg-white rounded shadow">Revenue<br /><strong>—</strong></div>
            </section>

            <section>
                <div className="p-4 bg-white rounded shadow">Recent activity will appear here.</div>
            </section>
        </div>
    );
}

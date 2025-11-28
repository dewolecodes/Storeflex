"use client";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

const AdminOrders = () => {
    const [tenantId, setTenantId] = useState<string>("");

    useEffect(() => {
        const fetchTenant = async () => {
            const session = await getSession();
            if (session?.user && typeof session.user === 'object' && 'tenantId' in session.user) {
                setTenantId(session.user.tenantId as string);
            }
        };
        fetchTenant();
    }, []);

    return (
        <div className="text-sm text-gray-800">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage orders for tenant {tenantId || '...'}</p>
                </div>
            </div>
            <div className="mt-6">This page will list orders, allow filtering and status updates.</div>
        </div>
    );
};

export default AdminOrders;

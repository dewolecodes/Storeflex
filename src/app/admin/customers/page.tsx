"use client";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

const AdminCustomers = () => {
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
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-1">List and manage customers for tenant {tenantId || '...'}</p>
            <div className="mt-6">Customer list, profile view, and activity will live here.</div>
        </div>
    );
};

export default AdminCustomers;

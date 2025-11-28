"use client";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

const AdminSettings = () => {
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
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Store settings for tenant {tenantId || '...'}</p>
            <div className="mt-6">Store details, payment keys, shipping defaults, and tax settings will be managed here.</div>
        </div>
    );
};

export default AdminSettings;

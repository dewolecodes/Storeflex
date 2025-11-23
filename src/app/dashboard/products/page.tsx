"use client";
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

type Product = {
    id: string;
    name: string;
    price: number;
    stock?: number | null;
    sku?: string | null;
};

export default function ProductsPage() {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function fetchProducts() {
            setLoading(true);
            try {
                const res = await fetch('/api/merchant/products');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load');
                if (mounted) setProducts(data.products || []);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg || 'Error');
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Products</h2>
                <Link href="/dashboard/products/new" className="px-3 py-1 bg-blue-600 text-white rounded">Add product</Link>
            </div>

            {loading && <div className="p-4 bg-white rounded shadow">Loading products…</div>}
            {error && <div className="p-4 bg-white rounded shadow text-red-600">{error}</div>}

            {!loading && products.length === 0 && (
                <div className="p-4 bg-white rounded shadow">No products yet — this area will list tenant products.</div>
            )}

            <div className="grid grid-cols-3 gap-4">
                {products.map((p) => (
                    <div key={p.id} className="p-4 bg-white rounded shadow">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-sm text-gray-600">Price: ${p.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">Stock: {p.stock ?? '—'}</div>
                        <div className="text-sm text-gray-600">SKU: {p.sku ?? '—'}</div>
                        <div className="mt-3 flex items-center gap-2">
                            <a href={`/dashboard/products/${p.id}/edit`} className="px-2 py-1 bg-gray-100 rounded border text-sm">Edit</a>
                            <button
                                className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                                onClick={async () => {
                                    if (!confirm('Delete this product?')) return;
                                    try {
                                        const res = await fetch(`/api/merchant/products/${p.id}`, { method: 'DELETE' });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || 'Delete failed');
                                        setProducts((prev) => prev.filter((x) => x.id !== p.id));
                                    } catch (err: unknown) {
                                        const msg = err instanceof Error ? err.message : String(err);
                                        alert(msg || 'Error deleting');
                                    }
                                }}
                            >Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

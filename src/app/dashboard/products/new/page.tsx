"use client";
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import MultiImageUploader from '@/shared/components/UI/MultiImageUploader';

export default function NewProductPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', price: '', stock: '', sku: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [imagePublicIds, setImagePublicIds] = useState<string[]>([]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // file selection is handled by MultiImageUploader; keep previews state for uploader callbacks

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            // Use images collected from uploader (already uploaded if you pressed Upload there)
            const res = await fetch('/api/merchant/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    price: Number(form.price),
                    stock: form.stock ? Number(form.stock) : undefined,
                    sku: form.sku || undefined,
                    description: form.description || undefined,
                    images: images.length > 0 ? images : undefined,
                    imagesPublicIds: imagePublicIds.length > 0 ? imagePublicIds : undefined,
                    // NOTE: categoryId is required by the API; set to empty string or let UI add a category picker later
                    categoryId: (window as unknown as Record<string, unknown>).__defaultCategoryId as string | undefined || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Create failed');
            router.push('/dashboard/products');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg || 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Add product</h2>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input name="name" value={form.name} onChange={onChange} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Price</label>
                    <input name="price" value={form.price} onChange={onChange} type="number" step="0.01" className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Stock</label>
                    <input name="stock" value={form.stock} onChange={onChange} type="number" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <input name="sku" value={form.sku} onChange={onChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea name="description" value={form.description} onChange={onChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Images</label>
                    <MultiImageUploader onChange={(imgs, pids) => { setImages(imgs); setImagePublicIds(pids); }} />
                    {/* previews are handled inside MultiImageUploader; no local preview state needed */}
                </div>
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    );
}

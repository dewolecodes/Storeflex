"use client";
import { useRouter, useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import MultiImageUploader from '@/shared/components/UI/MultiImageUploader';

type FormState = {
    name: string;
    price: string;
    stock: string;
    sku: string;
    description: string;
    isAvailable: boolean;
};

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.productId as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>({ name: '', price: '', stock: '', sku: '', description: '', isAvailable: true });
    const [error, setError] = useState<string | null>(null);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [existingPublicIds, setExistingPublicIds] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`/api/merchant/products/${productId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load');
                if (!mounted) return;
                const p = data.product;
                setForm({
                    name: p.name || '',
                    price: (p.price ?? 0).toString(),
                    stock: p.stock != null ? String(p.stock) : '',
                    sku: p.sku ?? '',
                    description: p.description ?? '',
                    isAvailable: Boolean(p.isAvailable),
                });
                setExistingImages(Array.isArray(p.images) ? p.images : []);
                setExistingPublicIds(Array.isArray(p.imagesPublicIds) ? p.imagesPublicIds : []);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg || 'Error');
            } finally {
                setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [productId]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement & HTMLTextAreaElement;
        if (type === 'checkbox') setForm({ ...form, [name]: checked });
        else setForm({ ...form, [name]: value });
    };

    // MultiImageUploader handles previews and uploads internally

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            // existingImages and existingPublicIds are managed by the uploader component
            const res = await fetch(`/api/merchant/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    price: Number(form.price),
                    stock: form.stock ? Number(form.stock) : undefined,
                    sku: form.sku || undefined,
                    description: form.description || undefined,
                    isAvailable: form.isAvailable,
                    images: existingImages.length > 0 ? existingImages : undefined,
                    imagesPublicIds: existingPublicIds.length > 0 ? existingPublicIds : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            router.push('/dashboard/products');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg || 'Error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 bg-white rounded shadow">Loading…</div>;

    return (
        <div className="max-w-2xl bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Edit product</h2>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            <form onSubmit={handleSave} className="space-y-4">
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
                    <div className="mt-2">
                        {/* MultiImageUploader handles uploads, preview, reorder, and delete */}
                        <MultiImageUploader existingImages={existingImages} existingPublicIds={existingPublicIds} productId={productId} onChange={(imgs, pids) => { setExistingImages(imgs); setExistingPublicIds(pids); }} onUploadStateChange={(u) => setIsUploading(u)} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={onChange} />
                        <span className="text-sm">Available</span>
                    </label>
                </div>
                {isUploading && <div className="text-sm text-yellow-600">Uploading images — please wait before saving.</div>}
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={saving || isUploading} className="px-4 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
                    <button type="button" onClick={() => router.push('/dashboard/products')} className="px-4 py-2 border rounded">Cancel</button>
                </div>
            </form>
        </div>
    );
}

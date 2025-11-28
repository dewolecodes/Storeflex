"use client";
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

type Props = {
    existingImages?: string[]; // URLs
    existingPublicIds?: string[]; // aligned with existingImages
    productId?: string | null;
    onChange?: (images: string[], publicIds: string[]) => void;
    /** optional callback to inform parent when uploads are in progress */
    onUploadStateChange?: (uploading: boolean) => void;
    maxFiles?: number;
};

export default function MultiImageUploader({ existingImages = [], existingPublicIds = [], productId = null, onChange, onUploadStateChange, maxFiles = 10 }: Props) {
    const [images, setImages] = useState<string[]>([...existingImages]);
    const [publicIds, setPublicIds] = useState<string[]>([...existingPublicIds]);
    const [previews, setPreviews] = useState<string[]>([]); // local file previews (for new files)
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        // notify parent
        onChange?.(images, publicIds);
        // Only run when images/publicIds change. Parent callback identities may be recreated
        // each render (inline handlers) which would otherwise trigger this effect and
        // create a render loop when the parent updates state in response. We intentionally
        // omit the callback from deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images, publicIds]);

    useEffect(() => {
        onUploadStateChange?.(uploading);
        // Only run when uploading changes. See comment above about omitting the callback
        // from the dependency list to avoid unnecessary trigger loops when parents
        // pass inline functions.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploading]);
    useEffect(() => {
        return () => {
            // revoke object URLs on unmount
            previews.forEach((p) => {
                try { URL.revokeObjectURL(p); } catch {
                    // ignore
                }
            });
        };
    }, [previews]);

    const onFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const arr = Array.from(files).slice(0, maxFiles - images.length - pendingFiles.length);
        setPendingFiles((prev) => [...prev, ...arr]);
        setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
        // auto-start upload to avoid user forgetting to press Upload and leaving pending files
        // use a microtask so state updates propagate
        setTimeout(() => uploadPending(arr), 0);
    };

    const removeExisting = async (idx: number) => {
        const url = images[idx];
        if (!url) return;
        if (productId) {
            // call delete endpoint to remove from Cloudinary and DB
            try {
                const res = await fetch('/api/merchant/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, imageUrl: url }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Delete failed');
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                alert(msg || 'Failed to delete image');
                return;
            }
        }
        // remove locally
        const newImages = images.filter((_, i) => i !== idx);
        const newPublicIds = publicIds.filter((_, i) => i !== idx);
        setImages(newImages);
        setPublicIds(newPublicIds);
    };

    const uploadPending = async (filesOverride?: File[]) => {
        const toUpload = filesOverride ?? pendingFiles;
        if (!toUpload || toUpload.length === 0) return;
        setUploading(true);
        onUploadStateChange?.(true);
        try {
            for (const file of toUpload) {
                // sign
                const signRes = await fetch('/api/merchant/uploads/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, purpose: 'product', productId }) });
                const signData = await signRes.json();
                if (!signRes.ok) throw new Error(signData.error || 'Upload sign failed');

                const fd = new FormData();
                fd.append('file', file);
                fd.append('api_key', signData.apiKey);
                fd.append('timestamp', String(signData.timestamp));
                fd.append('signature', signData.signature);
                fd.append('folder', signData.folder);

                const uploadRes = await fetch(signData.uploadUrl, { method: 'POST', body: fd });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed');

                const secure_url = uploadData.secure_url as string;
                const public_id = uploadData.public_id as string;

                // append to local state
                setImages((prev) => [...prev, secure_url]);
                setPublicIds((prev) => [...prev, public_id ?? '']);

                // if we are editing an existing product, tell the server the upload completed
                // so the product's arrays are updated incrementally. For new products the
                // parent will submit the images in the create request.
                if (productId) {
                    try {
                        await fetch('/api/merchant/uploads/complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId, secure_url, public_id }),
                        });
                    } catch (e) {
                        // don't block UI on server-side completion failure; log for debugging
                        // eslint-disable-next-line no-console
                        console.warn('Failed to notify server of completed upload', e);
                    }
                }
            }
            // clear pending that we uploaded
            if (filesOverride) {
                // remove the uploaded files from pendingFiles (by reference)
                setPendingFiles((prev) => prev.filter((f) => !filesOverride.includes(f)));

                // uploaded previews were appended at the end in onFiles(), so drop the last N previews
                setPreviews((prev) => {
                    const n = toUpload.length;
                    if (n <= 0) return prev;
                    if (n >= prev.length) return [];
                    // revoke the object URLs we are removing
                    const removed = prev.slice(prev.length - n);
                    removed.forEach((u) => {
                        try { URL.revokeObjectURL(u); } catch {
                            // ignore
                        }
                    });
                    return prev.slice(0, prev.length - n);
                });
            } else {
                // revoke all previews when clearing
                previews.forEach((u) => {
                    try { URL.revokeObjectURL(u); } catch {
                        // ignore
                    }
                });
                setPendingFiles([]);
                setPreviews([]);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            alert(msg || 'Upload failed');
        } finally {
            setUploading(false);
            onUploadStateChange?.(false);
        }
    };

    const removePending = (idx: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
        setPreviews((prev) => {
            const p = prev[idx];
            if (p) {
                try { URL.revokeObjectURL(p); } catch {
                    // ignore
                }
            }
            return prev.filter((_, i) => i !== idx);
        });
    };

    const move = (from: number, to: number) => {
        if (from < 0 || to < 0 || from >= images.length || to >= images.length) return;
        const imgs = [...images];
        const pids = [...publicIds];
        const [img] = imgs.splice(from, 1);
        const [pid] = pids.splice(from, 1);
        imgs.splice(to, 0, img);
        pids.splice(to, 0, pid);
        setImages(imgs);
        setPublicIds(pids);
    };

    return (
        <div>
            <div className="mb-2">
                {/* keep the input reachable by automation: visually hide offscreen instead of display:none */}
                <input data-testid="multi-uploader-input" ref={inputRef} type="file" multiple accept="image/*" onChange={(e) => onFiles(e.target.files)} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
                <button type="button" className="px-2 py-1 border rounded" onClick={() => inputRef.current?.click()}>Select files</button>
                <button type="button" className="ml-2 px-2 py-1 border rounded" onClick={() => uploadPending()} disabled={uploading || pendingFiles.length === 0}>{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>

            {previews.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                    {previews.map((p, idx) => (
                        <div key={p} className="relative">
                            {/* previews are object URLs so use a native img element */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p} className="w-24 h-24 object-cover rounded border" alt="preview" />
                            <button type="button" onClick={() => removePending(idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1">X</button>
                        </div>
                    ))}
                </div>
            )}

            {images.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                    {images.map((img, idx) => (
                        <div key={img} className="relative">
                            <Image src={img} alt={`img-${idx}`} width={112} height={112} className="w-28 h-28 object-cover rounded border" />
                            <div className="flex gap-1 mt-1">
                                <button type="button" onClick={() => move(idx, Math.max(0, idx - 1))} className="px-1 py-0.5 border rounded">◀</button>
                                <button type="button" onClick={() => move(idx, Math.min(images.length - 1, idx + 1))} className="px-1 py-0.5 border rounded">▶</button>
                                <button type="button" onClick={() => removeExisting(idx)} className="px-1 py-0.5 border rounded text-red-600">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

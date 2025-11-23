"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ storeName: "", email: "", password: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storeName: form.storeName, email: form.email, password: form.password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");

            setSuccess(data.message || "Registration successful");
            // Optionally redirect to login or verify page
            setTimeout(() => {
                router.push("/login");
            }, 1200);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-2xl font-bold mb-2">Create your store</h1>
                <p className="text-sm text-gray-600 mb-4">Register as a merchant to get a dashboard and start selling.</p>

                {error && <div className="mb-4 text-red-600">{error}</div>}
                {success && <div className="mb-4 text-green-600">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Store name (optional for now)</label>
                        <input name="storeName" value={form.storeName} onChange={onChange} className="w-full px-3 py-2 border rounded" placeholder="My Store" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input name="email" value={form.email} onChange={onChange} type="email" required className="w-full px-3 py-2 border rounded" placeholder="you@example.com" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input name="password" value={form.password} onChange={onChange} type="password" required className="w-full px-3 py-2 border rounded" placeholder="At least 8 characters" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Confirm password</label>
                        <input name="confirmPassword" value={form.confirmPassword} onChange={onChange} type="password" required className="w-full px-3 py-2 border rounded" placeholder="Confirm password" />
                    </div>

                    <div className="flex items-center justify-between">
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            {loading ? "Creating..." : "Create Store"}
                        </button>
                        <a href="/login" className="text-sm text-gray-600 hover:underline">Already have an account?</a>
                    </div>
                </form>
            </div>
        </div>
    );
}

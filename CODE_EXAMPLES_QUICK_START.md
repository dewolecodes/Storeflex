/**
 * CODE EXAMPLES & QUICK START SNIPPETS
 * Copy-paste ready implementations for each phase
 */

// ====================== PHASE 2: UPDATED AUTH OPTIONS ======================

/**
 * File: src/shared/lib/authOptions.ts (UPDATED)
 * 
 * FIXES:
 * 1. ✅ Password hashing with bcrypt
 * 2. ✅ Tenant context in JWT
 * 3. ✅ Role-based access
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        // ✅ FIX: Use bcrypt.compare instead of plain comparison
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  
  // ✅ NEW: Use JWT strategy with tenant context
  session: {
    strategy: "jwt",
  },
  
  // ✅ NEW: Add tenant and role to JWT token
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.tenantId = token.tenantId;
        session.user.role = token.role;
        session.user.id = token.sub;
      }
      return session;
    },
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// ====================== PHASE 2: MERCHANT REGISTRATION ======================

/**
 * File: src/app/(auth)/register/page.tsx (NEW)
 * Merchant registration form
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Button from "@/shared/components/UI/button";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    storeName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: formData.storeName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Registration successful, redirect to verify email
      router.push("/auth/verify?email=" + encodeURIComponent(formData.email));
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Create Your Store</h1>
        <p className="text-gray-600 mb-6">Join Storeflex and start selling today</p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Store Name</label>
            <input
              type="text"
              required
              value={formData.storeName}
              onChange={(e) =>
                setFormData({ ...formData, storeName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="My Awesome Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white"
          >
            {loading ? "Creating..." : "Create Store"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have a store?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ====================== PHASE 2: REGISTER API ROUTE ======================

/**
 * File: src/app/api/auth/register/route.ts (NEW)
 * Handle merchant registration
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/shared/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { storeName, email, password } = await request.json();

    // Validation
    if (!storeName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // ✅ Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant (store)
    const tenant = await db.tenant.create({
      data: {
        name: storeName,
        slug: storeName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, ""),
        email,
      },
    });

    // Create user with MERCHANT role
    const user = await db.user.create({
      data: {
        email,
        name: storeName,
        hashedPassword,
        tenantId: tenant.id,
        role: "MERCHANT",
      },
    });

    // ✅ TODO: Send verification email
    // await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      {
        message: "Registration successful. Please verify your email.",
        tenantId: tenant.id,
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}

// ====================== PHASE 4: PROTECTED DASHBOARD LAYOUT ======================

/**
 * File: src/app/dashboard/layout.tsx (NEW)
 * Dashboard wrapper with protection
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

export const metadata: Metadata = {
  title: "Merchant Dashboard",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // ✅ Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // ✅ Verify user is a merchant
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });

  if (!user) {
    redirect("/auth/login");
  }

  // Only merchants and admins can access dashboard
  if (user.role === "CUSTOMER") {
    redirect("/");
  }

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{user.tenant?.name}</h1>
          <p className="text-gray-400 text-sm">Merchant Dashboard</p>
        </div>

        <nav className="space-y-2">
          <a
            href="/dashboard"
            className="block px-4 py-2 rounded hover:bg-gray-800"
          >
            Overview
          </a>
          <a
            href="/dashboard/products"
            className="block px-4 py-2 rounded hover:bg-gray-800"
          >
            Products
          </a>
          <a
            href="/dashboard/orders"
            className="block px-4 py-2 rounded hover:bg-gray-800"
          >
            Orders
          </a>
          <a
            href="/dashboard/analytics"
            className="block px-4 py-2 rounded hover:bg-gray-800"
          >
            Analytics
          </a>
          <a
            href="/dashboard/store/settings"
            className="block px-4 py-2 rounded hover:bg-gray-800"
          >
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">
              {/* Page title will be set by child pages */}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}

// ====================== PHASE 5: PRODUCT API ROUTES ======================

/**
 * File: src/app/api/merchant/products/route.ts (NEW)
 * GET products, POST create product
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

// ✅ GET: List merchant's products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ CRITICAL: Filter by tenantId
    const products = await db.product.findMany({
      where: { tenantId: session.user.tenantId },
      include: { category: true, brand: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// ✅ POST: Create product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validation
    if (!data.name || data.price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Always add tenantId from session
    const product = await db.product.create({
      data: {
        ...data,
        tenantId: session.user.tenantId, // ✅ CRITICAL: From JWT, not client
        slug: data.name.toLowerCase().replace(/\s+/g, "-"),
      },
    });

    // ✅ Log action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "PRODUCT_CREATED",
        entity: "Product",
        entityId: product.id,
        newData: JSON.stringify(product),
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

/**
 * File: src/app/api/merchant/products/[productId]/route.ts (NEW)
 * GET, PUT, DELETE product
 */

// ✅ Helper: Verify ownership
async function verifyProductOwnership(
  productId: string,
  tenantId: string
) {
  const product = await db.product.findUnique({
    where: { id: productId },
  });

  // ✅ CRITICAL: Check tenantId matches
  if (!product || product.tenantId !== tenantId) {
    throw new Error("Product not found or unauthorized");
  }

  return product;
}

// ✅ PUT: Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify ownership
    const oldProduct = await verifyProductOwnership(
      params.productId,
      session.user.tenantId
    );

    const data = await request.json();

    const product = await db.product.update({
      where: { id: params.productId },
      data,
    });

    // ✅ Log the change
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "PRODUCT_UPDATED",
        entity: "Product",
        entityId: product.id,
        oldData: JSON.stringify(oldProduct),
        newData: JSON.stringify(product),
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: error.message?.includes("unauthorized") ? 403 : 500 }
    );
  }
}

// ✅ DELETE: Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify ownership
    await verifyProductOwnership(params.productId, session.user.tenantId);

    // ✅ Log before deletion
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "PRODUCT_DELETED",
        entity: "Product",
        entityId: params.productId,
      },
    });

    await db.product.delete({
      where: { id: params.productId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}

// ====================== PHASE 4: DASHBOARD HOME PAGE ======================

/**
 * File: src/app/dashboard/page.tsx (NEW)
 * Dashboard overview
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);

  // ✅ Get stats filtered by tenantId
  const [productCount, orderCount, totalRevenue] = await Promise.all([
    db.product.count({
      where: { tenantId: session!.user.tenantId },
    }),
    db.order.count({
      where: { tenantId: session!.user.tenantId },
    }),
    db.order.aggregate({
      where: { tenantId: session!.user.tenantId },
      _sum: { totalPrice: true },
    }),
  ]);

  const revenue = totalRevenue._sum.totalPrice || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome back!</h1>

      <div className="grid grid-cols-4 gap-4">
        {/* Products Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Products</h3>
          <p className="text-3xl font-bold mt-2">{productCount}</p>
          <p className="text-xs text-gray-500 mt-2">in your store</p>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Orders</h3>
          <p className="text-3xl font-bold mt-2">{orderCount}</p>
          <p className="text-xs text-gray-500 mt-2">all time</p>
        </div>

        {/* Revenue Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">${revenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">all time</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Store Status</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">Active</p>
          <p className="text-xs text-gray-500 mt-2">ready to sell</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <a
            href="/dashboard/products/new"
            className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 text-center"
          >
            <p className="font-semibold text-blue-600">+ Add Product</p>
            <p className="text-sm text-gray-600">Upload a new product</p>
          </a>
          <a
            href="/dashboard/orders"
            className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50 text-center"
          >
            <p className="font-semibold text-green-600">View Orders</p>
            <p className="text-sm text-gray-600">See recent orders</p>
          </a>
        </div>
      </div>
    </div>
  );
}

// ====================== SUMMARY ======================

/*
These code examples show:

✅ PHASE 2 (Auth):
  - Updated authOptions with bcrypt
  - Registration page component
  - Register API route
  - Tenant creation on registration

✅ PHASE 4 (Dashboard):
  - Protected dashboard layout
  - Dashboard home page
  - Role-based access control

✅ PHASE 5 (Products):
  - Product API routes (GET, POST, PUT, DELETE)
  - Ownership verification
  - Audit logging
  - TenantId filtering on all queries

KEY PATTERNS TO FOLLOW:

1. Always get session first
2. Always check authorization
3. Always get tenantId from session.user.tenantId (NOT client)
4. Always filter queries by tenantId
5. Always verify ownership before mutations
6. Always log important actions

Copy-paste these and customize to your needs!
*/

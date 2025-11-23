/**
 * PHASE 4: DASHBOARD IMPLEMENTATION GUIDE
 * 
 * This guide shows how to build the merchant dashboard
 * Files to create and structure
 */

// ====================== DASHBOARD STRUCTURE ======================

/*
After Phase 3 (authentication), create dashboard with this structure:

/src/app/dashboard/
├── layout.tsx                    (Dashboard wrapper)
├── page.tsx                      (Dashboard home / overview)
├── products/
│   ├── page.tsx                  (Products list)
│   ├── new.tsx                   (Add new product)
│   └── [productId]/
│       ├── edit.tsx              (Edit product)
│       └── details.tsx           (View product details)
├── orders/
│   ├── page.tsx                  (Orders list)
│   └── [orderId]/
│       └── details.tsx           (Order details)
├── analytics/
│   ├── page.tsx                  (Analytics dashboard)
│   ├── sales.tsx                 (Sales trends)
│   └── traffic.tsx               (Traffic analysis)
├── store/
│   ├── settings.tsx              (Store name, logo)
│   └── branding.tsx              (Colors, theme)
├── account/
│   ├── profile.tsx               (User profile)
│   ├── security.tsx              (Password, 2FA)
│   └── billing.tsx               (Subscription, invoices)
└── support/
    ├── page.tsx                  (Help center)
    └── tickets.tsx               (Support tickets)
*/

// ====================== DASHBOARD LAYOUT ======================

/**
 * File: src/app/dashboard/layout.tsx
 * Main dashboard wrapper with sidebar and header
 */

/*
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import DashboardSidebar from "@/domains/merchant/components/DashboardSidebar";
import DashboardHeader from "@/domains/merchant/components/DashboardHeader";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Verify user is a merchant (not just a customer)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });

  if (!user || user.role === "CUSTOMER") {
    redirect("/"); // Redirect customers to store
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar user={user} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={user} tenant={user.tenant} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
*/

// ====================== DASHBOARD HOME PAGE ======================

/**
 * File: src/app/dashboard/page.tsx
 * Overview with stats and charts
 */

/*
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

import OverviewCards from "@/domains/merchant/components/OverviewCards";
import SalesChart from "@/domains/merchant/components/SalesChart";
import RecentOrders from "@/domains/merchant/components/RecentOrders";
import QuickActions from "@/domains/merchant/components/QuickActions";

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  // Get merchant stats
  const [productCount, orderCount, orders, revenue] = await Promise.all([
    // Count products
    db.product.count({
      where: { tenantId: user.tenantId },
    }),

    // Count orders
    db.order.count({
      where: { tenantId: user.tenantId },
    }),

    // Get recent orders
    db.order.findMany({
      where: { tenantId: user.tenantId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true, customer: true },
    }),

    // Get total revenue (aggregate)
    db.order.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { totalPrice: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <OverviewCards
        productCount={productCount}
        orderCount={orderCount}
        revenue={revenue._sum.totalPrice || 0}
        activeOrders={orders.filter((o) => o.status !== "DELIVERED").length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart orders={orders} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      <RecentOrders orders={orders} />
    </div>
  );
}
*/

// ====================== PRODUCTS PAGE ======================

/**
 * File: src/app/dashboard/products/page.tsx
 * List all merchant's products
 */

/*
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

import Button from "@/shared/components/UI/button";
import ProductsTable from "@/domains/merchant/components/ProductsTable";

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const products = await db.product.findMany({
    where: { tenantId: user.tenantId },
    include: { category: true, brand: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/dashboard/products/new">
          <Button>Add Product</Button>
        </Link>
      </div>

      <ProductsTable products={products} />
    </div>
  );
}
*/

// ====================== PRODUCT FORM ======================

/**
 * File: src/domains/merchant/components/ProductForm.tsx
 * Form for creating/editing products
 */

/*
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import Button from "@/shared/components/UI/button";
import FileUpload from "@/shared/components/UI/fileUpload";

// Validation schema
const productSchema = z.object({
  name: z.string().min(3, "Product name required"),
  description: z.string().optional(),
  price: z.number().min(0.01, "Price must be positive"),
  salePrice: z.number().optional(),
  stock: z.number().int().min(0),
  category: z.string().min(1, "Category required"),
  brand: z.string().optional(),
  images: z.array(z.string()).min(1, "At least one image required"),
  sku: z.string().optional(),
  isAvailable: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: ProductFormData;
  productId?: string;
}

export default function ProductForm({
  initialData,
  productId,
}: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);

    try {
      const payload = { ...data, images };

      const url = productId
        ? `/api/merchant/products/${productId}`
        : "/api/merchant/products";

      const method = productId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save product");

      router.push("/dashboard/products");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-2xl"
    >
      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Product Name</label>
        <input
          {...register("name")}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Enter product name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          {...register("description")}
          className="w-full px-3 py-2 border rounded-lg"
          rows={4}
          placeholder="Enter product description"
        />
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            {...register("price", { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Sale Price (Optional)
          </label>
          <input
            {...register("salePrice", { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Stock */}
      <div>
        <label className="block text-sm font-medium mb-1">Stock</label>
        <input
          {...register("stock", { valueAsNumber: true })}
          type="number"
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="0"
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium mb-1">Product Images</label>
        <FileUpload
          onUpload={(urls) => setImages(urls)}
          maxFiles={5}
          accepting="image/*"
        />
        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {images.map((url) => (
              <div
                key={url}
                className="relative aspect-square rounded-lg overflow-hidden"
              >
                <img src={url} alt="Product" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Product"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
*/

// ====================== REQUIRED COMPONENTS ======================

/*
Components to create in /src/domains/merchant/components/:

1. DashboardSidebar.tsx
   - Navigation menu
   - Links to products, orders, analytics, settings
   - User menu with logout

2. DashboardHeader.tsx
   - Store name/logo
   - Search bar
   - User profile dropdown
   - Notifications bell

3. OverviewCards.tsx
   - Stats cards: Total Products, Orders, Revenue, Active Orders
   - Display as percentage change vs last period

4. SalesChart.tsx
   - Line/bar chart showing sales over time
   - Use Recharts for visualization

5. RecentOrders.tsx
   - Table of last 5 orders
   - Order ID, customer, status, total, date

6. ProductsTable.tsx
   - All merchant products
   - Columns: Name, Category, Price, Stock, Status, Actions
   - Edit/Delete buttons

7. QuickActions.tsx
   - Buttons for: Add Product, View Orders, Settings

8. ProductForm.tsx
   - Already shown above

9. OrderDetailsPage.tsx
   - Order info, items, customer, shipping

10. AnalyticsCharts.tsx
    - Sales trends, traffic, products performance
*/

// ====================== API ROUTES FOR DASHBOARD ======================

/**
 * File: src/app/api/merchant/products/route.ts
 * GET: List products
 * POST: Create product
 */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

// GET: List merchant's products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

// POST: Create product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validate data
    if (!data.name || data.price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        ...data,
        tenantId: session.user.tenantId,
        slug: data.name.toLowerCase().replace(/\s+/g, "-"),
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
*/

/**
 * File: src/app/api/merchant/products/[productId]/route.ts
 * GET: Get single product
 * PUT: Update product
 * DELETE: Delete product
 */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";

// Helper: Verify product ownership
async function verifyProductOwnership(
  productId: string,
  tenantId: string
) {
  const product = await db.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.tenantId !== tenantId) {
    throw new Error("Product not found or unauthorized");
  }

  return product;
}

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const product = await verifyProductOwnership(
      params.productId,
      session.user.tenantId
    );

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch product" },
      { status: error.message?.includes("not found") ? 404 : 500 }
    );
  }
}

// PUT
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyProductOwnership(params.productId, session.user.tenantId);

    const data = await request.json();

    const product = await db.product.update({
      where: { id: params.productId },
      data,
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyProductOwnership(params.productId, session.user.tenantId);

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
*/

// ====================== STYLING WITH TAILWIND ======================

/*
Dashboard should use consistent styling. Key classes:

Cards:
  className="bg-white rounded-lg shadow p-6"

Buttons:
  Primary: className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
  Secondary: className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"

Text:
  Heading: className="text-3xl font-bold text-gray-900"
  Subheading: className="text-lg font-semibold text-gray-800"
  Body: className="text-sm text-gray-600"

Tables:
  Header: className="bg-gray-100 font-semibold"
  Row: className="border-b hover:bg-gray-50"

Forms:
  Input: className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
*/

// ====================== NEXT STEPS ======================

/*
After building the dashboard:

1. Test authentication flow
   - Verify merchants can't access other merchants' products
   - Test role-based access (MERCHANT vs CUSTOMER)

2. Test product management
   - Create, edit, delete products
   - Verify image uploads work
   - Test inventory tracking

3. Performance optimization
   - Add pagination to product list
   - Cache frequently accessed data
   - Optimize database queries with indexes

4. Move to Phase 5: Store Frontend Updates
   - Update store to show products from different merchants
   - Add merchant profile pages
   - Add product filtering by merchant

For detailed implementation, see:
- DASHBOARD_COMPONENTS_DETAILED.md (detailed component code)
- API_ROUTES_GUIDE.md (API endpoint examples)
*/

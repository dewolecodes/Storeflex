/**
 * DATA PROTECTION & SECURITY GUIDE FOR MULTI-TENANT SYSTEM
 * 
 * CRITICAL: These rules must be followed to prevent data breaches
 * where merchants access other merchants' data
 */

// ====================== CORE PRINCIPLES ======================

/*
🔒 GOLDEN RULE #1: TENANT ID FILTERING
Every database query MUST filter by tenantId. No exceptions.

❌ NEVER DO THIS:
  const products = await db.product.findMany();  // Returns ALL products!

✅ ALWAYS DO THIS:
  const products = await db.product.findMany({
    where: { tenantId: session.user.tenantId }
  });


🔒 GOLDEN RULE #2: OWNERSHIP VERIFICATION
Before updating/deleting, verify ownership

❌ NEVER DO THIS:
  await db.product.update({
    where: { id: productId },
    data: { name: "New Name" }  // No ownership check!
  });

✅ ALWAYS DO THIS:
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.tenantId !== session.user.tenantId) {
    throw new Error("Unauthorized");
  }
  await db.product.update({
    where: { id: productId },
    data: { name: "New Name" }
  });


🔒 GOLDEN RULE #3: SERVER-SIDE TENANT CONTEXT
Never trust tenant ID from client. Always use server session.

❌ NEVER DO THIS:
  const tenantId = request.query.tenantId;  // From URL/client!
  await db.product.findMany({ where: { tenantId } });

✅ ALWAYS DO THIS:
  const session = await getServerSession(authOptions);
  const tenantId = session.user.tenantId;  // From JWT/server session
  await db.product.findMany({ where: { tenantId } });
*/

// ====================== HELPER FUNCTIONS ======================

/**
 * File: src/shared/lib/dataProtection.ts
 * Utilities for tenant context and ownership verification
 */

/*
import { Session } from "next-auth";
import { db } from "./db";

// Get tenant ID from session (safe way)
export function getTenantId(session: Session | null): string {
  if (!session?.user?.tenantId) {
    throw new Error("No tenant context");
  }
  return session.user.tenantId;
}

// Verify product ownership
export async function verifyProductOwnership(
  productId: string,
  tenantId: string
): Promise<boolean> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { tenantId: true },
  });

  return product?.tenantId === tenantId;
}

// Verify order ownership
export async function verifyOrderOwnership(
  orderId: string,
  tenantId: string
): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { tenantId: true },
  });

  return order?.tenantId === tenantId;
}

// Verify customer ownership
export async function verifyCustomerOwnership(
  customerId: string,
  tenantId: string
): Promise<boolean> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) return false;

  // Check if any orders from this customer belong to this tenant
  const order = await db.order.findFirst({
    where: {
      customerId: customerId,
      tenantId: tenantId,
    },
  });

  return !!order;
}

// Create safe query with tenant filter
export function createTenantFilter(tenantId: string) {
  return { tenantId };
}

// Audit log helper
export async function logAudit(
  userId: string,
  tenantId: string,
  action: string,
  entity: string,
  entityId: string,
  oldData?: any,
  newData?: any
) {
  await db.auditLog.create({
    data: {
      userId,
      tenantId,
      action,
      entity,
      entityId,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
    },
  });
}
*/

// ====================== MIDDLEWARE FOR TENANT CONTEXT ======================

/**
 * File: src/middleware.ts
 * Extract and validate tenant context from request
 */

/*
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Check if accessing protected routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token?.sub) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Verify token has tenant context
    if (!token.tenantId) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Clone request and add tenant to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", token.tenantId);
    requestHeaders.set("x-user-id", token.sub);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/merchant/:path*",
  ],
};
*/

// ====================== API ROUTE PROTECTION PATTERN ======================

/**
 * Safe API route pattern - ALWAYS follow this
 */

/*
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/authOptions";
import { db } from "@/shared/lib/db";
import { getTenantId, verifyProductOwnership } from "@/shared/lib/dataProtection";

// Pattern for ALL merchant API routes

export async function GET(
  request: NextRequest,
  { params }: { params: { productId?: string } }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get tenant ID safely from session
    const tenantId = getTenantId(session);

    // 3. Check authorization (if needed)
    if (params.productId) {
      const isOwner = await verifyProductOwnership(params.productId, tenantId);
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 4. Query with tenant filter
    const product = await db.product.findUnique({
      where: { id: params.productId },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
*/

// ====================== ROLE-BASED ACCESS CONTROL ======================

/**
 * Roles and their permissions
 */

/*
ADMIN (Platform Owner)
- Can access all tenants' data
- Can suspend/activate tenants
- Can view all analytics
- Full system access
- Check: session.user.role === "ADMIN"

MERCHANT (Seller)
- Can access only OWN tenant's data
- Can manage own products
- Can view own orders
- Can manage own profile
- Cannot see other merchants' data
- Check: session.user.role === "MERCHANT" && owns resource

STAFF (Team Member)
- Can access tenant's data if invited
- Limited permissions (assigned by merchant)
- Cannot manage billing/settings
- Check: session.user.role === "STAFF" && tenant allows

CUSTOMER (Buyer)
- Can only view public store
- Can create account and place orders
- Can view own orders
- Check: session.user.role === "CUSTOMER"

EXAMPLE IMPLEMENTATION:

function checkPermission(user: User, action: string, resource: any) {
  switch (user.role) {
    case "ADMIN":
      return true; // Admin has all permissions

    case "MERCHANT":
      // Merchant can only access own tenant's data
      return user.tenantId === resource.tenantId;

    case "STAFF":
      // Staff member - check if assigned to this tenant
      return user.tenantId === resource.tenantId;

    case "CUSTOMER":
      // Customers can only access their own data
      return user.id === resource.userId;

    default:
      return false;
  }
}
*/

// ====================== QUERY PATTERNS (DO'S AND DON'Ts) ======================

/*
✅ CORRECT PATTERNS:

1. Fetch user's products:
   db.product.findMany({
     where: { tenantId: session.user.tenantId }
   })

2. Fetch user's orders:
   db.order.findMany({
     where: { tenantId: session.user.tenantId }
   })

3. Fetch specific product with ownership check:
   const product = await db.product.findUnique({ where: { id } });
   if (product?.tenantId !== session.user.tenantId) throw error;

4. Update user's product:
   const product = await db.product.findUnique({ where: { id } });
   if (product?.tenantId !== session.user.tenantId) throw error;
   await db.product.update({
     where: { id },
     data: { ... }
   });

5. Count user's data:
   db.product.count({
     where: { tenantId: session.user.tenantId }
   })

6. Aggregate user's stats:
   db.order.aggregate({
     where: { tenantId: session.user.tenantId },
     _sum: { totalPrice: true }
   })


❌ DANGEROUS PATTERNS (NEVER USE):

1. No tenant filter:
   db.product.findMany()  // ❌ Returns ALL products!

2. Using client-provided tenantId:
   const { tenantId } = request.query;
   db.product.findMany({ where: { tenantId } })  // ❌ Not verified!

3. Assuming ownership:
   await db.product.delete({ where: { id } })  // ❌ No verification!

4. Querying by email only:
   db.user.findUnique({ where: { email } })  // ❌ Could be another tenant!

5. Join without tenant filter:
   db.product.findMany({
     include: { orders: true }  // ❌ Orders from all tenants!
   })

6. Bulk operations without filter:
   await db.product.deleteMany()  // ❌ Deletes ALL products!
   await db.order.updateMany({ data: { ... } })  // ❌ Updates all orders!
*/

// ====================== AUDITING & LOGGING ======================

/**
 * Log all important actions for compliance
 */

/*
CRITICAL ACTIONS TO LOG:

1. Data Access
   - When merchant views order details
   - When merchant downloads reports
   - Who accessed what data and when

2. Data Modification
   - Product created/updated/deleted
   - Order status changed
   - Price changes
   - Inventory changes

3. Account Changes
   - Password changed
   - Email changed
   - Payment method added/removed
   - Settings updated

4. Access Control
   - User added to team
   - User removed from team
   - Permission changes
   - Role changes

5. Suspicious Activity
   - Failed login attempts
   - Unusual access patterns
   - API rate limit exceeded
   - Attempted unauthorized access

IMPLEMENTATION:

async function logAction(
  userId: string,
  tenantId: string,
  action: string,
  entity: string,
  entityId: string,
  oldData?: any,
  newData?: any,
  ipAddress?: string
) {
  await db.auditLog.create({
    data: {
      userId,
      tenantId,
      action,
      entity,
      entityId,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      ipAddress,
      userAgent: request.headers["user-agent"],
    },
  });
}

EXAMPLE: After updating product
const oldProduct = await db.product.findUnique({ where: { id } });
await db.product.update({ where: { id }, data });
await logAction(
  session.user.id,
  session.user.tenantId,
  "PRODUCT_UPDATED",
  "Product",
  id,
  oldProduct,
  newData
);
*/

// ====================== RATE LIMITING ======================

/*
Prevent abuse by rate limiting:

1. Authentication endpoints
   - /api/auth/login: 5 attempts per 15 minutes
   - /api/auth/register: 3 per hour per IP
   - /api/auth/reset-password: 3 per hour per email

2. API endpoints
   - Merchant API: 100 requests per minute per user
   - Public API: 1000 requests per hour per IP

3. File uploads
   - Max file size: 50MB
   - Max 5 files per product
   - Scan for malware

IMPLEMENTATION (use rate-limit library):

import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, try again later",
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // Handle login
});
*/

// ====================== FILE UPLOAD SECURITY ======================

/*
When merchants upload product images:

1. Validation
   - Check file type (must be image)
   - Check file size (max 10MB)
   - Check file name (sanitize)
   - Check image dimensions

2. Scanning
   - Scan for malware
   - Verify it's a real image
   - Strip EXIF data

3. Storage
   - Store in dedicated Cloudinary account
   - Use tenant-specific folder: /tenant-{tenantId}/
   - Generate random file names
   - Don't store sensitive metadata

4. Access Control
   - Images publicly readable (store photos)
   - But track usage analytics
   - Don't expose file listing

IMPLEMENTATION:

async function uploadProductImage(
  file: File,
  tenantId: string
): Promise<string> {
  // 1. Validate
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file type");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File too large");
  }

  // 2. Upload to Cloudinary with tenant folder
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", `storeflex/${tenantId}`);
  formData.append("resource_type", "auto");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${process.env.CLOUDINARY_API_SECRET}`,
      },
    }
  );

  const data = await response.json();
  return data.secure_url;
}
*/

// ====================== GDPR & DATA PRIVACY ======================

/*
Considerations for multi-tenant system:

1. Data Ownership
   - Each tenant owns their customer data
   - Merchants can export customer lists
   - Customers can request data export

2. Data Deletion
   - Deleted products cannot be recovered
   - Deleted orders stay (for records) but anonymized
   - Deleted customers have data removed after 30 days

3. Data Portability
   - Customers can request their data
   - Merchants can export their data
   - Format: JSON or CSV

4. Consent Management
   - Get consent for email marketing
   - Track consent per merchant
   - Allow customers to opt-out

5. Breach Notification
   - Log all security incidents
   - Notify affected parties within 72 hours
   - Keep audit trail for investigation
*/

// ====================== SECURITY CHECKLIST ======================

/*
☑️ Authentication
- [ ] JWT secrets configured
- [ ] Password hashing with bcrypt (>= 10 rounds)
- [ ] Session timeout (15 minutes recommended)
- [ ] CSRF protection enabled
- [ ] Rate limiting on login

☑️ Authorization
- [ ] Role-based access control implemented
- [ ] Tenant ID filter on ALL queries
- [ ] Ownership verification before mutations
- [ ] No direct client-provided IDs trusted

☑️ Data Protection
- [ ] Audit logging enabled
- [ ] Sensitive data encrypted
- [ ] SQL injection prevention (using ORM)
- [ ] XSS prevention (sanitize output)
- [ ] CORS properly configured

☑️ Infrastructure
- [ ] HTTPS only (no HTTP)
- [ ] Secrets in environment variables
- [ ] Database backups automated
- [ ] Database access restricted
- [ ] Monitoring and alerting enabled

☑️ Testing
- [ ] Security tests written
- [ ] Tenant isolation tests pass
- [ ] Ownership verification tested
- [ ] Rate limiting tested
- [ ] Penetration testing done

☑️ Compliance
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] GDPR compliance
- [ ] Data retention policy
- [ ] Incident response plan
*/

// ====================== NEXT STEPS ======================

/*
1. Implement all helper functions from dataProtection.ts
2. Set up middleware.ts for tenant context extraction
3. Update all API routes to follow safe patterns
4. Add audit logging to critical operations
5. Implement rate limiting on auth endpoints
6. Set up monitoring and alerting
7. Run security audit before production
8. Set up regular security reviews (quarterly)
*/

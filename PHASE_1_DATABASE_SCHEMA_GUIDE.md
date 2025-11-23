/**
 * Implementation Guide: Phase 1 - Database Schema Update
 *
 * This guide walks through updating the Prisma schema for multi-tenancy.
 * Steps:
 * 1. Backup current database (MongoDB export)
 * 2. Review schema.prisma.NEW (the updated schema)
 * 3. Run migrations
 * 4. Test data isolation
 */

// ====================== STEP 1: BACKUP DATABASE ======================

// In your terminal, run:
// mongodump --uri "your-mongodb-connection-string" --out ./backup

// ====================== STEP 2: UPDATE SCHEMA ======================

// 1. Open prisma/schema.prisma
// 2. Replace entire contents with schema.prisma.NEW
// 3. Save the file

// ====================== STEP 3: RUN MIGRATION ======================

// Run:
// npx prisma migrate dev --name add_multi_tenant_support

// ====================== STEP 4: TEST DATA ISOLATION ======================

// Add this test file to verify tenant isolation works

/**
 * File: tests/tenantIsolation.test.ts
 * Test data isolation with new schema
 */

import { db } from "@/shared/lib/db";

async function testTenantIsolation() {
  try {
    // Create Tenant 1
    const tenant1 = await db.tenant.create({
      data: {
        name: "Test Store 1",
        slug: "test-store-1",
        email: "store1@example.com",
      },
    });

    // Create Tenant 2
    const tenant2 = await db.tenant.create({
      data: {
        name: "Test Store 2",
        slug: "test-store-2",
        email: "store2@example.com",
      },
    });

    // Create User for Tenant 1
    const user1 = await db.user.create({
      data: {
        email: "user1@example.com",
        name: "User 1",
        tenantId: tenant1.id,
        hashedPassword: "hashedpass",
        role: "MERCHANT",
      },
    });

    // Create Category (shared)
    const category = await db.category.create({
      data: {
        name: "Electronics",
        url: "electronics",
        slug: "electronics",
      },
    });

    // Create Brand (shared)
    const brand = await db.brand.create({
      data: {
        name: "Sony",
        slug: "sony",
      },
    });

    // Create Product for Tenant 1
    const product1 = await db.product.create({
      data: {
        name: "Laptop A",
        slug: "laptop-a",
        price: 1000,
        tenantId: tenant1.id,
        categoryID: category.id,
        brandID: brand.id,
      },
    });

    // Create Product for Tenant 2
    const product2 = await db.product.create({
      data: {
        name: "Laptop B",
        slug: "laptop-b",
        price: 1200,
        tenantId: tenant2.id,
        categoryID: category.id,
        brandID: brand.id,
      },
    });

    // TEST: Query Tenant 1's products only
    const tenant1Products = await db.product.findMany({
      where: { tenantId: tenant1.id },
    });

    console.log("✅ Tenant 1 sees", tenant1Products.length, "products");
    console.assert(tenant1Products.length === 1, "Should see 1 product");
    console.assert(tenant1Products[0].name === "Laptop A", "Should be Laptop A");

    // TEST: Query Tenant 2's products only
    const tenant2Products = await db.product.findMany({
      where: { tenantId: tenant2.id },
    });

    console.log("✅ Tenant 2 sees", tenant2Products.length, "products");
    console.assert(tenant2Products.length === 1, "Should see 1 product");
    console.assert(tenant2Products[0].name === "Laptop B", "Should be Laptop B");

    // TEST: Query all products (without filter) - DO NOT DO THIS IN PRODUCTION
    const allProducts = await db.product.findMany();
    console.log("⚠️  Without filter, query returns", allProducts.length, "products");
    console.assert(
      allProducts.length === 2,
      "This shows why filtering by tenantId is CRITICAL"
    );

    console.log("\n✅ All isolation tests passed!");

    // Cleanup
    await db.product.deleteMany({});
    await db.tenant.deleteMany({});
    await db.user.deleteMany({});
    await db.category.deleteMany({});
    await db.brand.deleteMany({});
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run test: npx tsx tests/tenantIsolation.test.ts

// ====================== MIGRATION CHECKLIST ======================

/*
After running the migration:

☑️ MongoDB collections created:
  - tenant (new)
  - user (updated - added tenantId, role)
  - product (updated - added tenantId, slug, stock)
  - order (new)
  - orderitem (new)
  - customer (new)
  - address (new)
  - auditlog (new)
  - notification (new)

☑️ Old data handling:
  - Existing users need tenantId assigned
  - Existing products need tenantId assigned
  - Create default "Admin" tenant for existing data

☑️ Create migration script:

  File: prisma/migrations/[timestamp]_add_multi_tenant_support/migration.ts
*/

// ====================== DATA MIGRATION SCRIPT ======================

/**
 * File: scripts/migrateToMultiTenant.ts
 * Migrates existing data to new multi-tenant structure
 * Run after schema migration: npx tsx scripts/migrateToMultiTenant.ts
 */

import { db } from "@/shared/lib/db";
import { UserRole, TenantStatus, SubscriptionPlan } from "@prisma/client";

async function migrateToMultiTenant() {
  console.log("🔄 Starting migration to multi-tenant...");

  try {
    // Step 1: Create default "Admin" tenant for existing products/users
    const adminTenant = await db.tenant.create({
      data: {
        name: "Storeflex Admin",
        slug: "storeflex-admin",
        email: "admin@storeflex.com",
        plan: SubscriptionPlan.ENTERPRISE,
        status: TenantStatus.ACTIVE,
      },
    });

    console.log("✅ Created admin tenant:", adminTenant.id);

    // Step 2: Update existing users
    const users = await db.user.findMany({
      where: { tenantId: null }, // Users without tenantId
    });

    for (const user of users) {
      await db.user.update({
        where: { id: user.id },
        data: {
          tenantId: adminTenant.id,
          role: UserRole.MERCHANT, // or ADMIN for existing admin users
        },
      });
    }

    console.log(`✅ Updated ${users.length} users with tenant association`);

    // Step 3: Update existing products
    const products = await db.product.findMany({
      where: { tenantId: null },
    });

    for (const product of products) {
      await db.product.update({
        where: { id: product.id },
        data: {
          tenantId: adminTenant.id,
          slug: product.name.toLowerCase().replace(/\s+/g, "-"), // Auto-generate slug
        },
      });
    }

    console.log(`✅ Updated ${products.length} products with tenant association`);

    console.log("\n✅ Migration completed successfully!");
    console.log(`ℹ️  Admin Tenant ID: ${adminTenant.id}`);
    console.log("ℹ️  All existing data is now under the admin tenant");
    console.log("ℹ️  Next: Create merchant registration flow");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run: npx tsx scripts/migrateToMultiTenant.ts

// ====================== KEY SCHEMA CHANGES SUMMARY ======================

/*
ADDED MODELS:
- Tenant (merchants/sellers)
- Customer (separate from User)
- Order & OrderItem (for orders)
- Address (shipping addresses)
- AuditLog (track changes)
- Notification (user notifications)

UPDATED MODELS:
- User: Added tenantId, role field
- Product: Added tenantId, slug, stock, cost, etc.
- Category: Made tenantId optional (shared categories)
- Brand: Made tenantId optional (shared brands)

KEY RELATIONSHIPS:
- Tenant > Users (1:many)
- Tenant > Products (1:many)
- Tenant > Orders (1:many)
- User > Tenant (many:1)
- Product > Tenant (many:1)
- Product > Orders via OrderItems

DATA ISOLATION:
- All queries MUST include WHERE { tenantId: ... }
- No query should return cross-tenant data
- Use middleware to verify tenant context
*/

// ====================== IMPORTANT: PASSWORD HASHING FIX ======================

/*
CRITICAL SECURITY ISSUE IN CURRENT CODE:

Current authOptions.ts line ~26:
  if (credentials.password !== user.hashedPassword) {  ❌ WRONG
    throw new Error("Invalid credentials");
  }

This does a PLAIN STRING COMPARISON without hashing!
Passwords are stored as plain text or not hashed properly.

FIX - Update authOptions.ts:
*/

// BEGIN FIX
import bcrypt from "bcryptjs";

// In the authorize function:
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Invalid credentials");
  }

  const user = await db.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user || !user?.hashedPassword) {
    throw new Error("Invalid credentials");
  }

  // ✅ CORRECT: Hash comparison
  const isPasswordValid = await bcrypt.compare(
    credentials.password,
    user.hashedPassword
  );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  return user;
}
// END FIX

/*
Also update registration to hash passwords:

const hashedPassword = await bcrypt.hash(password, 10);
await db.user.create({
  email,
  hashedPassword,  // ✅ Store hashed password
});
*/

// ====================== NEXT PHASE ======================

/*
After Phase 1 is complete:
1. Verify all migrations run successfully
2. Test data isolation with the test script
3. Update password hashing in auth system
4. Move to Phase 2: Implement merchant registration
5. See MERCHANT_REGISTRATION_IMPLEMENTATION.md for next steps
*/

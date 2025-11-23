# Storeflex Multi-Tenant Conversion Plan & Code Review

**Date:** November 19, 2025  
**Project:** Storeflex E-Commerce → Multi-Tenant E-Commerce Platform

---

## 📋 EXECUTIVE SUMMARY

Your current Storeflex application is a **single-vendor e-commerce platform** with:
- ✅ Centralized admin dashboard (only for store owner)
- ✅ Product/Brand/Category management
- ✅ Traffic analytics
- ✅ Shopping cart functionality
- ✅ NextAuth authentication

**Goal:** Convert to a **multi-tenant SaaS platform** where:
- 👥 Multiple merchants register and create accounts
- 🏪 Each merchant gets their own branded dashboard
- 📦 Merchants upload their own products
- 💳 Revenue sharing through subscriptions/commission
- 🛒 Single storefront showing all merchants' products

---

## 🔍 CURRENT ARCHITECTURE ANALYSIS

### 1. **Database Schema (Prisma/MongoDB)**

**Current Models:**
```
- Category (single, centralized)
- Brand (single, centralized)
- Product (attached to Category & Brand)
- User (basic NextAuth user)
- Account (OAuth integration)
- PageVisit (analytics)
```

**Issues for Multi-Tenancy:**
1. ❌ **No Tenant Model** - Database has no concept of merchants/sellers
2. ❌ **Shared Categories/Brands** - All products share same category/brand namespace
3. ❌ **No Tenant Isolation** - No row-level security or data boundaries
4. ❌ **Single Admin** - User model doesn't distinguish between store owner and merchants
5. ❌ **No Tenant Metadata** - Missing store name, logo, commission rates, status, etc.

---

### 2. **Authentication System**

**Current Setup:**
- NextAuth with Credentials provider
- JWT strategy
- PrismaAdapter for sessions
- Basic user/email login

**Issues for Multi-Tenancy:**
1. ❌ **Single Sign-On Point** - Currently all users redirect to `/admin` (store owner only)
2. ❌ **No Merchant Registration** - No signup flow for new sellers
3. ❌ **No Tenant Context** - Sessions don't carry tenant information
4. ❌ **No Role-Based Access** - No distinction between merchant, admin, customer
5. ❌ **Plain Text Passwords** - Passwords stored without hashing (security risk!)

**Current Auth Options:**
```typescript
// Location: src/shared/lib/authOptions.ts
// Uses plain password comparison (credentials.password !== user.hashedPassword)
// No password hashing on login
```

---

### 3. **Admin Dashboard**

**Current State:**
- Located at `/admin`
- Minimal UI (just "Dashboard" text)
- Sidebar with navigation
- Protected route (redirects to `/` if not authenticated)

**Current Pages:**
- `/admin` - Home
- `/admin/brands` - Brand management
- `/admin/categories` - Category management
- `/admin/products` - Product management
- `/admin/trafficView/[pageNumber]` - Analytics

**Issues:**
1. ❌ **Single Owner Only** - Not designed for multiple merchants
2. ❌ **Empty UI** - Placeholder content
3. ❌ **No User Onboarding** - No setup wizard for new merchants
4. ❌ **No Stats** - Missing revenue, order count, product metrics

---

### 4. **Product Management**

**Current Features:**
- Add/Edit/Delete products
- Category-specific specifications
- Brand assignment
- Price and sale price
- Image handling (Cloudinary)
- Availability status

**Issues for Multi-Tenancy:**
1. ❌ **No Product Ownership** - No field to track which merchant owns the product
2. ❌ **Shared Inventory** - No per-merchant inventory management
3. ❌ **No Commission Tracking** - No revenue calculation per merchant
4. ❌ **No Order Tracking** - No order model to track sales

---

### 5. **Frontend Store**

**Current Features:**
- Homepage with slides
- Product listing with filters
- Product detail pages
- Shopping cart (Redux-based)
- Skeleton loading

**Issues for Multi-Tenancy:**
1. ❌ **No Merchant Branding** - Single brand throughout
2. ❌ **No Store Separation** - Can't view products by merchant
3. ❌ **No Seller Profile** - No way to see merchant details
4. ❌ **No Order System** - No checkout/payment flow
5. ❌ **No Customer Accounts** - Customers can't create accounts or track orders

---

### 6. **Tech Stack Analysis**

**Strengths:**
- ✅ Next.js 14 (App Router) - Good for complex routing
- ✅ MongoDB - Flexible schema for multi-tenant data
- ✅ Prisma - Good ORM for relationships
- ✅ NextAuth - Production-ready auth
- ✅ TypeScript - Type safety
- ✅ TailwindCSS - Rapid UI development
- ✅ Redux - State management

**Gaps for Multi-Tenancy:**
- ❌ No payment processing (Stripe, PayPal)
- ❌ No image upload library (form-data handling)
- ❌ No email service (order confirmations)
- ❌ No rate limiting/abuse protection
- ❌ No audit logging

---

## 🎯 REQUIRED CHANGES FOR MULTI-TENANCY

### **Priority 1: DATABASE SCHEMA** (CRITICAL)

#### Changes Needed:

```typescript
// NEW: Tenant Model (Merchant/Seller)
model Tenant {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  name            String
  slug            String    @unique  // subdomain or URL slug
  email           String    @unique
  logo            String?   // Cloudinary URL
  description     String?
  contactEmail    String?
  phone           String?
  
  // Subscription info
  plan            SubscriptionPlan  @default(STARTER)
  status          TenantStatus      @default(ACTIVE)
  subscriptionId  String?           // Stripe subscription ID
  
  // Metadata
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  users           User[]
  products        Product[]
  orders          Order[]
  analytics       Analytics[]
  
  @@index([slug])
}

// UPDATED: User Model
model User {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  tenantId        String    @db.ObjectId           // NEW: Link to tenant
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  email           String?   @unique
  name            String?
  role            UserRole  @default(MERCHANT)    // NEW: Role
  hashedPassword  String?
  emailVerified   DateTime?
  image           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  accounts        Account[]
  
  @@index([tenantId])
}

// UPDATED: Product Model
model Product {
  id              String      @id @default(auto()) @map("_id") @db.ObjectId
  
  tenantId        String      @db.ObjectId         // NEW: Link to tenant
  tenant          Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  name            String
  slug            String                           // NEW: URL slug
  description     String?
  
  category        Category    @relation(fields: [categoryID], references: [id])
  categoryID      String      @db.ObjectId
  
  brand           Brand       @relation(fields: [brandID], references: [id])
  brandID         String      @db.ObjectId
  
  price           Float
  salePrice       Float?
  commission      Float?      // NEW: Platform commission
  
  images          String[]
  isAvailable     Boolean     @default(true)
  specialFeatures String[]
  
  specs           ProductSpec[]
  optionSets      String[]    @db.ObjectId
  
  pageVisits      PageVisit[]
  orderItems      OrderItem[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@index([tenantId])
  @@index([categoryID])
}

// NEW: Order Model
model Order {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  
  tenantId        String    @db.ObjectId
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  customerId      String    @db.ObjectId           // Customer reference
  customer        Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  items           OrderItem[]
  
  status          OrderStatus @default(PENDING)
  totalPrice      Float
  
  shippingAddress Address?
  
  stripePaymentId String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([tenantId])
  @@index([customerId])
}

// NEW: Customer Model (for checkout)
model Customer {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  email           String    @unique
  name            String
  password        String?   // Optional for guest checkout
  
  orders          Order[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// NEW: OrderItem Model
model OrderItem {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  
  orderId         String    @db.ObjectId
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId       String    @db.ObjectId
  product         Product   @relation(fields: [productId], references: [id])
  
  quantity        Int
  price           Float
  
  @@index([orderId])
}

// NEW: Enums
enum UserRole {
  ADMIN         // Platform admin
  MERCHANT      // Seller/Merchant
  CUSTOMER      // Store customer
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
  INACTIVE
}

enum SubscriptionPlan {
  STARTER       // Free/Trial
  PROFESSIONAL
  ENTERPRISE
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

type Address {
  street    String
  city      String
  state     String
  zipCode   String
  country   String
  phone     String
}
```

---

### **Priority 2: AUTHENTICATION & AUTHORIZATION**

#### 1. **Merchant Registration**
```typescript
// Create: src/app/(auth)/register/page.tsx
// Features:
// - Email validation
// - Password hashing (bcrypt)
// - Tenant creation
// - Welcome email
```

#### 2. **Enhanced NextAuth Setup**
```typescript
// Update: src/shared/lib/authOptions.ts
// Changes:
// - Add tenant context to JWT
// - Include user role
// - Add user type detection (merchant vs customer)
// - Add bcrypt password hashing
```

#### 3. **Tenant Middleware**
```typescript
// Create: src/middleware.ts
// Features:
// - Extract tenant from URL/subdomain
// - Validate tenant exists
// - Attach tenant to request context
```

#### 4. **Protected Routes**
```typescript
// Create: src/shared/lib/protectedRoute.ts
// - Merchant dashboard routes (requires auth + tenant ownership)
// - Admin routes (requires platform admin role)
// - Customer checkout routes
```

---

### **Priority 3: TENANT REGISTRATION & ONBOARDING**

#### Pages to Create:
1. **Registration Page** (`/register`)
   - Tenant/store name
   - Email
   - Password
   - Payment method
   - Terms agreement

2. **Verification Page** (`/verify-email`)
   - Email confirmation link

3. **Setup Wizard** (`/dashboard/setup`)
   - Store branding (logo, colors)
   - First product
   - Payment settings

---

### **Priority 4: USER DASHBOARD** (YOUR PRIMARY REQUEST)

#### Structure:
```
/dashboard
├── /dashboard/layout.tsx              (Protected route)
├── /dashboard/page.tsx                (Overview/Home)
├── /dashboard/products
│   ├── page.tsx                       (Product list)
│   ├── [productId]/edit.tsx          (Edit product)
│   └── new.tsx                        (Create product)
├── /dashboard/orders
│   ├── page.tsx                       (Order list)
│   └── [orderId]/details.tsx         (Order details)
├── /dashboard/analytics
│   ├── page.tsx                       (Dashboard stats)
│   ├── sales.tsx                      (Sales trends)
│   └── traffic.tsx                    (Traffic analysis)
├── /dashboard/store
│   ├── settings.tsx                   (Store name, logo)
│   └── branding.tsx                   (Colors, theme)
├── /dashboard/account
│   ├── profile.tsx                    (User profile)
│   ├── security.tsx                   (Password, 2FA)
│   └── billing.tsx                    (Subscription, invoices)
└── /dashboard/support
    ├── page.tsx                       (Help center)
    └── tickets.tsx                    (Support tickets)
```

#### Dashboard Components:
1. **Sidebar Navigation**
2. **Header with user menu**
3. **Overview cards** (Total sales, Orders, Products, Revenue)
4. **Charts** (Sales trends, Traffic, Product performance)
5. **Quick actions** (Add product, View orders)

---

### **Priority 5: PRODUCT UPLOAD FOR MERCHANTS**

#### Features:
```typescript
// Create: src/domains/merchant/components/ProductUpload.tsx
// - Multi-image upload (Cloudinary)
// - Category/brand selection
// - Specification inputs
// - Pricing configuration
// - Inventory management
// - Auto-generate slug
// - Preview before publish
```

#### Actions:
```typescript
// Create: src/actions/merchant/productActions.ts
// - createProduct (tenant-scoped)
// - updateProduct (verify ownership)
// - deleteProduct (verify ownership)
// - uploadImages (Cloudinary)
// - validateProductData
```

---

### **Priority 6: DATA ISOLATION & SECURITY**

#### Database Queries:
```typescript
// ALL product queries MUST include tenant filter:
db.product.findMany({
  where: {
    tenantId: session.user.tenantId  // ← CRITICAL
  }
})

// NEVER do:
db.product.findMany()  // ❌ Exposes all tenants' data!

// Create helper:
// src/shared/lib/tenantQuery.ts
export const getTenantFilter = (session: Session) => {
  return { tenantId: session.user.tenantId }
}
```

#### Key Rules:
1. ✅ Every query must filter by `tenantId`
2. ✅ Every mutation must verify ownership
3. ✅ Never trust user input for tenant context
4. ✅ Use server-side session for tenant ID
5. ✅ Log all sensitive operations (auditing)

---

## 🏗️ IMPLEMENTATION ROADMAP

### **Phase 1: Foundation (Week 1-2)** 
- [ ] Update Prisma schema
- [ ] Create Tenant model
- [ ] Update User model with role & tenantId
- [ ] Add database migrations

### **Phase 2: Authentication (Week 2-3)**
- [ ] Implement merchant registration
- [ ] Update NextAuth with tenant context
- [ ] Create login/registration pages
- [ ] Add email verification

### **Phase 3: Dashboard MVP (Week 3-4)**
- [ ] Create dashboard layout & routing
- [ ] Build dashboard home page (overview)
- [ ] Add navigation sidebar
- [ ] Create basic store settings page

### **Phase 4: Product Management (Week 4-5)**
- [ ] Create product upload form
- [ ] Implement image upload (Cloudinary)
- [ ] Build product list page
- [ ] Add product edit/delete

### **Phase 5: Store Frontend Updates (Week 5-6)**
- [ ] Update product listing (show all tenants)
- [ ] Add tenant branding
- [ ] Create seller profile pages
- [ ] Filter products by tenant

### **Phase 6: Orders & Payments (Week 6-7)**
- [ ] Create order model
- [ ] Implement Stripe integration
- [ ] Build checkout flow
- [ ] Add order tracking

### **Phase 7: Analytics & Admin (Week 7-8)**
- [ ] Add dashboard analytics
- [ ] Create platform admin panel
- [ ] Implement tenant management
- [ ] Add revenue tracking

### **Phase 8: Security & Testing (Week 8-9)**
- [ ] Add row-level security checks
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Security testing

---

## 🔒 SECURITY CONSIDERATIONS

### **Critical Issues to Fix:**

1. **Password Storage** ❌
   ```typescript
   // CURRENT (INSECURE):
   if (credentials.password !== user.hashedPassword)  // Plain comparison!
   
   // SHOULD BE:
   const isPasswordValid = await bcrypt.compare(credentials.password, user.hashedPassword)
   ```

2. **Data Isolation**
   ```typescript
   // Add middleware to verify tenant ownership on all mutations
   // Example: Product update must verify user's tenantId matches product's tenantId
   ```

3. **Rate Limiting**
   - Implement on auth endpoints
   - Implement on API endpoints

4. **CORS & CSRF**
   - Configure properly for multi-tenant

5. **Session Expiry**
   - Set reasonable JWT expiration

---

## 📦 DEPENDENCIES TO ADD

```json
{
  "bcryptjs": "^2.4.3",           // Already have bcrypt, use bcryptjs
  "stripe": "^14.0.0",             // Payment processing
  "sendgrid": "^7.7.0",            // Email service (optional, use SendGrid)
  "date-fns": "^3.0.0",            // Date formatting
  "recharts": "^2.10.0",           // Dashboard charts
  "react-hook-form": "^7.50.0",    // Form handling
  "axios": "^1.6.0",               // HTTP client
  "next-cloudinary": "^5.0.0"      // Better Cloudinary integration
}
```

---

## 📊 FILE CHANGES SUMMARY

### **Files to Create:**
- `/src/app/(auth)/register/page.tsx` - Registration
- `/src/app/(auth)/verify/page.tsx` - Email verification
- `/src/app/dashboard/layout.tsx` - Dashboard layout
- `/src/app/dashboard/page.tsx` - Dashboard home
- `/src/app/dashboard/products/...` - Product management pages
- `/src/app/dashboard/orders/...` - Order pages
- `/src/app/dashboard/analytics/...` - Analytics pages
- `/src/app/dashboard/store/...` - Store settings
- `/src/app/dashboard/account/...` - Account settings
- `/src/middleware.ts` - Tenant middleware
- `/src/shared/lib/tenantQuery.ts` - Tenant helpers
- `/src/shared/lib/dataProtection.ts` - Security checks
- `/src/domains/merchant/...` - Merchant-specific components
- `/src/actions/merchant/...` - Merchant actions

### **Files to Update:**
- `prisma/schema.prisma` - **CRITICAL** - Add Tenant, Order, Customer models
- `src/shared/lib/authOptions.ts` - Add bcrypt, tenant context
- `src/app/(store)/page.tsx` - Multi-tenant support
- `src/app/(store)/list/[[...params]]/page.tsx` - Filter by tenant
- `src/app/(store)/product/[productId]/page.tsx` - Show seller info
- `src/app/api/auth/[...nextauth]/route.ts` - Update with tenant context
- `package.json` - Add new dependencies
- `next.config.js` - Update for subdomain routing (if applicable)

### **Files to Delete/Archive:**
- `/src/app/admin/...` - Replace with merchant dashboard (or keep as platform admin)

---

## 🎨 DESIGN DECISIONS

### **1. Tenant Identification**
**Options:**
- Subdomain: `tenant.storeflex.com` (requires DNS setup)
- URL path: `storeflex.com/tenant/products` (simpler)
- Custom domain: `seller.com` (enterprise)

**Recommendation:** Start with URL path, migrate to subdomain later.

### **2. Product Ownership**
- Products linked to Tenant, not User
- User has access through Tenant membership
- Multiple users per Tenant (team accounts)

### **3. Customer vs Merchant**
- Separate user types in database
- Customers can create accounts to track orders
- Guests can checkout without account

### **4. Payment Model**
- Platform takes commission (e.g., 5% per sale)
- Merchants need payment method on file
- Monthly payouts or stripe connect

---

## 🚀 NEXT STEPS

1. **Backup your database** (MongoDB export)
2. **Review this plan** with the schema changes
3. **Start Phase 1** - Update Prisma schema
4. **Test migrations** locally
5. **Build Phase 2** - Authentication updates
6. **Iterate to Phase 3** - Dashboard

---

## 📞 KEY QUESTIONS TO ANSWER

1. **Payment Model:** How will merchants be paid? (Stripe Connect, monthly invoice, PayPal?)
2. **Subdomain vs Path:** Use subdomains for tenant stores?
3. **Categories/Brands:** Centralized (all tenants share) or per-tenant?
4. **Team Accounts:** Can merchants add staff members?
5. **Commission Rate:** Fixed % or variable by plan?
6. **Free Trial:** How long before payment required?
7. **Support:** In-app tickets or external support?

---

## ✅ CHECKLIST FOR CONVERSION

- [ ] Database schema updated with Tenant model
- [ ] User model updated with role and tenantId
- [ ] Merchant registration flow implemented
- [ ] Enhanced authentication with tenant context
- [ ] Dashboard structure created
- [ ] Product upload functionality built
- [ ] Data isolation verified on all queries
- [ ] Payment integration (Stripe/PayPal)
- [ ] Email notifications set up
- [ ] Analytics dashboard created
- [ ] Security audit completed
- [ ] Load testing passed
- [ ] Production deployment plan

---

**Status:** 📋 Planning Phase  
**Priority:** 🔴 High - Start with Phases 1-3  
**Estimated Duration:** 8-10 weeks for MVP

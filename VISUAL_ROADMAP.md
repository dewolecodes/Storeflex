# 🗺️ STOREFLEX CONVERSION - VISUAL ROADMAP

## Current Architecture
```
┌─────────────────────────────────────────┐
│          SINGLE VENDOR SETUP            │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   PUBLIC STORE (storeflex.com)  │   │
│  │  - Browse products              │   │
│  │  - Shopping cart                │   │
│  │  - NO CHECKOUT                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   ADMIN PANEL (/admin)          │   │
│  │  - Category management          │   │
│  │  - Brand management             │   │
│  │  - Product management           │   │
│  │  - Traffic analytics            │   │
│  │  - NO CUSTOMER ACCOUNTS         │   │
│  │  - NO MERCHANT SEPARATION       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   DATABASE                      │   │
│  │  - Products (shared)            │   │
│  │  - Categories (shared)          │   │
│  │  - Brands (shared)              │   │
│  │  - NO TENANT MODEL              │   │
│  │  - NO ORDERS                    │   │
│  │  - NO CUSTOMERS                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

## Target Architecture (Multi-Tenant)
```
┌────────────────────────────────────────────────────────────┐
│           MULTI-TENANT SAAS PLATFORM                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  STOREFRONT      │  │   MERCHANT #1    │               │
│  │  (Single View)   │  │   DASHBOARD      │               │
│  │  - All products  │  │ /dashboard       │               │
│  │  - All merchants │  │ - My products    │               │
│  │  - Search/filter │  │ - My orders      │               │
│  │  - Checkout      │  │ - My analytics   │               │
│  │                  │  │ - My settings    │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │   MERCHANT #2    │  │   MERCHANT #3    │               │
│  │   DASHBOARD      │  │   DASHBOARD      │               │
│  │ - My products    │  │ - My products    │               │
│  │ - My orders      │  │ - My orders      │               │
│  │ - My analytics   │  │ - My analytics   │               │
│  │ - My settings    │  │ - My settings    │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │   PLATFORM ADMIN                              │         │
│  │   /admin                                      │         │
│  │  - Tenant management                          │         │
│  │  - Payment processing                         │         │
│  │  - Commission tracking                        │         │
│  │  - Platform analytics                         │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │   DATABASE                                    │         │
│  │  - Tenants (merchants)                        │         │
│  │  - Users (per tenant)                         │         │
│  │  - Products (per tenant)                      │         │
│  │  - Orders (per tenant)                        │         │
│  │  - Customers                                  │         │
│  │  - Audit Logs                                 │         │
│  │  → ALL DATA ISOLATED BY TENANT ←              │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### BEFORE (Current)
```
User ─────┐
          ├──► Product ─────┐
          │                 ├──► Category
Category ─┘                 ├──► Brand
                            └──► Order?  ❌ MISSING
Brand ────┘
```

### AFTER (Multi-Tenant)
```
Tenant ────┬──► User (role: MERCHANT/STAFF/ADMIN/CUSTOMER)
           ├──► Product (tenantId filters)
           ├──► Order ────┬──► OrderItem ──► Product
           │              ├──► Customer
           │              └──► Address
           ├──► Category (optional tenantId)
           └──► Brand (optional tenantId)

Customer ──┬──► Order
           ├──► Address
           └──► (can belong to multiple tenants)

Shared:
AuditLog ──► logs changes across system
Notification ──► user alerts
```

## User Roles & Access

```
┌────────────────────────────────────────────────────────────┐
│ ADMIN (Platform Owner)                                     │
├────────────────────────────────────────────────────────────┤
│ ✅ Access to ALL tenants                                    │
│ ✅ Can suspend/activate merchants                          │
│ ✅ Can manage platform settings                            │
│ ✅ Can view all analytics                                  │
│ 🗂️  Routes: /admin, /api/admin/*                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ MERCHANT (Seller/Store Owner)                              │
├────────────────────────────────────────────────────────────┤
│ ✅ Access to OWN tenant only                                │
│ ✅ Can upload/manage products                              │
│ ✅ Can view orders/analytics for own store                 │
│ ❌ Cannot see other merchants' data                        │
│ 🗂️  Routes: /dashboard, /api/merchant/*                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ STAFF (Team Member)                                        │
├────────────────────────────────────────────────────────────┤
│ ✅ Access to assigned tenant                                │
│ ✅ Can manage products/orders (limited)                    │
│ ✅ Cannot change billing/settings                          │
│ ❌ Cannot add new staff                                    │
│ 🗂️  Routes: /dashboard, /api/merchant/* (limited)          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ CUSTOMER (Buyer)                                           │
├────────────────────────────────────────────────────────────┤
│ ✅ Can browse all products                                  │
│ ✅ Can place orders                                        │
│ ✅ Can track own orders                                    │
│ ✅ Can manage own account                                  │
│ ❌ Cannot access any merchant data                         │
│ 🗂️  Routes: /store, /api/customer/*, /checkout            │
└────────────────────────────────────────────────────────────┘
```

## Data Flow

### Current: Product Upload
```
Admin Portal
    ↓
(Login) ─ hardcoded to /admin
    ↓
Upload Product
    ↓
Database: Products (shared, no ownership)
    ↓
Store Frontend: Display ALL products
```

### New: Product Upload
```
Merchant Registration
    ↓
(Register) ─ create Tenant + User
    ↓
Merchant Dashboard
    ↓
(Login) ─ routes to /dashboard/[tenantSlug]
    ↓
Upload Product
    ↓
Database: Product { tenantId: "tenant-123", ... }
    ↓
Store Frontend
    ↓
Display by tenant + filter by tenantId
```

## Security Model

### Query Protection (Data Isolation)

```javascript
// ❌ DANGEROUS - returns ALL data
db.product.findMany()

// ✅ SAFE - filters by tenant
db.product.findMany({
  where: { tenantId: session.user.tenantId }
})

// ✅ SAFE - with ownership check
const product = await db.product.findUnique({ where: { id } });
if (product?.tenantId !== session.user.tenantId) throw Error();
```

### Resource Ownership Verification

```
Request: PATCH /api/merchant/products/123
  ↓
1. Check Authentication
   Is user logged in?
  ↓
2. Extract Tenant Context
   tenantId = session.user.tenantId (from JWT, not client)
  ↓
3. Verify Ownership
   SELECT product WHERE id=123 AND tenantId=session.user.tenantId
   If result is null → FORBIDDEN (403)
  ↓
4. Perform Operation
   UPDATE product SET name='...' WHERE id=123
  ↓
5. Log Action
   AuditLog { userId, tenantId, action, entityId, oldData, newData }
```

## Implementation Timeline

```
PHASE 1: DATABASE (Week 1-2)
  ├─ Create schema.prisma.NEW
  ├─ Migrate: add Tenant model
  ├─ Migrate: update Product/User/Order models
  ├─ Create migration script
  └─ ✓ Test isolation

PHASE 2: AUTH (Week 2-3)
  ├─ Fix password hashing (bcrypt)
  ├─ Create registration flow
  ├─ Email verification
  ├─ Update NextAuth JWT
  └─ ✓ Test merchant signup

PHASE 3: ROUTING (Week 3-4)
  ├─ Create middleware.ts (extract tenant)
  ├─ Protect /dashboard routes
  ├─ Create auth guards
  └─ ✓ Test route access

PHASE 4: DASHBOARD (Week 4-5)
  ├─ Layout & Sidebar
  ├─ Overview page
  ├─ Navigation
  └─ ✓ Basic dashboard working

PHASE 5: PRODUCTS (Week 5-6)
  ├─ Product upload form
  ├─ Image handling
  ├─ Product listing
  ├─ Edit/Delete
  └─ ✓ Can upload products

PHASE 6: ORDERS (Week 6-7)
  ├─ Order model
  ├─ Checkout flow
  ├─ Payment integration
  └─ ✓ Orders functional

PHASE 7: ANALYTICS (Week 7-8)
  ├─ Dashboard stats
  ├─ Charts
  ├─ Reports
  └─ ✓ Analytics working

PHASE 8: SECURITY (Week 8-9)
  ├─ Audit logging
  ├─ Rate limiting
  ├─ Security testing
  └─ ✓ Ready for production
```

## File Organization - New Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          (← customer login)
│   │   ├── register/page.tsx       (← MERCHANT registration NEW)
│   │   └── verify/page.tsx         (← email verify NEW)
│   │
│   ├── (store)/
│   │   ├── page.tsx                (← update for multi-tenant)
│   │   ├── list/[[...params]]/
│   │   └── product/[productId]/
│   │
│   ├── dashboard/                  (← MERCHANT DASHBOARD NEW)
│   │   ├── layout.tsx              (protected route)
│   │   ├── page.tsx                (overview)
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new.tsx
│   │   │   └── [productId]/
│   │   ├── orders/
│   │   ├── analytics/
│   │   ├── store/
│   │   ├── account/
│   │   └── support/
│   │
│   ├── admin/                      (← PLATFORM ADMIN - OPTIONAL)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── tenants/
│   │   ├── payments/
│   │   └── reports/
│   │
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── merchant/products/      (← NEW)
│       ├── merchant/orders/        (← NEW)
│       ├── merchant/analytics/     (← NEW)
│       ├── customer/orders/        (← NEW)
│       └── admin/                  (← NEW)
│
├── domains/
│   ├── admin/                      (← move old admin components)
│   ├── merchant/                   (← NEW - dashboard components)
│   │   └── components/
│   │       ├── DashboardSidebar.tsx
│   │       ├── DashboardHeader.tsx
│   │       ├── OverviewCards.tsx
│   │       ├── ProductForm.tsx
│   │       ├── OrdersTable.tsx
│   │       └── ...
│   ├── product/
│   └── store/
│
├── shared/
│   ├── lib/
│   │   ├── authOptions.ts          (← UPDATE: fix password + tenant JWT)
│   │   ├── db.ts
│   │   ├── dataProtection.ts       (← NEW: tenant helpers)
│   │   └── tenantQuery.ts          (← NEW: query patterns)
│   ├── components/
│   ├── types/
│   └── utils/
│
└── middleware.ts                   (← NEW: extract tenant context)
```

## Key Metrics to Track

### After Full Implementation:

```
Platform Metrics:
  📊 Total Merchants: X
  📊 Total Products: Y
  📊 Total Orders: Z
  💰 Total Revenue: $XXX
  📈 Monthly Growth: X%

Merchant Metrics:
  📊 Products per merchant
  📊 Average order value
  💰 Commission calculations
  📈 Sales trends

Customer Metrics:
  📊 Conversion rate
  📊 Average order value
  📊 Repeat purchase rate
  📊 Cart abandonment rate

System Health:
  ⏱️  API response times
  🔒 Security incidents: 0
  🔄 Downtime: 0%
  ✅ Data integrity: 100%
```

## Success Checklist

- [ ] Database migrations successful
- [ ] Tenant isolation verified
- [ ] Merchant registration working
- [ ] Dashboard accessible by merchants
- [ ] Product upload functional
- [ ] Multi-tenant product display working
- [ ] Orders processed correctly
- [ ] Payments integrated
- [ ] Analytics showing accurate data
- [ ] Security audit passed
- [ ] Load testing passed
- [ ] Production deployment successful
- [ ] Merchants onboarded

---

## Quick Reference

| Aspect | Current | After Conversion |
|--------|---------|------------------|
| **Merchants** | 1 (hardcoded) | Unlimited ✓ |
| **Dashboard** | Admin only | Per merchant ✓ |
| **Product Upload** | Central admin | Merchants ✓ |
| **Orders** | None | Full system ✓ |
| **Customers** | No accounts | Full profiles ✓ |
| **Payment** | No integration | Stripe ✓ |
| **Analytics** | Traffic only | Complete ✓ |
| **Security** | Basic auth | Role-based ✓ |
| **Data Isolation** | None | Enforced ✓ |

---

Start with: **PHASE_1_DATABASE_SCHEMA_GUIDE.md**

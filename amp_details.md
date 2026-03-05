# AutoMobile Space — Complete Platform Architecture & Development Specification
### Master SRS / TRD / PRD — Enterprise Grade Blueprint

---

| Attribute | Detail |
|-----------|--------|
| Document Type | Master Architecture Specification (SRS + TRD + PRD) |
| Platform | AutoMobile Space — Vehicle Ecosystem Super-Platform |
| Version | v2.0 — Complete Engineering Edition |
| Target Market | India (Global Expansion Phase 7) |
| Stack | React / Node.js / PostgreSQL / Redis / Kafka / AWS |
| Architecture | Microservices-ready Modular Monolith → Full Microservices |
| Date | March 2026 |
| Classification | Internal — Engineering & Product Team |

---

## TABLE OF CONTENTS

- Part I    — Product Architecture & Vision
- Part II   — Platform Roles, Permissions & Authentication
- Part III  — Marketplace System (B2C)
- Part IV   — Spare Parts Catalog & Compatibility Engine
- Part V    — B2B Vendor Quotation & Bidding System
- Part VI   — Inventory Management System
- Part VII  — Billing & Accounting System
- Part VIII — Order Management System
- Part IX   — Delivery & Real-Time Tracking System
- Part X    — Ratings, Reviews & Trust System
- Part XI   — Return & Refund System
- Part XII  — Notification System
- Part XIII — Complete Database Schema Design
- Part XIV  — System & Microservice Architecture
- Part XV   — Payment System
- Part XVI  — Security & Compliance
- Part XVII — Admin Dashboard
- Part XVIII — AI & Machine Learning Features
- Part XIX  — Agile Phase-wise Implementation Plan
- Part XX   — API Design Reference
- Part XXI  — Infrastructure Deployment Plan
- Part XXII — Scalability Plan

---

## EXECUTIVE SUMMARY

AutoMobile Space is India's first automobile super-platform — a unified, cloud-native ecosystem that simultaneously operates as:

- A B2C spare parts marketplace (Amazon / Boodmo model) for vehicle owners to discover, compare, and purchase parts
- A B2B vendor quotation and bidding exchange for shops to procure inventory from distributors
- A full-featured Shop ERP replacing Tally / Vyapar — purpose-built for auto parts retail
- A vehicle service aggregator (GoMechanic model) for booking, tracking, and reviewing service centers
- A hyperlocal logistics layer (Zomato model) for real-time tracked delivery within cities

All five pillars share one platform, one identity system, one payment layer, and one data backbone. The strategic moat is the compound flywheel: a shop that digitizes its inventory for ERP use automatically publishes that inventory to the B2C marketplace, creating a virtuous cycle where both supply and demand grow together.

> **The Core Flywheel:**
> Shop digitizes inventory (ERP) → inventory auto-publishes to marketplace (B2C) → shop receives orders → logistics dispatched → shop earns revenue → incentive to keep inventory updated → marketplace grows richer. Each pillar feeds every other.

### Key Market Facts

| Market Metric | Value |
|---------------|-------|
| India registered vehicles | 32+ crore, growing at 8% CAGR |
| Auto parts aftermarket size | ₹2.2 lakh crore ($26B) |
| Organized e-commerce share | < 3% — massive headroom |
| Auto parts retailers in India | 7+ lakh shops, 95% undigitized |
| Digital preference post-COVID | 67% vehicle owners prefer digital-first (ACMA 2023) |
| No competing unified platform | Zero platforms combine ERP + Marketplace + B2B + Service + Logistics |

---

# PART I — PRODUCT ARCHITECTURE & VISION

## 1. Five-Pillar Architecture

AutoMobile Space is architected around five tightly integrated pillars. While each pillar can function independently, their true value emerges at the intersections — a shop's ERP inventory becomes a marketplace listing; a marketplace order triggers the logistics system; a service booking creates a parts demand signal.

| Pillar | Replaces | Provides | Revenue Model |
|--------|----------|----------|---------------|
| B2C Marketplace | Visiting 4–6 shops physically | Amazon-style discovery, fitment filter, delivery, reviews, price comparison | 3–8% GMV commission |
| B2B Procurement (RFQ) | WhatsApp-based vendor negotiation | Formal quotation → bidding → PO → GST invoice | 1–2% B2B transaction fee |
| Shop ERP | Tally, Vyapar, Excel, paper khata | Purpose-built auto-parts ERP with offline mode, GST, udhaar | ₹999–₹4,999/month SaaS |
| Service Aggregator | Calling mechanics individually | Booking, tracking, service history, GoMechanic-style | 15–20% service commission |
| Hyperlocal Logistics | No delivery — customer carries parts | Zomato-style real-time tracked delivery, 45-min SLA | Delivery fee + logistics margin |

## 1.1 Platform Target Scale (24-Month Horizon)

| Metric | Month 3 | Month 12 | Month 24 | Unit |
|--------|---------|----------|----------|------|
| Active Shops (ERP) | 5 | 500 | 10,000 | shops |
| Monthly Active Customers | 100 | 50,000 | 1,000,000 | users |
| City Coverage | 1 | 10 | 50+ | cities |
| Daily Orders (Marketplace) | 10 | 2,000 | 50,000 | orders/day |
| Daily Invoices (ERP) | 75 | 25,000 | 500,000 | invoices/day |
| ARR Target | < 0.1 Cr | 5 Cr | 25 Cr | INR |
| Uptime SLA | 99.5% | 99.9% | 99.99% | — |
| P95 API Latency | < 500ms | < 300ms | < 150ms | — |

## 1.2 Technology Stack Overview

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Web | React 18 + Vite 5 + Tailwind CSS | Fastest HMR, tree-shaking, optimal bundle, wide ecosystem |
| Frontend Mobile | React Native 0.74 (Expo) | Code sharing with web, native device APIs (camera, barcode) |
| State Management | Zustand + React Query (TanStack) | Zustand for global UI; React Query for server-state caching |
| Offline Storage | IndexedDB (Dexie.js wrapper) | Structured offline data, transactional, works in PWA |
| API Layer | Node.js 20 LTS + Express 5 | JavaScript full-stack, proven at scale, large ecosystem |
| ORM | Prisma 5 | Type-safe queries, schema-first, excellent migration tooling |
| Primary Database | PostgreSQL 16 (AWS RDS) | ACID compliance, JSON support, row-level security, mature |
| Document Store | MongoDB Atlas | Flexible schema for product catalog, audit logs, activity feeds |
| Cache | Redis 7 (AWS ElastiCache) | Session tokens, stock cache, pub/sub, job queues |
| Search Engine | Typesense 26 (self-hosted) | Sub-10ms search, open source, typo-tolerant, fitment facets |
| Message Queue | Apache Kafka | High-throughput event streaming, microservice decoupling |
| File Storage | AWS S3 + Cloudflare R2 | PDFs on S3; images on R2 for CDN delivery, zero egress cost |
| Authentication | Custom JWT + Firebase Phone OTP | Phone OTP critical for India; social login for B2C |
| Payment Gateway | Razorpay (primary) + PayU (fallback) | Best UPI support, GST invoicing, India-first, widest coverage |
| Delivery APIs | Dunzo / Porter / Shiprocket | Hyperlocal same-day, pan-India courier, multi-provider fallback |
| Email | Resend (primary) / SendGrid (fallback) | Transactional email, reliable delivery, simple API |
| SMS | MSG91 (India) + Twilio (international) | OTP and transactional SMS; MSG91 for better India delivery |
| WhatsApp | WATI / Interakt (Meta BSP) | Official Meta Business Solution Partner; webhook automation |
| Cloud | AWS (primary) + Cloudflare (CDN/WAF) | Managed services, global CDN, DDoS protection |
| Container | Docker + Kubernetes (EKS) | Container orchestration, auto-scaling, rolling deploys |
| CI/CD | GitHub Actions + ArgoCD | Automated testing, GitOps deployment pipeline |
| Monitoring | Datadog + Sentry + PagerDuty | APM, error tracking, on-call alerting |

---

# PART II — PLATFORM ROLES, PERMISSIONS & AUTHENTICATION

## 2. Platform Roles & Permission Model

AutoMobile Space supports nine distinct actor types. The permission system is built on Role-Based Access Control (RBAC) with attribute-based overrides. Every API endpoint is decorated with required permissions; the middleware validates role + permission scope before processing.

## 2.1 Role Definitions & Permission Matrix

| Role | Interface | Auth Method | Key Capabilities |
|------|-----------|-------------|-----------------|
| Customer / Vehicle Owner | Marketplace PWA + Mobile App | Phone OTP + Social | Browse, search, cart, checkout, track, review, wishlist, returns |
| Shop Owner | ERP Web + Mobile PWA | Phone OTP + KYC | Full ERP: inventory, billing, udhaar, reports, staff mgmt, marketplace listings |
| Shop Manager | ERP Web | Phone OTP | Billing, GRN, inventory view, restricted reports, staff operations |
| Cashier | ERP Web (POS only) | Phone OTP | POS billing only — cannot see margins, reports, or udhaar totals |
| Mechanic | ERP Mobile / Web | Phone OTP | Job card mgmt, part lookup, service history, labour entry |
| Spare Parts Vendor / Distributor | Vendor Portal Web | Phone OTP + Business KYC | Catalog mgmt, quotation bidding, order fulfilment, invoice generation |
| Delivery Partner | Delivery App (Mobile) | Phone OTP + Onboarding | Accept delivery jobs, GPS tracking, proof of delivery, earnings |
| Warehouse Manager | WMS Web | Phone OTP + Admin approval | Stock receipt, putaway, pick/pack, dispatch, cycle counts |
| Finance / Accounting | Finance Dashboard | Phone OTP + 2FA mandatory | GST reports, P&L, balance sheet, reconciliation, audit exports |
| Platform Admin | Admin Console | Email + 2FA + IP whitelist | Full platform control: users, shops, products, orders, disputes, config |
| Platform Support Agent | Support Dashboard | Email + 2FA | Customer tickets, order actions, refund approvals, user communication |

## 2.2 Authentication System — Enterprise Grade

### 2.2.1 Registration Workflows

| User Type | Registration Flow | KYC Documents | Approval |
|-----------|------------------|---------------|---------|
| Customer | Phone OTP → profile completion → done | None required | Instant auto-approval |
| Shop Owner | Phone OTP → business details → GST number → shop photos → bank details | GST certificate, shop photo, owner ID proof | Admin review within 24hrs |
| Vendor / Distributor | Phone OTP → company details → trade license → GST → bank → product categories | Trade license, GST certificate, PAN, cancelled cheque | Admin review within 48hrs |
| Delivery Partner | Phone OTP → personal details → vehicle details → license → bank | Driving license, vehicle RC, Aadhaar, bank details | Auto + background check |
| Service Center | Phone OTP → garage details → GST → certifications → photos | GST, shop photos, service certifications, owner ID | Admin review within 48hrs |

### 2.2.2 Security Mechanisms

- **JWT Access Tokens:** 15-minute expiry, RS256 signed, containing role + permissions + shop_id + tenant_id
- **Refresh Tokens:** 30-day expiry, stored as httpOnly cookies, rotated on every use, single-use invalidation
- **Phone OTP:** 6-digit OTP, 5-minute expiry, max 3 attempts, 10-minute lockout after failure, Firebase/MSG91
- **OAuth 2.0:** Google, Facebook for customer social login; PKCE flow enforced
- **RBAC Middleware:** Every API route decorated with required permissions; middleware validates before handler
- **Rate Limiting:** Auth endpoints: 5 req/min/IP; API: 1000 req/min/user; OTP: 3 req/10min/phone
- **CAPTCHA:** Invisible reCAPTCHA v3 on registration, login, checkout; score threshold 0.5
- **Session Management:** Redis-backed session store; concurrent session limit per role; device fingerprinting
- **MFA:** Mandatory TOTP 2FA for Admin, Finance, and Support roles; optional for shop owners
- **Fraud Detection:** Velocity checks on OTP requests, login anomaly detection, geo-IP mismatch alerts

### 2.2.3 JWT Token Structure

| Claim | Type | Example | Purpose |
|-------|------|---------|---------|
| sub | UUID | usr_abc123 | User identifier |
| role | enum | SHOP_OWNER | Primary role |
| permissions | string[] | ['inventory:write','billing:read'] | Granular permissions |
| shop_id | UUID? | shp_xyz789 | Bound shop (null for customer/admin) |
| tenant_id | UUID | tnt_001 | Multi-tenant identifier |
| iat | timestamp | 1704067200 | Issued at |
| exp | timestamp | 1704068100 | Expires (15 min) |
| jti | UUID | tok_unique001 | Token ID for revocation |

---

# PART III — MARKETPLACE SYSTEM (B2C)

## 3. B2C Marketplace Engine

The marketplace operates on an Amazon-style multi-seller model where the same product SKU can be listed by multiple shops. The platform hosts the product catalog centrally; shops attach inventory (price + stock + location) to catalog items. Customers see a unified product page with multiple seller options sorted by price, rating, and distance.

## 3.1 How the Marketplace Works (End-to-End)

1. Customer searches for "brake pads for Honda City 2019 petrol"
2. Fitment filter narrows catalog to compatible SKUs using vehicle make-model-year-variant database
3. Typesense returns ranked results with seller offers aggregated per SKU
4. Customer selects product → sees price comparison from multiple nearby shops
5. Customer adds to cart, selects preferred seller/delivery option
6. Checkout: address, payment, delivery slot selection
7. Order confirmed → shop notified → shop packs → delivery partner assigned
8. Real-time GPS tracking → delivery → customer confirms → payment settled to shop

## 3.2 Product Listing System

The catalog has two layers: the Global Catalog maintained by the platform, and the Shop Inventory layer maintained by each shop.

| Layer | Owner | Contains | Purpose |
|-------|-------|----------|---------|
| Global Catalog | Platform Admin | Master SKUs, part numbers, compatibility data, specs, images | Single source of truth; prevents duplicate listings |
| Brand Catalog | Brand/Manufacturer | Official part numbers, OEM specs, brand images | Brand-verified data for authenticity signals |
| Shop Inventory | Shop Owner | Price, stock qty, condition (new/refurb), warranty, location | Shop's offer attached to a catalog SKU |
| Vendor Catalog | Distributor/Vendor | Wholesale prices, MOQ, lead times, availability | B2B procurement layer |

## 3.3 Multi-Seller Price Comparison Engine

### Ranking Algorithm

When a customer views a product, the platform aggregates all seller offers and ranks them using a composite score:

```
Composite Score = (0.35 × normalized_price)
                + (0.25 × seller_rating)
                + (0.20 × proximity_score)
                + (0.10 × stock_reliability)
                + (0.10 × delivery_speed)
```

- **Price:** normalized against median market price for that SKU in the city
- **Proximity:** distance from customer's pincode to shop; within 5km gets maximum score
- **Stock Reliability:** historical order fulfilment rate — shops that frequently cancel get penalized
- **Delivery Speed:** shops with same-day delivery capability get a boost

## 3.4 Product Search Engine

Search is powered by Typesense with a custom indexing pipeline. The search index is enriched with vehicle compatibility data, synonyms, and regional language tokens.

| Search Feature | Implementation | Notes |
|---------------|---------------|-------|
| Full-text search | Typesense with BM25 | Typo-tolerant, sub-50ms P95 |
| Fitment filter | Vehicle make/model/year/variant facets | Pre-computed compatibility matrix |
| Part number search | Exact OEM + aftermarket part number matching | Cross-reference table with 50+ brands |
| Synonym support | Custom synonym dictionary | e.g., 'brake pad' = 'disc pad' = 'brake shoe' |
| Regional language | Hindi, Telugu, Tamil, Kannada tokenization | Transliteration support |
| Typo tolerance | 2-character edit distance on product names | Critical for part number searches |
| Category filter | Hierarchical category facets | e.g., Brakes → Disc Brakes → Brake Pads |
| Price range filter | Numeric range faceting | Min/max price per city |
| Brand filter | Brand facet with logo display | OEM vs aftermarket toggle |
| Availability filter | In-stock only, include pre-order | Real-time stock sync via Redis |

---

# PART IV — SPARE PARTS CATALOG & COMPATIBILITY ENGINE

## 4. Vehicle Compatibility System

The spare parts compatibility engine is the most critical differentiator of the platform. A wrong part recommendation destroys trust immediately. The system uses a hierarchical vehicle taxonomy combined with a part compatibility matrix to guarantee fitment accuracy.

## 4.1 Vehicle Taxonomy Hierarchy

Vehicles are classified in a 7-level hierarchy:

1. **Vehicle Category** → Car, Bike, Truck, Bus, Three-Wheeler, Tractor, Electric
2. **Make** → Honda, Maruti Suzuki, Hyundai, Bajaj, Hero, Tata, Mahindra, etc.
3. **Model** → City, Activa, Nexon, Pulsar, Splendor, etc.
4. **Year** → 2015, 2016, ... 2026 (year of manufacture)
5. **Variant** → Petrol, Diesel, CNG, Electric, Hybrid; Automatic/Manual; LX/VX/ZX
6. **Engine** → 1.5L i-VTEC, 1.5L i-DTEC, 110cc, 150cc, etc.
7. **Body Type** → Sedan, Hatchback, SUV, Crossover, Pickup, etc.

## 4.2 Part Compatibility Matrix

**Example fitment chain:** Honda → City → 2019 → Petrol 1.5L → VX CVT → Brake Pads

Every part in the catalog has a fitment table specifying the exact vehicle combinations it fits. Fitment data sources:

- OEM manufacturer data (primary source — imported via XML/CSV feeds)
- TecDoc / AutoData integration (European standard fitment database)
- ACMA database (India-specific fitment data)
- Community-verified fitment (shop owners confirm through their sales history)
- AI-assisted fitment suggestion (NLP on part descriptions + historical orders)

## 4.3 Part Catalog Schema

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| sku_id | UUID | sku_abc123 | Platform-assigned unique SKU |
| oem_part_number | VARCHAR | 04465-0K060 | Toyota OEM number |
| aftermarket_numbers | JSONB | ['FDB3020','AY600TY061'] | Cross-reference numbers |
| category_id | UUID → hierarchy | brake-pads | 7-level category tree |
| brand_id | UUID | TVS Motor | Brand reference |
| part_name | VARCHAR | Front Disc Brake Pad Set | Display name |
| part_name_hi | VARCHAR | फ्रंट ब्रेक पैड | Hindi localization |
| description | TEXT | OE quality, semi-metallic compound... | Full description |
| specifications | JSONB | {"material":"semi-metallic","thickness":"12mm"} | Spec key-values |
| images | JSONB array | [{url, alt, is_primary}] | Cloudflare R2 URLs |
| weight_grams | INTEGER | 820 | For shipping calculation |
| hsn_code | VARCHAR | 87089900 | GST HSN code |
| gst_rate | DECIMAL | 18.00 | GST percentage |
| fitment_count | INTEGER | 47 | Vehicles this fits — denormalized for display |
| is_verified | BOOLEAN | true | OEM-verified fitment data |

## 4.4 Compatibility Guarantee Mechanism

When a customer selects their vehicle (make/model/year/variant) and browses, every returned part has been pre-validated for compatibility. The validation pipeline:

1. Customer vehicle stored in session/profile as "My Garage" entry
2. Search query enriched with vehicle_id → Typesense filter on precomputed fitment array
3. Each product page shows a "Fits Your Vehicle" badge with green checkmark
4. At cart addition: server-side re-validation of fitment before accepting item
5. At checkout: final fitment validation + warning if garage not set
6. Post-delivery: customer can confirm or report fitment issue → feeds ML training data

---

# PART V — B2B VENDOR QUOTATION & BIDDING SYSTEM

## 5. B2B Procurement System

The B2B module replaces the informal WhatsApp-based procurement process that currently dominates India's auto parts supply chain. Shops create formal Request for Quotation (RFQ) documents; vendors bid with prices; shops compare and confirm orders; the system auto-generates GST-compliant purchase orders and updates inventory on delivery.

## 5.1 RFQ Workflow (End-to-End)

1. Shop owner identifies stock need — via manual review, stock alert, or customer demand
2. Creates RFQ: selects parts (from catalog), specifies quantity, required delivery date, payment terms
3. RFQ published to eligible vendors — filtered by category, city coverage, and rating
4. Vendors receive notification (push + WhatsApp + SMS) and submit bids within deadline
5. Each bid contains: unit price, total price, GST breakup, delivery date, payment terms, warranty
6. Shop owner sees side-by-side comparison table of all bids
7. Shop can counter-bid (one round of negotiation), vendors can accept/revise
8. Shop selects winning vendor → system auto-generates Purchase Order (PO)
9. Vendor accepts PO → starts order fulfillment
10. Delivery: shop scans received stock via GRN (Goods Receipt Note) → inventory auto-updated
11. System auto-generates GST purchase invoice → updates accounts payable ledger

## 5.2 Bidding Logic & Pricing Engine

| Feature | Logic | Notes |
|---------|-------|-------|
| Bid visibility | Sealed bids — vendors cannot see competitors' prices until auction closes | Prevents collusion, ensures competitive pricing |
| Bid deadline | Shop sets deadline (default 24hrs, min 2hrs, max 7 days) | Configurable per RFQ |
| Auto-extension | If bid received within 15min of deadline, extend by 15min | Prevents last-second sniping |
| Minimum bids | RFQ goes live to vendors immediately; min 0 bids to proceed | Shop can also direct-invite specific vendors |
| Counter-offer | Shop can counter one time; vendor gets 12hrs to respond | One round negotiation keeps it clean |
| Auto-ranking | System ranks bids: price (50%) + vendor rating (30%) + delivery speed (20%) | Advisory — shop has final choice |
| Price benchmark | System shows market average price for the part alongside bids | Helps shops identify unusually high/low bids |
| Vendor blacklist | Shops can blacklist vendors; blacklisted vendors don't receive their RFQs | Shop-level preference |
| Platform fee | 1–2% of order value charged to vendor on confirmed order | Platform revenue stream |

## 5.3 Purchase Order & Invoice Generation

On order confirmation, the system auto-generates:

- **Purchase Order (PO):** PO number, line items, quantities, agreed prices, GST breakdown, delivery terms, payment terms, both party details, digital signatures
- **Goods Receipt Note (GRN):** Created by shop when stock arrives; matches against PO; highlights discrepancies
- **Purchase Invoice:** Auto-generated from GRN; GSTIN-compliant; HSN codes; IGST/CGST/SGST breakdown
- **Payment Record:** Tracks payment against invoice; partial payments supported; aging reports

---

# PART VI — INVENTORY MANAGEMENT SYSTEM

## 6. Inventory Management System (ERP Core)

The Inventory Management System is the most strategically important module — it is the primary reason shop owners adopt the platform, and it creates the data that powers the marketplace. It is purpose-built for auto parts retail, with features that generic tools like Tally and Vyapar do not offer.

## 6.1 Stock Management

### Stock Item Master

| Field | Description |
|-------|-------------|
| Stock ID | Platform-assigned identifier; links to catalog SKU |
| Shop ID | Which shop's inventory |
| SKU Reference | Link to global catalog SKU (or custom SKU for non-cataloged items) |
| Item Name | Shop's preferred display name |
| Category | Auto-populated from catalog; editable |
| Unit | Pcs, Set, Litre, Kg, Meter |
| Purchase Price | Last purchase price; tracked per batch |
| MRP | Maximum Retail Price |
| Selling Price | Shop's default selling price |
| HSN Code | Auto-populated from catalog; editable for unlisted items |
| GST Rate | Auto-populated; 5/12/18/28% |
| Current Stock | Real-time quantity; updated on every sale/purchase |
| Minimum Stock | Alert threshold — triggers low-stock notification |
| Maximum Stock | Overstock threshold for dead-stock detection |
| Rack Location | Physical location in shop (Rack A3, Bin 7) |
| Barcode/QR | EAN/QR code for scanner-based billing |
| Images | Up to 5 images for identification |
| Vehicle Fitment | Links to compatible vehicles from catalog |

### 6.1.1 Batch & Lot Tracking

- Every purchase creates a batch record with purchase date, vendor, purchase price, expiry (if applicable)
- FIFO (First In First Out) costing by default; LIFO and weighted average also supported
- Batch traceability: for any sale, system can trace back to the purchase batch
- Expiry tracking: consumables (oils, filters) get expiry date field; alerts 30 days before expiry

### 6.1.2 Barcode & QR Scanning

- Each stock item gets a platform-generated QR code that can be printed as a shelf label
- Billing: cashier scans barcode → item auto-added to invoice with price and GST
- Stock-in: receiving staff scans items during GRN to match against PO
- Stock audit: auditor scans items to perform cycle counts without manual entry
- Mobile: React Native app supports camera-based scanning; Bluetooth scanner via BLE API

## 6.2 Purchase Orders & Supplier Management

### Purchase Order Lifecycle

1. **Draft** — PO created by shop owner/manager
2. **Sent** — PO transmitted to supplier (email, WhatsApp, or platform portal)
3. **Acknowledged** — Supplier confirms receipt and estimated delivery
4. **Partially Received** — Some items received — partial GRN created
5. **Received** — All items received — full GRN created — inventory updated
6. **Invoiced** — Supplier invoice matched against GRN
7. **Paid** — Payment recorded against invoice
8. **Closed** — All quantities, amounts, and payments reconciled

## 6.3 Dead Stock & Reorder Intelligence

| Feature | Logic | Action |
|---------|-------|--------|
| Dead Stock Detection | Items with zero movement for configurable period (default 90 days) | Alert + suggest B2B listing or discount |
| Slow-Moving Items | Movement velocity < 20% of category average | Flag in reports; suggest price reduction |
| Low Stock Alert | Current qty < minimum stock threshold | Push notification to owner + auto-suggest RFQ |
| Overstock Warning | Current qty > maximum stock threshold | Flag dead stock risk; suggest pausing purchases |
| Reorder Point | Rolling average daily sales × lead time days | Auto-generate draft PO suggestion |
| Demand Forecasting | ML model on 90-day sales history + seasonality | Predicted reorder quantity shown in purchase screen |

## 6.4 Warehouse Management (Multi-Location)

- Multi-warehouse support: shops can manage multiple storage locations (main shop, back store, second branch)
- Inter-warehouse transfers: formal transfer requests with approval workflow
- Rack/bin management: physical location tracking for every item
- Putaway rules: define which categories go to which rack/bin
- Pick lists: for marketplace orders, system generates optimized pick list sorted by rack location
- Cycle counting: partial inventory audits on a rotation schedule; discrepancy auto-creates adjustment entry

---

# PART VII — BILLING & ACCOUNTING SYSTEM

## 7. Billing & Accounting System

The accounting module is a purpose-built, GST-compliant double-entry bookkeeping system. It is not a general accounting tool like Tally — every concept, workflow, and report is designed specifically for the auto parts retail business.

## 7.1 GST Invoice Generation

### Invoice Types Supported

| Invoice Type | When Used | GST Treatment |
|-------------|----------|---------------|
| Tax Invoice (B2C sale) | Sale to unregistered customer | CGST + SGST for intra-state; IGST for inter-state |
| Tax Invoice (B2B sale) | Sale to GST-registered business | Same as B2C; buyer can claim ITC |
| Bill of Supply | Sale of GST-exempt goods | No GST; specified exempt items only |
| Export Invoice | International sale | Zero-rated; LUT/bond reference required |
| Proforma Invoice | Quotation to customer | No tax implication; becomes tax invoice on confirmation |
| Credit Note | Return/discount post-invoice | Reverses GST liability; links to original invoice |
| Debit Note | Upward price revision post-invoice | Increases GST liability; links to original invoice |
| Receipt Voucher | Advance payment received | GST on advance; adjusted on final invoice |
| Refund Voucher | Return of advance | Reverses receipt voucher GST |

### 7.1.1 Invoice Data Structure

- **Invoice Number:** Auto-generated sequential (FY-based reset), configurable prefix per shop (e.g., AMS/2425/001)
- **Seller details:** Name, address, GSTIN, state code, contact
- **Buyer details:** Name, address, GSTIN (if B2B), state code
- **Place of Supply:** State code; determines IGST vs CGST+SGST
- **Line items:** Item name, HSN/SAC, quantity, unit, rate, discount, taxable value
- **GST breakup per line:** Rate, CGST/SGST/IGST amounts
- **Invoice totals:** Subtotal, total discount, taxable value, CGST, SGST, IGST, round-off, grand total
- **Payment terms:** Due date, payment mode, bank details for RTGS/NEFT
- **E-invoice IRN:** Integration with GSTN for e-invoicing (mandatory for >₹5Cr turnover)
- **QR code:** E-invoice QR embedded in invoice PDF

## 7.2 Double-Entry Bookkeeping

Every financial transaction creates a double-entry journal entry in the ledger.

| Transaction | Debit Account | Credit Account |
|-------------|--------------|----------------|
| Sale (Cash) | Cash / Bank Account | Sales Account + GST Payable |
| Sale (Credit) | Accounts Receivable (Customer) | Sales Account + GST Payable |
| Purchase (Cash) | Purchase Account + GST Receivable (ITC) | Cash / Bank Account |
| Purchase (Credit) | Purchase Account + GST Receivable (ITC) | Accounts Payable (Vendor) |
| Payment Received | Cash / Bank Account | Accounts Receivable (Customer) |
| Payment Made | Accounts Payable (Vendor) | Cash / Bank Account |
| Stock Adjustment (Loss) | Stock Loss Account | Inventory Account |
| Stock Adjustment (Gain) | Inventory Account | Stock Gain Account |
| Return (Customer) | Sales Return Account + GST Payable (reversal) | Accounts Receivable / Cash |
| Return (to Vendor) | Accounts Payable / Cash | Purchase Return Account + GST ITC (reversal) |

## 7.3 Financial Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| GSTR-1 | Outward supply return — details of all sales invoices | Monthly / Quarterly |
| GSTR-2A/2B | Auto-populated inward supply (for ITC reconciliation) | Monthly |
| GSTR-3B | Summary GST return — net tax payable | Monthly |
| Profit & Loss Statement | Revenue, COGS, gross profit, operating expenses, net profit | Monthly, Quarterly, Annual |
| Balance Sheet | Assets, liabilities, equity snapshot | Monthly, Annual |
| Cash Flow Statement | Operating, investing, financing cash flows | Monthly |
| Accounts Receivable Aging | Outstanding dues by customer, bucketed by age (0-30, 31-60, 61-90, 90+ days) | Real-time |
| Accounts Payable Aging | Outstanding dues to vendors, bucketed by age | Real-time |
| Stock Valuation Report | Current inventory value by FIFO/LIFO/Weighted Average | On-demand |
| Udhaar (Credit) Ledger | Customer-wise credit given, received, balance | Real-time |
| Day Book | All transactions of the day in chronological order | Daily |
| Sales Register | All sales invoices with tax breakup | On-demand |
| Purchase Register | All purchase invoices with ITC breakup | On-demand |

---

# PART VIII — ORDER MANAGEMENT SYSTEM

## 8. Order Management System

The Order Management System handles the complete lifecycle of every customer order from cart creation to final settlement. It is the central nervous system coordinating between marketplace, inventory, logistics, payment, and notification modules.

## 8.1 Order State Machine

Every order follows a defined state machine. State transitions trigger webhooks and notifications.

| State | Description | Triggers | Next States |
|-------|-------------|---------|-------------|
| CART | Items in cart, not yet ordered | User action | → PENDING_PAYMENT |
| PENDING_PAYMENT | Order created, payment not confirmed | Checkout initiated | → CONFIRMED, → CANCELLED |
| CONFIRMED | Payment successful, shop notified | Payment webhook | → PROCESSING |
| PROCESSING | Shop accepted, preparing order | Shop action | → PACKED |
| PACKED | Items packed and ready | Shop action | → PICKED_UP |
| PICKED_UP | Delivery partner collected from shop | Delivery partner scan | → IN_TRANSIT |
| IN_TRANSIT | Delivery partner en route | GPS update | → OUT_FOR_DELIVERY |
| OUT_FOR_DELIVERY | Last mile, near customer | GPS geofence trigger | → DELIVERED, → FAILED_DELIVERY |
| DELIVERED | Customer received, confirmed | Delivery partner or customer action | → COMPLETED, → RETURN_INITIATED |
| COMPLETED | Order fully done, payment settled | Auto after 48hr no return request | Terminal |
| RETURN_INITIATED | Customer requested return | Customer action | → RETURN_APPROVED, → RETURN_REJECTED |
| RETURN_APPROVED | Return pickup scheduled | Admin/auto action | → RETURN_PICKED_UP |
| RETURN_PICKED_UP | Item picked from customer | Delivery partner | → RETURN_RECEIVED |
| RETURN_RECEIVED | Item inspected at shop | Shop action | → REFUNDED |
| REFUNDED | Refund processed to customer | Payment gateway | Terminal |
| CANCELLED | Order cancelled | Customer/Shop/System | → REFUNDED (if paid) |

## 8.2 Cart & Checkout System

### Cart System

- **Persistent cart:** stored in DB, survives browser close; Redis for active session performance
- **Multi-seller cart:** customer can have items from multiple shops; checkout creates multiple sub-orders
- **Cart merge:** when guest user logs in, merge anonymous cart with account cart
- **Price lock:** cart holds current price for 15 minutes; after expiry, price refreshed from live inventory
- **Stock reservation:** on add-to-cart, soft-reserve stock for 15 minutes to prevent overselling
- **Coupon/promo validation:** real-time coupon validation with usage limits, min order value, category restrictions

### Checkout System

1. Address selection/addition: saved addresses, Google Maps autocomplete, GPS auto-fill
2. Delivery slot selection: same-day (if before cutoff), next-day, scheduled
3. Seller confirmation: for multi-seller cart, confirm each seller's items and delivery options
4. Coupon application: optional; real-time discount calculation
5. Payment selection: UPI, card, wallet, COD, credit/EMI
6. Order review: final summary before payment
7. Payment processing: redirect to Razorpay / payment flow
8. Order confirmation: webhook from payment → order state to CONFIRMED → notifications sent

---

# PART IX — DELIVERY & REAL-TIME TRACKING SYSTEM

## 9. Hyperlocal Logistics & Real-Time Tracking

The logistics system operates like Zomato Hyperpure or Dunzo — real-time tracked hyperlocal delivery for the city. It supports both platform-managed delivery partners and third-party logistics provider integrations.

## 9.1 Delivery Partner Assignment Algorithm

1. Order marked PACKED → system initiates delivery assignment
2. Candidate pool: delivery partners with status AVAILABLE within 3km of shop
3. Score each candidate: proximity (40%) + current load (30%) + rating (20%) + vehicle type match (10%)
4. Broadcast to top-3 partners simultaneously; first acceptance wins
5. Auto-escalation: if no acceptance in 3 minutes, broadcast to 5km radius
6. Fallback: if no acceptance in 8 minutes, auto-assign to third-party logistics (Porter/Dunzo API)
7. Manual override: admin can manually assign any available partner

## 9.2 Real-Time GPS Tracking

| Feature | Implementation | Update Frequency |
|---------|---------------|-----------------|
| Delivery partner location | React Native app sends GPS via WebSocket | Every 5 seconds while on active delivery |
| Customer tracking map | React frontend subscribes to Redis pub/sub via WebSocket | Real-time push on location update |
| ETA calculation | MapMyIndia / Google Maps Distance Matrix API | Recalculated every 30 seconds |
| Geofence alerts | PostGIS spatial query on partner location | When partner within 500m of customer |
| Route visualization | Polyline rendered on Mapbox GL JS map | Updated on each GPS point |
| Estimated arrival | ML model: historical delivery times + current traffic | Shown to customer throughout delivery |

## 9.3 Proof of Delivery (POD)

- **OTP-based POD:** customer receives 4-digit OTP; delivery partner enters OTP in app to complete delivery
- **Photo POD:** delivery partner takes photo of delivered package at door; uploaded to S3
- **Signature POD:** for high-value orders, customer digital signature captured in app
- **Unable to deliver:** partner can mark failed delivery with reason code; customer notified for rescheduling
- **Contactless delivery:** customer can select contactless; photo POD auto-required

---

# PART X — RATINGS, REVIEWS & TRUST SYSTEM

## 10. Ratings & Reviews System

The trust layer is the long-term moat for the marketplace. Genuine, verified reviews are a primary driver of purchase decisions. The system is designed to collect authentic feedback, detect manipulation, and surface useful insights.

## 10.1 Review Types

| Review Type | Who Reviews | Who/What is Reviewed | When Triggered |
|------------|------------|---------------------|----------------|
| Product Review | Customer | Specific product SKU (fitment, quality, price-value) | After order COMPLETED, delay 48hrs |
| Shop Review | Customer | Shop (service quality, packaging, communication) | After order COMPLETED |
| Delivery Review | Customer | Delivery partner (speed, handling, professionalism) | After order DELIVERED |
| Service Center Review | Customer | Service center (quality, honesty, turnaround time) | After service booking COMPLETED |
| Vendor Review | Shop Owner | Vendor/Distributor (quality, delivery, pricing) | After B2B order RECEIVED |
| Customer Review | Shop Owner | Customer (payment behaviour, handling of goods) | After order COMPLETED |

## 10.2 Anti-Fraud Mechanisms

- **Verified purchase only:** reviews can only be submitted for actual completed transactions
- **One review per order:** each order generates exactly one review prompt per review type
- **Review delay:** review prompt sent 48 hours after delivery — emotional spike cooling period
- **Content moderation:** ML classifier for spam, competitor bashing, inappropriate content
- **Velocity detection:** flag if same user reviews 3+ products in 1 hour
- **IP clustering:** flag reviews from same IP/device fingerprint
- **Account age check:** accounts < 7 days old have reviews held for manual approval
- **Incentivized review detection:** NLP to detect "got free product for review" type patterns
- **Seller response:** sellers can officially respond to reviews; no editing of customer review
- **Review removal:** only via support ticket with evidence; audit trail maintained

## 10.3 Seller Trust Score Formula

Every shop and vendor has a composite Trust Score (0–100) that drives marketplace ranking:

- Order fulfilment rate: % of orders not cancelled by shop (weight: 25%)
- On-time delivery rate: % of orders packed within SLA (weight: 20%)
- Average review rating: weighted average of last 90 days' reviews (weight: 25%)
- Response time: average time to accept/reject orders (weight: 15%)
- Dispute rate: % of orders that generated a dispute ticket (weight: 15%)

---

# PART XI — RETURN & REFUND SYSTEM

## 11. Return & Refund System

## 11.1 Return Policy Framework

| Product Category | Return Window | Condition Required | Who Bears Return Shipping |
|----------------|--------------|-------------------|--------------------------|
| Electronic parts (sensors, ECU) | 7 days | Unused, original packaging | Platform if defective; customer if change of mind |
| Mechanical parts (brakes, filters) | 7 days | Unused, original packaging | Platform if defective; customer if change of mind |
| Consumables (oils, fluids) | No return | — | — |
| Electrical wiring, batteries | 7 days | Unused; no physical damage | Platform if defective only |
| Wrong part delivered | 14 days | Any condition | Platform covers return shipping |
| Damaged in transit | 48 hours from delivery | Photo evidence required | Platform covers return shipping |
| Not as described | 7 days | Photo evidence required | Platform covers return shipping |

## 11.2 Return Workflow

1. Customer submits return request: reason code + photos + description
2. Automated decision: if reason = "damaged in transit" or "wrong part" → auto-approved → pickup scheduled
3. Manual review: if reason = "change of mind" or "fitment issue" → shop reviews within 24hrs
4. Shop decision: approve (pickup scheduled) or reject (dispute opened)
5. Escalation: if shop rejects → customer can escalate to platform support within 48hrs
6. Support decision: platform support reviews evidence; can override shop decision
7. Return pickup: delivery partner picks item from customer → delivers to shop
8. Shop inspection: shop receives item, inspects, approves/rejects refund
9. Refund processing: initiated within 24hrs of shop approval; 3–7 business days to customer

## 11.3 Refund Methods

| Original Payment | Refund Options | Timeline |
|----------------|---------------|---------|
| UPI | UPI refund (auto) / Platform wallet | UPI: 2-3 hours; Wallet: instant |
| Credit/Debit Card | Card reversal | 5-7 business days |
| Net Banking | Bank transfer | 3-5 business days |
| COD | Bank transfer (IMPS/NEFT) / Platform wallet | Wallet: instant; Bank: 3-5 days |
| Platform Wallet | Platform wallet credit | Instant |
| EMI | EMI cancellation + refund to card | 7-10 business days |

---

# PART XII — NOTIFICATION SYSTEM

## 12. Notification System

The notification system is event-driven. Every significant platform event publishes a message to Kafka. Dedicated notification workers consume these events and dispatch to appropriate channels. This decouples notification logic from core business logic.

## 12.1 Notification Channels & Events

| Event | SMS | Email | Push | WhatsApp | In-App |
|-------|-----|-------|------|----------|--------|
| Order Placed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Payment Confirmed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order Confirmed by Shop | ✓ | — | ✓ | ✓ | ✓ |
| Order Packed | — | — | ✓ | ✓ | ✓ |
| Out for Delivery | ✓ | — | ✓ | ✓ | ✓ |
| Delivered | ✓ | ✓ | ✓ | ✓ | ✓ |
| Return Approved | — | ✓ | ✓ | ✓ | ✓ |
| Refund Processed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Low Stock Alert (Shop) | ✓ | — | ✓ | ✓ | ✓ |
| New RFQ Received (Vendor) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bid Won / Lost | — | ✓ | ✓ | ✓ | ✓ |
| Invoice Generated | — | ✓ | — | ✓ | ✓ |
| Payment Due (Udhaar) | ✓ | — | ✓ | ✓ | ✓ |
| New Review Posted | — | — | ✓ | — | ✓ |
| Account KYC Approved | ✓ | ✓ | ✓ | ✓ | ✓ |

## 12.2 Event-Driven Architecture

- Each notification event is a Kafka message with: event_type, entity_id, user_ids, template_id, template_vars, priority
- Priority levels: CRITICAL (OTP, payment), HIGH (order updates), NORMAL (marketing), LOW (reports)
- Template management: all message templates stored in DB, editable by admin without code deploy
- Localization: templates in Hindi, Telugu, Tamil, Kannada, Marathi, Gujarati
- Delivery receipts: all SMS/email/WhatsApp delivery receipts tracked; retry on failure
- Opt-out management: users can mute specific notification types per channel; TRAI DND compliance

---

# PART XIII — COMPLETE DATABASE SCHEMA DESIGN

## 13. Database Architecture

## 13.1 Database Strategy

| Database | Use Case | Why |
|----------|----------|-----|
| PostgreSQL 16 | Users, orders, inventory, billing, payments, vendors — all transactional data | ACID compliance, row-level security, JSON support, mature ecosystem |
| MongoDB Atlas | Product catalog attributes, activity logs, notification history, audit trails | Flexible schema for variable attribute sets across parts categories |
| Redis 7 | Sessions, JWT blacklist, stock level cache, search cache, job queues, pub/sub | Sub-millisecond reads, pub/sub for real-time features |
| Typesense | Search index for products, shops, parts with faceting | Purpose-built search; much faster and cheaper than Elasticsearch at startup scale |
| AWS S3 | Invoice PDFs, export files, document storage | Durable, cheap, good CDN integration |
| Cloudflare R2 | Product images, shop photos, delivery partner photos | Zero egress cost, automatic CDN, CORS-friendly |

## 13.2 Core Schema Tables

### 13.2.1 Users & Authentication

```sql
users (
  id                UUID PRIMARY KEY,
  phone             VARCHAR(15) UNIQUE,
  email             VARCHAR(255) UNIQUE NULLABLE,
  name              VARCHAR(255),
  role              ENUM('CUSTOMER','SHOP_OWNER','SHOP_MANAGER','CASHIER',
                        'MECHANIC','VENDOR','DELIVERY_PARTNER',
                        'WAREHOUSE_MANAGER','FINANCE','ADMIN','SUPPORT'),
  status            ENUM('ACTIVE','SUSPENDED','PENDING_KYC','BANNED'),
  profile_image_url TEXT,
  gstin             VARCHAR(15),
  pan               VARCHAR(10),
  referral_code     VARCHAR(20),
  referred_by       UUID REFERENCES users(id),
  created_at        TIMESTAMP,
  updated_at        TIMESTAMP,
  last_login_at     TIMESTAMP,
  is_verified       BOOLEAN DEFAULT false
)

user_sessions (
  id                  UUID PRIMARY KEY,
  user_id             UUID REFERENCES users(id),
  refresh_token_hash  VARCHAR(255),
  device_fingerprint  VARCHAR(255),
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMP,
  expires_at          TIMESTAMP,
  revoked_at          TIMESTAMP NULLABLE
)

user_kyc (
  id                  UUID PRIMARY KEY,
  user_id             UUID REFERENCES users(id),
  document_type       ENUM('AADHAAR','PAN','DRIVING_LICENSE','GST','TRADE_LICENSE'),
  document_number     VARCHAR(100),
  document_front_url  TEXT,
  document_back_url   TEXT,
  verification_status ENUM('PENDING','APPROVED','REJECTED'),
  verified_by         UUID REFERENCES users(id) NULLABLE,
  verified_at         TIMESTAMP,
  rejection_reason    TEXT
)
```

### 13.2.2 Shop & Vendor

```sql
shops (
  id                    UUID PRIMARY KEY,
  owner_id              UUID REFERENCES users(id),
  shop_name             VARCHAR(255),
  shop_type             ENUM('SPARE_PARTS','SERVICE_CENTER','VENDOR','DISTRIBUTOR'),
  gstin                 VARCHAR(15),
  pan                   VARCHAR(10),
  address_line1         TEXT,
  address_line2         TEXT,
  city                  VARCHAR(100),
  state                 VARCHAR(100),
  pincode               VARCHAR(10),
  lat                   DECIMAL(10,8),
  lng                   DECIMAL(11,8),
  phone                 VARCHAR(15),
  email                 VARCHAR(255),
  operating_hours       JSONB,
  shop_photos           JSONB,
  is_verified           BOOLEAN DEFAULT false,
  kyc_status            ENUM('PENDING','APPROVED','REJECTED'),
  marketplace_enabled   BOOLEAN DEFAULT false,
  erp_plan              ENUM('FREE','BASIC','PRO','ENTERPRISE'),
  subscription_expires_at TIMESTAMP,
  bank_account_id       UUID,
  trust_score           DECIMAL(5,2) DEFAULT 100.00,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
)

shop_staff (
  id          UUID PRIMARY KEY,
  shop_id     UUID REFERENCES shops(id),
  user_id     UUID REFERENCES users(id),
  role        ENUM('MANAGER','CASHIER','MECHANIC','WAREHOUSE'),
  permissions JSONB,
  is_active   BOOLEAN DEFAULT true,
  joined_at   TIMESTAMP
)
```

### 13.2.3 Product Catalog

```sql
catalog_categories (
  id          UUID PRIMARY KEY,
  parent_id   UUID REFERENCES catalog_categories(id) NULLABLE,
  name        VARCHAR(255),
  slug        VARCHAR(255) UNIQUE,
  level       INT,
  sort_order  INT,
  icon_url    TEXT,
  is_active   BOOLEAN DEFAULT true
)

catalog_brands (
  id          UUID PRIMARY KEY,
  name        VARCHAR(255),
  slug        VARCHAR(255) UNIQUE,
  logo_url    TEXT,
  country     VARCHAR(100),
  is_oem      BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false
)

catalog_skus (
  id                    UUID PRIMARY KEY,
  category_id           UUID REFERENCES catalog_categories(id),
  brand_id              UUID REFERENCES catalog_brands(id),
  sku_code              VARCHAR(100) UNIQUE,
  name                  VARCHAR(500),
  name_hi               VARCHAR(500),
  description           TEXT,
  oem_part_number       VARCHAR(200),
  aftermarket_numbers   JSONB,
  specifications        JSONB,
  images                JSONB,
  weight_grams          INT,
  hsn_code              VARCHAR(8),
  gst_rate              DECIMAL(5,2),
  is_active             BOOLEAN DEFAULT true,
  is_verified           BOOLEAN DEFAULT false,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
)

sku_fitments (
  id               UUID PRIMARY KEY,
  sku_id           UUID REFERENCES catalog_skus(id),
  vehicle_make_id  UUID REFERENCES vehicle_makes(id),
  vehicle_model_id UUID REFERENCES vehicle_models(id),
  year_from        INT,
  year_to          INT,
  variant_id       UUID REFERENCES vehicle_variants(id) NULLABLE,
  engine_id        UUID NULLABLE,
  notes            TEXT
)

vehicle_makes   (id UUID PK, name VARCHAR, logo_url TEXT, country VARCHAR)
vehicle_models  (id UUID PK, make_id UUID FK, name VARCHAR, category ENUM)
vehicle_variants(id UUID PK, model_id UUID FK, year_from INT, year_to INT,
                 fuel_type ENUM, transmission ENUM, engine_cc INT, body_type ENUM)
```

### 13.2.4 Inventory

```sql
shop_inventory (
  id               UUID PRIMARY KEY,
  shop_id          UUID REFERENCES shops(id),
  sku_id           UUID REFERENCES catalog_skus(id) NULLABLE,
  custom_item_name VARCHAR(500) NULLABLE,
  barcode          VARCHAR(100),
  selling_price    DECIMAL(12,2),
  mrp              DECIMAL(12,2),
  cost_price       DECIMAL(12,2),
  current_stock    DECIMAL(10,2),
  min_stock        DECIMAL(10,2),
  max_stock        DECIMAL(10,2),
  unit             ENUM('PCS','SET','LITRE','KG','METER'),
  rack_location    VARCHAR(100),
  is_active        BOOLEAN DEFAULT true,
  last_restocked_at TIMESTAMP,
  created_at       TIMESTAMP,
  updated_at       TIMESTAMP
  -- INDEX(shop_id), INDEX(sku_id), INDEX(barcode)
)

inventory_batches (
  id                UUID PRIMARY KEY,
  inventory_id      UUID REFERENCES shop_inventory(id),
  purchase_order_id UUID,
  quantity          DECIMAL(10,2),
  cost_price        DECIMAL(12,2),
  vendor_id         UUID,
  manufacture_date  DATE NULLABLE,
  expiry_date       DATE NULLABLE,
  batch_number      VARCHAR(100),
  created_at        TIMESTAMP
)

inventory_transactions (
  id               UUID PRIMARY KEY,
  shop_id          UUID REFERENCES shops(id),
  inventory_id     UUID REFERENCES shop_inventory(id),
  transaction_type ENUM('SALE','PURCHASE','RETURN_IN','RETURN_OUT',
                        'ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT'),
  quantity_change  DECIMAL(10,2),
  quantity_before  DECIMAL(10,2),
  quantity_after   DECIMAL(10,2),
  reference_id     UUID,
  reference_type   ENUM('ORDER','PURCHASE_ORDER','ADJUSTMENT','TRANSFER'),
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMP
  -- INDEX(shop_id, created_at), INDEX(inventory_id, created_at)
)
```

### 13.2.5 Orders

```sql
orders (
  id                  UUID PRIMARY KEY,
  order_number        VARCHAR(50) UNIQUE,
  customer_id         UUID REFERENCES users(id),
  total_amount        DECIMAL(12,2),
  discount_amount     DECIMAL(12,2),
  delivery_charge     DECIMAL(10,2),
  tax_amount          DECIMAL(12,2),
  grand_total         DECIMAL(12,2),
  payment_status      ENUM('PENDING','PAID','REFUNDED','PARTIALLY_REFUNDED'),
  payment_method      ENUM('UPI','CARD','NETBANKING','WALLET','COD','BNPL','EMI'),
  razorpay_order_id   VARCHAR(100),
  delivery_address    JSONB,
  status              ENUM(-- full 16-state machine --),
  placed_at           TIMESTAMP,
  confirmed_at        TIMESTAMP,
  packed_at           TIMESTAMP,
  shipped_at          TIMESTAMP,
  delivered_at        TIMESTAMP,
  completed_at        TIMESTAMP,
  cancelled_at        TIMESTAMP,
  cancellation_reason TEXT,
  created_at          TIMESTAMP,
  updated_at          TIMESTAMP
  -- INDEX(customer_id), INDEX(status), INDEX(placed_at)
)

order_items (
  id             UUID PRIMARY KEY,
  order_id       UUID REFERENCES orders(id),
  shop_id        UUID REFERENCES shops(id),
  inventory_id   UUID REFERENCES shop_inventory(id),
  sku_id         UUID REFERENCES catalog_skus(id),
  item_name      VARCHAR(500),
  quantity       DECIMAL(10,2),
  unit_price     DECIMAL(12,2),
  mrp            DECIMAL(12,2),
  discount       DECIMAL(12,2),
  taxable_value  DECIMAL(12,2),
  gst_rate       DECIMAL(5,2),
  gst_amount     DECIMAL(12,2),
  total_price    DECIMAL(12,2),
  hsn_code       VARCHAR(8),
  status         ENUM('ACTIVE','RETURNED','CANCELLED')
)

sub_orders (
  id                  UUID PRIMARY KEY,
  order_id            UUID REFERENCES orders(id),
  shop_id             UUID REFERENCES shops(id),
  status              ENUM,
  estimated_delivery  TIMESTAMP,
  actual_delivery     TIMESTAMP,
  delivery_partner_id UUID NULLABLE,
  tracking_events     JSONB
)
```

### 13.2.6 Invoices & Accounting

```sql
invoices (
  id              UUID PRIMARY KEY,
  invoice_number  VARCHAR(50) UNIQUE,
  invoice_type    ENUM('TAX_INVOICE','BILL_OF_SUPPLY','PROFORMA',
                       'CREDIT_NOTE','DEBIT_NOTE'),
  shop_id         UUID REFERENCES shops(id),
  order_id        UUID NULLABLE,
  buyer_id        UUID NULLABLE,
  buyer_details   JSONB,
  invoice_date    DATE,
  due_date        DATE NULLABLE,
  subtotal        DECIMAL(12,2),
  total_discount  DECIMAL(12,2),
  taxable_value   DECIMAL(12,2),
  cgst_amount     DECIMAL(12,2),
  sgst_amount     DECIMAL(12,2),
  igst_amount     DECIMAL(12,2),
  cess_amount     DECIMAL(12,2),
  round_off       DECIMAL(5,2),
  grand_total     DECIMAL(12,2),
  payment_status  ENUM('UNPAID','PARTIALLY_PAID','PAID'),
  irn             VARCHAR(64) NULLABLE,  -- e-invoice
  qr_code_url     TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP
)

invoice_line_items (
  id              UUID PRIMARY KEY,
  invoice_id      UUID REFERENCES invoices(id),
  item_name       VARCHAR(500),
  hsn_code        VARCHAR(8),
  quantity        DECIMAL(10,2),
  unit            ENUM,
  rate            DECIMAL(12,2),
  discount_pct    DECIMAL(5,2),
  discount_amount DECIMAL(12,2),
  taxable_value   DECIMAL(12,2),
  gst_rate        DECIMAL(5,2),
  cgst            DECIMAL(12,2),
  sgst            DECIMAL(12,2),
  igst            DECIMAL(12,2),
  total           DECIMAL(12,2)
)

ledger_entries (
  id                UUID PRIMARY KEY,
  shop_id           UUID REFERENCES shops(id),
  entry_date        DATE,
  debit_account_id  UUID REFERENCES chart_of_accounts(id),
  credit_account_id UUID REFERENCES chart_of_accounts(id),
  amount            DECIMAL(12,2),
  narration         TEXT,
  reference_id      UUID,
  reference_type    ENUM,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP
  -- INDEX(shop_id, entry_date)
)

chart_of_accounts (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  account_name    VARCHAR(255),
  account_type    ENUM('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'),
  parent_id       UUID REFERENCES chart_of_accounts(id) NULLABLE,
  is_system_account BOOLEAN DEFAULT false,
  opening_balance DECIMAL(14,2),
  current_balance DECIMAL(14,2)
)
```

### 13.2.7 B2B RFQ & Vendor Bids

```sql
rfq_requests (
  id                   UUID PRIMARY KEY,
  rfq_number           VARCHAR(50) UNIQUE,
  shop_id              UUID REFERENCES shops(id),
  title                VARCHAR(500),
  required_by          DATE,
  payment_terms        TEXT,
  delivery_requirements TEXT,
  status               ENUM('DRAFT','PUBLISHED','BIDDING',
                            'UNDER_NEGOTIATION','AWARDED','CANCELLED'),
  bid_deadline         TIMESTAMP,
  created_at           TIMESTAMP
)

rfq_items (
  id             UUID PRIMARY KEY,
  rfq_id         UUID REFERENCES rfq_requests(id),
  sku_id         UUID REFERENCES catalog_skus(id) NULLABLE,
  item_name      VARCHAR(500),
  quantity       DECIMAL(10,2),
  unit           ENUM,
  target_price   DECIMAL(12,2) NULLABLE,
  specifications TEXT
)

vendor_bids (
  id               UUID PRIMARY KEY,
  rfq_id           UUID REFERENCES rfq_requests(id),
  vendor_id        UUID REFERENCES shops(id),
  total_bid_amount DECIMAL(14,2),
  gst_included     BOOLEAN,
  delivery_date    DATE,
  payment_terms    TEXT,
  validity_days    INT,
  bid_notes        TEXT,
  status           ENUM('SUBMITTED','COUNTER_OFFERED','ACCEPTED','REJECTED','EXPIRED'),
  submitted_at     TIMESTAMP
)

vendor_bid_items (
  id            UUID PRIMARY KEY,
  bid_id        UUID REFERENCES vendor_bids(id),
  rfq_item_id   UUID REFERENCES rfq_items(id),
  unit_price    DECIMAL(12,2),
  total_price   DECIMAL(12,2),
  gst_rate      DECIMAL(5,2),
  gst_amount    DECIMAL(12,2),
  brand         VARCHAR(255),
  part_number   VARCHAR(200),
  notes         TEXT
)
```

### 13.2.8 Delivery & Tracking

```sql
delivery_partners (
  id                      UUID PRIMARY KEY,
  user_id                 UUID REFERENCES users(id),
  vehicle_type            ENUM('BIKE','CAR','VAN','BICYCLE'),
  vehicle_number          VARCHAR(20),
  license_number          VARCHAR(20),
  is_available            BOOLEAN DEFAULT false,
  current_lat             DECIMAL(10,8),
  current_lng             DECIMAL(11,8),
  last_location_updated_at TIMESTAMP,
  rating                  DECIMAL(3,2),
  total_deliveries        INT DEFAULT 0,
  active_delivery_id      UUID NULLABLE
)

deliveries (
  id                   UUID PRIMARY KEY,
  sub_order_id         UUID REFERENCES sub_orders(id),
  delivery_partner_id  UUID REFERENCES delivery_partners(id) NULLABLE,
  third_party_provider ENUM('PORTER','DUNZO','SHIPROCKET') NULLABLE,
  tracking_number      VARCHAR(100),
  pickup_address       JSONB,
  delivery_address     JSONB,
  status               ENUM,
  assigned_at          TIMESTAMP,
  picked_up_at         TIMESTAMP,
  estimated_delivery   TIMESTAMP,
  delivered_at         TIMESTAMP,
  pod_type             ENUM('OTP','PHOTO','SIGNATURE','CONTACTLESS'),
  pod_reference        TEXT,
  route_polyline       TEXT,
  distance_km          DECIMAL(8,2)
)

delivery_location_pings (
  id              BIGSERIAL PRIMARY KEY,
  delivery_id     UUID REFERENCES deliveries(id),
  lat             DECIMAL(10,8),
  lng             DECIMAL(11,8),
  accuracy_meters INT,
  speed_kmh       DECIMAL(6,2),
  heading         INT,
  timestamp       TIMESTAMP
  -- PARTITION BY RANGE(timestamp), INDEX(delivery_id, timestamp DESC)
  -- Partition by day; purge after 90 days
)
```

### 13.2.9 Reviews & Ratings

```sql
reviews (
  id                   UUID PRIMARY KEY,
  review_type          ENUM('PRODUCT','SHOP','DELIVERY','SERVICE_CENTER','VENDOR'),
  reviewer_id          UUID REFERENCES users(id),
  reviewee_id          UUID,
  order_id             UUID REFERENCES orders(id),
  rating               DECIMAL(2,1),
  title                VARCHAR(500),
  body                 TEXT,
  images               JSONB,
  is_verified_purchase BOOLEAN DEFAULT true,
  is_approved          BOOLEAN DEFAULT false,
  fraud_score          DECIMAL(5,4),
  helpful_count        INT DEFAULT 0,
  reported_count       INT DEFAULT 0,
  seller_response      TEXT,
  seller_response_at   TIMESTAMP,
  created_at           TIMESTAMP,
  updated_at           TIMESTAMP
  -- INDEX(reviewee_id, review_type), INDEX(order_id)
)
```

## 13.3 Sharding & Indexing Strategy

| Table | Sharding Key | Index Strategy | Notes |
|-------|-------------|---------------|-------|
| orders | customer_id hash sharding at 50K orders/day | Composite: (customer_id, placed_at), (status, placed_at), (shop_id, placed_at) | Partition by month beyond 1M rows |
| invoice_line_items | shop_id hash sharding | Composite: (invoice_id), (shop_id, invoice_date) | High write volume table |
| delivery_location_pings | delivery_id hash + time-range partitioning | (delivery_id, timestamp DESC) | Partition by day; purge after 90 days |
| inventory_transactions | shop_id hash sharding | (shop_id, created_at), (inventory_id, created_at) | High write table from POS |
| ledger_entries | shop_id hash sharding | (shop_id, entry_date), (debit_account_id), (credit_account_id) | Critical for accounting queries |
| catalog_skus | no sharding needed at startup | (sku_code), (category_id), full-text GIN index on name | GIN for LIKE search; Typesense for real search |

---

# PART XIV — SYSTEM & MICROSERVICE ARCHITECTURE

## 14. System Architecture

The architecture follows a phased evolution from a Modular Monolith (V1) to a full Microservices architecture (V3+). This approach prioritizes developer velocity at launch while maintaining a clear migration path to distributed systems as scale demands it.

## 14.1 Architecture Evolution Phases

| Phase | Architecture | Scale | Rationale |
|-------|-------------|-------|-----------|
| V1 (MVP, 0–6 months) | Modular Monolith — 1 deployable, multiple logical modules | 5 shops, 100 MAU | Speed over perfection; horizontal scaling via load balancer |
| V2 (Growth, 6–18 months) | Service-Oriented Monolith — extract search, notifications, file gen as separate services | 500 shops, 50K MAU | Extract proven bottlenecks only; not premature optimization |
| V3 (Scale, 18–36 months) | Microservices — 12 core services, shared API gateway, event mesh via Kafka | 10K shops, 1M MAU | Full independence, polyglot, independent scaling, fault isolation |
| V4 (Global, 36+ months) | Multi-region microservices — global CDN, data residency per region | Global scale | Data sovereignty, latency optimization, regional compliance |

## 14.2 V3 Microservice Map

| Service | Responsibility | Database | Port/Protocol |
|---------|---------------|---------|---------------|
| API Gateway (Kong) | Route, auth, rate-limit, load balance all inbound traffic | N/A — stateless | 443 HTTPS / gRPC |
| Auth Service | JWT issue/refresh, OTP, OAuth, session management | PostgreSQL (auth DB) + Redis | 8001 REST |
| User Service | User CRUD, profiles, KYC, roles, preferences | PostgreSQL (user DB) | 8002 REST + gRPC |
| Shop Service | Shop CRUD, staff management, KYC, settings, plans | PostgreSQL (shop DB) | 8003 REST |
| Catalog Service | Global catalog, SKUs, categories, brands, fitment | PostgreSQL (catalog DB) + MongoDB | 8004 REST + gRPC |
| Inventory Service | Stock management, GRN, adjustments, alerts, warehouse | PostgreSQL (inventory DB) | 8005 REST + gRPC |
| Order Service | Cart, checkout, order lifecycle, state machine | PostgreSQL (order DB) | 8006 REST + gRPC |
| Payment Service | Razorpay integration, reconciliation, refunds, settlements | PostgreSQL (payment DB) | 8007 REST |
| Invoice Service | GST invoice generation, PDF creation, e-invoice IRN | PostgreSQL (invoice DB) | 8008 REST |
| Accounting Service | Ledger, P&L, balance sheet, GST reports | PostgreSQL (accounting DB) | 8009 REST |
| Delivery Service | Partner assignment, GPS tracking, POD, third-party logistics | PostgreSQL (delivery DB) + Redis | 8010 REST + WebSocket |
| Search Service | Typesense management, indexing pipeline, search API | Typesense + Redis (cache) | 8011 REST |
| Notification Service | Event consumption, template rendering, channel dispatch | PostgreSQL (notif DB) + Redis | 8012 REST + Kafka consumer |
| B2B Service | RFQ, bidding, PO management, vendor relations | PostgreSQL (b2b DB) | 8013 REST |
| Review Service | Reviews, ratings, fraud detection, trust scores | PostgreSQL (review DB) + MongoDB | 8014 REST |
| Admin Service | Platform administration, disputes, configuration | Shared read replicas | 8015 REST |

## 14.3 Request Flow — Microservices

1. Client → Cloudflare CDN/WAF → AWS ALB (Application Load Balancer)
2. ALB → Kong API Gateway (rate limit check, JWT validation, route matching)
3. Kong → Auth Service (token introspection) → Kong (enriches request with user context)
4. Kong → Target Microservice (e.g., Order Service for POST /orders)
5. Order Service → Kafka publish (order.created event)
6. Kafka → Inventory Service consumer (reserve stock)
7. Kafka → Notification Service consumer (send confirmation)
8. Kafka → Payment Service consumer (create payment record)
9. Response back to client via Kong → ALB → CDN

## 14.4 Service Communication Patterns

| Pattern | Used For | Technology | Notes |
|---------|---------|-----------|-------|
| Synchronous REST | User-facing API calls where immediate response needed | Express REST + Axios | Via API gateway; circuit breaker pattern |
| Synchronous gRPC | High-frequency inter-service calls (Inventory → Order stock check) | gRPC + Protobuf | Faster than REST for internal; strongly typed |
| Async Events (pub/sub) | Side effects that don't need immediate response (notifications, index updates) | Kafka topics | Fire and forget; consumer groups for reliability |
| Async Jobs (queues) | Scheduled and background work (PDF generation, batch exports) | BullMQ + Redis | Priority queues; dead letter queue for failures |
| WebSocket | Real-time client features (delivery tracking, live notifications) | Socket.io | Redis adapter for multi-instance pub/sub |
| Service Mesh | Service-to-service mTLS, observability, traffic management | Istio (V4+) | Introduce at V4 global scale |

---

# PART XV — PAYMENT SYSTEM

## 15. Payment System

## 15.1 Supported Payment Methods

| Method | Provider | Flow | Notes |
|--------|---------|------|-------|
| UPI (auto-pay) | Razorpay UPI | Intent/Collect flow; deep-link to UPI apps | 95% success rate in India; preferred |
| UPI QR | Razorpay | QR generated; customer scans in any UPI app | Good for offline/COD replacement |
| Credit/Debit Card | Razorpay | PCI-DSS compliant card form; 3DS2 authentication | Razorpay handles card data; we never touch card numbers |
| Net Banking | Razorpay | Redirect to bank portal | Lower success rate; last resort |
| Digital Wallets | Razorpay (Paytm, PhonePe via aggregator) | Wallet balance deduction | Instant; no OTP for small amounts |
| COD (Cash on Delivery) | Platform-managed | Order placed; payment collected at delivery | Agent collects; deposits to shop; platform reconciles |
| Buy Now Pay Later | Simpl / LazyPay / Razorpay BNPL | Credit check → purchase → pay later | For orders >₹500 |
| EMI | Razorpay EMI | Bank EMI + cardless EMI | For orders >₹3,000 |
| Platform Wallet | Custom implementation | Pre-loaded credits; cashback storage | Instant checkout; lock-in mechanism |
| B2B Credit | Custom implementation | 30/60-day credit terms for shop-vendor B2B | Managed manually; credit limit per vendor relationship |

## 15.2 Payment Reconciliation

- Every payment creates a Payment record linked to Order + Invoice
- Razorpay webhook consumed by Payment Service → updates order status on success
- Settlement: Razorpay settles to platform account T+1 or T+2
- Shop payout: platform calculates shop's earnings = order_total - platform_commission - payment_gateway_fee - shipping_fee; settles to shop's bank account on T+3
- Reconciliation job: daily batch job reconciles Razorpay settlement report against internal payment records; flags discrepancies for finance team
- Dispute handling: Razorpay chargebacks auto-trigger dispute workflow; evidence collected; platform bears cost if shop at fault

## 15.3 Financial Controls

- Payment Service is the only service that can write to payment and settlement tables
- All payment operations are append-only (immutable ledger pattern); corrections via adjustment entries, never deletes
- TDS deduction: platform deducts TDS (1% for B2B, applicable thresholds) and generates TDS certificates
- GST on platform commission: platform's 3-8% commission is subject to GST; platform issues tax invoice to shops for commission charges

---

# PART XVI — SECURITY & COMPLIANCE

## 16. Security Architecture

## 16.1 Security Layers

| Layer | Mechanism | Implementation |
|-------|-----------|---------------|
| Network | DDoS protection, WAF rules, IP allowlisting for admin | Cloudflare Enterprise WAF + AWS Shield |
| Transport | TLS 1.3 everywhere; HSTS with preload; certificate pinning in mobile | AWS ACM + Cloudflare SSL |
| Authentication | JWT RS256, refresh token rotation, OTP brute-force protection | Custom auth service; Firebase for OTP |
| Authorization | RBAC with attribute-based overrides; row-level security in PostgreSQL | Middleware per route; PostgreSQL RLS |
| API Gateway | Rate limiting per user/IP/endpoint; request size limits; API key management | Kong Gateway with rate-limit plugin |
| Input Validation | Zod schema validation on all API inputs; parameterized queries only | Zod for TypeScript; Prisma prevents SQL injection |
| Secrets Management | All secrets in AWS Secrets Manager; env vars never in code; secret rotation | AWS Secrets Manager + GitHub Actions OIDC |
| Data Encryption | At-rest: AES-256 for DB (AWS RDS encryption), S3 SSE-S3 | AWS managed keys; PII-encrypted at column level |
| Audit Logging | Every data-modifying action logged with user_id, timestamp, before/after state | Append-only audit log table + CloudWatch |
| Fraud Detection | Velocity checks, geo-anomaly, device fingerprinting, ML score | Custom rules engine + Sift Science (Phase 3+) |
| PCI DSS | Never store, process, or transmit raw card data | Delegate entirely to Razorpay (PCI DSS Level 1) |
| GDPR / PDPB | Data deletion on request within 30 days; data portability export; consent management | Custom data management workflows |

## 16.2 Audit Logging

```sql
audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID,
  user_id     UUID,
  action      VARCHAR(200),
  entity_type ENUM,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  timestamp   TIMESTAMP
)
```

- Audit logs shipped to AWS CloudWatch Logs (7-year retention for financial records)
- Admin UI for audit log search: filter by user, action, entity, date range
- Immutability enforced via PostgreSQL trigger: any UPDATE/DELETE on audit_logs raises exception

---

# PART XVII — ADMIN DASHBOARD

## 17. Admin Dashboard & Control Center

## 17.1 Admin Modules

| Module | Key Functions |
|--------|--------------|
| User Management | View/search all users; verify KYC; suspend/ban accounts; reset 2FA; impersonate for support |
| Shop Management | Approve/reject shop registrations; review KYC documents; set subscription plans; view shop analytics; force-disable listing |
| Product Catalog | Add/edit/delete catalog SKUs; manage categories; import brand catalogs; flag incorrect fitment data; bulk upload via CSV |
| Order Management | View all orders with full timeline; manual state transitions; cancel/refund orders; reassign delivery partners; investigate disputes |
| Payment & Finance | Settlement reports; reconciliation status; pending refunds; chargeback management; TDS reports; commission analytics |
| Disputes & Returns | View open disputes; review evidence; issue platform-level refund overrides; penalize bad actors; track dispute resolution SLA |
| Delivery Partners | Onboard/offboard partners; view performance metrics; manage zones; real-time partner location map; payout management |
| Vendor Management | Approve vendor registrations; view bid history; manage vendor trust scores; handle vendor disputes |
| Notification Center | Create/edit notification templates; broadcast announcements; view delivery receipts; manage opt-out lists |
| Analytics Dashboard | Platform GMV, MAU, order volume, shop count — live metrics with daily/weekly/monthly breakdowns; cohort analysis |
| Configuration | Feature flags; maintenance mode; commission rate overrides; city launch controls; A/B test configuration |
| Audit Log Viewer | Search/filter immutable audit trail; export for compliance |

---

# PART XVIII — AI & MACHINE LEARNING FEATURES

## 18. AI & Machine Learning Features (Phase 6)

## 18.1 AI Feature Roadmap

| Feature | Input Data | Model Type | Business Impact |
|---------|-----------|-----------|----------------|
| Dynamic Pricing Engine | Historical sales, competitor prices, demand signals, inventory levels, time of day/week | Gradient Boosting (XGBoost) | 2–5% GMV increase from price optimization |
| Demand Forecasting | SKU sales history, seasonality, location, vehicle registration trends | LSTM / Prophet (time-series) | 20–30% reduction in stockouts and dead stock |
| Inventory Replenishment AI | Sales velocity, lead times, seasonal patterns, RFQ history | Reinforcement Learning + statistical | Auto-generate RFQs; reduce manual procurement effort by 60% |
| Fake Review Detection | Review text, account age, purchase velocity, IP patterns, device fingerprint, timing | BERT NLP + anomaly detection | Maintain trust; prevent competitor gaming |
| Fitment Recommendation | Order history, vehicle profile, catalog browse behavior | Collaborative filtering + content-based | Upsell compatible parts; reduce wrong-part returns |
| Search Personalization | User browse/purchase history, vehicle profile, location, time | Two-tower neural network | 12–18% search-to-purchase conversion improvement |
| Fraud Detection | Transaction patterns, location, device, order history, payment method | Real-time ML scoring (Isolation Forest) | Reduce chargeback rate from ~1% to <0.3% |
| Chatbot / Voice Assistant | Natural language queries in English + Hindi | Fine-tuned LLM (GPT-4o / Gemini Pro) | Reduce support load by 40%; 24/7 customer assistance |
| Part Image Recognition | Photo of damaged/broken part uploaded by customer | CNN (ResNet / EfficientNet) | Help customers identify parts without knowing names |
| Service Anomaly Detection | Service center timing, price, complaint rates | Unsupervised clustering | Detect fraudulent service centers before users complain |

## 18.2 AI Infrastructure

- ML training: AWS SageMaker for model training and deployment; MLflow for experiment tracking
- Feature store: Feast (open-source) for managing ML features shared across models
- Model serving: SageMaker real-time endpoints for latency-sensitive models (fraud, search)
- Batch inference: SageMaker batch transform for nightly demand forecasting runs
- Data pipeline: Apache Airflow for ETL pipelines feeding ML training data
- A/B testing: split traffic via API gateway feature flags; measure metrics via Mixpanel

---

# PART XIX — AGILE PHASE-WISE IMPLEMENTATION PLAN

## 19. Agile Development Phases

---

## Phase 0 — Research & Architecture (Weeks 1–4)

### Sprint 0.1 (Week 1–2)
Project scaffold: monorepo setup, CI/CD pipeline (GitHub Actions), Docker Compose dev environment, ESLint/Prettier/Husky, PostgreSQL + Redis setup, Prisma initial schema, Cloudflare R2 + S3 bucket setup

### Sprint 0.2 (Week 3–4)
Auth service: phone OTP (Firebase), JWT issue/refresh, RBAC middleware, user registration flows, Postman collection. Design system: Tailwind config, component library (Button, Input, Modal, Table), dark mode tokens, responsive grid.

---

## Phase 1 — MVP Launch (Weeks 5–16)
**Goal:** 5 pilot shops live, ERP core functional, basic marketplace browsable

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 1.1 | Wk 5–6 | Shop onboarding: registration, KYC upload, admin approval workflow. Basic inventory: add stock items, categories, pricing. Barcode generation and printing. |
| Sprint 1.2 | Wk 7–8 | POS billing: fast invoice creation, barcode scan, GST calculation, payment modes (cash/UPI/card). Invoice PDF generation (Puppeteer). Customer SMS receipt. |
| Sprint 1.3 | Wk 9–10 | Inventory management: purchase orders, GRN, stock adjustment, stock alerts. Supplier management CRUD. Inventory transaction ledger. |
| Sprint 1.4 | Wk 11–12 | Customer marketplace: registration, vehicle profile, browse/search (Typesense), product pages, cart. Razorpay payment integration. Basic order placement. |
| Sprint 1.5 | Wk 13–14 | Order management: shop receives order notification, confirms, marks packed. Basic delivery assignment (manual). Order status tracking page for customer. |
| Sprint 1.6 | Wk 15–16 | Reports: daily sales summary, stock report, GST summary (GSTR-1 export). Admin dashboard: shop approval, user management. Go-live prep: security audit, load testing. |

---

## Phase 2 — Marketplace Expansion (Weeks 17–28)
**Goal:** 50+ shops, marketplace fully functional, delivery operational

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 2.1 | Wk 17–18 | Multi-seller marketplace: price comparison engine, seller ranking algorithm, fitment-filtered search, vehicle compatibility badges, "Fits Your Vehicle" feature. |
| Sprint 2.2 | Wk 19–20 | Delivery system: delivery partner app (React Native), GPS tracking (WebSocket), partner assignment algorithm, OTP-based POD, customer tracking map. |
| Sprint 2.3 | Wk 21–22 | Reviews & ratings: product/shop/delivery reviews, fraud detection (basic rules), seller response, review moderation queue in admin. |
| Sprint 2.4 | Wk 23–24 | Return & refund system: return request flow, admin dispute resolution, Razorpay refund API integration, refund tracking. |
| Sprint 2.5 | Wk 25–26 | Advanced search: category facets, brand filter, price range, availability filter, sort options, search analytics, query suggestions. |
| Sprint 2.6 | Wk 27–28 | Notification system: Kafka event architecture, SMS (MSG91), email (Resend), WhatsApp (WATI), push notifications (FCM), template management. |

---

## Phase 3 — Vendor Network (Weeks 29–40)
**Goal:** B2B marketplace live, vendor onboarding, RFQ system operational

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 3.1 | Wk 29–30 | Vendor portal: vendor registration + KYC, catalog management, bid submission interface, order fulfillment workflow. |
| Sprint 3.2 | Wk 31–32 | RFQ system: shop creates RFQ, vendor notification, sealed bid submission, bid comparison table, counter-offer workflow. |
| Sprint 3.3 | Wk 33–34 | B2B purchase orders: auto-generate PO from winning bid, vendor PO acceptance, GRN matching, B2B invoice generation. |
| Sprint 3.4 | Wk 35–36 | Vendor trust score: delivery tracking, bid reliability, rating system. Shop-vendor relationship management, preferred vendor list, blacklist. |
| Sprint 3.5 | Wk 37–38 | B2B payments: credit terms management, payment due alerts, aging reports, partial payment tracking. |
| Sprint 3.6 | Wk 39–40 | Multi-city launch toolkit: city configuration, logistics zone management, pincode serviceability, city-specific pricing zones. |

---

## Phase 4 — Inventory + Accounting System (Weeks 41–52)
**Goal:** Full Tally-replacement ERP, GST compliance, financial reporting

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 4.1 | Wk 41–42 | Advanced inventory: multi-warehouse, inter-warehouse transfers, batch tracking, FIFO/LIFO/Weighted Average costing, expiry tracking. |
| Sprint 4.2 | Wk 43–44 | Full accounting: chart of accounts, double-entry ledger, accounts payable, accounts receivable, bank reconciliation. |
| Sprint 4.3 | Wk 45–46 | GST compliance: GSTR-1, GSTR-3B generation, ITC reconciliation, e-invoice IRN integration, e-way bill generation. |
| Sprint 4.4 | Wk 47–48 | Financial reports: P&L, balance sheet, cash flow, udhaar ledger, customer aging, vendor aging. PDF export. |
| Sprint 4.5 | Wk 49–50 | Dead stock AI: slow-moving alerts, dead stock reports, auto-suggest RFQ for low stock, demand-based reorder quantities. |
| Sprint 4.6 | Wk 51–52 | Staff management: role-based ERP access, cashier-only mode, activity logs, shift management, attendance integration. |

---

## Phase 5 — Logistics & Real-Time Tracking (Weeks 53–64)
**Goal:** Zomato-quality delivery experience, third-party logistics integration, route optimization

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 5.1 | Wk 53–54 | Advanced delivery: multi-stop delivery optimization (deliver 3 orders in one trip), batch assignment, dynamic ETA with traffic data. |
| Sprint 5.2 | Wk 55–56 | Third-party logistics: Porter / Dunzo Business API, Shiprocket for outstation, smart routing (hyperlocal first, courier fallback). |
| Sprint 5.3 | Wk 57–58 | Delivery partner app v2: earnings dashboard, acceptance rate tracking, dispute reporting, navigation integration (Google Maps / MapMyIndia). |
| Sprint 5.4 | Wk 59–60 | Live operations dashboard: real-time delivery map for admin, SLA breach alerts, partner performance heatmap, city-level operations view. |
| Sprint 5.5 | Wk 61–62 | Service center booking: GoMechanic-style booking flow, mechanic assignment, live job status tracking, parts-to-service integration. |
| Sprint 5.6 | Wk 63–64 | Vehicle service history: digital vehicle health record, service reminders, warranty tracking. |

---

## Phase 6 — AI Pricing & Recommendation (Weeks 65–80)
**Goal:** AI-powered features driving conversion, retention, and operational efficiency

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 6.1 | Wk 65–68 | Demand forecasting: LSTM model on sales history, inventory replenishment recommendations, auto-draft RFQ generation. |
| Sprint 6.2 | Wk 69–72 | Dynamic pricing: XGBoost model for price optimization, competitor price scraping (ethical), time-of-day pricing suggestions. |
| Sprint 6.3 | Wk 73–76 | Search personalization: two-tower model, personalized ranking, "Customers also bought" recommendations, frequently bought together. |
| Sprint 6.4 | Wk 77–80 | AI support chatbot: LLM fine-tuned on platform Q&A, Hindi + English support, order status via chatbot, escalation to human agent. |

---

## Phase 7 — Global Scale Infrastructure (Weeks 81–104)
**Goal:** 99.99% uptime, multi-region, 1M+ MAU capacity, Series A-ready infrastructure

| Sprint | Duration | Features |
|--------|----------|---------|
| Sprint 7.1 | Wk 81–84 | Full microservices migration: extract all 16 services, Kubernetes (EKS) deployment, Istio service mesh, Kafka event backbone. |
| Sprint 7.2 | Wk 85–88 | Multi-region: AWS ap-south-1 (Mumbai primary) + ap-southeast-1 (Singapore secondary), Aurora Global Database, CloudFront global CDN. |
| Sprint 7.3 | Wk 89–92 | Observability: Datadog APM, distributed tracing (Jaeger), SLO/SLA dashboards, automated runbooks, PagerDuty on-call rotation. |
| Sprint 7.4 | Wk 93–96 | Performance: read replicas per service, Redis Cluster for cache, CDN cache for catalog APIs, database query optimization pass. |
| Sprint 7.5 | Wk 97–100 | Compliance: PDPB (India) compliance, GDPR for global users, SOC 2 Type II audit preparation, penetration testing. |
| Sprint 7.6 | Wk 101–104 | International expansion prep: multi-currency, multi-language (5 languages), country-specific tax engines, UAE / SEA market research. |

---

# PART XX — API DESIGN REFERENCE

## 20. API Design

All APIs follow REST conventions with JSON payloads. API versioning is via URL path (/api/v1/).

Every response follows a standard envelope:
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 450 },
  "error": null
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "STOCK_INSUFFICIENT", "message": "Not enough stock", "details": {} }
}
```

## 20.1 Authentication APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| POST | /api/v1/auth/send-otp | Send OTP to phone number | No |
| POST | /api/v1/auth/verify-otp | Verify OTP, issue JWT + refresh token | No |
| POST | /api/v1/auth/refresh | Refresh access token using refresh token cookie | No |
| POST | /api/v1/auth/logout | Revoke refresh token | Yes |
| POST | /api/v1/auth/google | Google OAuth callback, issue tokens | No |
| GET | /api/v1/auth/me | Get current user profile | Yes |

## 20.2 Catalog & Search APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| GET | /api/v1/catalog/search?q=&vehicle_id=&category=&brand=&price_min=&price_max=&page= | Full-text search with fitment filter | No |
| GET | /api/v1/catalog/skus/:id | Get SKU details with fitment list and seller offers | No |
| GET | /api/v1/catalog/categories | Get category tree | No |
| GET | /api/v1/catalog/brands | Get brand list with filters | No |
| GET | /api/v1/vehicles/makes | Get all vehicle makes | No |
| GET | /api/v1/vehicles/models?make_id= | Get models for a make | No |
| GET | /api/v1/vehicles/variants?model_id=&year= | Get variants | No |
| POST | /api/v1/catalog/skus | Create new catalog SKU | Admin |
| PUT | /api/v1/catalog/skus/:id | Update catalog SKU | Admin |

## 20.3 Inventory APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| GET | /api/v1/shop/inventory?page=&search=&category=&low_stock=true | List shop inventory | Shop staff |
| POST | /api/v1/shop/inventory | Add new stock item | Shop owner/manager |
| PUT | /api/v1/shop/inventory/:id | Update stock item (price, location, etc.) | Shop owner/manager |
| POST | /api/v1/shop/inventory/adjustment | Create stock adjustment with reason | Shop owner/manager |
| GET | /api/v1/shop/inventory/:id/transactions | Get movement history for item | Shop staff |
| POST | /api/v1/shop/purchase-orders | Create purchase order | Shop owner/manager |
| POST | /api/v1/shop/purchase-orders/:id/grn | Record goods receipt | Shop staff |

## 20.4 Order APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| GET | /api/v1/customer/cart | Get current cart | Customer |
| POST | /api/v1/customer/cart/items | Add item to cart | Customer |
| DELETE | /api/v1/customer/cart/items/:id | Remove from cart | Customer |
| POST | /api/v1/customer/checkout | Create order + initiate payment | Customer |
| GET | /api/v1/customer/orders | List customer orders | Customer |
| GET | /api/v1/customer/orders/:id | Get order details + tracking | Customer |
| POST | /api/v1/customer/orders/:id/return | Initiate return request | Customer |
| GET | /api/v1/shop/orders | List incoming orders for shop | Shop staff |
| PUT | /api/v1/shop/orders/:id/status | Update order status (confirm, pack, etc.) | Shop staff |
| POST | /api/v1/payments/webhook | Razorpay webhook handler | Razorpay signed |

## 20.5 B2B RFQ APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| POST | /api/v1/shop/rfq | Create RFQ | Shop owner |
| GET | /api/v1/shop/rfq | List shop's RFQs | Shop owner |
| GET | /api/v1/vendor/rfq | List open RFQs for vendor (matching categories) | Vendor |
| POST | /api/v1/vendor/rfq/:id/bid | Submit bid on RFQ | Vendor |
| POST | /api/v1/shop/rfq/:id/counter | Submit counter-offer | Shop owner |
| POST | /api/v1/shop/rfq/:id/award/:bid_id | Award RFQ to winning vendor | Shop owner |
| GET | /api/v1/shop/rfq/:id/bids | Get all bids for an RFQ (after deadline) | Shop owner |

## 20.6 Delivery APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| GET | /api/v1/delivery/active | Get active delivery for partner | Delivery partner |
| PUT | /api/v1/delivery/:id/accept | Accept delivery assignment | Delivery partner |
| PUT | /api/v1/delivery/:id/pickup | Mark picked up from shop | Delivery partner |
| PUT | /api/v1/delivery/:id/deliver | Mark delivered (OTP/photo) | Delivery partner |
| POST | /api/v1/delivery/:id/location | Send GPS ping | Delivery partner |
| GET | /api/v1/customer/orders/:id/tracking | Get live tracking for order | Customer |

## 20.7 Accounting APIs

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|--------------|
| GET | /api/v1/shop/reports/pnl?from=&to= | Profit & Loss report | Shop owner/finance |
| GET | /api/v1/shop/reports/gstr1?month=&year= | GSTR-1 export | Shop owner/finance |
| GET | /api/v1/shop/reports/gstr3b?month=&year= | GSTR-3B summary | Shop owner/finance |
| GET | /api/v1/shop/ledger?account_id=&from=&to= | Ledger entries for an account | Shop owner/finance |
| GET | /api/v1/shop/invoices?page=&type=&status= | List invoices | Shop staff |
| GET | /api/v1/shop/invoices/:id/pdf | Download invoice PDF | Shop staff/Customer |

---

# PART XXI — INFRASTRUCTURE DEPLOYMENT PLAN

## 21. Infrastructure Deployment

## 21.1 AWS Architecture — V1 (MVP)

| Resource | Service | Spec | Notes |
|----------|---------|------|-------|
| API Server | AWS ECS Fargate | 2 vCPU, 4GB RAM × 2 instances | Stateless; behind ALB |
| Database (Primary) | AWS RDS PostgreSQL 16 | db.t3.medium, 100GB SSD, Multi-AZ | Automated backups, 7-day retention |
| Cache | AWS ElastiCache Redis 7 | cache.t3.small | Sessions, stock cache, job queue |
| Search | Self-hosted Typesense on EC2 | t3.small, 30GB SSD | Daily snapshot to S3 |
| File Storage | AWS S3 + Cloudflare R2 | Standard storage class | S3 for PDFs; R2 for images (zero egress) |
| Load Balancer | AWS ALB | Standard | SSL termination, health checks |
| CDN / WAF | Cloudflare Free → Pro | — | DDoS, SSL, static assets |
| Container Registry | AWS ECR | — | Docker images |
| Secrets | AWS Secrets Manager | — | DB passwords, API keys |
| Email | AWS SES + Resend | — | SES for bulk; Resend for transactional |
| Logging | AWS CloudWatch Logs | — | 30-day retention in CW; S3 archive |

## 21.2 AWS Architecture — V3 (Scale: Kubernetes)

| Resource | Service | Scale Target | Auto-Scaling |
|----------|---------|-------------|-------------|
| Container Orchestration | AWS EKS (Kubernetes 1.29) | 16 microservices | HPA: CPU/memory triggers; KEDA for queue-based |
| Database — Primary | Aurora PostgreSQL 16 (Serverless v2) | Auto-scales 0.5–64 ACU | Auto-scales on load |
| Database — Shards | RDS PostgreSQL (per service DB) | 16 databases across 4 RDS clusters | Vertical + read replica scaling |
| Cache Cluster | ElastiCache Redis 7 Cluster | 6-node cluster (3 primary, 3 replica) | Add shards on memory usage |
| Message Queue | Amazon MSK (Managed Kafka) | 3 broker cluster, 30 day retention | Partition-level scaling |
| Search | Typesense Cloud / Dedicated EC2 | r5.xlarge (32GB RAM) | Manual vertical scaling |
| CDN | CloudFront + Cloudflare Enterprise | 200+ PoPs globally | Auto |
| Load Balancing | AWS ALB (per service) + NLB (gRPC) | Unlimited | Auto |
| Object Storage | S3 Intelligent Tiering + Cloudflare R2 | Unlimited | Auto |
| Observability | Datadog APM + CloudWatch + Jaeger | — | — |

## 21.3 CI/CD Pipeline (8 Stages)

1. Developer pushes to feature branch → GitHub Actions triggered
2. **Stage 1 — Build & Test:** npm install, TypeScript compile, unit tests (Jest), integration tests (Supertest), coverage threshold enforced
3. **Stage 2 — Quality Gates:** ESLint, Prettier check, Snyk security scan, SonarQube code quality
4. **Stage 3 — Docker Build:** multi-stage Dockerfile, image tagged with git SHA, pushed to AWS ECR
5. **Stage 4 — Staging Deploy:** ArgoCD detects new image tag, updates Kubernetes staging manifest, auto-deploy to staging
6. **Stage 5 — E2E Tests:** Playwright E2E tests against staging environment
7. **Stage 6 — Production Deploy:** PR merged to main → GitHub Action approvals → ArgoCD deploys to production with blue-green strategy
8. **Stage 7 — Post-deploy:** Smoke tests, Datadog monitor check, Slack notification with deployment summary

---

# PART XXII — SCALABILITY PLAN

## 22. Scalability Architecture

## 22.1 Horizontal Scaling Strategy

| Component | Scale Method | Bottleneck Trigger | Max Scale |
|-----------|-------------|-------------------|-----------|
| API Services | EKS HPA — add pods on CPU > 60% | CPU / request rate | 50 pods per service |
| PostgreSQL | Add read replicas for read-heavy queries; write sharding for >10M rows/month | Write IOPS > 80% | 5 read replicas per DB |
| Redis | Redis Cluster — add shards on memory > 70% | Memory / ops/sec | 16 shards |
| Kafka | Add brokers and partitions; increase replication factor | Consumer lag > 10K messages | 100 partitions per topic |
| Typesense | Vertical scale (more RAM) then dedicated cluster | Search latency > 100ms P95 | 256GB RAM cluster |
| Delivery Tracking | WebSocket connections per node: 10K max; add nodes on connection count | Concurrent WebSocket connections | Unlimited nodes |
| File Storage | S3 / R2 is infinitely scalable | N/A — auto-scales | Infinite |

## 22.2 Performance Targets & SLOs

| SLO Metric | Target | Measurement | Alert Threshold |
|-----------|--------|-------------|----------------|
| API Availability | 99.99% (52 min downtime/year) | Synthetic monitoring every 30s | < 99.95% → PagerDuty P1 |
| P95 API Latency (GET) | < 100ms | Datadog APM percentiles | P95 > 200ms → alert |
| P95 API Latency (POST) | < 300ms | Datadog APM percentiles | P95 > 500ms → alert |
| Search Latency | < 50ms P99 | Typesense metrics | P99 > 100ms → alert |
| Invoice PDF Generation | < 3 seconds | Job queue timing | > 8s → alert |
| GPS Location Update | < 1 second delivery to customer | WebSocket frame timing | > 3s → alert |
| Payment Webhook Processing | < 500ms | Webhook timing log | > 2s → alert |
| Database Query (indexed) | < 10ms P95 | pg_stat_statements | P95 > 50ms → alert |
| Error Rate | < 0.1% of requests | Sentry error rate | > 0.5% → alert |
| Deployment Frequency | Daily (business hours) | GitHub Actions | No deploys 7 days → process alert |

## 22.3 Fault Tolerance Mechanisms

- **Circuit Breaker:** every inter-service HTTP call wrapped in circuit breaker; open after 5 failures in 10s; half-open after 30s
- **Retry with Exponential Backoff:** transient failures retried up to 3 times with jitter
- **Bulkhead Pattern:** thread pools isolated per dependency — payment service failure cannot starve order service
- **Graceful Degradation:** if recommendation service is down, serve non-personalized results; if review service is down, show cached scores
- **Multi-AZ:** all production databases deployed Multi-AZ; auto-failover in < 60 seconds
- **Regional Failover:** DNS failover (Route 53 health checks) to secondary region if primary region has >10% error rate for 2 minutes
- **Chaos Engineering:** weekly Chaos Monkey runs in staging; monthly in production off-peak hours (Phase 7)

## 22.4 Data Backup & Recovery

| Data | Backup Method | Frequency | RTO | RPO |
|------|--------------|-----------|-----|-----|
| PostgreSQL (all DBs) | AWS RDS automated snapshots + continuous WAL to S3 | Daily snapshot + continuous WAL | < 30 minutes (RDS restore) | < 5 minutes (PITR) |
| MongoDB Atlas | Atlas automated backup to S3 | Every 6 hours | < 1 hour | < 6 hours |
| Redis | Redis AOF + RDB snapshots to S3 | Every 5 minutes (AOF) | < 15 minutes (new cluster) | < 5 minutes |
| S3 / R2 Files | S3 Versioning + Cross-Region Replication | Real-time replication | Immediate (serve from replica) | Zero (sync replication) |
| Kafka | MSK multi-AZ with 3-day retention | Continuous replication | < 15 minutes | Zero (in-sync replicas) |

## 22.5 Final MVP Go-Live Checklist

Before go-live, the following must be verified:

- [ ] **Security:** Penetration test completed; OWASP Top 10 addressed; SSL A+ rating on Qualys SSL Labs
- [ ] **Performance:** Load test at 2× expected peak traffic; all SLOs met
- [ ] **Compliance:** GST invoice format validated by CA; GSTIN verification API integrated
- [ ] **Payment:** Razorpay test mode → production mode switched; PCI DSS SAQ-A completed
- [ ] **Backup:** Backup restore tested successfully; RTO/RPO validated
- [ ] **Monitoring:** All dashboards configured; PagerDuty alerts set up; on-call rotation defined
- [ ] **Documentation:** API documentation published (Swagger/OpenAPI); runbook for all P1 scenarios
- [ ] **Legal:** Privacy Policy, Terms of Service, Cancellation Policy published on platform
- [ ] **Mobile:** App Store (iOS) + Play Store (Android) submissions completed; PWA Lighthouse score > 90
- [ ] **Smoke Test:** End-to-end journey tested: customer browses → orders → pays → delivery partner assigns → delivers → customer reviews

---

## REVENUE MODEL SUMMARY

| Revenue Stream | Model | Year 1 Target | ARR Potential |
|---------------|-------|--------------|--------------|
| ERP SaaS Subscriptions | ₹999/₹2,499/₹4,999 per shop/month | 200 shops | ₹2.4–6 Cr ARR |
| Marketplace Commission | 3–8% GMV on B2C sales | ₹5 Cr GMV | ₹0.25–0.4 Cr |
| B2B Transaction Fee | 1–2% of B2B order value | ₹2 Cr GMV | ₹0.04 Cr |
| Delivery Fee | ₹25–80 per delivery | 2,000 orders/day at scale | ₹1.8 Cr |
| Featured Listings | Brand-sponsored placements | 20 brand partners | ₹0.5 Cr |
| GST Filing API | ₹299/shop/quarter | 1,000 shops | ₹0.12 Cr |
| BNPL / Fintech Referral | Referral fee from NBFC partners | Working capital loans | ₹0.3 Cr |
| Data Insights | Demand reports for manufacturers | 5 brand clients | ₹0.25 Cr |

---

> **AutoMobile Space Platform Architecture v2.0 | March 2026 | Confidential — Internal Engineering & Product Team**
>
> *This document represents a comprehensive blueprint for building India's most ambitious automotive super-platform. The architecture is designed to grow from 5 pilot shops to 10,000+ shops and 1 million monthly active users without requiring fundamental rewrites. Start with Phase 0, ship Phase 1 in 12 weeks, and let the flywheel do the rest.*

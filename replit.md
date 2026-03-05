# AutoMobile Space — Velvet Parts Platform

## Project Overview
A production-grade B2B2C Hyperlocal Auto Parts SaaS Platform built with React 19 + Vite 7. Frontend-only app using localStorage as simulated database.

Two integrated modes:
1. **Marketplace** (Velvet Parts) — Customer-facing: vehicle-specific fitment, multi-seller comparison, cart/checkout, order tracking
2. **Shop ERP** — Shop-owner-facing: inventory, POS billing, udhaar/credit ledger, GST reports, B2B procurement, analytics

## Tech Stack
- **Framework**: React 19 with Vite 7
- **State**: Custom Context/localStorage store (`src/store.js`)
- **Charts**: Recharts (AreaChart, BarChart, PieChart)
- **Styling**: Custom dark theme (inline styles via `src/theme.js`)
- **Fonts**: Outfit (UI), JetBrains Mono (financial figures)

## Design System
- **Background**: `#0A0F1D` → `#121B2F` (surface) → `#1A253D` (card)
- **Amber** `#F59E0B` — CTAs, highlights
- **Emerald** `#10B981` — success, positive
- **Crimson** `#EF4444` — errors, danger
- **Sky** `#38BDF8` — info, orders
- **Violet** `#8B5CF6` — admin, premium

## Storage Keys (localStorage)
- `vl_products` — product inventory
- `vl_movements` — immutable stock movement ledger
- `vl_orders` — marketplace orders
- `vl_shops` — shop profiles
- `vl_cart` — marketplace cart
- `vl_vehicle` — selected vehicle for fitment
- `vl_parties` — udhaar/credit parties
- `vl_rfqs` — B2B RFQ requests
- `vl_vendors` — vendor profiles (3 seeded)
- `vl_purchase_orders` — POs from awarded RFQs
- `vl_notifications` — in-app notification history
- `vl_notif_prefs` — notification preferences
- `vl_garage` — customer saved vehicles
- `vl_reminders` — vehicle service reminders
- `vl_announcements` — admin broadcast messages
- `vl_company` — company profile/settings (GSTIN, PAN, address, financial year)
- `vl_voucher_sequences` — auto-sequential voucher numbering per type per financial year

## Project Structure
```
src/
├── pages/
│   ├── DashboardPage.jsx       # KPIs, dead stock, alerts, charts
│   ├── InventoryPage.jsx       # Stock management, movements ledger
│   ├── POSBillingPage.jsx      # Point-of-sale billing, GST, hold/park invoices, keyboard shortcuts
│   ├── PartiesPage.jsx         # Udhaar ledger, aging, WhatsApp, bill-by-bill payment allocation
│   ├── OrdersPage.jsx          # Marketplace order management
│   ├── HistoryPage.jsx         # Sales history, invoice history
│   ├── ReportsPage.jsx         # GSTR-1, GSTR-3B, Day Book, ITC, Stock Valuation
│   ├── WorkshopPage.jsx        # Job cards, workshop management
│   ├── VendorRFQPage.jsx       # B2B procurement, RFQ, vendor bidding, POs
│   ├── PurchaseEntryPage.jsx   # Multi-item purchase bills, vendor invoice tracking, 3-way match
│   ├── SettingsPage.jsx        # Company profile, GSTIN, PAN, financial year config
│   ├── AccountingPage.jsx      # Full double-entry bookkeeping (Tally/SAP style)
│   ├── AdminDashboard.jsx      # Platform admin (5-click logo to access)
│   └── PricingPage.jsx         # SaaS pricing plans
├── marketplace/
│   ├── pages/
│   │   ├── MarketplaceHome.jsx       # Hero, category grid, search results
│   │   ├── ProductDetailsPage.jsx    # PDP, seller comparison, reviews, fitment
│   │   ├── CustomerProfile.jsx       # Order history + My Garage
│   │   ├── CheckoutPage.jsx          # Cart → address → payment
│   │   └── OrderTrackingPage.jsx     # Live tracking timeline
│   ├── components/
│   │   ├── ProductCard.jsx           # Product listing card
│   │   ├── SearchBar.jsx             # Search with suggestions
│   │   ├── CartDrawer.jsx            # Slide-out cart
│   │   ├── VehicleSelectorModal.jsx  # Make/model/year/variant picker
│   │   ├── ProductComparisonModal.jsx
│   │   └── SharedUI.jsx              # ShopCard, SectionCarousel, SkeletonLoader
│   └── api/
│       └── engine.js                 # Ranking, search, buy-box algorithms
├── components/
│   ├── ui/                     # Design system components
│   │   ├── Badge.jsx, Btn.jsx, Input.jsx, Select.jsx
│   │   ├── Modal.jsx, StatCard.jsx, EmptyState.jsx
│   │   ├── Toast.jsx, NotificationBell.jsx
│   │   └── index.js
│   ├── PurchaseModal.jsx, SaleModal.jsx, StockAdjustmentModal.jsx
│   └── ProductModal.jsx
├── App.jsx                     # Root app, routing, nav, notification logic
├── store.js                    # All localStorage state management
├── theme.js                    # Design tokens + global CSS
├── utils.js                    # Business logic helpers
├── accounting.js               # Double-entry bookkeeping engine
├── voucherNumbering.js         # Auto-sequential voucher numbering system
└── vehicleData.js              # Make/model/year/variant data
```

## Key Business Rules
- **Stock**: Never edit stock directly — always computed from immutable `movements` ledger
- **Buy Box**: score = (1/price)×0.6 + (1/distance)×0.2 + (rating/5)×0.2
- **Order SLA**: Accept within 5 min to maintain marketplace rankings; countdown timer on orders
- **Dead Stock**: Items with 0 sales in 180+ days flagged for flash sale suggestion
- **GST**: CGST+SGST for intra-state; IGST for inter-state
- **Voucher Numbering**: PREFIX/FY/SEQ format (e.g., INV/2526/001), auto-incremented per financial year

## Features Implemented

### ERP Side
- Dashboard with KPIs, dead stock alerts, auto-PO, revenue charts
- **AI Demand Intelligence**: Demand forecasting, days-until-depletion per product, urgency table
- **Smart Reorder Queue**: Auto-suggests items below min stock, batch PO creation, dismissal
- **Monthly P&L Summary**: Revenue, COGS, Gross Profit, Gross Margin %, net profit estimate
- **Platform Intelligence Alerts**: Dead stock, overdue credit, SLA breach, trend signals
- Inventory with stock movements ledger, barcode labels, PO generation
- **Smart Filter in Inventory**: Sales velocity (Fast/Slow/Dead), price range, category, stock status
- POS Billing (fast invoice, GST, multiple payment modes)
- **POS Keyboard Shortcuts**: Ctrl+S (save), Ctrl+H (hold), Ctrl+N (new), Esc (clear), F1 (help)
- **Hold/Park Invoice**: Save current bill, resume later, held invoice list with badge
- **Bill-by-Bill Payment Allocation**: Select specific invoices to allocate payments, FIFO auto-allocate
- Parties / Udhaar with aging visualization, WhatsApp deep-links
- Orders management with 5-min accept timer, countdown
- **Return & Refund Management**: Full return lifecycle — approve/reject, RETURN_IN stock movement, refund processing
- Reports: GSTR-1, GSTR-3B, Day Book, ITC Register, Stock Valuation
- Workshop / Job Cards
- **B2B Vendor RFQ System**: Create RFQs, vendor bids, bid ranking, PO generation, inventory receipt
- **Multi-Item Purchase Entry**: Full purchase bill with vendor invoice tracking, HSN codes, PO auto-fill, 3-way match
- **Credit Note & Debit Note Flows**: Link to original invoice, proper stock + accounting reversal
- **Contra Voucher**: Fund transfers between cash/bank accounts
- **Document Reversal**: Create equal and opposite journal entry for any voucher
- **Company Settings**: Company profile, GSTIN, PAN, State, Address, financial year config
- **Voucher Auto-Numbering**: Sequential numbers per type per FY (INV/PUR/RCP/PAY/JNL/CN/DN/CON)
- **Staff Management**: Roles (MANAGER/CASHIER/MECHANIC/WAREHOUSE), permissions matrix, activity tracking, PIN-based login
- **Admin Dashboard**: Platform GMV, shop management, dispute queue (5-click logo access)
- **Accounting & Finance** (Tally-style): Full double-entry bookkeeping system with 10 tabs:
  - Chart of Accounts (27 predefined accounts, custom account addition)
  - Day Book / Vouchers (auto-generated from movements, manual journal entries, voucher type filters)
  - Ledger View (per-account transaction history with running balance, CSV export)
  - Trial Balance (grouped by type with subtotals, balanced verification)
  - Profit & Loss Statement (Revenue vs Expenses, Gross/Operating/Net Profit, margin %, bar chart)
  - Balance Sheet (T-format, Assets = Liabilities + Capital verification, pie chart)
  - Cash Flow Statement (Operating/Investing/Financing activities, area chart trend)
  - Cost Sheet (cascading cost breakdown: Materials → Prime Cost → Works Cost → Total Cost)
  - Outstanding Aging (Receivables & Payables with 0-30/31-60/61-90/90+ day buckets, WhatsApp reminders)
  - Financial Ratios (Current Ratio, Quick Ratio, Margins, Turnover, ROA, Debt/Equity, Health Score)
  - Engine: `src/accounting.js`, UI: `src/pages/AccountingPage.jsx`

### Marketplace Side
- Hero with animated gear, trust badges, category grid
- Search with results page, brand/category filters, in-stock toggle
- Product Details: fitment banner, seller comparison table, reviews, related products
- Cart, checkout, order tracking with live timeline
- **Return Request Flow**: Customers can request returns from delivered orders with reason/evidence
- **My Garage + Profile**: Save multiple vehicles, service reminders, smart recommendations, order history
- **Service Center Booking** (GoMechanic pillar): 4 service centers, 4-step booking flow, My Bookings management
- **Wishlist**: Heart button on all product cards, slide-in wishlist drawer, "Add All to Cart"
- **Product Compare**: Compare up to 3 products side-by-side in a full-screen overlay

### Cross-Platform
- **Live Notification Bell**: Auto-generates notifications for new orders, low stock, payment due, RFQ bids. Mark read, clear, preferences toggle.
- **Architecture Document**: Full spec stored in `amp_details.md`
- **Dynamic Company Branding**: All invoices, WhatsApp messages, and GST reports use company settings from `vl_company`

## Development Setup
- Run: `npm run dev` on port 5000
- Build: `npm run build` → outputs to `dist/`

## Replit Configuration
- Frontend binds to `0.0.0.0:5000` with `allowedHosts: true` for proxy compatibility
- Deployment: static site, build with `npm run build`, serve from `dist/`

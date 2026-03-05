# Deep Research: How Amazon/Flipkart E-Commerce Actually Works — Applied to an Auto Parts SaaS

This document is a professional-grade, no-fluff technical and UX breakdown of every major system in a modern eCommerce platform (Amazon, Flipkart, Swiggy Instamart) and a professional ERP (Tally, Vyapar, Zoho Inventory). It is written specifically so you can hand it to an AI or a developer and they can build each feature with full context on the **logic, the edge cases, the UI decisions, and the real-world "why"** behind every choice.

---

## TABLE OF CONTENTS

1. [The Customer Journey (Amazon POV)](#1-the-customer-journey)
2. [Homepage & Personalization Engine](#2-homepage--personalization-engine)
3. [Search & Discovery (The Revenue Engine)](#3-search--discovery)
4. [Product Listing Page (PLP) — The Grid](#4-product-listing-page-plp)
5. [Product Detail Page (PDP) — The Conversion Page](#5-product-detail-page-pdp)
6. [Cart, Checkout & Payment](#6-cart-checkout--payment)
7. [Order Management & Tracking (Post-Purchase)](#7-order-management--tracking)
8. [The Shop Owner ERP (Tally/Vyapar POV)](#8-the-shop-owner-erp)
9. [Inventory & The Immutable Ledger](#9-inventory--the-immutable-ledger)
10. [Offline POS (Point of Sale) — The Billing Counter](#10-offline-pos)
11. [Accounting: Receivables, Payables & GST](#11-accounting)
12. [UI/UX Design System Deep Dive](#12-uiux-design-system)
13. [Monetization & SaaS Subscription Logic](#13-monetization)

---

## 1. THE CUSTOMER JOURNEY

### How a customer actually thinks (Psychology)
A customer buying auto parts is **anxious**, not excited. They're thinking:
- "Will this part fit my car?"
- "Am I getting overcharged?"
- "How fast can I get this? My car is stuck."

**Amazon's solution:** Remove all friction. Show confidence signals everywhere.

### The Flow (Step by Step)
```
Land on Homepage
  → [Optional] Select Vehicle ("My Garage")
  → Browse / Search for a part
  → View Product Listing Page (grid of results)
  → Click a product → Product Detail Page
  → Add to Cart
  → View Cart → Checkout
  → Enter Address → Select Payment → Place Order
  → Order Confirmation → Live Tracking → Delivery
  → [Optional] Return / Review
```

### Edge Cases Amazon Handles:
| Scenario | Amazon's Solution | Our Implementation |
|---|---|---|
| User searches "brake pad" but doesn't know which one | Show "fits your vehicle" badges | My Garage context filter |
| User adds item, comes back 3 days later | Cart persists via localStorage/DB | `localStorage` cart in `useStore` |
| Item goes out of stock while in cart | "This item is no longer available" warning at checkout | Real-time stock check on checkout |
| User wants to compare sellers | "Other sellers on Amazon" section on PDP | Multi-seller Buy Box table |

---

## 2. HOMEPAGE & PERSONALIZATION ENGINE

### What Amazon's Homepage Actually Does:
1. **Hero Banner Carousel** (3-5 rotating promotions) — always above the fold.
2. **"Based on your browsing history"** — personalized product rows.
3. **"Deals of the Day"** — time-limited discounts.
4. **Category Navigation** — horizontal scrollable chips or a grid.

### For Auto Parts, Adapt This To:
| Amazon Section | Our Equivalent | Logic |
|---|---|---|
| "Based on your history" | "Parts for your Creta 2021" | Filter products where `compatibleVehicles` includes user's garage vehicle |
| "Deals of the Day" | "Flash Deals from Local Shops" | Products where shop owner set a temporary discount |
| "Top Sellers" | "Most Purchased Parts This Week" | Sort by `SALE` movement count in last 7 days |
| "Shop by Category" | Category icons: Brakes, Engine, Electrical, Filters | Static category grid linking to filtered PLP |

### The "My Garage" System (Critical for Auto Parts)

**Why it exists:** On Amazon, you buy a phone case. If it doesn't fit, you return it for ₹0. On auto parts, a wrong brake pad means a ₹200 mechanic labor fee wasted + a dangerous car. **Fitment is life-or-death.**

**Implementation Logic:**
```
State: selectedVehicle = { make, model, year, fuel, variant }

On Homepage Load:
  IF selectedVehicle exists:
    → Filter ALL product feeds where product.compatibleVehicles includes selectedVehicle
    → Show green sticky banner: "Showing parts for [Vehicle]"
  ELSE:
    → Show modal/banner urging vehicle selection
    → Show generic "trending" products (unfiltered)

On Product Card render:
  IF selectedVehicle AND product.compatibleVehicles includes selectedVehicle:
    → Show green "✓ Exact Fit" badge on the card
  ELSE IF selectedVehicle AND product.compatibleVehicles does NOT include:
    → Either HIDE the product entirely, OR show red "✗ Does Not Fit" badge
```

**Cascading Dropdown Logic:**
```
Step 1: Select Make → API returns Models for that Make
Step 2: Select Model → API returns Years for that Model
Step 3: Select Year → API returns Variants (engine/fuel type)
Step 4: Confirm → Save to state + localStorage

Data Structure:
VEHICLE_DATABASE = {
  "Maruti": {
    "Swift": {
      years: [2018, 2019, 2020, 2021, 2022, 2023],
      variants: ["VXi Petrol", "ZXi Petrol", "ZDi Diesel"]
    },
    "Baleno": { ... }
  },
  "Hyundai": {
    "Creta": { ... },
    "i20": { ... }
  }
}
```

---

## 3. SEARCH & DISCOVERY (The Revenue Engine)

Search generates 60% of Amazon's revenue. It's not a text box; it's a conversion machine.

### How Amazon Search Actually Works:

1. **Debounced Input** (300ms delay after user stops typing before firing query).
2. **Autocomplete Dropdown** shows:
   - Recent searches (from localStorage)
   - Category suggestions ("brakes" → suggests "Category: Brakes")
   - Top product matches ("brakes" → "Bosch Brake Pad for Swift")
3. **Fuzzy Matching** — "brak pad" still matches "Brake Pad" (Levenshtein distance / trigram matching).
4. **Result Ranking Algorithm:**
   ```
   score = (textRelevance * 0.4) + (salesVelocity * 0.2) + (reviews * 0.15) + (price * 0.15) + (inStock * 0.1)
   ```

### For Our Platform (Autocomplete UI Structure):
```
SearchBar Input
  ↓ (on typing, debounce 300ms)
Dropdown appears:
  ┌─────────────────────────────────────────┐
  │ 🕐 Recent: "oil filter"                │  ← from localStorage
  │ 🕐 Recent: "brake pad swift"           │
  │ ─────────────────────────────────────── │
  │ 📂 Category: Brakes                    │  ← category match
  │ 📂 Category: Brake Fluid               │
  │ ─────────────────────────────────────── │
  │ 🔧 Bosch Brake Pad (Swift/Creta)       │  ← product match
  │ 🔧 Brembo Brake Disc 260mm             │
  │ 🔧 Brake Fluid DOT4 Bosch 500ml        │
  └─────────────────────────────────────────┘
```

### Edge Cases:
- **Typos:** "brek pad" → must still return brake pads (use `.includes()` on normalized strings, or Fuse.js for fuzzy).
- **Multi-word:** "bosch swift brake" → must match products containing ALL these words in ANY order across name + brand + vehicle fields.
- **Empty results:** Never show a blank page. Show "Did you mean: brake pad?" + "Popular in Brakes" fallback section.

---

## 4. PRODUCT LISTING PAGE (PLP) — THE GRID

### Amazon's PLP Anatomy:
```
┌──────────────────────────────────────────────────────┐
│ BREADCRUMB: Home > Brakes > Brake Pads               │
│                                                       │
│ ┌────────────┐  ┌──────────────────────────────────┐ │
│ │ FILTERS    │  │ SORT: Relevance | Price ↑ | Price↓│ │
│ │            │  │ "Showing 24 results for brake pad" │ │
│ │ ☐ Bosch    │  │                                    │ │
│ │ ☐ Brembo   │  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │ │
│ │ ☐ TVS      │  │ │Card1│ │Card2│ │Card3│ │Card4│ │ │
│ │            │  │ └─────┘ └─────┘ └─────┘ └─────┘ │ │
│ │ Price:     │  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │ │
│ │ ₹100-₹5000│  │ │Card5│ │Card6│ │Card7│ │Card8│ │ │
│ │ [===-----] │  │ └─────┘ └─────┘ └─────┘ └─────┘ │ │
│ │            │  │                                    │ │
│ │ Rating:    │  │ Load More / Pagination             │ │
│ │ ★★★★ & up │  │                                    │ │
│ └────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### The Product Card — Exact Design Spec:
```
┌─────────────────────────────────────┐
│  [✓ EXACT FIT]          [♡ Wishlist]│  ← Badges (absolute positioned)
│                                     │
│         [ PRODUCT IMAGE ]           │  ← 200x200px, object-fit: contain
│                                     │
│  BOSCH                              │  ← Brand pill (small, muted color)
│  Bosch Brake Pad Set Front          │  ← Title (max-height: 2.8em, overflow hidden)
│  for Hyundai Creta 2020-2023        │
│                                     │
│  ★★★★☆ 4.2 (128 ratings)           │  ← Rating (gold stars + count)
│                                     │
│  ₹1,850  ₹̶2̶,̶4̶0̶0̶  23% off        │  ← Price block (large), MRP (strikethrough), discount badge
│                                     │
│  🚚 Get it by Tomorrow, 2pm        │  ← Delivery estimate (green if fast)
│  📍 From Ravi Auto Parts (2.4 km)   │  ← Seller info + distance
│                                     │
│  [     Add to Cart     ]            │  ← Primary CTA button (amber/yellow)
└─────────────────────────────────────┘
```

### Card CSS Structure:
```css
.product-card {
  background: var(--card-bg);         /* Dark: #1e293b */
  border: 1px solid var(--border);    /* #334155 */
  border-radius: 16px;
  padding: 16px;
  position: relative;                 /* For absolute-positioned badges */
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  width: 100%;                        /* Fills grid column */
  min-width: 240px;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  border-color: var(--amber);
}

.product-card .fitment-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--emerald);
  color: #000;
  font-size: 10px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 20px;
  z-index: 5;
}

.product-card .price-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.product-card .price-block .sell-price {
  font-size: 20px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
}

.product-card .price-block .mrp {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: line-through;
}

.product-card .price-block .discount {
  background: #dc262622;
  color: #ef4444;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
}
```

### Multi-Seller Aggregation Logic:
```javascript
// PROBLEM: 5 shops sell "NGK Spark Plug BKR6E". Don't show 5 cards.
// SOLUTION: Group by a universal SKU or OEM part number.

function aggregateProducts(allProducts) {
  const groups = {};
  
  allProducts.forEach(product => {
    const key = product.oemNumber || product.sku;  // Universal identifier
    if (!groups[key]) {
      groups[key] = {
        product: product,           // Use first occurrence as display template
        sellers: [],
        lowestPrice: Infinity,
      };
    }
    groups[key].sellers.push({
      shopId: product.shopId,
      shopName: product.shopName,
      price: product.sellPrice,
      stock: product.stock,
      distance: product.shopDistance,
      rating: product.shopRating,
    });
    groups[key].lowestPrice = Math.min(groups[key].lowestPrice, product.sellPrice);
  });

  return Object.values(groups).map(g => ({
    ...g.product,
    sellPrice: g.lowestPrice,
    sellerCount: g.sellers.length,
    sellers: g.sellers.sort((a, b) => a.price - b.price), // Cheapest first
    displayLabel: g.sellers.length > 1 
      ? `Starting from ₹${g.lowestPrice} (${g.sellers.length} sellers)` 
      : null,
  }));
}
```

---

## 5. PRODUCT DETAIL PAGE (PDP) — THE CONVERSION PAGE

This is where 80% of purchase decisions happen. Every pixel matters.

### Amazon PDP Layout:
```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────────────────┐  ┌─────────────────────────────┐   │
│ │                      │  │ Bosch Brake Pad Set Front    │   │
│ │   [MAIN IMAGE]       │  │ for Hyundai Creta 2020-23   │   │
│ │   (zoomable)         │  │                              │   │
│ │                      │  │ Brand: BOSCH                 │   │
│ │──────────────────────│  │ OEM No: 0986AB1234           │   │
│ │ [thumb][thumb][thumb] │  │ ★★★★☆ 4.2 (128 ratings)     │   │
│ └──────────────────────┘  │                              │   │
│                           │ ┌──────────────────────────┐ │   │
│                           │ │ ✓ FITS YOUR CRETA 2021   │ │   │
│                           │ │   Guaranteed compatible   │ │   │
│                           │ └──────────────────────────┘ │   │
│                           │                              │   │
│                           │ ₹1,850  ₹̶2̶,̶4̶0̶0̶  Save ₹550 │   │
│                           │ (Inclusive of all taxes)      │   │
│                           │                              │   │
│                           │ 📍 Sold by: Ravi Auto Parts  │   │
│                           │    2.4 km away · ★4.5        │   │
│                           │ 🚚 Delivery: Today by 4 PM   │   │
│                           │                              │   │
│                           │ Qty: [1] [-][+]              │   │
│                           │                              │   │
│                           │ [████ ADD TO CART ████]       │   │
│                           │ [    BUY NOW →              ]│   │
│                           │                              │   │
│                           │ 🔄 Compare 4 other sellers   │   │
│                           └─────────────────────────────┘│   │
│                                                           │   │
│ ─────────── OTHER SELLERS ────────────                    │   │
│ ┌────────────────────────────────────────────────────┐    │   │
│ │ Shop Name        │ Distance │ Price  │ Stock │ Add │    │   │
│ │ Ravi Auto Parts  │ 2.4 km   │ ₹1,850 │ 5     │ [+] │    │   │
│ │ Kumar Spares     │ 4.1 km   │ ₹1,900 │ 3     │ [+] │    │   │
│ │ Lakshmi Motors   │ 6.8 km   │ ₹1,920 │ 8     │ [+] │    │   │
│ │ Balaji Parts     │ 8.2 km   │ ₹2,100 │ 2     │ [+] │    │   │
│ └────────────────────────────────────────────────────┘    │   │
│                                                           │   │
│ ─────────── SPECIFICATIONS ──────────                     │   │
│   Material: Semi-Metallic                                 │   │
│   Position: Front Axle                                    │   │
│   OEM Cross-Ref: 58101-S1A00                              │   │
│   Warranty: 2 Years / 30,000 km                           │   │
│                                                           │   │
│ ─────────── CUSTOMERS ALSO BOUGHT ──────────              │   │
│  [Card] [Card] [Card] [Card]                              │   │
└──────────────────────────────────────────────────────────────┘
```

### The Buy Box Algorithm (Who Wins the "Add to Cart"):
```javascript
function calculateBuyBoxWinner(sellers, userLocation) {
  return sellers
    .filter(s => s.stock > 0)  // Must have stock
    .map(s => ({
      ...s,
      score: (
        (1 / s.price) * 0.6 +              // 60% weight: cheapest wins
        (1 / (s.distance + 0.1)) * 0.2 +   // 20% weight: closest wins
        (s.rating / 5) * 0.2               // 20% weight: highest rated wins
      )
    }))
    .sort((a, b) => b.score - a.score)[0]; // Highest score wins
}
```

### Fitment Banner Logic:
```javascript
function getFitmentStatus(product, selectedVehicle) {
  if (!selectedVehicle) return { status: "unknown", color: "gray", icon: "⚠️", text: "Select your vehicle to verify fitment" };
  
  const vehicleKey = `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.year}`.toLowerCase();
  const fits = (product.compatibleVehicles || "").toLowerCase().includes(vehicleKey);
  
  if (fits) return { 
    status: "fits", color: "emerald", icon: "✓", 
    text: `Guaranteed to fit your ${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.year}` 
  };
  
  return { 
    status: "no-fit", color: "crimson", icon: "✗", 
    text: `Does NOT fit your ${selectedVehicle.make} ${selectedVehicle.model}. Check OEM number.` 
  };
}
```

---

## 6. CART, CHECKOUT & PAYMENT

### Cart Architecture (How Amazon Handles Multi-Vendor):
```
Cart State Structure:
cart = [
  { productId: "p1", shopId: "s1", qty: 2, price: 1850, shopName: "Ravi Auto Parts" },
  { productId: "p5", shopId: "s1", qty: 1, price: 340, shopName: "Ravi Auto Parts" },
  { productId: "p3", shopId: "s2", qty: 1, price: 2100, shopName: "Kumar Spares" },
]

Display Logic:
  → Group cart items by shopId
  → Each shop group = separate "shipment" with its own delivery estimate
  → Calculate delivery fee PER SHOP (not per item)
```

### Cart UI (Swiggy Instamart Style):
```
┌─────────────────────────────────────────────┐
│ YOUR CART (3 items from 2 shops)            │
│                                              │
│ ─── 📦 Shipment 1: Ravi Auto Parts ───      │
│ │ Bosch Brake Pad      x2   ₹3,700        │ │
│ │ Oil Filter            x1   ₹340          │ │
│ │ Subtotal: ₹4,040                         │ │
│ │ 🚚 Delivery: ₹50 (2.4 km)               │ │
│                                              │
│ ─── 📦 Shipment 2: Kumar Spares ───         │
│ │ Clutch Plate           x1   ₹2,100       │ │
│ │ Subtotal: ₹2,100                         │ │
│ │ 🚚 Delivery: ₹80 (6.1 km)               │ │
│                                              │
│ ─────────────────────────────────            │
│ Items Total:              ₹6,140            │
│ Delivery:                 ₹130              │
│ GST (inclusive):          ₹940              │
│ ─────────────────────────────────            │
│ GRAND TOTAL:              ₹6,270            │
│                                              │
│ [████ PLACE ORDER ████]                     │
└─────────────────────────────────────────────┘
```

### The Stock Race Condition (Critical Edge Case):
```
Scenario:
  T=0:  Online customer adds "Bosch Brake Pad" (stock: 1) to cart
  T=30: Walk-in customer at the shop buys that same brake pad (stock: 0)
  T=60: Online customer clicks "Place Order"

Solution:
  On "Place Order" click:
  1. Re-check current stock for EVERY item in cart
  2. IF any item has stock = 0:
     → Show modal: "Sorry, [Shop Name] just sold out of [Product]"
     → Offer alternatives: "Available at Kumar Spares for ₹50 more"
     → Let user update cart or remove item
  3. IF all items have stock > 0:
     → Create `reservedStock` field on each product (prevents double-sell)
     → Proceed to Payment
```

### Checkout State Machine:
```
CART → ADDRESS_ENTRY → PAYMENT_METHOD → CONFIRM → PROCESSING → SUCCESS → TRACKING

States:
  "cart"       → User reviews items, applies coupons
  "address"    → User enters/selects delivery address
  "payment"    → User selects UPI / Card / COD
  "confirm"    → Final review with all totals
  "processing" → Payment gateway processing (loading spinner)
  "success"    → Order confirmation with Order ID
  "failed"     → Payment failed, retry options
```

---

## 7. ORDER MANAGEMENT & TRACKING

### Customer Order Tracking (Amazon Style):
```
Order #ORD-39281
Placed on: March 1, 2026

Status Timeline (Vertical Stepper):
  ● Order Placed — March 1, 11:30 AM          [DONE - Green]
  │
  ● Confirmed by Seller — March 1, 11:35 AM   [DONE - Green]
  │
  ● Packed & Ready — March 1, 12:15 PM        [DONE - Green]
  │
  ○ Out for Delivery — Estimated 2:00 PM      [IN PROGRESS - Amber pulse]
  │
  ○ Delivered                                  [PENDING - Gray]
```

### Order State Machine (Shop Owner Side):
```
PLACED → ACCEPTED → PACKED → SHIPPED → DELIVERED → COMPLETED
  │         │                    │
  └→ REJECTED (with reason)      └→ RETURNED (customer initiated)

Shop Owner Actions:
  PLACED    → "Accept" or "Reject" (with reason like "Out of Stock")
  ACCEPTED  → "Mark as Packed" (triggers customer notification)
  PACKED    → "Assign Delivery" (enters delivery partner details)
  SHIPPED   → Auto-updates tracking; customer sees live status
  DELIVERED → "Mark Delivered" (auto-triggers payment settlement)
```

---

## 8. THE SHOP OWNER ERP (Tally/Vyapar POV)

### What a Real Auto Parts Shop Owner Does Every Day:
```
6:00 AM  → Opens shop, checks WhatsApp for pending orders
6:30 AM  → Walk-in mechanic asks for "Swift ke brake pad"
         → Owner checks stock mentally or in a diary
         → Finds part, bills it (handwritten or Vyapar)
7:00 AM  → Distributor delivery boy arrives with 50 items
         → Owner checks each item against the invoice
         → Records purchase in register/Tally
8:00 AM  → Mechanic from yesterday calls: "Bhai, udhar rakh de" (put on credit)
         → Owner writes in red diary
9:00 AM  → Checks online orders on platform
         → Accepts 3, rejects 1 (out of stock)
12:00 PM → Realizes 5 items are running low, calls distributor to order
5:00 PM  → End of day: counts cash, checks UPI credits
         → Tries to reconcile with bills (often fails)
```

**Every feature we build must map to one of these real moments.**

### Dashboard KPI Cards — Exact Logic:
```javascript
// Calculate these from the movements[] array, filtered by shopId

// 1. Today's Revenue
const todayStart = new Date().setHours(0,0,0,0);
const todaySales = movements.filter(m => m.shopId === activeShopId && m.type === "SALE" && m.date >= todayStart);
const todayRevenue = todaySales.reduce((sum, m) => sum + m.total, 0);

// 2. Today's Profit (Net)
const todayProfit = todaySales.reduce((sum, m) => sum + m.profit, 0);

// 3. Inventory Value (Capital locked in stock)
const shopProducts = products.filter(p => p.shopId === activeShopId);
const inventoryValue = shopProducts.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);

// 4. Pending Udhaar (Receivables)
const pendingReceivables = movements
  .filter(m => m.shopId === activeShopId && m.type === "SALE" && m.paymentStatus === "pending")
  .reduce((sum, m) => sum + m.total, 0);

// 5. Pending Online Orders
const pendingOrders = orders.filter(o => o.shopId === activeShopId && o.status === "placed").length;

// 6. Low Stock Alerts
const lowStockCount = shopProducts.filter(p => p.stock > 0 && p.stock < p.minStock).length;
const outOfStockCount = shopProducts.filter(p => p.stock <= 0).length;
```

---

## 9. INVENTORY & THE IMMUTABLE LEDGER

### Why Stock is NEVER a Static Number (Tally's Golden Rule):
```
WRONG WAY (Excel mindset):
  product.stock = 10     ← user types "10" directly
  Problem: No audit trail. How did it become 10? Who changed it? When?

RIGHT WAY (Ledger mindset):
  movements = [
    { type: "PURCHASE", qty: +20, date: "Jan 1" },  → Bought 20
    { type: "SALE",     qty: -5,  date: "Jan 5" },  → Sold 5
    { type: "SALE",     qty: -3,  date: "Jan 8" },  → Sold 3
    { type: "ADJUST",   qty: -2,  date: "Jan 10" }, → 2 damaged
  ]
  computedStock = 20 - 5 - 3 - 2 = 10  ← mathematically derived!
  
  Benefit: Complete audit trail. Every single piece is accounted for.
```

### Movement Types (Full Taxonomy):
```
| Type       | Stock Effect | Revenue Effect | When Used                          |
|------------|-------------|----------------|-------------------------------------|
| PURCHASE   | +qty        | -cost (expense)| Buying stock from distributor       |
| SALE       | -qty        | +revenue       | Selling to customer (offline/online)|
| ESTIMATE   | 0 (no change)| 0             | Quotation only, no commitment      |
| ADJUST     | ±qty        | 0              | Damaged/lost/count correction       |
| TRANSFER   | ±qty        | 0              | Moving stock between godowns        |
| RETURN     | +qty        | -revenue       | Customer returned a part            |
| SALE_RETURN| +qty        | -revenue       | Reversing a mistaken sale           |
```

---

## 10. OFFLINE POS (POINT OF SALE)

### The 10-Second Bill Flow:
```
Step 1: [Search Box auto-focused on modal open]
        Owner types "brake" → instant filter of products
        
Step 2: Clicks product → Qty auto-fills to 1
        Changes qty if needed

Step 3: Price auto-fills from product.sellPrice
        Owner can override for negotiation

Step 4: GST auto-calculates based on product.gstRate
        (18% for most auto parts in India)

Step 5: Customer details (optional for walk-in)
        Required for credit sales (Udhaar)

Step 6: Payment Mode:
        ┌─────┐ ┌─────┐ ┌─────┐
        │ 💵  │ │ 📱  │ │ 💳  │    ← Quick select buttons
        │Cash │ │ UPI │ │Card │
        └─────┘ └─────┘ └─────┘
        
        OR: Payment Splitting:
        Cash:  ₹[2000]
        UPI:   ₹[1000]  
        Credit:₹[2000] ← auto-calculated as unpaid balance

Step 7: [Record Sale] → Creates movement, deducts stock, shows invoice
```

### Multi-Tender Payment Split Logic:
```javascript
function calculatePaymentSplit(totalBill, enteredPayments) {
  // enteredPayments = { Cash: 2000, UPI: 1000, Card: 0 }
  const totalPaid = Object.values(enteredPayments).reduce((a, b) => a + b, 0);
  const unpaidBalance = Math.max(0, totalBill - totalPaid);
  
  return {
    ...enteredPayments,
    Credit: unpaidBalance,  // Whatever isn't paid = Udhaar
    isCredit: unpaidBalance > 0,
    totalPaid,
    unpaidBalance,
  };
}
// Result: { Cash: 2000, UPI: 1000, Card: 0, Credit: 2000, isCredit: true }
```

---

## 11. ACCOUNTING: RECEIVABLES, PAYABLES & GST

### Accounts Receivable (Udhaar / Who Owes You Money):
```javascript
function getReceivables(movements, shopId) {
  const creditSales = movements.filter(m => 
    m.shopId === shopId && 
    m.type === "SALE" && 
    m.paymentStatus === "pending"
  );
  
  // Group by customer
  const byCustomer = {};
  creditSales.forEach(sale => {
    const key = sale.customerName || "Unknown";
    if (!byCustomer[key]) byCustomer[key] = { name: key, phone: sale.customerPhone, total: 0, transactions: [], oldestDate: Infinity };
    byCustomer[key].total += sale.total;
    byCustomer[key].transactions.push(sale);
    byCustomer[key].oldestDate = Math.min(byCustomer[key].oldestDate, sale.date);
  });
  
  // Calculate aging
  return Object.values(byCustomer).map(c => ({
    ...c,
    ageDays: Math.floor((Date.now() - c.oldestDate) / 86400000),
    ageCategory: getAgeCategory(c.oldestDate), // "0-30 days", "31-60 days", "60+ days"
  })).sort((a, b) => b.total - a.total);
}
```

### GST Calculation Logic:
```javascript
function calculateGST(movements, shopId) {
  const shopMoves = movements.filter(m => m.shopId === shopId);
  
  // Output GST (collected from customers on SALES)
  const outputGST = shopMoves
    .filter(m => m.type === "SALE")
    .reduce((sum, m) => sum + (m.gstAmount || 0), 0);
  
  // Input GST (paid to suppliers on PURCHASES)  
  const inputGST = shopMoves
    .filter(m => m.type === "PURCHASE")
    .reduce((sum, m) => sum + (m.gstAmount || 0), 0);
  
  // Net Liability = Output - Input (this is what you owe the government)
  const netLiability = outputGST - inputGST;
  
  return { outputGST, inputGST, netLiability };
}
```

---

## 12. UI/UX DESIGN SYSTEM DEEP DIVE

### Color Tokens (For a Premium, Trust-Inspiring Dark Theme):
```css
:root {
  /* Backgrounds */
  --bg:         #0f172a;    /* Main background (deep navy) */
  --surface:    #1e293b;    /* Cards, modals, elevated surfaces */
  --card:       #1a2332;    /* Slightly lighter than surface */
  
  /* Text */
  --t1:         #f1f5f9;    /* Primary text (almost white) */
  --t2:         #94a3b8;    /* Secondary text */
  --t3:         #64748b;    /* Muted text (labels, hints) */
  
  /* Borders */
  --border:     #334155;    /* Subtle borders */
  --border-hi:  #475569;    /* Highlighted borders (hover) */
  
  /* Accents */
  --amber:      #f59e0b;    /* Primary CTA, warnings, brand */
  --emerald:    #10b981;    /* Success, profit, "fits" */
  --crimson:    #ef4444;    /* Error, loss, "doesn't fit" */
  --sky:        #0ea5e9;    /* Info, links, secondary actions */
}
```

### Typography Rules:
```css
/* UI Text (labels, buttons, body copy) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Financial Numbers (prices, totals, stock counts, GST amounts) */
font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
/* WHY: Monospace prevents layout shifting when numbers change (₹1,999 vs ₹999) */

/* Sizes hierarchy: */
--text-xs: 10px;    /* Badges, chips */
--text-sm: 12px;    /* Labels, hints */
--text-md: 14px;    /* Body, table cells */
--text-lg: 16px;    /* Section titles */
--text-xl: 20px;    /* Prices */
--text-2xl: 28px;   /* Page headings */
```

### Component Interaction Patterns:
```
Buttons:
  - Primary (Amber): For main CTAs only. Max 1 per screen section.
  - Ghost: For secondary actions (Cancel, Reset).
  - Subtle: For inline table actions (Edit, View).
  
  Hover: translateY(-1px) + box-shadow increase
  Active: scale(0.98) — instant tactile feedback
  Loading: Show spinner, disable clicks, change text to "Processing..."

Toasts:
  - Appear top-right
  - Auto-dismiss after 4 seconds
  - Types: success (green), error (red), info (blue), warning (amber)
  - Include dismiss X button
  
Modals:
  - Backdrop: rgba(0,0,0,0.7) with backdrop-filter: blur(4px)
  - Enter animation: opacity 0→1 + translateY(20px→0) over 200ms
  - Exit animation: reverse of enter
  - Always include close X in top-right
  - Max width: 600px for forms, 440px for confirmations
```

---

## 13. MONETIZATION & SAAS SUBSCRIPTION LOGIC

### Pricing Tiers:
```
FREE TIER (Starter):
  - Up to 50 products
  - POS billing
  - Basic inventory tracking
  - NO online marketplace listing
  
PROFESSIONAL (₹1,499/mo):
  - Unlimited products
  - Full POS + Inventory
  - Online marketplace listing (products visible to buyers)
  - GST reports
  - Party ledgers (Udhaar tracking)
  - 2% commission on each online sale
  
ENTERPRISE (₹3,999/mo):
  - Everything in Professional
  - Multi-location/godown support
  - Batch & expiry tracking
  - Smart procurement (auto-POs)
  - Dedicated account manager
  - 1.5% commission (reduced)
```

### Why Shop Owners Will Pay:
1. **Time saved:** 2 hours/day of manual register work → automated.
2. **Money recovered:** Average shop has ₹2-5 lakhs stuck in Udhaar. WhatsApp reminders recover 30% of that.
3. **New revenue:** Online orders they would NEVER have gotten from walk-in traffic.
4. **Compliance:** GST filing becomes 1-click instead of paying ₹5,000/month to a CA for data entry.

---

## CONCLUSION

This document contains the exact logic, UI patterns, edge cases, and design decisions that power Amazon, Flipkart, Swiggy Instamart (for the customer side) and Tally, Vyapar, Zoho (for the shop owner side). Every section is written as a buildable spec.

**To use this:** Hand this entire document + your existing codebase to an AI model and ask it to implement each section one at a time, starting with the component you care about most. The AI has everything it needs: algorithms, data structures, CSS specs, state management patterns, and edge case handling.

# The Ultimate Auto-Parts Marketplace & SaaS ERP Blueprint (Production-Ready Spec)

**Prompt Instruction to AI:** You are an elite Staff Software Engineer, Product Manager, and Technical UI/UX Architect. Your objective is to architect and generate the complete frontend and state-management code for a **B2B2C Hyperlocal Auto Parts SaaS Platform**. 

This is not a toy app. It is a real-world startup product designed to be monetized. It solves massive, painful problems for two distinct user bases: 
1. **The Shop Owner (B2B SaaS User):** Needs a system strictly better, faster, and more automotive-focused than Tally, Vyapar, or Zoho to manage their complex inventory, accounting, and *udhaar* (credit). Crucially, this ERP magically opens a new online revenue channel for them. They will pay a monthly SaaS subscription (e.g., ₹1,499/mo) + transaction fees for this.
2. **The Vehicle Owner / Mechanic (B2C/B2B Buyer):** Needs absolute confidence in part fitment, price transparency, and same-day local delivery, completely eliminating the anxiety of buying the wrong automotive part.

If you understand this, implement the system strictly following the detailed logic, edge cases, UX architecture, and real-world workflows defined below. Do not cut corners. Do not ignore edge cases.

---

## 1. THE SAAS VALUE PROPOSITION & MONETIZATION (Why this exists)

### 1.1 Shop Owner Value Prop (Why they pay)
* **Zero-Effort E-Commerce:** By simply managing their daily local inventory in your POS/ERP, their products instantly become buyable to thousands of local customers on the Marketplace. No separate website, no manual catalog uploads.
* **Smart Procurement:** The system learns their sales velocity. Instead of guessing what to buy, it generates intelligent Purchase Orders for items about to run out, preventing lost sales.
* **Dead Stock Liquidation:** The ERP identifies parts not sold in 180+ days and auto-suggests running a "Flash Sale" on the marketplace to recover locked capital.
* **Udhaar (Credit) Automation:** The bane of Indian retail is managing credit. The system tracks ages of receivables and generates 1-click WhatsApp payment reminders with UPI links, improving cash flow by 30%.
* **GST Compliance:** One-click GSTR-3B and GSTR-1 Excel exports. They just hand the export to their CA.

### 1.2 Customer Value Prop (Why they use this instead of Amazon)
* **The "Fitment Guarantee":** Amazon sells generic parts. This platform forces a "My Garage" context. If a brake pad doesn't fit the user's specific Swift VXi, the UI explicitly blocks them from buying it.
* **Hyperlocal Speed:** Amazon takes 2 days. A car cannot sit broken for 2 days. This app routes the order to a shop 3km away for delivery in 45 minutes via Dunzo/Porter/Swiggy Genie API integration.
* **Multi-Vendor Price Comparison:** Mechanics often overcharge. This platform acts as a great equalizer, allowing users to compare 5 verified local shops instantly for the exact same Bosch Spark Plug.

---

## 2. THE CUSTOMER EXPERIENCE (Amazon/Flipkart logic adapted for Automotive)

### 2.1 "My Garage" (The Core Conversion Engine)
Auto parts are highly specific. The UX must force/incentivize entering the vehicle before browsing.
* **The Onboarding Modal:** Clean, high-conversion, cascading UI: `Make (Maruti) -> Model (Swift) -> Year (2019) -> Fuel (Petrol) -> Variant (VXi)`. 
* **State Persistence:** Saved in `localStorage` or user profile.
* **The "Virtual Mechanic" Engine:** Based on the vehicle and mileage, the homepage displays dynamic recommendations: "Your Swift hit 40,000km. Based on the OEM manual, it's time for an Oil Filter & Spark Plug change."

### 2.2 The Marketplace Homepage (Dynamic & Personalized)
* **Header:** Sticky. Contains Brand Logo, Cart (with live badge), and a robust Search Bar with debounced autocomplete. Searching "brakes" suggests `Category: Brakes` or `Top Product: Bosch Brake Pads`. 
* **If Garage is Empty:** Show a massive hero banner ("Select Vehicle for Exact Fit"), "Shop By Brand", and generic "Trending in Hyderabad".
* **If Garage is Full:** 
  * Massive green sticky banner: `[✓] Showing exact-fit parts for 2019 Maruti Swift VXi`.
  * The entire homepage feed filters dynamically. If a shop sells a great part but it doesn't fit the Swift, *it is completely hidden from the feed*.

### 2.3 Product Listing Page (PLP) & Advanced Search
* **Faceted Search (Desktop Sidebar / Mobile Bottom Sheet):** Standard Amazon filters (Price slider, Brand checkboxes, Category, In-Stock only, Shop Rating).
* **The "Card" UI:** Must be extremely dense but readable. 
  * Image/Thumbnail.
  * Brand pill (e.g., `BOSCH`).
  * Clear Title (max 2 lines).
  * Fitment Badge: Absolute positioned green pill saying "✓ EXACT FIT" (if matches garage context).
  * Price Block: Large `sellPrice`, small strike-through `MRP`, and a highly visible "Save 15%" badge.
  * Fulfillment expectation: "Get it in 45 mins from Ravi Auto Parts".
* **Multi-Seller Aggregation (Crucial Logic):** If 6 shops sell the exact same NGK spark plug, DO NOT clutter the search results with 6 identical cards. Show ONE card. Label it: "NGK Spark Plug - Starting from ₹150 (6 Sellers available)".

### 2.4 Product Details Page (PDP) & The Buy Box Strategy
* **Hero Section:** Large imagery, OEM part numbers, technical specifications.
* **The Fitment Banner:** The most important UI element on the page. Massive green block with a Checkmark if it fits. Massive red block with an X if it doesn't.
* **The Buy Box Rules:** The default, massive "Add to Cart" button routes to the winning shop.
  * *Winner Algorithm* = Highest score based on `(Lowest Price * 0.6) + (Proximity * 0.2) + (Seller Rating * 0.2)`.
  * **Other Sellers List:** A clean, trust-inspiring table below the Buy Box: "Compare other local sellers". Shows Shop Name, Distance, Price, and individual secondary "Add to Cart" buttons.

### 2.5 Cart, Checkout & Fulfillment Edge Cases
* **Vendor Splitting (The Swiggy Instamart approach):** If cart has parts from "Shop A" and "Shop B", the UI groups them visually. Delivery fees are calculated per shop. 
* **Cart Abandonment / Stockout Race Condition:** Auto parts are low-stock items. If a live walk-in customer buys the last brake pad from Shop A while an online customer has it sitting in their cart, the online checkout MUST fail gracefully upon clicking "Pay". It should say: *"Sorry, Shop A just sold out. Shop B has it for ₹20 more. Update cart?"*
* **Returns Workflow:** Auto-parts have high return rates due to mechanics misdiagnosing issues. Customers get a strict "Request Return" flow for 7 days, requiring photo upload of the unused part in original packaging.

---

## 3. THE SHOP OWNER ERP (The SaaS Engine)

This must be inherently faster, cleaner, and strictly better geared towards automotive retail than horizontal tools like Tally, Vyapar, or Zoho. The shop owner operates a fast-paced retail counter with grease on their hands. Keyboard shortcuts, barcode scanning readiness, and instant zero-latency load times are mandatory.

### 3.1 The Financial & Operational Dashboard
* **Real-Time SaaS Metrics (Top Row):**
  * Today's Counter Sales (Offline) vs Online Sales.
  * Gross Margin % (Profitability tracking based on weighted average costs).
  * Live Inventory Valuation (Total Capital locked in the godown).
* **Actionable Alerts (The value driver):**
  * "🔴 3 Online orders waiting for acceptance (Accept within 5 mins to maintain rankings)."
  * "⚠️ 12 High-moving items hit minimum stock level. Reorder?"
  * "💸 ₹45,000 in Udhaar pending collection this week."

### 3.2 Inventory & Catalog Management (The Immutable Ledger)
* **The Golden Rule:** Stock is NEVER a static editable number in a database column. It is computationally derived from the `InventoryMovement` ledger `(Purchases - Sales ± Adjustments)`. This prevents fraud and ensures perfect auditability.
* **List View:** Dense UI table. Rapid search by SKU, Name, Rack Number.
* **Multi-Location/Godown Support:** A shop has a storefront and a godown 1km away. Products track stock *per location*. `TRANSFER` challans move stock between them.
* **Batch & Expiry Management:** Engine oils, coolants, and chemicals expire. The system must track batch numbers and alert 30 days before expiry to liquidate at a deep discount on the marketplace.

### 3.3 The Offline POS (Billing Counter)
* 95% of transactions happen here. It must take < 10 seconds to generate a thermal-print ready bill.
* **Quick Flow:** Search/Scan item ➞ Qty ➞ Auto-applies GST based on product category ➞ Select Customer ➞ Select Mechanic (optional, for commission/loyalty tracking) ➞ Select Payment.
* **Payment Splitting Edge Case:** A ₹5,000 bill paid as ₹2,000 Cash, ₹1,000 UPI, and ₹2,000 Udhaar (Credit). The UI must handle multi-tender payments natively.
* **Estimates/Quotations:** Often, a customer just wants a quote for a full engine rebuild. Ability to create a "Quotation" that *does not* deduct stock, which can be universally converted to a "Tax Invoice" later.

### 3.4 Accounts Receivable (Udhaar) & Payable (Suppliers)
* **Party Ledgers:** The absolute heart of Indian retail logic. 
* **Receivables (Customer Debt):** Tracks every credit sale. Calculates age of debt (0-30 days, 31-60 days). Includes a 1-click "Send WhatsApp Payment Link" button rendering a pre-filled message.
* **Payables (Supplier Debt):** Tracks purchases made on credit from wholesale distributors. Manages due dates to maintain good credit scores with suppliers.
* **Payment Recording (Receipts):** When a mechanic walks in and pays ₹5,000 against a historical ₹12,000 debt, the UI must allow logging a `RECEIPT` transaction against the Party Ledger that inherently lowers the outstanding balance.

### 3.5 B2B Procurement (Restocking)
* When stock hits `minStock`, the system generates a Draft Purchase Order.
* **Purchase Voucher Entry:** Records incoming stock from the distributor. Automatically tracks Input GST.
* **Costing Logic:** Entering a Purchase Voucher updates the master `buyPrice` of the product using FIFO or Moving Average costing, which inherently recalculates future profit margins on the dashboard.

---

## 4. SYSTEM ARCHITECTURE & DATA INTEGRITY RULES

You must architect this as a robust React application utilizing advanced state management (e.g., a complex `useStore` hook using Zustand/Context + `localStorage` wrapper to simulate a real database for the sake of the prototype).

### 4.1 Strict Ledger Immutability
* Do not allow updating `movements`. Once a sale is made, it is cryptographically locked in concept.
* To fix a mistake in a sale, the user must perform a `SALES_RETURN` or `ADJUSTMENT` movement.
* Profit is strictly calculated as `Selling Price - Weighted Average Buying Price` *at the time of the sale transaction*.

### 4.2 Handling Concurrency (Simulated)
* The exact same global state `products` array serves both the Marketplace (read-heavy, filtering) and the Shop ERP (write-heavy, deducting).
* When a Marketplace order is PLACED, it creates `reservedStock`.
* When the Shop Owner CLICKS "Accept & Pack" in their ERP, it converts `reservedStock` to a permanent `SALE` deduction.
* If a Shop Owner makes an offline sale that drops stock to 0, the Marketplace instantly removes or grays out the "Add to Cart" button for that shop globally.

### 4.3 UI/UX Design System Hand-off
* Utilize a premium, high-trust, fintech-inspired aesthetic. 
* **Colors:** Dark mode by default (`#0f172a` bg, crisp white text). Strategic accents: Emerald for success/profit, Amber for warnings/buttons, Crimson for alerts/debt.
* **Typography:** Clean sans-serif (Inter/SF Pro) for UI elements. Strict Monospace (JetBrains Mono/Roboto Mono) for ALL financial figures, invoice numbers, and SKUs to ensure tabular alignment and prevent layout shifting.
* **Feedback Loops:** Every action (adding to cart, recording a purchase, accepting an order, settling debt) MUST have a corresponding toast notification or visual micro-interaction (e.g., button turning green temporarily, number counters tick-rolling). Empty states must be beautifully illustrated and explanatory.

---
**FINAL AI INSTRUCTION:** 
Read this entire blueprint twice. Internalize the value proposition, the dual-sided nature of the platform, the strict unified ledger requirements, and the specific edge cases (Cart stockouts, Udhaar splitting). 

Generate the necessary modular React components, the centralized state store, the highly robust data models, and the routing logic to bring this multi-million dollar SaaS platform to life. Ensure the code is production-ready, highly commented, visually stunning, and handles all specified business logic without breaking.

# Complete Technical Breakdown: Tally, SAP & Zoho
## How They Work Internally — Every Feature, Model, Method & Design Pattern
### For AutoMobile Space ERP Replacement Development

---

| Document | ERP Systems Deep-Dive Technical Reference |
|----------|-------------------------------------------|
| Purpose | Understand Tally / SAP / Zoho deeply enough to replace them |
| Scope | Internal architecture, data models, accounting logic, UI patterns, workflows |
| Project | AutoMobile Space — Shop ERP Module |
| Version | v1.0 — March 2026 |

---

## TABLE OF CONTENTS

- Section 1 — Foundational Accounting Concepts All Three Systems Share
- Section 2 — TALLY ERP 9 / TallyPrime — Complete Technical Breakdown
- Section 3 — SAP S/4HANA & SAP Business One — Complete Technical Breakdown
- Section 4 — Zoho Books / Zoho One — Complete Technical Breakdown
- Section 5 — How to Build Your Own ERP: Synthesized Architecture
- Section 6 — AutoMobile Space ERP — Feature-by-Feature Implementation Guide

---

# SECTION 1 — FOUNDATIONAL ACCOUNTING CONCEPTS ALL THREE SYSTEMS SHARE

Before breaking down each system, you must understand the universal accounting engine that all three systems are built on. Without mastering this foundation, you cannot build any ERP.

---

## 1.1 Double-Entry Bookkeeping — The Core Engine

Every financial transaction in every ERP — Tally, SAP, Zoho — is recorded as a journal entry with two sides that must always balance:

```
Every Debit = A corresponding Credit of the same amount
Sum of all Debits = Sum of all Credits (always, forever, no exceptions)
```

This is not optional or configurable. It is the mathematical law that makes accounting work.

### The Five Account Types

Every account in existence falls into exactly one of these five categories:

**1. Assets** — Things the business OWNS
- Examples: Cash, Bank, Inventory (Stock), Accounts Receivable, Equipment, Land, Prepaid Expenses
- Normal Balance: DEBIT (increases with debit, decreases with credit)
- Rule: Debit increases an asset. Credit decreases an asset.

**2. Liabilities** — Things the business OWES to others
- Examples: Accounts Payable, Loans, GST Payable, Salary Payable, Advance from Customers
- Normal Balance: CREDIT (increases with credit, decreases with debit)
- Rule: Credit increases a liability. Debit decreases a liability.

**3. Equity (Capital)** — Owner's stake in the business
- Examples: Capital Account, Retained Earnings, Owner's Drawing
- Normal Balance: CREDIT
- Rule: Credit increases equity. Debit decreases it. (Drawing/withdrawal is a debit)

**4. Income (Revenue)** — Money earned from business operations
- Examples: Sales, Service Income, Interest Income, Commission Received
- Normal Balance: CREDIT
- Rule: Credit increases income (when you earn, credit income). Debit reduces it (for returns).

**5. Expenses** — Costs incurred to run the business
- Examples: Purchases (Cost of Goods Sold), Rent, Salary, Electricity, Depreciation
- Normal Balance: DEBIT
- Rule: Debit increases expense. Credit reduces it.

### The Golden Rules of Accounting (Used in Tally/SAP/Zoho)

Tally uses the old Indian format with Three Golden Rules. Modern systems use the same logic but present it differently.

**Rule 1 — Real Accounts (Assets):**
- Debit what comes IN
- Credit what goes OUT

**Rule 2 — Personal Accounts (People/Parties — Receivable/Payable):**
- Debit the RECEIVER
- Credit the GIVER

**Rule 3 — Nominal Accounts (Income/Expense):**
- Debit all EXPENSES and LOSSES
- Credit all INCOMES and GAINS

### How a Sale Journal Entry Works (Step by Step)

When a shop sells brake pads worth ₹1,000 (+18% GST = ₹180) for a total of ₹1,180 paid in cash:

```
Step 1: Identify the accounts affected
  - Cash (Asset) increases by ₹1,180
  - Sales Revenue (Income) increases by ₹1,000
  - GST Payable - CGST (Liability) increases by ₹90
  - GST Payable - SGST (Liability) increases by ₹90

Step 2: Apply the rules
  - Cash is an Asset that is increasing → DEBIT Cash ₹1,180
  - Sales is Income that is increasing → CREDIT Sales ₹1,000
  - CGST Payable is Liability increasing → CREDIT CGST Payable ₹90
  - SGST Payable is Liability increasing → CREDIT SGST Payable ₹90

Step 3: Verify balance
  - Total Debits:  ₹1,180
  - Total Credits: ₹1,000 + ₹90 + ₹90 = ₹1,180
  - Balanced ✓
```

### How a Purchase Journal Entry Works

When a shop buys spare parts worth ₹500 (+18% GST = ₹90) on credit from a vendor:

```
Step 1: Accounts affected
  - Purchases/COGS (Expense) increases by ₹500
  - GST Receivable - CGST (Asset) increases by ₹45 (Input Tax Credit)
  - GST Receivable - SGST (Asset) increases by ₹45 (Input Tax Credit)
  - Accounts Payable (Liability) increases by ₹590

Step 2: Apply rules
  - Purchases is Expense increasing → DEBIT Purchases ₹500
  - CGST Receivable is Asset increasing → DEBIT CGST Receivable ₹45
  - SGST Receivable is Asset increasing → DEBIT SGST Receivable ₹45
  - Accounts Payable is Liability increasing → CREDIT Accounts Payable ₹590

Step 3: Verify
  - Total Debits: ₹500 + ₹45 + ₹45 = ₹590
  - Total Credits: ₹590
  - Balanced ✓
```

---

## 1.2 The Chart of Accounts (CoA)

The Chart of Accounts is the master list of every account used by the business. Every ERP has one. It is the backbone of the entire accounting system.

### Standard CoA Structure (Used by Tally, SAP, Zoho)

```
1000s — ASSETS
  1100 — Current Assets
    1110 — Cash in Hand
    1120 — Bank Accounts
      1121 — HDFC Bank - Current Account
      1122 — SBI Bank - Savings Account
    1130 — Accounts Receivable (Sundry Debtors)
      [Customer sub-ledgers]
    1140 — Inventory / Stock
      1141 — Raw Material Stock
      1142 — Finished Goods Stock
      1143 — Stock in Transit
    1150 — Prepaid Expenses
    1160 — GST Input Tax Credit
      1161 — CGST Receivable
      1162 — SGST Receivable
      1163 — IGST Receivable
  1200 — Fixed Assets (Non-Current Assets)
    1210 — Furniture & Fixtures
    1220 — Computers & Equipment
    1230 — Vehicles
    1240 — Accumulated Depreciation (contra-asset, credit balance)

2000s — LIABILITIES
  2100 — Current Liabilities
    2110 — Accounts Payable (Sundry Creditors)
      [Vendor sub-ledgers]
    2120 — GST Output Tax Payable
      2121 — CGST Payable
      2122 — SGST Payable
      2123 — IGST Payable
    2130 — TDS Payable
    2140 — Advance from Customers
    2150 — Salary Payable
    2160 — Short-term Loans
  2200 — Long-term Liabilities
    2210 — Term Loans
    2220 — Owner's Loan to Business

3000s — EQUITY
  3100 — Capital Account
  3200 — Retained Earnings / Surplus
  3300 — Owner's Drawing

4000s — INCOME
  4100 — Sales Revenue
    4110 — Sales - Spare Parts
    4120 — Sales - Service Labour
    4130 — Sales - Accessories
  4200 — Other Income
    4210 — Interest Received
    4220 — Discount Received
    4230 — Commission Income

5000s — EXPENSES
  5100 — Cost of Goods Sold
    5110 — Purchases - Spare Parts
    5120 — Purchase Returns (credit balance — reduces COGS)
    5130 — Freight Inward
  5200 — Operating Expenses
    5210 — Rent
    5220 — Salary & Wages
    5230 — Electricity
    5240 — Telephone & Internet
    5250 — Packaging Material
  5300 — Financial Expenses
    5310 — Bank Charges
    5320 — Interest on Loans
  5400 — Depreciation
```

### How Tally Implements CoA

Tally calls the Chart of Accounts "Groups and Ledgers." The hierarchy is:
- **Groups** = Account categories (like Assets, Liabilities, Expenses above)
- **Ledgers** = Individual accounts (like HDFC Bank, Vendor A, Sales)

Tally ships with 28 pre-defined Groups. Every ledger must belong to exactly one group. The group determines how the ledger behaves in reports (whether it appears on Balance Sheet or P&L, which side — debit or credit).

### How SAP Implements CoA

SAP uses "Account Groups" and "GL Accounts" (General Ledger Accounts). SAP requires you to define a CoA at the company level. Each GL Account has:
- Account type (Asset/Liability/Revenue/Expense)
- Field status group (which fields are required/optional when posting)
- Sort key (how transactions are sorted in the account)
- House bank assignment (for bank accounts)

### How Zoho Implements CoA

Zoho Books has a pre-built CoA for each country with GST-specific accounts pre-created. Users can add custom accounts. Zoho maps accounts to financial statement positions automatically based on account type.

---

## 1.3 Voucher / Journal Entry — The Transaction Record

In every ERP, every financial event is recorded as a Voucher (Tally's term) or Journal Entry (Zoho/SAP term). This is the atomic unit of accounting.

A voucher/journal entry contains:
- **Date** — Transaction date (not the entry date, though both are stored)
- **Voucher Type** — What kind of transaction (Sale, Purchase, Payment, Receipt, etc.)
- **Voucher Number** — Auto-sequential per type per financial year
- **Narration** — Human-readable description
- **Ledger Entries** — The debit/credit lines (minimum 2, can be many)
- **Reference Number** — Invoice number, cheque number, etc.
- **Party Details** — Customer/vendor details for party vouchers
- **GST Details** — HSN/SAC codes, tax rates, tax amounts per line
- **Attachment** — Scanned invoice, receipt (in modern systems)

---

## 1.4 The Financial Year Concept

All three systems organize accounting by financial year. In India, the financial year runs from April 1 to March 31.

- Financial Year 2025-26: April 1, 2025 to March 31, 2026
- Voucher numbers reset at the start of each financial year
- Reports can span across financial years for comparison
- Year-end closing: transfer net profit/loss to Capital/Retained Earnings account
- Opening balances for the new year = Closing balances of the previous year (for Balance Sheet accounts only — P&L accounts reset to zero)

---

# SECTION 2 — TALLY ERP 9 / TALLYPRIME — COMPLETE TECHNICAL BREAKDOWN

---

## 2.1 What Tally Is — Architecture Overview

Tally is a desktop-first accounting software built in a proprietary language called TDL (Tally Definition Language). It stores all data in a proprietary binary database format, not a standard SQL database. Every company's data is stored in a folder on the local machine (or server in Tally.NET/Server mode).

### Tally's Data Storage Model

Tally stores data in Object-Oriented Collections. Instead of SQL tables, Tally has:
- **Masters** — Static data: Companies, Ledgers, Stock Items, Units of Measure, Tax Rates, etc.
- **Vouchers** — Transaction data: Every financial event
- **Reports** — Dynamically generated from masters and vouchers on the fly

The data directory for a company contains:
```
Company1/
  Company.900       — Company master (name, financial year, GST details)
  Master.900        — All masters (ledgers, stock items, units, etc.)
  TranMgr.900       — Transaction manager (index of all vouchers)
  Tally.sav         — Saved data
  [Year folders]/   — Voucher data per financial year
```

### Tally's Processing Model

When you open Tally and generate a report (like Profit & Loss), Tally:
1. Reads all vouchers from the data files for the date range
2. Processes each voucher's ledger entries in memory
3. Aggregates by account groups according to the CoA hierarchy
4. Renders the report in the UI in real-time

There is NO pre-computed summary table. Reports are always computed fresh. This is why Tally can be slow for large datasets but is always 100% accurate.

---

## 2.2 Tally's Masters — Every Master Type Explained

Masters in Tally are the reference data that vouchers are built on.

### 2.2.1 Company Master

This is the top-level entity. Every Tally installation can have multiple companies. A company is an independent set of books.

Fields in a Company Master:
- Company Name (what appears on all reports)
- Mailing Name (for invoices)
- Address (multi-line: address, city, state, pincode)
- State (determines CGST+SGST vs IGST on invoices)
- Country
- Pin Code
- Phone, Mobile, Email, Website
- Financial Year Beginning (default April 1)
- Books Beginning From (date from which you start entering data)
- Base Currency Symbol (₹)
- Formal Name of Currency (Indian Rupee)
- Local Currency Symbol
- GST/Tax information:
  - GSTIN (15-character GST registration number)
  - Registered As: Regular / Composition / Unregistered
  - Composite Rate (if Composition dealer)
  - State Code (2-digit state code for GST)
- Income Tax Number (PAN)
- Tax Deduction Account Number (TAN)
- Enable GST features: Yes/No
- Enable Payroll: Yes/No
- Enable Job Costing: Yes/No

### 2.2.2 Ledger Master

A Ledger is an individual account. Every financial entity — every customer, every vendor, every bank account, every expense type — is a ledger.

Fields in a Ledger Master:
- Name (the account name as shown in reports)
- Under (which Group it belongs to — determines account type)
- Opening Balance (the balance at the start of the financial year)
  - Amount
  - Dr/Cr (whether opening balance is debit or credit)
- Maintain Balances Bill-by-Bill: Yes/No
  - If Yes: tracks outstanding invoices individually
  - If No: tracks running balance only
- Default Credit Period (for customer/vendor ledgers — e.g., 30 days)
- GST Details (for customers/vendors):
  - Is Party a GST Registered Dealer: Yes/No
  - GSTIN/UIN
  - PAN
  - Is Party Applicable for TDS: Yes/No
  - TDS Nature of Payment
- Bank Details (for bank ledgers):
  - Account Number
  - IFSC Code
  - Bank Name
  - Branch
- Mailing Details (for party ledgers):
  - Address
  - State
  - Country
  - Pincode
- Inventory Values are Affected: Yes/No
  - Yes for Purchase, Sales, Stock accounts — links accounting to inventory

### 2.2.3 Group Master

Groups organize ledgers into the CoA hierarchy. Tally has 28 pre-defined groups you cannot delete:

```
PRIMARY GROUPS (top-level):
  Capital Account          (Equity)
  Loans (Liability)        (Long-term liabilities)
  Current Liabilities      (Short-term liabilities)
  Fixed Assets             (Non-current assets)
  Investments             (Financial investments)
  Current Assets           (Short-term assets)
  Misc. Expenses (Asset)  (Preliminary expenses, not yet written off)
  Suspense Account        (Temporary holding account)
  Sales Accounts          (Revenue)
  Purchase Accounts       (Cost of goods)
  Direct Incomes          (Other direct revenue)
  Direct Expenses         (Direct costs)
  Indirect Incomes        (Non-operating revenue)
  Indirect Expenses       (Non-operating costs)

SUB-GROUPS (under primary groups):
  Bank Accounts            → under Current Assets
  Bank OD Accounts         → under Loans (Liability)
  Branch/Divisions         → under Current Assets
  Capital Account          → under Capital Account
  Cash-in-Hand             → under Current Assets
  Deposits (Asset)         → under Current Assets
  Deposits (Liability)     → under Current Liabilities
  Duties & Taxes           → under Current Liabilities
  Loans & Advances (Asset) → under Current Assets
  Provisions               → under Current Liabilities
  Reserves & Surplus       → under Capital Account
  Secured Loans            → under Loans (Liability)
  Stock-in-Hand            → under Current Assets
  Sundry Creditors         → under Current Liabilities
  Sundry Debtors           → under Current Assets
  Unsecured Loans          → under Loans (Liability)
```

Each group has a property: **Net Debit/Credit Balance for Reporting**. This tells Tally which side a positive balance appears on in financial statements.

### 2.2.4 Stock Item Master (Inventory Item)

Every product in inventory is a Stock Item in Tally.

Fields in a Stock Item Master:
- Name (the item name)
- Under (Stock Group — category hierarchy, e.g., Auto Parts > Brake System > Brake Pads)
- Category (secondary classification — optional)
- Units of Measure — Primary UOM (e.g., Nos, Kg, Litre, Box)
- Alternate UOM (if item sold in different units than purchased)
- Opening Balance:
  - Quantity
  - Rate (per unit cost)
  - Value (auto-calculated as Qty × Rate)
- GST Details:
  - HSN/SAC Code (mandatory for GST)
  - Taxability: Taxable / Nil Rated / Exempt / Non-GST
  - Default GST Rate (5% / 12% / 18% / 28%)
  - CGST Rate (half of total for intra-state)
  - SGST Rate (half of total for intra-state)
  - IGST Rate (full rate for inter-state)
  - Cess Rate (if applicable)
- Costing Method: Average Cost / FIFO / LIFO / Standard Cost
- Market Valuation Method: Average Price / Last Purchase Price / Standard Price
- Allow use of Expiry Dates: Yes/No
- Allow Batch-wise Details: Yes/No
- Set/Alter MRP Details: Yes/No (for MRP-based billing)
- Item can be sold in fractions: Yes/No (e.g., 0.5 kg of oil)
- Description (internal notes about the item)
- Part Number (supplier's part number for cross-reference)

### 2.2.5 Stock Group Master

Organizes Stock Items into a hierarchy (like folders). Example:

```
All Items (root)
  ├── Brake System
  │   ├── Brake Pads
  │   ├── Brake Discs
  │   └── Brake Fluid
  ├── Engine Parts
  │   ├── Oil Filters
  │   ├── Air Filters
  │   └── Spark Plugs
  └── Electricals
      ├── Batteries
      └── Bulbs & Lights
```

### 2.2.6 Unit of Measure (UOM) Master

Defines how items are counted. Types:
- Simple UOM: Nos, Kg, Litre, Box, Set, Pair, Meter
- Compound UOM: Box of 12 Nos (1 Box = 12 Nos) — for conversion

### 2.2.7 Godown (Warehouse) Master

Tally supports multiple storage locations called Godowns.

Fields:
- Name
- Under (parent godown — for hierarchy)
- Address (optional, for tracking)

You can have:
- Main Warehouse → Godown 1 → Shelf A1
- Secondary Store → Godown 2

Every stock item's quantity is tracked per godown. A stock transfer between godowns is a specific voucher type (Stock Transfer Journal).

### 2.2.8 Cost Centre Master

Cost centres allow you to track income and expenses by department, project, or location. Example: if you have two branches, you can allocate every sale and expense to Branch A or Branch B and get profitability per branch.

### 2.2.9 Currency Master

Tally supports multi-currency. You define:
- Currency Name
- Symbol
- Formal Name
- Number of Decimal Places
- Is Foreign Currency: Yes/No
- Daily exchange rates can be entered manually

### 2.2.10 Voucher Type Master

Each type of transaction in Tally is a Voucher Type. Tally has pre-defined voucher types, and you can create custom ones.

Pre-defined Voucher Types:
- **Sales** — Records sales transactions (generates sales invoice)
- **Purchase** — Records purchase transactions (records vendor invoice)
- **Receipt** — Records money received from customers (cash/bank)
- **Payment** — Records money paid to vendors/expenses (cash/bank)
- **Journal** — General-purpose entry for adjustments, depreciation, etc.
- **Contra** — Fund transfers between cash and bank accounts
- **Credit Note** — Sales return or credit given to customer
- **Debit Note** — Purchase return or debit to vendor
- **Delivery Note** — Dispatch of goods (no accounting entry — inventory only)
- **Receipt Note** — Receipt of goods (no accounting entry — inventory only)
- **Rejection Out** — Return of received goods
- **Rejection In** — Return from customer (non-accounting)
- **Stock Journal** — Stock adjustment, transfer, manufacture
- **Physical Stock** — Actual stock count reconciliation
- **Memorandum** — Draft/provisional entry (not posted to books)
- **Reversing Journal** — Auto-reverses on a set date (for accruals)
- **Optional Voucher** — Like a draft, doesn't affect books until confirmed
- **Payroll** — Salary processing (if payroll module enabled)

For each Voucher Type, you configure:
- Name
- Type of Voucher (base type — Sales, Purchase, Journal, etc.)
- Method of Voucher Numbering: Automatic / Manual / Multi-user Auto
- Starting Number (for the financial year)
- Prefix (e.g., INV/ for invoices)
- Suffix
- Prevent Duplicates: Yes/No
- Use EFFECTIVE Date for Vouchers: Yes/No
- Use Common Narration: Yes/No
- Narration for Each Entry: Yes/No

---

## 2.3 Tally's Voucher Entry — Every Voucher Type in Detail

### 2.3.1 Sales Voucher (Invoice Creation)

This is the most used voucher type for a spare parts shop. When a customer buys goods, you create a Sales voucher.

**Screen Layout of a Tally Sales Invoice:**

```
Sales Invoice
Date: [DD-MM-YYYY]          Voucher No: INV/2425/001

Party A/c Name: [Customer Name or Cash]
Place of Supply: [State - auto-fills from customer ledger]

Sales Ledger: Sales - Spare Parts

Bill of Materials / Items:
+----------+-------+------+------+--------+-----+--------+--------+-------+
| Item     | Godown| Qty  | Rate |HSN Code|GST% | Value  | GST Amt| Total |
+----------+-------+------+------+--------+-----+--------+--------+-------+
| Brake Pad|Main WH| 2 Nos|450   |8708    | 18% | 900.00 | 162.00 |1062.00|
| Oil Fltr |Main WH| 1 Nos|200   |8421    | 18% | 200.00 |  36.00 | 236.00|
+----------+-------+------+------+--------+-----+--------+--------+-------+
                                              Taxable Value: ₹1,100.00
                                                 CGST (9%): ₹   99.00
                                                 SGST (9%): ₹   99.00
                                               Grand Total: ₹1,298.00

Mode of Payment: Cash / Bank / Credit (choose)

Narration: [Free text description of the sale]
```

**What Tally Does Internally When You Save This Invoice:**

1. Creates a Sales Voucher record with all the header data
2. Creates Inventory Ledger Entries:
   - Reduces Stock Item "Brake Pad" by 2 Nos in Main Warehouse
   - Reduces Stock Item "Oil Filter" by 1 Nos in Main Warehouse
   - Records cost (for valuation) using the costing method (FIFO/Average)
3. Creates Accounting Ledger Entries (the journal entry):
   - DEBIT: Cash/Customer Account — ₹1,298.00
   - CREDIT: Sales — Spare Parts — ₹1,100.00
   - CREDIT: CGST Payable — ₹99.00
   - CREDIT: SGST Payable — ₹99.00
4. If Bill-by-Bill is enabled for the customer: creates an outstanding bill record for ₹1,298 dated today (for accounts receivable aging)
5. Updates the stock ledger (average cost, FIFO batch, etc.)
6. Makes the invoice available for printing

**Sales Invoice Print Format contains:**
- Seller GSTIN, Name, Address, State, State Code
- Invoice Number, Invoice Date
- Buyer Name, Buyer GSTIN (if B2B), Buyer Address, Buyer State
- Place of Supply (state)
- Item table: Description, HSN, Qty, Rate, Amount, GST Rate, GST Amount, Total
- Tax summary: Taxable Value, CGST, SGST, IGST, Total Tax
- Grand Total in numbers and words
- Declaration text (as per GST rules)
- Bank details (for credit invoices)
- Seller signature space
- QR code (for e-invoices)

### 2.3.2 Purchase Voucher

When a shop receives goods from a vendor and records the purchase bill.

**Purchase Voucher Data:**
- Supplier Invoice Number (their bill number — mandatory for GST ITC claim)
- Supplier Invoice Date
- Party A/c Name: (the vendor/supplier ledger)
- Purchase Ledger: Purchases - Spare Parts
- Items purchased (same structure as sales — item, qty, rate, HSN, GST%)
- Reference: the PO number it corresponds to (optional)

**What Tally Does Internally:**
1. DEBIT: Purchases — ₹1,100.00 (the taxable value)
2. DEBIT: CGST Input Tax Credit — ₹99.00
3. DEBIT: SGST Input Tax Credit — ₹99.00
4. CREDIT: Vendor Account (Accounts Payable) — ₹1,298.00
5. Increases stock quantities of purchased items
6. Records the purchase batch (for FIFO tracking)
7. Creates an outstanding bill in the vendor's account (accounts payable aging)

### 2.3.3 Receipt Voucher

When a customer pays their outstanding bill (credit sale payment received).

```
Receipt Voucher
Date: [DD-MM-YYYY]        Voucher No: RCP/2425/001

Account: [Bank Account or Cash]    Amount: ₹1,298.00

Particulars:
Party Account: [Customer Name]     ₹1,298.00
  Against Ref: INV/2425/001        ₹1,298.00 [Bill-by-bill matching]

Narration: Received cheque no. 123456 from customer for invoice INV/2425/001
```

**What Tally Does Internally:**
1. DEBIT: Cash/Bank Account — ₹1,298.00
2. CREDIT: Customer (Accounts Receivable) — ₹1,298.00
3. Marks the outstanding bill INV/2425/001 as PAID
4. Updates customer's running balance to zero

### 2.3.4 Payment Voucher

When the shop pays a vendor or an expense.

```
Payment Voucher
Date: [DD-MM-YYYY]        Voucher No: PAY/2425/001

Account: [Bank Account or Cash]    Amount: ₹590.00

Particulars:
Party Account: [Vendor Name]    ₹590.00
  Against Ref: PUR/2425/001     ₹590.00

Narration: Paid by NEFT to vendor for purchase bill PUR/2425/001
```

**What Tally Does Internally:**
1. DEBIT: Vendor Account (reduces Accounts Payable) — ₹590.00
2. CREDIT: Bank Account (reduces cash/bank) — ₹590.00
3. Marks the outstanding purchase bill as PAID

### 2.3.5 Journal Voucher

A general-purpose entry for transactions that don't fit other types. Used for:
- Depreciation entries
- Interest accrual
- Bank charge recording (from bank statement)
- Salary accrual
- Provision entries
- Opening balance entries
- GST adjustments
- TDS entries

```
Journal Voucher
Date: [DD-MM-YYYY]        Voucher No: JNL/2425/001

Particulars:
DEBIT:  Depreciation Expense        ₹5,000.00
CREDIT: Accumulated Depreciation    ₹5,000.00

Narration: Monthly depreciation on computers @20% p.a. — Month of April 2025
```

### 2.3.6 Contra Voucher

Used ONLY for fund transfers between cash and bank accounts. Never involves any income or expense account.

Examples:
- Depositing cash into bank: DEBIT Bank, CREDIT Cash
- Withdrawing cash from bank (ATM): DEBIT Cash, CREDIT Bank
- Transferring between two bank accounts: DEBIT Bank B, CREDIT Bank A

### 2.3.7 Credit Note (Sales Return)

When a customer returns goods that were previously sold.

```
Credit Note
Date: [DD-MM-YYYY]        Voucher No: CN/2425/001
Against Ref: INV/2425/001

Party: [Customer Name]
Items Returned:
  Brake Pad - 1 Nos - ₹450 + GST ₹81 = ₹531

Accounting Effect:
  DEBIT: Sales - Spare Parts (reduces revenue) ₹450
  DEBIT: CGST Payable (reversal) ₹40.50
  DEBIT: SGST Payable (reversal) ₹40.50
  CREDIT: Customer Account (reduces receivable) ₹531
  Also: Stock of Brake Pad INCREASES by 1 Nos
```

### 2.3.8 Debit Note (Purchase Return)

When the shop returns goods to a vendor.

```
Debit Note
Date: [DD-MM-YYYY]        Voucher No: DN/2425/001
Against Ref: PUR/2425/001

Party: [Vendor Name]
Items Returned:
  Oil Filter - 1 Nos - ₹200 + GST ₹36 = ₹236

Accounting Effect:
  DEBIT: Vendor Account (reduces payable) ₹236
  CREDIT: Purchases - Spare Parts (reduces COGS) ₹200
  CREDIT: CGST Input Tax Credit (reversal) ₹18
  CREDIT: SGST Input Tax Credit (reversal) ₹18
  Also: Stock of Oil Filter DECREASES by 1 Nos
```

### 2.3.9 Stock Journal (Inventory Adjustment)

Used to adjust inventory without any accounting entry (for physical count differences) OR for internal stock movements.

Types:
1. **Stock Adjustment (write-off):** Remove damaged/lost stock
   - DEBIT: Stock Loss/Damage Expense (new nominal account)
   - CREDIT: Stock Item (reduces inventory)
2. **Stock Transfer between Godowns:**
   - FROM: Main Warehouse — Brake Pad — reduce qty by 10
   - TO: Branch Store — Brake Pad — increase qty by 10
   - No accounting entry — just inventory movement
3. **Manufacturing Journal:**
   - Consume raw materials (reduce) and produce finished goods (increase)

### 2.3.10 Physical Stock Voucher

When you do a physical stock count and the actual count differs from the book stock:

- Lists each item
- Records actual physical count
- Tally auto-calculates the difference
- Creates an adjustment to bring book stock in line with physical stock
- The adjustment posts to a "Stock Variance" expense or income account

---

## 2.4 Tally's Inventory System — Deep Dive

### 2.4.1 Stock Valuation Methods

Tally supports four inventory valuation methods:

**1. Average Cost (Weighted Average)**
- Running average cost recalculated on every purchase
- Formula: (Existing Stock Value + New Purchase Value) / (Existing Qty + New Qty) = New Average Cost
- Example: Have 10 brake pads at ₹400 each (value ₹4,000). Buy 5 more at ₹500 each (value ₹2,500). New average = (4,000 + 2,500) / (10 + 5) = ₹6,500 / 15 = ₹433.33 per pad
- Most common method for auto parts shops

**2. FIFO (First In, First Out)**
- Oldest stock is assumed to be sold first
- Each purchase creates a batch with its own cost
- When selling, Tally uses the cost of the oldest batch first
- Best for expirable items (oils, filters with date sensitivity)
- Example: Bought 10 at ₹400 (Jan), 5 at ₹500 (Feb). When selling 8, COGS = 8 × ₹400 = ₹3,200. Remaining: 2 at ₹400, 5 at ₹500.

**3. LIFO (Last In, First Out)**
- Newest stock assumed to be sold first
- Less common; good for rising prices (shows higher COGS, lower taxable profit)
- Not permitted under IFRS; used in US GAAP historically

**4. Standard Cost**
- A fixed predetermined cost is used for valuation regardless of actual purchase price
- Variance between actual and standard is recorded as a variance account
- Used in manufacturing environments

### 2.4.2 Batch/Lot Tracking

When "Maintain Batch-wise Details" is enabled for a stock item:
- Every purchase records a batch number, manufacturing date, expiry date, quantity, and cost
- Every sale is linked to a specific batch (FIFO or user-selected)
- Reports show stock by batch — helps track which batch has expiry issues
- Enables recall traceability: "which customers got stock from batch XYZ?"

### 2.4.3 Multi-Godown (Warehouse) Management

- Stock quantities are tracked per godown per item
- Stock Summary report shows item-wise, godown-wise quantities
- Stock Transfer Voucher moves stock between godowns
- You can generate a pick list from a specific godown for order fulfillment
- Purchase can be received into any godown
- Sales can be dispatched from any godown

### 2.4.4 Reorder Level Management

For each stock item you can set:
- **Reorder Level:** When stock hits this number, place a purchase order (minimum stock trigger)
- **Reorder Quantity:** How much to order when reorder level is hit
- **Minimum Order Quantity:** Supplier's minimum

Tally generates a "Reorder Status" report that shows all items below reorder level.

---

## 2.5 Tally's Reports — Every Report Type Explained

### 2.5.1 Accounting Reports

**Trial Balance**
- Shows all ledger accounts with their net debit or credit balance for the selected period
- Purpose: Verify that total debits = total credits (mathematical check)
- Format: Two columns — Debit Balances | Credit Balances
- Total of both columns must be equal
- This is how you know your books are balanced

**Profit & Loss Account (P&L)**
The P&L shows how much profit or loss the business made in a period.

Tally's P&L Structure:
```
PROFIT & LOSS ACCOUNT
For the period: April 1, 2025 to March 31, 2026

INCOME SIDE (Credit Items):
  Closing Stock                               ₹3,50,000
  Sales - Spare Parts                         ₹12,00,000
  Sales - Service Labour                      ₹  80,000
  Direct Incomes                              ₹   5,000
  Indirect Incomes                            ₹   8,000
                          Total Income:       ₹16,43,000

EXPENDITURE SIDE (Debit Items):
  Opening Stock                               ₹2,00,000
  Purchases - Spare Parts                     ₹ 7,50,000
  Purchase Returns (-)                        ₹  (20,000)
  Freight Inward                              ₹  10,000
  Gross Profit (transferred to P&L):         ₹4,10,000
  ─────────────────────────────────────────────────────
  Gross Profit                               ₹4,10,000
  Indirect Expenses:
    Rent                                     ₹1,20,000
    Salaries                                 ₹1,80,000
    Electricity                              ₹  18,000
    Depreciation                             ₹  24,000
    Bank Charges                             ₹   2,400
                    Total Indirect Expenses: ₹3,44,400
                        Net Profit (Loss):   ₹  65,600
```

**Balance Sheet**
The Balance Sheet shows the financial position of the business at a specific point in time.

Tally's Balance Sheet Structure:
```
BALANCE SHEET
As at: March 31, 2026

LIABILITIES                          ASSETS
Capital Account:                     Fixed Assets:
  Capital (Opening) ₹5,00,000          Furniture     ₹80,000
  Add: Net Profit   ₹  65,600          Computer      ₹40,000
  Less: Drawings    ₹(40,000)          Accum. Deprec (₹24,000)
  Net Capital       ₹5,25,600          Net Fixed     ₹96,000

Current Liabilities:                 Current Assets:
  Sundry Creditors  ₹1,50,000          Stock-in-Hand ₹3,50,000
  CGST Payable      ₹  18,000          Sundry Debtors₹2,20,000
  SGST Payable      ₹  18,000          Cash-in-Hand  ₹  15,000
  Loan - SBI Bank   ₹2,00,000          Bank - HDFC   ₹2,30,600
                                        
Total Liabilities:  ₹9,11,600        Total Assets:   ₹9,11,600
```

**Cash Flow Statement**
Shows how cash moved during the period — operating, investing, and financing activities.

**Ledger** (Statement of Account)
Shows every transaction that affected a specific account during a period.
Example: "Show me all transactions in HDFC Bank account for April 2025":
```
Date     | Particulars          | Vch Type | Debit    | Credit   | Balance
01-Apr   | Opening Balance      |          |          |          | ₹1,50,000 Dr
05-Apr   | Received from Ramesh | Receipt  | ₹5,000   |          | ₹1,55,000 Dr
10-Apr   | Paid to Vendor XYZ   | Payment  |          | ₹12,000  | ₹1,43,000 Dr
15-Apr   | Sales Cash (Contra)  | Contra   | ₹25,000  |          | ₹1,68,000 Dr
```

**Day Book**
Shows all vouchers entered on a specific day, in chronological order. Used for daily review.

**Outstanding Statements — Bills Receivable / Bills Payable**
Shows all unpaid invoices:
- Bills Receivable: Money customers owe you (Accounts Receivable aging)
- Bills Payable: Money you owe vendors (Accounts Payable aging)

Aging buckets in Tally:
- Current (not yet due)
- 1–30 days overdue
- 31–60 days overdue
- 61–90 days overdue
- More than 90 days overdue

### 2.5.2 Inventory Reports

**Stock Summary**
Shows all stock items with current quantity, rate, and value per godown.

**Stock Ledger**
For a specific item, shows all movements (purchase, sale, adjustment) with dates, quantities, and running balance.

**Stock Movement Analysis**
Shows movement velocity — fast-moving vs slow-moving vs non-moving items for a period.

**Ageing Analysis**
How long items have been in stock — helps identify dead stock.

**Stock Valuation Report**
Current stock value at different valuation methods (Average/FIFO/Standard) side by side.

**Reorder Status**
Items at or below reorder level — list with current stock, reorder level, shortfall, and reorder quantity.

### 2.5.3 GST Reports

**GSTR-1 (Outward Supplies)**
Tally aggregates all sales vouchers and produces the GSTR-1 data:
- B2B supplies (GST-registered buyers): Party-wise, invoice-wise list with GSTIN
- B2C Large supplies (>₹2.5 lakh): Invoice-wise list
- B2C Small supplies: State-wise, rate-wise summary
- HSN-wise summary: Each HSN code, quantity, value, tax
- Credit/Debit Notes: Linked to original invoices
- Nil-rated and exempt supplies summary

**GSTR-2A/2B (Inward Supplies)**
Auto-populated from GSTN portal based on what your vendors filed. Tally can download this data and compare it against your purchase entries to identify mismatches (ITC reconciliation).

**GSTR-3B (Summary Return)**
Monthly summary:
- Outward taxable supplies
- ITC available
- ITC eligible
- Net GST payable

**GST Audit Report**
GSTR-9 (annual return data) preparation.

---

## 2.6 Tally's Udhaar (Credit Management) System

Tally calls this "Outstanding Management" or "Debtors/Creditors Management." For an auto parts shop, this is the informal credit extended to mechanics, garages, and loyal customers (udhaar in Hindi).

### How Tally Tracks Udhaar

1. When creating a Sales Voucher on credit, select the customer ledger as the Party Account
2. Enable "Maintain Balances Bill-by-Bill" in the ledger master
3. Tally stores each outstanding invoice separately with:
   - Invoice number
   - Invoice amount
   - Invoice date
   - Credit period (due date)
   - Payment received against this bill: partial or full
   - Outstanding balance

4. Outstanding Report shows:
   - Customer name
   - Bill number
   - Bill date
   - Due date
   - Days overdue
   - Outstanding amount

5. When customer pays, you create a Receipt Voucher and in the "Against Ref" field, allocate the payment against specific bills (FIFO allocation or manual selection)

### Collection Follow-up in Tally

Tally Prime added:
- Payment reminders (configurable messages)
- SMS integration for sending outstanding reminders
- Email from within Tally
- WhatsApp integration (via third-party connector)

---

## 2.7 Tally's Configuration System — TDL (Tally Definition Language)

Tally's entire UI, reports, and business logic is defined in TDL files. This is how you understand Tally's design philosophy.

TDL has three main concepts:

**1. Objects (Data)**
Represent real-world entities: LedgerObjects, VoucherObjects, StockItemObjects, etc.
Each object has a collection of methods (calculated fields).

**2. Definitions (UI Components)**
Reports, Forms, Parts, Lines, Fields — define how data is displayed.

**3. Functions and Actions**
Handle user interactions, validations, and computations.

This means every calculation Tally performs — GST calculation, stock valuation, P&L computation — is defined in TDL files. Tally ships with thousands of TDL definitions. Advanced users can write custom TDL to add reports, change behavior, add fields.

---

# SECTION 3 — SAP S/4HANA & SAP BUSINESS ONE — COMPLETE TECHNICAL BREAKDOWN

---

## 3.1 SAP Architecture Overview

SAP is an enterprise-grade ERP designed for medium-to-large companies. SAP Business One (SAP B1) is the version designed for small-medium businesses and is most comparable to Tally for our purposes. SAP S/4HANA is the full enterprise version.

### SAP's Three-Tier Architecture

```
Presentation Layer: SAP GUI / Fiori Web UI / SAP Business One Client
Application Layer: SAP Application Server (ABAP / Java)
Database Layer: SAP HANA (in-memory columnar database) / SQL Server / Oracle
```

### SAP's Core Concept: The Document

In SAP, every transaction — every sale, every purchase, every payment — creates a **Document**. A document has:
- Document Number (auto-assigned per document type per fiscal year)
- Company Code (the legal entity)
- Fiscal Year
- Document Date
- Posting Date
- Document Type (SA=GL Account Document, KR=Vendor Invoice, DR=Customer Invoice, etc.)
- Currency
- Reference (external document number, like the vendor's invoice number)
- Header Text (narration)
- Line Items (each line is a debit or credit to an account)

Documents, once posted, are IMMUTABLE in SAP. You cannot edit a posted document. You can only reverse it (create an equal and opposite document). This is the SAP audit trail mechanism.

---

## 3.2 SAP's Master Data — Every Master Type

### 3.2.1 Chart of Accounts (CoA)

In SAP, the CoA is defined at the CLIENT level (the highest organizational unit). A company code uses one CoA. SAP ships with pre-defined CoA templates:
- INT: International Chart of Accounts (used by most SAP implementations)
- CA: Canada
- YCOA: Generic

Each GL Account (General Ledger Account) in SAP has:
- Account Number (typically 6 digits, e.g., 100000)
- Account Type: Asset (A), Liability (K), Revenue (E), Expense (S)
- Account Group (determines field selection rules)
- Short Text (30 chars for lists)
- Long Text (full description)
- Reconciliation Account indicator (links sub-ledger to GL)
- Only Balances in Local Currency: Yes/No
- Line Item Display: Yes/No (can see every line item in account)
- Sort Key (how transactions sort in account)
- Field Status Group (which fields are mandatory/optional in transactions)
- Relevant to Cash Flow: Yes/No (for cash flow statement)
- Tax Category (which taxes apply)
- Planning Level (for budgeting)

### 3.2.2 Vendor Master (Accounts Payable)

SAP stores vendor information in three "segments" because different departments maintain different parts:
- **General Data** — Basic info maintained by accounting: Vendor name, address, search terms, language
- **Company Code Data** — Accounting-specific: Reconciliation Account, Payment Terms, Payment Method, Bank Details, Withholding Tax info
- **Purchasing Organization Data** — Procurement-specific: Order Currency, Delivery Terms, Incoterms, Minimum Order Value, Vendor evaluation

### 3.2.3 Customer Master (Accounts Receivable)

Similarly structured:
- **General Data:** Name, address, phone, email, language, search terms
- **Company Code Data:** Reconciliation account, payment terms, credit limit, dunning (collection) settings
- **Sales Organization Data:** Pricing group, delivery priority, shipping conditions, incoterms

### 3.2.4 Material Master (Product / Inventory Item)

The Material Master in SAP is the most complex master. It has different "views" maintained by different departments, and each view has different fields:

- **Basic Data 1:** Material number, description, material type, industry sector, material group, base unit of measure, weight, volume
- **Basic Data 2:** CAD drawing, production resources
- **Classification:** Custom characteristics (color, size, brand, etc.)
- **Sales: Sales Org Data 1:** Sales unit, minimum order quantity, item category group, delivery plant
- **Sales: General/Plant Data:** Availability check, transportation group, batch management indicator
- **Purchasing:** Purchasing group, purchasing value key, order unit, overdelivery/underdelivery tolerances, critical part
- **MRP 1:** MRP type (consumption-based, reorder point, planned), reorder point, safety stock, planned delivery time
- **MRP 2:** Procurement type (in-house/external), lot size, fixed lot size
- **MRP 3:** Availability check, period indicator
- **Accounting 1:** Valuation Class (links to GL accounts), price control (Standard/Moving Average), Standard Price or Moving Average Price, previous price
- **Accounting 2:** LIFO/FIFO data
- **Costing 1:** Costing lot size, procurement alternatives
- **Plant Data/Storage:** Storage conditions, temperature, picking area, storage bin

### 3.2.5 Business Partner (SAP's unified concept in S/4HANA)

SAP S/4HANA unified customer and vendor masters into a single "Business Partner" master. One Business Partner can be:
- A Customer (has AR data)
- A Vendor (has AP data)
- Both a Customer and Vendor (for intercompany trading)

---

## 3.3 SAP's Transaction Processing — Key Transaction Codes

In SAP GUI, every action is a Transaction Code (T-code). This is SAP's equivalent of navigating menus. Key T-codes:

| T-Code | Description |
|--------|-------------|
| FB60 | Enter Vendor Invoice (Purchase Invoice) |
| FB65 | Enter Vendor Credit Memo |
| FB70 | Enter Customer Invoice |
| FB75 | Enter Customer Credit Memo |
| F-53 | Post Vendor Payment (manual) |
| F-28 | Post Incoming Payment from Customer |
| FBZ2 | Post Incoming Payment |
| MIGO | Goods Movement (Goods Receipt, Goods Issue, Transfer Posting) |
| ME21N | Create Purchase Order |
| ME31N | Create Outline Agreement (Contract) |
| VA01 | Create Sales Order |
| VF01 | Create Billing Document (Invoice) |
| MB1C | Goods Receipt for Initial Stock Upload |
| MB52 | Warehouse Stocks of Material (Inventory Report) |
| F.01 | Financial Statements |
| S_ALR_87012284 | Vendor Line Items (AP ledger) |
| FD10N | Customer Balance Display |

---

## 3.4 SAP's Procure-to-Pay (P2P) Process

This is the complete purchase workflow in SAP:

**Step 1: Purchase Requisition (PR)**
An internal document requesting that something be purchased. Created by any department (warehouse manager, production, etc.). Does NOT create any accounting entry.
- T-code: ME51N
- Contains: Material, Quantity, Required Date, Requesting Plant, Account Assignment (cost center or GL account)

**Step 2: Request for Quotation (RFQ) — Optional**
Send RFQ to multiple vendors. Collect and compare quotations.
- T-code: ME41 (Create RFQ), ME47 (Enter Quotation from Vendor), ME49 (Price Comparison)

**Step 3: Purchase Order (PO)**
Formal order to vendor. Can be created from PR or directly.
- T-code: ME21N
- Contains: Vendor, Material, Quantity, Delivery Date, Price, Plant, Storage Location, Account Assignment, Payment Terms, Incoterms
- NO accounting entry yet

**Step 4: Goods Receipt (GR)**
When physical goods arrive, the warehouse records the receipt.
- T-code: MIGO (Movement Type 101 = Goods Receipt for Purchase Order)
- Accounting Entry Created:
  - DEBIT: Inventory/Stock Account (material's valuation class determines which GL)
  - DEBIT: GR/IR Account (Goods Receipt / Invoice Receipt — a clearing account)
  - CREDIT: GR/IR Account (other side — complex SAP posting)
- Actually: DEBIT Inventory, CREDIT GR/IR (Goods Receipt / Invoice Receipt clearing account)

**Step 5: Invoice Verification (MIRO)**
When vendor's invoice arrives, finance records it and matches against PO and GR (3-way match):
- T-code: MIRO
- SAP verifies: Invoice quantity ≤ PO quantity? Invoice price = PO price (within tolerance)?
- Accounting Entry:
  - DEBIT: GR/IR Account (clears the GR posting)
  - CREDIT: Vendor Account (creates the liability — accounts payable)
  - DEBIT or CREDIT: Price variance account (if invoice price ≠ PO price)

**Step 6: Payment (F110 — Automatic Payment Run)**
SAP can automatically pay all due invoices via a payment run:
- T-code: F110
- Configuration: Company code, payment run date, next payment date, vendor selection, house bank
- SAP selects all invoices due for payment, checks payment methods, creates payment documents
- Generates bank transfer file (SEPA/NEFT format) automatically
- Accounting Entry:
  - DEBIT: Vendor Account (clears the liability)
  - CREDIT: Bank Account

---

## 3.5 SAP's Order-to-Cash (O2C) Process

The complete sales workflow:

**Step 1: Sales Order (SO)**
Customer places an order. Recorded in SAP as a Sales Order.
- T-code: VA01
- Contains: Customer, Material, Quantity, Requested Delivery Date, Ship-to Party, Bill-to Party, Price (from pricing conditions), Payment Terms, Incoterms
- Pricing Conditions in SAP determine the final price:
  - Condition Type PR00 = Base Price
  - Condition Type K004 = Customer Discount
  - Condition Type MWST = Tax (GST)
  - These conditions are stored in Condition Records and applied automatically based on customer, material, date, and other factors

**Step 2: Availability Check (ATP)**
SAP checks if the requested quantity is available (Available to Promise). Based on:
- Current stock
- Planned goods receipts (from POs)
- Existing commitments (from other SOs)
- Safety stock requirements

**Step 3: Delivery / Outbound Delivery**
- T-code: VL01N
- Picking: System generates pick list for warehouse staff
- Goods Issue (MIGO): Stock is physically removed from warehouse
  - Accounting Entry:
    - DEBIT: COGS (Cost of Goods Sold) — based on material's valuation
    - CREDIT: Inventory Account

**Step 4: Billing / Invoice Creation**
- T-code: VF01
- Created from the outbound delivery
- Accounting Entry:
  - DEBIT: Customer Account (Accounts Receivable)
  - CREDIT: Sales Revenue Account
  - CREDIT: GST Payable (Output Tax)

**Step 5: Incoming Payment**
- T-code: F-28
- Customer pays → Cash/Bank debited, Customer account credited

---

## 3.6 SAP's Controlling Module (CO) — Cost Management

SAP FI (Financial Accounting) handles external reporting. SAP CO (Controlling) handles internal management accounting. For an auto parts shop, CO is what enables:

**Cost Centers:** Departments like Workshop, Sales Counter, Delivery — track costs per department
**Profit Centers:** Branches or product lines — track revenue AND cost per center
**Internal Orders:** Track costs for a specific project or one-time event (like shop renovation)
**Product Costing:** Calculate the exact cost of producing/servicing an item

---

## 3.7 SAP Business One (SAP B1) — SMB-Specific Features

SAP B1 is more relevant for our comparison (it targets the same market as Tally):

### SAP B1's Key Modules

**Administration:**
- Company setup, fiscal year, currencies
- User and permission management
- Approval workflows (e.g., purchases above ₹10,000 need manager approval)
- Document numbering series

**Financial Accounting:**
- Chart of Accounts, Journal Entries
- AR: Customer invoices, receipts, credit memos
- AP: Vendor invoices, payments, debit memos
- Banking: Bank reconciliation, cash management

**Sales (Order-to-Cash):**
- Sales quotation → Sales order → Delivery → AR Invoice → Incoming payment
- Each document can be created from the previous (drag-and-relate)
- Blanket agreements (standing orders with customers)

**Purchasing (Procure-to-Pay):**
- Purchase quotation → Purchase order → Goods receipt PO → AP Invoice → Outgoing payment

**Inventory:**
- Item master (extensive fields)
- Multiple warehouses
- Price lists (multiple price levels — retail, wholesale, dealer, VIP)
- Special pricing by customer
- Batch and serial number management
- Inventory counting (cycle counts, full counts)
- Pick and pack (for outbound warehouse operations)

**Manufacturing:**
- Bill of Materials (BOM)
- Production Orders

**MRP (Material Requirements Planning):**
- Demand forecasting
- Purchase recommendations based on minimum stock levels
- Supply and demand analysis

**Reports:**
- Financial statements
- Aging reports
- Inventory status, movement, and slow-moving reports
- Sales analysis by customer, item, salesperson, period
- Purchase analysis

---

# SECTION 4 — ZOHO BOOKS / ZOHO ONE — COMPLETE TECHNICAL BREAKDOWN

---

## 4.1 Zoho Architecture Overview

Zoho is a cloud-native, multi-tenant SaaS platform. Unlike Tally (desktop-first) and SAP (enterprise server), Zoho runs entirely in the browser. It's built on a modern microservices architecture with REST APIs for everything.

Zoho's data model is:
- Multi-tenant: each customer's data is isolated in the same database infrastructure
- Organization-based: the top-level entity is an Organization
- Role-based access: multiple users per organization with configurable permissions
- Real-time sync: all data synced across users instantly (web and mobile apps)

Zoho Books has these key modules:
- Dashboard
- Contacts (Customers + Vendors)
- Items (Products/Services)
- Sales (Estimates, Sales Orders, Invoices, Credit Notes, Customer Payments, Recurring Invoices)
- Purchases (Purchase Orders, Bills, Vendor Credits, Vendor Payments, Recurring Bills)
- Banking (Bank Accounts, Bank Rules, Reconciliation)
- Accounting (Chart of Accounts, Manual Journals, Opening Balances)
- Documents (File attachment management)
- Reports

---

## 4.2 Zoho's Contacts Module — Customer & Vendor Management

### Contact Fields (Customer)

Zoho stores customers and vendors as "Contacts" with a type flag.

- Contact Type: Customer / Vendor / Both
- Display Name (as shown on invoices)
- Company Name
- Contact Persons (multiple — each with name, email, phone, designation)
- Currency (for multi-currency transactions)
- Payment Terms (Net 15, Net 30, Net 45, Due on Receipt, etc.)
- Credit Limit (maximum outstanding allowed)
- Tax Treatment: Registered / Unregistered / Consumer / Overseas / SEZ (for India GST)
- GST Identification Number (GSTIN)
- Place of Supply (state code)
- PAN Number
- TDS applicable: Yes/No
- TDS Section (if applicable)
- Opening Balance
- Billing Address (multiple addresses supported)
- Shipping Address (multiple, with shipping attention)
- Contact Notes
- Custom Fields (unlimited custom fields you can define)
- Portal Access: Can invite customer to Zoho Customer Portal (to view invoices, make payments online)

---

## 4.3 Zoho's Item Master (Products and Services)

### Item Fields

- Item Type: Goods / Service
- Item Name
- Unit (Nos, Kg, Litre, Box, etc.)
- Description (shown on invoices)
- SKU (stock keeping unit — your internal code)
- HSN Code (for goods)
- SAC Code (for services)
- Selling Price (default rate on invoices)
- Cost Price (purchase price)
- Tax Preference: Taxable / Tax Exempt / Out of Scope
- Tax (which GST rate applies — pre-configured tax rates)
- Purchase Tax (ITC claim — usually same as selling tax)
- Account (which GL account does this item's sale credit — usually Sales Account)
- Purchase Account (which GL account does purchase debit — usually Purchases Account)
- Enable Inventory Tracking: Yes/No (Zoho Books has basic inventory; Zoho Inventory is the dedicated module)
- Reorder Point (minimum stock before alert)
- Preferred Vendor

---

## 4.4 Zoho's Sales Workflow — Every Step

### 4.4.1 Estimate (Quotation)

Before a sale, you can send a formal estimate to the customer. No accounting entry — just a document.

Fields:
- Customer name
- Estimate number (auto)
- Estimate date, Expiry date
- Items: Product, Qty, Rate, Discount (fixed amount or percentage), Tax
- Shipping charge (can be taxable or non-taxable)
- Customer notes (appear on the document)
- Terms & Conditions (appear on document footer)
- Attachments

Status flow: Draft → Sent → Accepted → Declined → Invoiced

When customer accepts, convert to Invoice in one click (all data carried over).

### 4.4.2 Sales Order

After estimate acceptance or directly for confirmed orders.

Additional fields vs Estimate:
- Shipment date
- Delivery method
- Shipment preference
- Salesperson (for commission tracking)

Status flow: Draft → Confirmed → Packed → Shipped → Invoiced → Closed

### 4.4.3 Invoice (Tax Invoice)

The core sales document. Triggers the accounting entry.

**Invoice Creation Screen in Zoho:**

```
Customer: [Dropdown — searches contacts]
Invoice#: INV-2025-001 (auto-generated)
Invoice Date: 15-Apr-2025
Payment Terms: Net 30 (Due Date auto-calculated: 15-May-2025)
Place of Supply: Telangana (auto-filled from customer)

Items:
[Item Search] [Qty] [Rate] [Discount] [Tax] [Amount]
Brake Pad Set  2     500    0%          18%   1,000+180
Oil Filter     1     200    10%         18%   180+32.4

Sub Total:     ₹1,180.00
Discount:      ₹(20.00)
Taxable Amount:₹1,160.00
CGST (9%):     ₹104.40
SGST (9%):     ₹104.40
Total:         ₹1,368.80

Adjustment: [+/- any manual adjustment like rounding]
Balance Due: ₹1,368.80
```

**Zoho internally posts this journal entry:**
```
DEBIT:  Accounts Receivable  ₹1,368.80
CREDIT: Sales Account        ₹1,160.00
CREDIT: CGST Payable         ₹104.40
CREDIT: SGST Payable         ₹104.40
```

**Additional invoice features in Zoho:**
- Recurring invoices (auto-generate monthly/quarterly)
- Invoice sharing via email with online payment link
- Invoice viewed/opened tracking (read receipts)
- Multiple currencies per invoice (forex invoices)
- Retainer invoices (for advance payments)
- Time-based billing (track hours, bill at hourly rate)
- Project billing (connect invoice to project)

### 4.4.4 Customer Payment (Receipt)

When customer pays:
- Link to which invoice(s) being paid
- Payment date
- Mode: Cash, Check, Bank Transfer, Credit Card, Online Payment
- Bank Account or Cash Account to deposit to
- Reference number (cheque number, transfer ref)
- Excess payment handling (if customer pays more than due — stored as credit)

**Journal Entry:**
```
DEBIT:  Cash / Bank Account  ₹1,368.80
CREDIT: Accounts Receivable  ₹1,368.80
```

### 4.4.5 Credit Note

For sales returns or discounts post-invoice.

- Link to original invoice (mandatory in Zoho for GST compliance)
- Items being returned or amount being credited
- Reason
- Can be applied to existing outstanding invoices or refunded

### 4.4.6 Online Payment Collection (Zoho's Advantage over Tally)

Zoho integrates with:
- Razorpay, PayU, CCAvenue, Instamojo (India)
- Stripe, Square, PayPal (International)

When you send an invoice by email, the customer sees a "Pay Now" button. They can pay directly online. Payment is automatically reconciled against the invoice. The bank account receives the funds. Zoho marks the invoice as paid. Zero manual data entry for payment recording.

---

## 4.5 Zoho's Purchase Workflow — Every Step

### 4.5.1 Purchase Order

Sent to vendors for ordering stock.

Fields:
- Vendor
- PO Number (auto or manual)
- PO Date
- Expected Delivery Date
- Currency
- Items: Item, Qty, Rate, Tax
- Shipping charges
- Terms & Conditions

No accounting entry. Status: Draft → Issued → Billed → Closed

### 4.5.2 Bill (Vendor Invoice / Purchase Invoice)

When you receive goods and vendor's invoice:

Fields:
- Vendor
- Bill# (this should match the vendor's invoice number)
- Bill Date (the date on the vendor's invoice — important for ITC)
- Due Date
- Reference (PO number)
- Items received with quantities, rates, taxes

**Journal Entry:**
```
DEBIT:  Purchases / Inventory Account  ₹1,000.00
DEBIT:  CGST Input Tax Credit          ₹90.00
DEBIT:  SGST Input Tax Credit          ₹90.00
CREDIT: Accounts Payable (Vendor)      ₹1,180.00
```

### 4.5.3 Vendor Payment

Recording payment to vendor:
- Which bill(s) being paid
- Payment date and mode
- Bank account used
- Reference number

**Journal Entry:**
```
DEBIT:  Accounts Payable (Vendor)  ₹1,180.00
CREDIT: Bank Account               ₹1,180.00
```

---

## 4.6 Zoho's Banking Module — Bank Reconciliation

Bank reconciliation is matching your book records against the actual bank statement. Zoho has the most user-friendly bank reconciliation of the three systems.

### How Zoho Bank Reconciliation Works

1. **Connect Bank Account (Auto-import):**
   Zoho can connect directly to most Indian banks via account aggregator / net banking feed. Transactions appear automatically in Zoho from the bank.

2. **Manual CSV Import:**
   Download statement from bank as CSV → Upload to Zoho → Map columns → Import

3. **Matching Screen:**
   Zoho shows two columns side by side:
   - Left: Transactions in Zoho books for this account
   - Right: Transactions from bank statement not yet matched

4. **Auto-matching:**
   Zoho tries to automatically match based on date and amount. High-confidence matches are auto-accepted. Uncertain matches are flagged for review.

5. **Manual Matching:**
   - Select a Zoho transaction → Select the matching bank statement line → Confirm match
   - If a bank charge appears that isn't in Zoho books, create the entry directly from the bank feed
   - If a bank interest is credited, create the income entry from the bank feed

6. **Bank Rules (Auto-categorization):**
   You can define rules: "If bank narration contains 'HDFC CHARGES', automatically create a Journal Entry debiting Bank Charges expense and crediting Bank Account."

7. **Reconciliation Result:**
   After matching all transactions: Bank Statement Closing Balance = Zoho Book Balance. Done.

---

## 4.7 Zoho's Chart of Accounts — Structure and Pre-built Accounts

Zoho ships with a pre-built GST-ready CoA for India. Key accounts:

**Asset Accounts:**
- Cash (1000)
- Bank (auto-created for each bank you add)
- Accounts Receivable (1100)
- Inventory Asset (1200)
- Input CGST (1300) — for ITC
- Input SGST (1301) — for ITC
- Input IGST (1302) — for ITC
- Prepaid Expenses (1400)
- Fixed Assets (various)

**Liability Accounts:**
- Accounts Payable (2000)
- Output CGST (2100) — tax collected on sales
- Output SGST (2101)
- Output IGST (2102)
- TDS Payable (2200)
- Customer Advance (2300)

**Equity Accounts:**
- Owner's Equity / Capital (3000)
- Retained Earnings (3100)

**Revenue Accounts:**
- Sales (4000)
- Discount Given (4100) — contra revenue

**Expense Accounts:**
- Cost of Goods Sold (5000)
- Purchases (5100)
- Employee Expenses (5200)
- Rent Expense (5300)
- Office Supplies (5400)
- Bank Charges (5500)

---

## 4.8 Zoho's GST Compliance Features

Zoho Books is probably the most GST-friendly of the three for Indian SMBs.

### GST Number Management
- Store GSTIN for your organization and all customers/vendors
- Validate GSTIN format (15 characters, specific pattern)
- Auto-determine IGST vs CGST+SGST based on seller state vs buyer state

### Tax Rates
Zoho maintains a library of GST rates. You select the applicable rate for each item. Zoho pre-configures:
- GST 5%, 12%, 18%, 28%
- Cess rates for specific items
- Composite rates (for composition dealers)
- Zero-rated (for exports and SEZ)
- Exempt

### Auto-populated Tax Amount
When you type item + quantity + rate, Zoho calculates:
- Taxable value (after discount)
- CGST = Taxable × CGST rate (if intra-state)
- SGST = Taxable × SGST rate (if intra-state)
- IGST = Taxable × IGST rate (if inter-state)

### HSN/SAC Code Management
Each item has an HSN (goods) or SAC (services) code. Zoho uses these to:
- Print on invoices (mandatory for GST)
- Group transactions in GSTR-1 HSN summary

### GSTR-1 Generation
Zoho generates GSTR-1 data from your invoices:
- B2B: All invoices to GST-registered customers, with their GSTIN and invoice details
- B2C Large: Invoices >₹2.5 lakh to unregistered customers
- B2C Small: Summary by state and tax rate
- CDNR: Credit/debit notes to registered customers
- CDNUR: Credit/debit notes to unregistered customers
- HSN Summary: Tax-wise, HSN-wise summary
- Export: Export invoices (zero-rated)
- NIL: Nil-rated and exempt supply summary

You can export this data as a JSON file and upload to the GSTN portal, or Zoho files it directly via their GSP (GST Suvidha Provider) integration.

### GSTR-3B
Monthly summary return data — auto-calculated from your transactions.

### E-way Bill
For goods worth >₹50,000 transported more than 50 km, an E-way Bill is mandatory. Zoho integrates with the E-way Bill portal to generate E-way Bills directly from invoices.

### E-Invoice (IRN)
For businesses with turnover >₹5 crore, e-invoicing is mandatory. Zoho integrates with the IRP (Invoice Registration Portal) to:
- Submit invoice data to IRP
- Get back the IRN (Invoice Reference Number) and QR code
- Embed the QR code in the printed invoice automatically

---

## 4.9 Zoho's Reports — Complete List and Explanation

### Business Overview Reports
- **Profit and Loss:** Standard income statement. Supports comparative (this year vs last year), department-wise, project-wise
- **Balance Sheet:** Financial position at any date. With drill-down to individual transactions
- **Cash Flow Statement:** Direct or indirect method
- **Business Snapshot:** Dashboard showing key metrics at a glance

### Accounts Receivable Reports
- **Invoice Details:** All invoices with status, amount, tax
- **Customer Balances:** Current outstanding per customer
- **Receivable Summary:** Aging bucket summary
- **Receivable Details:** Every unpaid invoice with aging
- **Invoice Aging Summary / Detail:** Overdue invoices grouped by age (1-30 days, 31-60 days, etc.)
- **Sales by Customer:** Revenue per customer for a period
- **Sales by Item:** Revenue per product for a period
- **Sales by Salesperson**

### Accounts Payable Reports
- **Bill Details:** All bills with status
- **Vendor Balances:** Current outstanding per vendor
- **Payable Summary / Detail:** Same as receivable but for what you owe
- **Purchase by Vendor**
- **Purchase by Item**

### Inventory Reports (if inventory tracking enabled)
- **Inventory Summary:** Current stock levels
- **Inventory Valuation Summary:** Value of stock at cost
- **FIFO Cost Lot Tracking:** See which FIFO batch each item came from
- **Committed Stock:** Stock allocated to sales orders not yet delivered
- **Product Sales Report:** Which items sold how much
- **Active Purchase Orders Report**

### GST Reports (India-specific)
- **GSTR-1:** Full outward supply data
- **GSTR-2:** Inward supply reconciliation
- **GSTR-3B:** Summary return
- **GST Filing Summary**
- **GSTR-4:** Composition dealer return
- **ITC Taken and Reversed**
- **HSN / SAC Summary**
- **Tax Collected on Sales**
- **Tax Paid on Purchases**

### Banking Reports
- **Bank Summary:** All bank accounts with balances
- **Reconciliation Status:** Which accounts are reconciled

---

## 4.10 Zoho's Unique Features (Not in Tally)

### Customer Portal
Customers can log in to a dedicated portal to:
- View their outstanding invoices
- Download invoice PDFs
- Make online payments (pay now button)
- View their payment history
- Accept or decline estimates

### Vendor Portal
Vendors can:
- View POs you've sent them
- Accept POs
- Submit invoices against POs
- View payment history

### Recurring Transactions
Set any invoice or bill to auto-generate on a schedule:
- Profile: Customer, items, amount
- Recurrence: Daily, weekly, monthly, quarterly, annually
- Start date, End date or number of recurrences
- Auto-send: email the invoice automatically when created
- Auto-charge: charge the customer's card automatically

### Workflow Automation (Zoho Flow / Zoho Books Workflows)
Define rules that trigger actions:
- Trigger: Invoice due date is tomorrow
- Action: Send email reminder to customer with payment link

- Trigger: Bill overdue > 30 days
- Action: Create task for finance team in Zoho CRM

### Retainer Invoices (Advance Payment)
When you collect advance from customer before doing the work/delivering goods:
- Create Retainer Invoice (not a regular invoice)
- Customer pays against retainer
- When actual work done, create regular invoice
- Apply retainer amount against invoice

### Time & Expense Tracking
For service businesses:
- Track time spent on projects
- Assign hourly rates
- Bill time directly as invoice line items

### Multi-Currency
Every transaction can be in a different currency:
- Define exchange rates (manually or auto-fetch from ECB/RBI)
- Realized and unrealized forex gain/loss calculations
- Reports in both transaction currency and base currency

---

# SECTION 5 — HOW TO BUILD YOUR OWN ERP: SYNTHESIZED ARCHITECTURE

---

## 5.1 The Minimum Core of Any ERP

Having studied Tally, SAP, and Zoho, here is the irreducible minimum of what you must build to have a functioning ERP:

### Layer 1: Master Data Engine
- Chart of Accounts (CoA) with full account hierarchy
- Party Master (customers and vendors — same table with type flag)
- Item/Product Master with inventory settings
- Tax Master (GST rates, HSN codes)
- Warehouse/Location Master
- Unit of Measure Master
- Bank Account Master
- Voucher Type / Transaction Type Master

### Layer 2: Accounting Engine
- Journal Entry (Ledger Entry) system — the atomic unit
- All entries validated for debit = credit before committing
- Double-entry enforced at the database level (transaction wrapping)
- Financial year management (year-end close, opening balance carry-forward)
- Multi-currency with FX gain/loss

### Layer 3: Sub-Ledger Engines
- Accounts Receivable: Invoice → Receipt → Credit Note; outstanding tracking
- Accounts Payable: Bill → Payment → Debit Note; outstanding tracking
- Both sub-ledgers post to corresponding Control/Reconciliation accounts in the GL

### Layer 4: Inventory Engine
- Stock items with quantities per location
- Every inventory movement has a corresponding accounting entry
- Costing: weighted average minimum; FIFO ideally
- Batch/lot tracking optional initially

### Layer 5: Document Engine
- Sales documents: Estimate → Order → Invoice → Receipt
- Purchase documents: PO → GRN → Bill → Payment
- Each document linked to the next (reference chain)
- Documents post journal entries when finalized/posted

### Layer 6: Tax Engine
- GST calculation on every document
- Intra-state: CGST + SGST; Inter-state: IGST
- Input Tax Credit tracking
- GSTR-1, GSTR-3B report generation

### Layer 7: Report Engine
- Trial Balance (aggregation of all GL accounts)
- P&L (aggregation by account type: Income - Expense)
- Balance Sheet (aggregation by account type: Asset, Liability, Equity)
- Aging reports (AR, AP)
- Inventory reports

---

## 5.2 The Accounting Engine — Database Design

### Core Tables

```sql
-- The Chart of Accounts
accounts (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),  -- tenant isolation
  account_code    VARCHAR(20) UNIQUE,          -- e.g., "1000", "2100"
  account_name    VARCHAR(255) NOT NULL,
  account_type    ENUM('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'),
  account_subtype VARCHAR(100),                -- e.g., "current_asset", "fixed_asset"
  parent_id       UUID REFERENCES accounts(id), -- for hierarchy
  is_system       BOOLEAN DEFAULT false,       -- system accounts can't be deleted
  is_active       BOOLEAN DEFAULT true,
  normal_balance  ENUM('DEBIT','CREDIT'),      -- natural balance side
  description     TEXT,
  created_at      TIMESTAMP
)

-- Every transaction header
journal_entries (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  entry_date      DATE NOT NULL,              -- the transaction date
  posting_date    DATE NOT NULL,              -- when it was recorded
  entry_type      ENUM('SALE','PURCHASE','RECEIPT','PAYMENT','JOURNAL',
                       'CONTRA','CREDIT_NOTE','DEBIT_NOTE','STOCK_ADJ',
                       'DEPRECIATION','SALARY','OPENING_BALANCE'),
  reference_number VARCHAR(50),               -- invoice no., cheque no., etc.
  narration       TEXT,
  status          ENUM('DRAFT','POSTED','REVERSED'),
  is_system_generated BOOLEAN DEFAULT false,  -- auto-created vs manual
  source_document_type VARCHAR(50),           -- 'INVOICE','BILL','PAYMENT', etc.
  source_document_id UUID,                    -- the triggering document
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP,
  posted_at       TIMESTAMP,
  fiscal_year     VARCHAR(7),                 -- e.g., "2025-26"
  fiscal_period   INT                         -- 1-12 (April=1, March=12)
)

-- Each debit/credit line in a journal entry
journal_entry_lines (
  id              UUID PRIMARY KEY,
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id      UUID REFERENCES accounts(id),
  description     TEXT,
  debit_amount    DECIMAL(14,2) DEFAULT 0,
  credit_amount   DECIMAL(14,2) DEFAULT 0,
  party_id        UUID REFERENCES parties(id) NULLABLE, -- for AR/AP lines
  document_ref    VARCHAR(100),                -- the invoice or bill number
  cost_center_id  UUID NULLABLE,
  line_order      INT,                        -- position in the entry
  CONSTRAINT check_debit_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
)

-- Constraint: Every journal entry must balance
-- Enforced by: application layer + PostgreSQL trigger
CREATE OR REPLACE FUNCTION enforce_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit DECIMAL;
  total_credit DECIMAL;
BEGIN
  SELECT SUM(debit_amount), SUM(credit_amount)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF ABS(total_debit - total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry not balanced. Debit: %, Credit: %',
      total_debit, total_credit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Account balances (denormalized for performance)
account_balances (
  id              UUID PRIMARY KEY,
  account_id      UUID REFERENCES accounts(id),
  fiscal_year     VARCHAR(7),
  period          INT,   -- 0=opening, 1-12=monthly periods
  debit_total     DECIMAL(14,2) DEFAULT 0,
  credit_total    DECIMAL(14,2) DEFAULT 0,
  closing_balance DECIMAL(14,2) DEFAULT 0,  -- positive=debit normal balance
  updated_at      TIMESTAMP
)
-- Updated by trigger whenever a journal_entry_line is inserted
```

---

## 5.3 The Invoice/Bill System — Database Design

```sql
-- Parties (customers and vendors in one table)
parties (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  party_type      ENUM('CUSTOMER','VENDOR','BOTH'),
  display_name    VARCHAR(255) NOT NULL,
  company_name    VARCHAR(255),
  gstin           VARCHAR(15),
  pan             VARCHAR(10),
  gst_type        ENUM('REGULAR','COMPOSITION','UNREGISTERED','CONSUMER',
                       'OVERSEAS','SEZ'),
  place_of_supply VARCHAR(2),  -- state code
  credit_period   INT DEFAULT 0, -- days
  credit_limit    DECIMAL(12,2),
  opening_balance DECIMAL(12,2) DEFAULT 0,
  opening_balance_type ENUM('RECEIVABLE','PAYABLE'),
  billing_address JSONB,
  shipping_addresses JSONB,  -- array of addresses
  contact_persons JSONB,     -- array of {name, email, phone, designation}
  bank_details    JSONB,     -- for payment
  ar_account_id   UUID REFERENCES accounts(id), -- which GL account for AR
  ap_account_id   UUID REFERENCES accounts(id), -- which GL account for AP
  tds_applicable  BOOLEAN DEFAULT false,
  tds_section     VARCHAR(20),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP
)

-- Tax rates configuration
tax_rates (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  tax_name        VARCHAR(100),         -- e.g., "GST 18%"
  tax_type        ENUM('GST','CESS','TDS','TCS','CUSTOM'),
  total_rate      DECIMAL(5,2),         -- 18.00
  components      JSONB,                -- [{name:"CGST",rate:9},{name:"SGST",rate:9}]
  hsn_code        VARCHAR(8),           -- associated HSN (optional)
  is_active       BOOLEAN DEFAULT true
)

-- Invoice header
invoices (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  invoice_type    ENUM('SALES_INVOICE','PURCHASE_BILL','CREDIT_NOTE',
                       'DEBIT_NOTE','PROFORMA','ESTIMATE','SALES_ORDER',
                       'PURCHASE_ORDER','GRN','DELIVERY_NOTE'),
  invoice_number  VARCHAR(50) NOT NULL,
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  party_id        UUID REFERENCES parties(id),
  party_gstin     VARCHAR(15),          -- snapshot at time of invoice
  party_address   JSONB,                -- snapshot at time of invoice
  our_gstin       VARCHAR(15),          -- our GSTIN
  place_of_supply VARCHAR(2),           -- determines IGST vs CGST+SGST
  supply_type     ENUM('INTRA_STATE','INTER_STATE','EXPORT','SEZ'),
  currency        VARCHAR(3) DEFAULT 'INR',
  exchange_rate   DECIMAL(10,4) DEFAULT 1.0000,

  -- Amounts
  subtotal        DECIMAL(12,2),        -- sum of line amounts before discount
  total_discount  DECIMAL(12,2) DEFAULT 0,
  taxable_value   DECIMAL(12,2),        -- subtotal - discount
  cgst_amount     DECIMAL(12,2) DEFAULT 0,
  sgst_amount     DECIMAL(12,2) DEFAULT 0,
  igst_amount     DECIMAL(12,2) DEFAULT 0,
  cess_amount     DECIMAL(12,2) DEFAULT 0,
  tds_amount      DECIMAL(12,2) DEFAULT 0,
  round_off       DECIMAL(5,2) DEFAULT 0,
  grand_total     DECIMAL(12,2),

  -- Status
  status          ENUM('DRAFT','SENT','PARTIAL','PAID','OVERDUE',
                       'VOID','WRITTEN_OFF'),
  payment_status  ENUM('UNPAID','PARTIAL','PAID'),
  amount_paid     DECIMAL(12,2) DEFAULT 0,
  balance_due     DECIMAL(12,2),

  -- Links
  reference_number VARCHAR(100),        -- PO number, original invoice (for CN/DN)
  linked_invoice_id UUID,               -- for credit notes / debit notes

  -- GST/Compliance
  irn             VARCHAR(64),          -- e-invoice reference number
  ack_number      VARCHAR(50),          -- e-invoice acknowledgement
  qr_code         TEXT,                 -- e-invoice QR data
  eway_bill_number VARCHAR(20),

  -- Documents
  pdf_url         TEXT,                 -- generated PDF URL in S3/R2
  journal_entry_id UUID REFERENCES journal_entries(id), -- linked accounting entry

  -- Metadata
  notes           TEXT,
  terms           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP,
  posted_at       TIMESTAMP
)

-- Invoice line items
invoice_lines (
  id              UUID PRIMARY KEY,
  invoice_id      UUID REFERENCES invoices(id),
  line_order      INT,
  item_id         UUID REFERENCES items(id) NULLABLE,
  item_name       VARCHAR(500),          -- snapshot
  description     TEXT,
  hsn_code        VARCHAR(8),
  sac_code        VARCHAR(6),
  quantity        DECIMAL(10,3),
  unit            VARCHAR(20),
  rate            DECIMAL(12,2),         -- per unit price
  discount_type   ENUM('PERCENT','AMOUNT'),
  discount_value  DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0, -- calculated
  taxable_value   DECIMAL(12,2),
  tax_rate_id     UUID REFERENCES tax_rates(id),
  tax_rate        DECIMAL(5,2),
  cgst_rate       DECIMAL(5,2),
  cgst_amount     DECIMAL(12,2),
  sgst_rate       DECIMAL(5,2),
  sgst_amount     DECIMAL(12,2),
  igst_rate       DECIMAL(5,2),
  igst_amount     DECIMAL(12,2),
  cess_rate       DECIMAL(5,2),
  cess_amount     DECIMAL(12,2),
  line_total      DECIMAL(12,2),         -- taxable_value + all tax amounts
  account_id      UUID REFERENCES accounts(id), -- which revenue/expense account
  inventory_item_id UUID,                -- link to shop_inventory for stock update
  batch_id        UUID,                  -- which inventory batch (for FIFO)
  CONSTRAINT check_quantity CHECK (quantity > 0)
)

-- Payment records (matching payments to invoices)
invoice_payments (
  id              UUID PRIMARY KEY,
  invoice_id      UUID REFERENCES invoices(id),
  payment_id      UUID REFERENCES payments(id),
  amount_applied  DECIMAL(12,2),
  created_at      TIMESTAMP
)

-- All payment transactions
payments (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  payment_type    ENUM('INCOMING','OUTGOING'),  -- receipt vs payment
  payment_date    DATE,
  party_id        UUID REFERENCES parties(id),
  amount          DECIMAL(12,2),
  payment_mode    ENUM('CASH','CHEQUE','NEFT','RTGS','UPI','CARD','OTHER'),
  bank_account_id UUID REFERENCES accounts(id), -- which cash/bank account
  reference       VARCHAR(100),                 -- cheque number, UTR, UPI ref
  narration       TEXT,
  tds_deducted    DECIMAL(12,2) DEFAULT 0,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP
)
```

---

## 5.4 The Inventory Engine — Database Design

```sql
-- Inventory items (linked to catalog_skus from marketplace)
items (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  sku_id          UUID REFERENCES catalog_skus(id) NULLABLE, -- marketplace link
  item_code       VARCHAR(100),              -- internal code / barcode
  item_name       VARCHAR(500) NOT NULL,
  item_type       ENUM('GOODS','SERVICE','NON_INVENTORY'),
  category        VARCHAR(255),
  brand           VARCHAR(255),
  hsn_code        VARCHAR(8),
  gst_rate        DECIMAL(5,2),
  unit            VARCHAR(20),
  alternate_unit  VARCHAR(20),
  conversion_factor DECIMAL(10,4),          -- how many base units per alternate unit
  purchase_price  DECIMAL(12,2),            -- default purchase price
  selling_price   DECIMAL(12,2),            -- default selling price
  mrp             DECIMAL(12,2),
  sales_account_id UUID REFERENCES accounts(id),
  purchase_account_id UUID REFERENCES accounts(id),
  inventory_account_id UUID REFERENCES accounts(id), -- the asset account for this item
  track_inventory BOOLEAN DEFAULT true,
  costing_method  ENUM('WEIGHTED_AVG','FIFO','STANDARD') DEFAULT 'WEIGHTED_AVG',
  standard_cost   DECIMAL(12,2),            -- for standard costing method
  reorder_level   DECIMAL(10,2),
  reorder_qty     DECIMAL(10,2),
  preferred_vendor_id UUID REFERENCES parties(id),
  track_batches   BOOLEAN DEFAULT false,
  track_expiry    BOOLEAN DEFAULT false,
  images          JSONB,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP
)

-- Stock per item per warehouse
stock_levels (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  item_id         UUID REFERENCES items(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  quantity_on_hand DECIMAL(10,3) DEFAULT 0,
  quantity_reserved DECIMAL(10,3) DEFAULT 0, -- allocated to orders not yet shipped
  quantity_available DECIMAL(10,3) GENERATED ALWAYS AS
                    (quantity_on_hand - quantity_reserved) STORED,
  avg_cost        DECIMAL(12,2) DEFAULT 0,
  total_value     DECIMAL(14,2) GENERATED ALWAYS AS
                    (quantity_on_hand * avg_cost) STORED,
  last_updated    TIMESTAMP,
  UNIQUE(item_id, warehouse_id)
)

-- Batch / Lot records (when batch tracking enabled)
stock_batches (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  item_id         UUID REFERENCES items(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  batch_number    VARCHAR(100),
  lot_number      VARCHAR(100),
  manufacture_date DATE,
  expiry_date     DATE,
  quantity_received DECIMAL(10,3),
  quantity_on_hand  DECIMAL(10,3),
  cost_per_unit   DECIMAL(12,2),
  purchase_invoice_id UUID REFERENCES invoices(id),
  created_at      TIMESTAMP
)

-- Every stock movement — the stock ledger
stock_movements (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  item_id         UUID REFERENCES items(id),
  warehouse_id    UUID REFERENCES warehouses(id),
  batch_id        UUID REFERENCES stock_batches(id) NULLABLE,
  movement_type   ENUM('PURCHASE','SALE','RETURN_IN','RETURN_OUT',
                       'ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN',
                       'TRANSFER_OUT','OPENING_STOCK','WRITE_OFF'),
  quantity        DECIMAL(10,3),             -- positive = in, negative = out
  quantity_before DECIMAL(10,3),
  quantity_after  DECIMAL(10,3),
  unit_cost       DECIMAL(12,2),             -- cost per unit at time of movement
  total_cost      DECIMAL(14,2),
  reference_type  VARCHAR(50),               -- 'INVOICE','BILL','ADJUSTMENT', etc.
  reference_id    UUID,
  narration       TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP
)

-- Warehouses
warehouses (
  id              UUID PRIMARY KEY,
  shop_id         UUID REFERENCES shops(id),
  name            VARCHAR(255),
  parent_id       UUID REFERENCES warehouses(id), -- for sub-warehouses
  address         TEXT,
  is_primary      BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true
)
```

---

## 5.5 The Report Engine — How to Build Financial Reports

### How to Compute the Trial Balance

```sql
-- Get all account balances for a period
SELECT
  a.account_code,
  a.account_name,
  a.account_type,
  SUM(jel.debit_amount) AS total_debits,
  SUM(jel.credit_amount) AS total_credits,
  SUM(jel.debit_amount) - SUM(jel.credit_amount) AS net_balance,
  CASE
    WHEN a.normal_balance = 'DEBIT'
      THEN SUM(jel.debit_amount) - SUM(jel.credit_amount)
    ELSE SUM(jel.credit_amount) - SUM(jel.debit_amount)
  END AS display_balance
FROM accounts a
JOIN journal_entry_lines jel ON jel.account_id = a.id
JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE a.shop_id = :shop_id
  AND je.shop_id = :shop_id
  AND je.status = 'POSTED'
  AND je.entry_date BETWEEN :from_date AND :to_date
GROUP BY a.account_code, a.account_name, a.account_type, a.normal_balance
ORDER BY a.account_code;
```

### How to Compute Profit & Loss

```sql
-- P&L: Show Income vs Expenses for a period
SELECT
  a.account_type,
  a.account_name,
  SUM(CASE
    WHEN a.account_type = 'INCOME'
      THEN jel.credit_amount - jel.debit_amount  -- net credit = income
    WHEN a.account_type = 'EXPENSE'
      THEN jel.debit_amount - jel.credit_amount  -- net debit = expense
  END) AS amount
FROM accounts a
JOIN journal_entry_lines jel ON jel.account_id = a.id
JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE a.shop_id = :shop_id
  AND a.account_type IN ('INCOME','EXPENSE')
  AND je.status = 'POSTED'
  AND je.entry_date BETWEEN :from_date AND :to_date
GROUP BY a.account_type, a.account_name
ORDER BY a.account_type, a.account_name;

-- Net Profit = Total Income - Total Expenses
```

### How to Compute Balance Sheet

```sql
-- Balance Sheet: Assets, Liabilities, Equity at a point in time
-- Includes ALL transactions from the beginning of time to the as-of date
-- Because Balance Sheet accounts carry forward (they don't reset at year-end)

SELECT
  a.account_type,
  a.account_name,
  SUM(jel.debit_amount) - SUM(jel.credit_amount) AS debit_net,
  SUM(jel.credit_amount) - SUM(jel.debit_amount) AS credit_net,
  CASE a.account_type
    WHEN 'ASSET'     THEN SUM(jel.debit_amount) - SUM(jel.credit_amount)
    WHEN 'LIABILITY' THEN SUM(jel.credit_amount) - SUM(jel.debit_amount)
    WHEN 'EQUITY'    THEN SUM(jel.credit_amount) - SUM(jel.debit_amount)
  END AS balance
FROM accounts a
JOIN journal_entry_lines jel ON jel.account_id = a.id
JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE a.shop_id = :shop_id
  AND a.account_type IN ('ASSET','LIABILITY','EQUITY')
  AND je.status = 'POSTED'
  AND je.entry_date <= :as_of_date   -- all time up to the date
GROUP BY a.account_type, a.account_name
ORDER BY a.account_type, a.account_name;
```

### How to Compute Accounts Receivable Aging

```sql
-- AR Aging: How much each customer owes, bucketed by age
SELECT
  p.display_name AS customer,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  CURRENT_DATE - i.due_date AS days_overdue,
  i.balance_due,
  CASE
    WHEN i.due_date >= CURRENT_DATE THEN 'Current'
    WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30 days'
    WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60 days'
    WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90 days'
    ELSE 'Over 90 days'
  END AS aging_bucket
FROM invoices i
JOIN parties p ON i.party_id = p.id
WHERE i.shop_id = :shop_id
  AND i.invoice_type = 'SALES_INVOICE'
  AND i.payment_status IN ('UNPAID','PARTIAL')
  AND i.balance_due > 0
ORDER BY p.display_name, i.due_date;
```

---

# SECTION 6 — AUTOMOBILE SPACE ERP: FEATURE-BY-FEATURE IMPLEMENTATION GUIDE

---

## 6.1 POS (Point of Sale) Billing — How to Build It

The POS is the most-used feature in a spare parts shop. A cashier does 20-100 transactions a day. Every second saved matters.

### POS Screen Design (Based on Tally's Fast Entry + Zoho's Clean UI)

```
+-------------------------------------------------------------+
|  AMS POS — Shop Name                  [User: Cashier1]     |
+-------------------------------------------------------------+
| [Search items by name, barcode, part number...]  [Scan ⌨]  |
+-------------------------------------------------------------+
| Items Added:                                                 |
| #  Item          Qty  Rate    Disc   GST   Total            |
| 1. Brake Pad Set   2  ₹450    0%     18%   ₹1,062          |
| 2. Oil Filter      1  ₹200    10%    18%   ₹212.40         |
| [+Add Item]                                                  |
+-------------------------------------------------------------+
|                      Sub Total:    ₹1,274.40                |
|                      CGST (9%):    ₹  114.70               |
|                      SGST (9%):    ₹  114.70               |
|                         TOTAL:     ₹1,503.80               |
+-------------------------------------------------------------+
| Customer: [Search or Cash Sale]                             |
| Payment:  [UPI] [Cash] [Card] [Credit]                      |
|                                                             |
| [Clear]  [Hold Invoice]  [PRINT & SAVE]                     |
+-------------------------------------------------------------+
```

### POS Keyboard Shortcuts (Like Tally)

Tally is keyboard-first. Your POS should be too for speed:
- `F2` — Change date
- `F8` — Sales invoice
- `F9` — Purchase bill
- `Alt+F1` — Select godown
- `Alt+C` — Create new item on-the-fly
- `Ctrl+A` — Accept and save
- `Ctrl+Q` — Quit/cancel
- `Tab` / `Enter` — Move to next field
- `Backspace` — Go to previous field
- Barcode scan — auto-fills item search

### POS Item Search Algorithm

The search box needs to be instant (< 100ms response). It should search simultaneously across:
1. Item name (partial match, typo-tolerant via Typesense)
2. Barcode / EAN (exact match)
3. Internal item code / SKU
4. OEM part number (exact and partial)
5. Aftermarket part number

Implementation:
- Typesense index with all items for this shop
- Local search cache in Redis (most frequently accessed items cached in-memory)
- Barcode scan: direct database lookup (exact match — fastest)

### POS GST Calculation Logic

```javascript
function calculateLineItem(item, quantity, discountPercent) {
  const baseAmount = quantity * item.rate;
  const discountAmount = baseAmount * (discountPercent / 100);
  const taxableValue = baseAmount - discountAmount;

  let cgst = 0, sgst = 0, igst = 0;

  if (isIntraState(shopState, customerState)) {
    cgst = taxableValue * (item.gstRate / 2 / 100);
    sgst = taxableValue * (item.gstRate / 2 / 100);
  } else {
    igst = taxableValue * (item.gstRate / 100);
  }

  const lineTotal = taxableValue + cgst + sgst + igst;

  return { baseAmount, discountAmount, taxableValue, cgst, sgst, igst, lineTotal };
}

function calculateInvoiceTotal(lines) {
  const subtotal = lines.reduce((s, l) => s + l.baseAmount, 0);
  const totalDiscount = lines.reduce((s, l) => s + l.discountAmount, 0);
  const taxableValue = lines.reduce((s, l) => s + l.taxableValue, 0);
  const totalCGST = lines.reduce((s, l) => s + l.cgst, 0);
  const totalSGST = lines.reduce((s, l) => s + l.sgst, 0);
  const totalIGST = lines.reduce((s, l) => s + l.igst, 0);
  const grandTotal = taxableValue + totalCGST + totalSGST + totalIGST;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = grandTotal + roundOff;

  return { subtotal, totalDiscount, taxableValue, totalCGST, totalSGST, totalIGST, grandTotal, roundOff, finalTotal };
}
```

### POS Save Flow (Backend — What Happens When Invoice is Saved)

```
Client clicks "PRINT & SAVE"
  ↓
Frontend validates: all required fields present, quantities > 0
  ↓
POST /api/v1/erp/invoices with full invoice data
  ↓
Backend wraps entire operation in a database transaction:
  
  STEP 1: Validate stock availability
    For each line item:
      SELECT quantity_available FROM stock_levels
      WHERE item_id = ? AND warehouse_id = ?
      If quantity_available < requested quantity: ROLLBACK + return error

  STEP 2: Generate invoice number
    SELECT NEXTVAL for this shop's current series
    Format: prefix + fiscal_year + sequence (e.g., INV/2425/001)

  STEP 3: Insert invoice record
    INSERT INTO invoices (all fields)

  STEP 4: Insert invoice line items
    For each line: INSERT INTO invoice_lines

  STEP 5: Update stock levels
    For each line:
      UPDATE stock_levels
      SET quantity_on_hand = quantity_on_hand - quantity
      WHERE item_id = ? AND warehouse_id = ?

  STEP 6: Insert stock movement records
    For each line: INSERT INTO stock_movements (type=SALE, ...)

  STEP 7: Create journal entry
    INSERT INTO journal_entries (entry_type=SALE, ...)
    INSERT INTO journal_entry_lines:
      DEBIT:  Cash/Receivable account — grand_total
      CREDIT: Sales account — taxable_value
      CREDIT: CGST Payable — cgst_amount
      CREDIT: SGST Payable — sgst_amount

  STEP 8: Update account balances (denormalized)
    UPDATE account_balances for each affected account

  STEP 9: Commit transaction

  STEP 10: Queue async jobs (outside transaction):
    - Generate PDF (Puppeteer) → upload to S3 → update invoice.pdf_url
    - Send SMS receipt to customer phone (if phone provided)
    - Send WhatsApp receipt (if enabled)
    - Sync to Typesense search index
    - Publish event to Kafka (invoice.created) for marketplace sync
```

---

## 6.2 Purchase Entry — How to Build It

### Purchase Entry Screen Design

```
+-------------------------------------------------------------+
|  Record Purchase Bill                                        |
+-------------------------------------------------------------+
| Vendor: [Search vendor name...]                             |
| Vendor Invoice No: [Their invoice number — mandatory]       |
| Vendor Invoice Date: [DD-MM-YYYY]                          |
| Our PO Reference: [PO number — optional]                   |
| Receive to Warehouse: [Main Store ▼]                       |
+-------------------------------------------------------------+
| Items:                                                       |
| Item     | Qty | Rate | Disc | HSN  | GST% | Tax | Total   |
| [Search] |     |      | 0%   |      | 18%  |     |         |
+-------------------------------------------------------------+
|                         Taxable Value: ₹         |
|                   CGST Input Credit (9%): ₹      |
|                   SGST Input Credit (9%): ₹      |
|                            Bill Total: ₹         |
+-------------------------------------------------------------+
| Payment: [Credit (add to payable)] [Cash] [Bank]           |
| [Save Draft] [Save & Post]                                  |
+-------------------------------------------------------------+
```

### Auto-fill from PO

If the shop created a PO earlier:
1. Cashier enters the PO reference number
2. System fetches all PO line items
3. Pre-fills items, quantities, rates from the PO
4. Cashier adjusts for any discrepancies (vendor sent different qty, different rate)
5. System compares received vs. PO quantities and highlights differences

### 3-Way Matching (like SAP)

For shops that want strict control:
- PO: Ordered 10 brake pads at ₹400 each
- GRN: Received 10 brake pads (physical count)
- Bill: Vendor charged for 10 at ₹420 each (price discrepancy!)
- System flags: "Bill price (₹420) differs from PO price (₹400) by ₹200 total. Approve or reject?"

---

## 6.3 Inventory Valuation — FIFO Implementation

### Weighted Average (Simpler, Used by Most Shops)

```javascript
// When recording a purchase:
async function updateWeightedAverage(itemId, warehouseId, newQty, newCostPerUnit) {
  const current = await db.stock_levels.findOne({ item_id: itemId, warehouse_id: warehouseId });
  const existingValue = current.quantity_on_hand * current.avg_cost;
  const newValue = newQty * newCostPerUnit;
  const totalQty = current.quantity_on_hand + newQty;
  const newAvgCost = totalQty > 0 ? (existingValue + newValue) / totalQty : newCostPerUnit;

  await db.stock_levels.update(
    { quantity_on_hand: totalQty, avg_cost: newAvgCost },
    { where: { item_id: itemId, warehouse_id: warehouseId } }
  );
}

// When recording a sale:
async function getCostForSale(itemId, warehouseId, quantity) {
  const level = await db.stock_levels.findOne({ item_id: itemId, warehouse_id: warehouseId });
  return level.avg_cost; // COGS per unit = current average cost
}
```

### FIFO Implementation

```javascript
// When recording a purchase: always create a new batch
async function createFIFOBatch(itemId, warehouseId, qty, costPerUnit, invoiceId) {
  await db.stock_batches.create({
    item_id: itemId,
    warehouse_id: warehouseId,
    quantity_received: qty,
    quantity_on_hand: qty,
    cost_per_unit: costPerUnit,
    purchase_invoice_id: invoiceId,
    created_at: new Date()
  });
}

// When recording a sale: consume oldest batches first
async function consumeFIFO(itemId, warehouseId, quantityNeeded) {
  // Get batches in FIFO order (oldest first)
  const batches = await db.stock_batches.findAll({
    where: { item_id: itemId, warehouse_id: warehouseId, quantity_on_hand: { [Op.gt]: 0 } },
    order: [['created_at', 'ASC']]  // oldest first = FIFO
  });

  let remaining = quantityNeeded;
  const batchConsumptions = [];
  let totalCOGS = 0;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const consume = Math.min(remaining, batch.quantity_on_hand);
    batchConsumptions.push({ batchId: batch.id, consumed: consume, costPerUnit: batch.cost_per_unit });
    totalCOGS += consume * batch.cost_per_unit;
    remaining -= consume;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock. Short by ${remaining} units.`);
  }

  // Update each batch
  for (const bc of batchConsumptions) {
    await db.stock_batches.update(
      { quantity_on_hand: db.sequelize.literal(`quantity_on_hand - ${bc.consumed}`) },
      { where: { id: bc.batchId } }
    );
  }

  return { batchConsumptions, totalCOGS, cogsPerUnit: totalCOGS / quantityNeeded };
}
```

---

## 6.4 GST Reports — How to Generate GSTR-1

### GSTR-1 Data Structure and Generation

```javascript
async function generateGSTR1(shopId, month, year) {

  // B2B: Invoices to GST-registered businesses
  const b2bInvoices = await db.invoices.findAll({
    where: {
      shop_id: shopId,
      invoice_type: 'SALES_INVOICE',
      status: 'POSTED',
      invoice_date: { [Op.between]: [monthStart, monthEnd] }
    },
    include: [{ model: parties, where: { gst_type: 'REGULAR' } }]
  });

  // Format for GSTR-1 B2B section
  const b2b = b2bInvoices.reduce((acc, inv) => {
    const custin = inv.party.gstin;
    if (!acc[custin]) acc[custin] = { ctin: custin, inv: [] };
    acc[custin].inv.push({
      inum: inv.invoice_number,   // invoice number
      idt: formatDate(inv.invoice_date), // invoice date
      val: inv.grand_total,       // invoice value
      pos: inv.place_of_supply,   // place of supply state code
      rchrg: 'N',                 // reverse charge
      itms: inv.lines.map(l => ({
        num: l.line_order,
        itm_det: {
          txval: l.taxable_value,
          rt: l.tax_rate,
          camt: l.cgst_amount,
          samt: l.sgst_amount,
          iamt: l.igst_amount
        }
      }))
    });
    return acc;
  }, {});

  // B2C Small: Summary by state, rate (inter-state invoices < 2.5 lakh)
  const b2csInvoices = await db.invoices.findAll({
    where: {
      shop_id: shopId,
      invoice_type: 'SALES_INVOICE',
      invoice_date: { [Op.between]: [monthStart, monthEnd] },
      supply_type: 'INTER_STATE',
      grand_total: { [Op.lt]: 250000 }
    },
    include: [{ model: parties, where: { gst_type: ['CONSUMER','UNREGISTERED'] } }]
  });

  // Aggregate by state + rate
  const b2cs = b2csInvoices.reduce((acc, inv) => {
    // group by place_of_supply + tax_rate
    // sum up taxable_value, tax_amounts
    return acc;
  }, []);

  // HSN Summary: aggregate by HSN code across all invoices
  const hsnSummary = await db.query(`
    SELECT
      il.hsn_code,
      SUM(il.quantity) as qty,
      il.unit,
      SUM(il.taxable_value) as taxable_value,
      il.tax_rate,
      SUM(il.cgst_amount) as cgst,
      SUM(il.sgst_amount) as sgst,
      SUM(il.igst_amount) as igst
    FROM invoice_lines il
    JOIN invoices i ON il.invoice_id = i.id
    WHERE i.shop_id = ? AND i.invoice_type = 'SALES_INVOICE'
      AND i.invoice_date BETWEEN ? AND ?
      AND i.status = 'POSTED'
    GROUP BY il.hsn_code, il.unit, il.tax_rate
    ORDER BY il.hsn_code
  `, { replacements: [shopId, monthStart, monthEnd] });

  return {
    gstin: shop.gstin,
    fp: `${month.toString().padStart(2,'0')}${year}`, // filing period
    b2b: Object.values(b2b),
    b2cs,
    hsn: { data: hsnSummary }
  };
}
```

---

## 6.5 Udhaar (Credit / Accounts Receivable) — How to Build It

This is the most important feature for Indian shop owners. The term "udhaar" means informal credit — a mechanic takes goods today and pays end of the month.

### Udhaar Ledger Screen

```
Customer: Ramesh Mechanics
Phone: +91-98765-43210
Credit Limit: ₹25,000
Current Outstanding: ₹18,450
Available Credit: ₹6,550

Transaction History:
Date       | Type    | Reference    | Amount  | Balance
01-Apr     | Invoice | INV/001      | +₹3,500 | ₹3,500
05-Apr     | Invoice | INV/015      | +₹2,200 | ₹5,700
10-Apr     | Payment | Cash         | -₹5,000 | ₹700
15-Apr     | Invoice | INV/031      | +₹8,750 | ₹9,450
22-Apr     | Invoice | INV/048      | +₹5,000 | ₹14,450
28-Apr     | Invoice | INV/062      | +₹4,000 | ₹18,450

Outstanding Bills:
Invoice    | Date   | Amount | Due Date  | Days Overdue
INV/031    |15-Apr  | ₹8,750 | 15-May    | Current
INV/048    |22-Apr  | ₹5,000 | 22-May    | Current
INV/062    |28-Apr  | ₹4,000 | 28-May    | Current
INV/015 (partial) |05-Apr | ₹700 | 05-May | 5 days overdue

[Record Payment] [Send WhatsApp Reminder] [Print Statement]
```

### Udhaar Payment Recording with Bill Allocation

When a customer pays ₹10,000 against multiple outstanding bills:

```javascript
async function recordCustomerPayment(customerId, amount, paymentMode, billAllocations) {
  // billAllocations: [{ invoiceId: 'INV/031', amount: 8750 }, { invoiceId: 'INV/048', amount: 1250 }]

  await db.transaction(async (t) => {
    // 1. Create payment record
    const payment = await db.payments.create({
      party_id: customerId,
      amount: amount,
      payment_mode: paymentMode,
      payment_date: new Date(),
      payment_type: 'INCOMING'
    }, { transaction: t });

    // 2. Apply to each bill
    for (const allocation of billAllocations) {
      await db.invoice_payments.create({
        invoice_id: allocation.invoiceId,
        payment_id: payment.id,
        amount_applied: allocation.amount
      }, { transaction: t });

      // Update invoice balance_due and payment_status
      const invoice = await db.invoices.findByPk(allocation.invoiceId);
      const newBalance = invoice.balance_due - allocation.amount;
      await invoice.update({
        amount_paid: invoice.amount_paid + allocation.amount,
        balance_due: newBalance,
        payment_status: newBalance <= 0 ? 'PAID' : 'PARTIAL'
      }, { transaction: t });
    }

    // 3. Create journal entry
    await createJournalEntry({
      entry_type: 'RECEIPT',
      lines: [
        { account: getCashOrBankAccount(paymentMode), debit: amount },
        { account: getARAccount(), party_id: customerId, credit: amount }
      ]
    }, t);
  });
}
```

### Udhaar Reminder Workflow

```javascript
// Scheduled job: runs every morning at 9 AM
async function sendUdhaarReminders(shopId) {
  const overdueInvoices = await db.invoices.findAll({
    where: {
      shop_id: shopId,
      invoice_type: 'SALES_INVOICE',
      payment_status: ['UNPAID','PARTIAL'],
      due_date: { [Op.lt]: new Date() }  // past due
    },
    include: [parties]
  });

  // Group by customer
  const byCustomer = groupBy(overdueInvoices, 'party_id');

  for (const [customerId, invoices] of Object.entries(byCustomer)) {
    const customer = invoices[0].party;
    const totalDue = invoices.reduce((s, i) => s + i.balance_due, 0);

    // Send WhatsApp message
    await sendWhatsApp(customer.phone,
      `Dear ${customer.display_name}, this is a friendly reminder from ${shop.name}. ` +
      `You have outstanding dues of ₹${totalDue.toFixed(2)}. ` +
      `Please settle at your earliest convenience. Thank you.`
    );
  }
}
```

---

## 6.6 Day Book — Real-Time Transaction Log

The Day Book is simply all vouchers entered on a given day in chronological order. Like the Tally Day Book.

```sql
SELECT
  je.entry_date,
  je.entry_type,
  i.invoice_number,
  p.display_name AS party,
  je.narration,
  SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount END) AS debit,
  SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount END) AS credit
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
LEFT JOIN invoices i ON i.journal_entry_id = je.id
LEFT JOIN parties p ON i.party_id = p.id
WHERE je.shop_id = :shopId
  AND je.entry_date = :date
  AND je.status = 'POSTED'
GROUP BY je.id, je.entry_date, je.entry_type, i.invoice_number, p.display_name, je.narration
ORDER BY je.created_at;
```

---

## 6.7 Key Design Patterns from All Three Systems (What You Must Copy)

### From Tally — Copy These

1. **Voucher Number Auto-Sequence:** Every voucher type has its own sequential number, prefix configurable, resets every financial year. Users can see and audit the sequence.

2. **Alter as Post (Edit Voucher):** Unlike SAP's immutable-after-post rule, Tally lets you edit any voucher anytime. This is what Indian shop owners expect. If you post a wrong amount, just go in and fix it. (However, add an audit trail of what changed.)

3. **Cost Centre Allocation:** When entering an expense, optionally allocate it to a cost center (Branch A, Branch B). This gives branch-wise P&L without separate company books.

4. **Optional Voucher → Confirmed:** Let shops enter tentative entries that don't affect books, then confirm them. Useful for sales orders (optional) that become invoices (posted).

5. **Narration per Entry Line:** Tally allows a narration for the whole voucher AND for each individual debit/credit line. This is powerful for audit trails.

6. **Bill-by-Bill Outstanding:** Track each invoice individually for AR/AP. This is essential for accurate aging and collection.

7. **Period Lock:** Once the month is "closed," prevent editing past-period vouchers without a special password. Prevents accidental backdating.

8. **Backup Before Update:** Every time books are changed, create a backup. This is mental security for shop owners.

### From SAP — Copy These

1. **Approval Workflows:** Purchases above a certain amount require manager approval before a PO is sent. Build a simple workflow engine (request → approval → reject/approve).

2. **3-Way Matching Concept:** PO qty × PO price = GRN qty = Vendor Invoice qty/price. Flag discrepancies.

3. **Document Reversal (Not Editing):** Provide the option to reverse a posted entry (creates equal and opposite entry). This preserves audit trail better than editing.

4. **Account Determination:** Automatically determine which GL account to debit/credit based on item category + transaction type. Shop owner doesn't need to know accounting — system handles it.

5. **Master Data Governance:** Prevent creating duplicate items, duplicate customers. Force data quality at master creation time.

### From Zoho — Copy These

1. **Clean Web UI First:** Everything accessible from a browser. No installation required. Mobile-responsive.

2. **Customer/Vendor Portal:** Customers can log in to see their invoices and pay online. This accelerates collections dramatically.

3. **Bank Feed + Bank Rules:** Connect bank account → transactions auto-import → auto-match with books → reconciliation takes minutes.

4. **One-Click Document Conversion:** PO → GRN → Bill in one click (data carries over). No re-keying.

5. **Automatic Payment Reminders:** Configure reminder schedules (3 days before due, on due date, 7 days overdue) and the system sends them automatically.

6. **Report Drill-Down:** Click any number in a report to see the transactions that make up that number. Click a transaction to open the voucher. This is how every modern ERP should work.

7. **User Roles and Permissions:** Different users see different things. The cashier doesn't see the P&L. The accountant doesn't see the POS. Fine-grained permission control.

8. **Audit Trail (Who Changed What When):** Every change to a document is logged with user + timestamp + old value + new value. Accessible to admins.

---

## 6.8 Automobile Space ERP — Complete Feature List Summary

Based on everything above, here is the complete feature set for your ERP module:

### Masters Module
- Chart of Accounts with default GST-ready CoA for auto parts shops
- Party Master (Customers + Vendors in one screen, type-flagged)
- Item Master linked to platform catalog SKUs
- Tax Rate Master (GST rates pre-configured)
- Warehouse/Godown Master
- Unit of Measure Master
- Bank Account Master
- Voucher Series Configuration per type per financial year
- Staff/User Roles per shop

### Sales Module
- POS Billing (fast, barcode-scan-first, keyboard shortcuts)
- Estimate / Quotation
- Sales Order
- Delivery Note (stock dispatch without invoice)
- Tax Invoice (B2C and B2B)
- Credit Note (sales return)
- Recurring Invoices
- Invoice sharing via WhatsApp / email with payment link
- Bulk invoice import (CSV)
- Customer statement generation

### Purchase Module
- Purchase Order (with RFQ integration from B2B module)
- Goods Receipt Note (GRN — receive stock against PO)
- Purchase Invoice / Bill (record vendor's invoice, claim ITC)
- Debit Note / Purchase Return
- 3-way matching (PO vs GRN vs Bill)
- Vendor bill approval workflow

### Inventory Module
- Multi-warehouse stock management
- Barcode and QR scanning (mobile camera + bluetooth scanner)
- Batch and lot tracking with expiry dates
- FIFO and Weighted Average costing
- Stock adjustment (physical count variance, write-off)
- Inter-warehouse stock transfer
- Reorder level alerts
- Dead stock detection
- Physical stock voucher (cycle count)
- Product serialization (for expensive items)

### Accounting Module
- Full double-entry journal entry system
- General Ledger with drill-down
- Bank reconciliation (manual + bank feed)
- Trial Balance
- Profit & Loss Statement (monthly, quarterly, annual)
- Balance Sheet
- Cash Flow Statement
- Accounts Receivable with aging
- Accounts Payable with aging
- Cost centre allocation
- Financial year management and year-end closing

### Udhaar (Credit) Module
- Customer-wise outstanding with aging
- Bill-by-bill tracking and payment allocation
- Credit limit management and blocking
- Automated WhatsApp/SMS payment reminders
- Customer statement (all dues summary)
- Collection performance reports

### GST & Compliance Module
- GSTR-1 generation (B2B, B2CS, CDNR, HSN summary)
- GSTR-3B summary
- ITC reconciliation (GSTR-2B matching)
- E-invoice (IRN generation) via IRP integration
- E-way bill generation
- GST ledger (collected vs paid)
- Annual return support (GSTR-9)
- TDS deduction and TDS certificates
- Income Tax quarterly advance tax reminders

### Reports Module
- Trial Balance
- Profit & Loss (with comparison, cost-centre-wise)
- Balance Sheet
- Cash Flow Statement
- Day Book (all transactions by date)
- Sales Register (all invoices)
- Purchase Register (all bills)
- Stock Ledger (per item movement history)
- Stock Summary (all items with current qty and value)
- Slow/non-moving stock report
- Ageing report (AR and AP)
- Outstanding Bills Receivable / Payable
- Vendor performance report
- Customer profitability
- Branch-wise performance (if multi-branch)
- Tax reports: GST collected, GST paid, net GST liability

### Staff Management Module
- Role-based access per staff member
- Cashier mode (POS only, no reports, no margins visible)
- Manager mode (all except owner financials)
- Owner mode (full access)
- Activity log per user
- Login/logout tracking
- Per-user sales performance

---

> **This document covers the complete internal workings of Tally ERP 9 / TallyPrime, SAP Business One, and Zoho Books — every feature, data model, accounting method, and design pattern — with direct implementation guidance for the AutoMobile Space ERP module.**

---

*AutoMobile Space ERP Technical Reference v1.0 | March 2026 | Internal Engineering*

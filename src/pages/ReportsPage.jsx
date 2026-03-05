import { useMemo, useState } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate, fmtTime, daysAgo, pct, getDebtAging, exportMovementsCSV, downloadCSV, generateCSV, margin, stockStatus, calculateWeightedAvgCost, getCompanyInfo } from "../utils";
import { StatCard, Btn, Input, Select } from "../components/ui";
import { useStore } from "../store";

export function ReportsPage({ movements, products, activeShopId, onPaymentReceipt, toast, parties }) {
    const [view, setView] = useState("overview");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [dayBookFilter, setDayBookFilter] = useState("ALL");
    const [valuationMethod, setValuationMethod] = useState("FIFO");

    const { auditLog } = useStore();

    const shopMovements = useMemo(() => movements.filter(m => m.shopId === activeShopId), [movements, activeShopId]);
    const shopProducts = useMemo(() => (products || []).filter(p => p.shopId === activeShopId), [products, activeShopId]);
    const shopParties = useMemo(() => (parties || []).filter(p => p.shopId === activeShopId), [parties, activeShopId]);

    // Filter movements by selected month
    const monthlyMovements = useMemo(() => {
        return shopMovements.filter(m => {
            const mDate = new Date(m.date).toISOString().slice(0, 7);
            return mDate === selectedMonth;
        });
    }, [shopMovements, selectedMonth]);

    // Filter movements by selected date
    const dailyMovements = useMemo(() => {
        return shopMovements.filter(m => {
            const dDate = new Date(m.date).toISOString().slice(0, 10);
            return dDate === selectedDate;
        });
    }, [shopMovements, selectedDate]);

    // ===== FINANCIAL STATS =====
    const stats = useMemo(() => {
        let sales = 0, purchases = 0, pnl = 0, outGst = 0, inGst = 0, units = 0, returns = 0, damages = 0;
        const receivables = {}, payables = {};

        shopMovements.forEach(m => {
            if (m.type === "SALE") {
                sales += m.total; pnl += m.profit || 0; outGst += m.gstAmount || 0; units += m.qty;
                if (m.paymentMode === "Credit" || m.paymentStatus === "pending") {
                    const cust = m.customerName || "Unknown Customer";
                    if (!receivables[cust]) receivables[cust] = { name: cust, phone: m.customerPhone, total: 0, transactions: [], oldestDate: Infinity };
                    receivables[cust].total += m.total;
                    receivables[cust].transactions.push(m);
                    receivables[cust].oldestDate = Math.min(receivables[cust].oldestDate, m.date);
                }
            } else if (m.type === "PURCHASE") {
                purchases += m.total; inGst += m.gstAmount || 0;
                if (m.paymentMode === "Credit" || m.paymentStatus === "pending") {
                    const supp = m.supplierName || m.supplier || "Unknown Supplier";
                    if (!payables[supp]) payables[supp] = { name: supp, total: 0, transactions: [], oldestDate: Infinity };
                    payables[supp].total += m.total;
                    payables[supp].transactions.push(m);
                    payables[supp].oldestDate = Math.min(payables[supp].oldestDate, m.date);
                }
            } else if (m.type === "RETURN_IN") { returns += m.total || 0; }
            else if (m.type === "DAMAGE" || m.type === "THEFT") { damages += Math.abs(m.profit || 0); }
        });

        // Receipts reduce receivables
        shopMovements.filter(m => m.type === "RECEIPT").forEach(m => {
            const cust = m.customerName;
            if (cust && receivables[cust]) {
                receivables[cust].total = Math.max(0, receivables[cust].total - m.total);
            }
        });

        const recList = Object.values(receivables).filter(c => c.total > 0).map(c => ({
            ...c, ageDays: Math.floor((Date.now() - c.oldestDate) / 86400000),
            aging: getDebtAging(c.oldestDate),
        })).sort((a, b) => b.total - a.total);

        const payList = Object.values(payables).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

        // Inventory valuation
        const invValue = shopProducts.reduce((s, p) => s + (p.buyPrice * p.stock), 0);
        const invSellValue = shopProducts.reduce((s, p) => s + (p.sellPrice * p.stock), 0);
        const potentialProfit = invSellValue - invValue;

        return {
            sales, purchases, pnl, outGst, inGst, netGst: outGst - inGst,
            units, returns, damages,
            recList, recTotal: recList.reduce((s, i) => s + i.total, 0),
            payList, payTotal: payList.reduce((s, i) => s + i.total, 0),
            invValue, invSellValue, potentialProfit,
            cogs: purchases, grossProfit: pnl, netProfit: pnl - damages - returns,
        };
    }, [shopMovements, shopProducts]);

    // ===== TABS =====
    const tabs = [
        { id: "overview", label: "P&L Overview", icon: "📊" },
        { id: "gstr1", label: "GSTR-1", icon: "📄" },
        { id: "gstr3b", label: "GSTR-3B", icon: "⚖️" },
        { id: "daybook", label: "Day Book", icon: "📖" },
        { id: "itc", label: "ITC Register", icon: "📥" },
        { id: "valuation", label: "Stock Valuation", icon: "📦" },
        { id: "balance", label: "Balance Sheet", icon: "⚖️" },
        { id: "parties", label: "Party Ledgers", icon: "📒" },
        { id: "audit", label: "Audit Log", icon: "🔍" },
    ];

    // ===== GSTR-1 DATA =====
    const gstr1Data = useMemo(() => {
        const b2b = [];
        const b2c = [];
        let totalInvoices = 0;
        let totalTaxable = 0;
        let totalGst = 0;

        monthlyMovements.filter(m => m.type === "SALE").forEach(m => {
            const party = shopParties.find(p => p.name === m.customerName);
            const taxable = m.total - (m.gstAmount || 0);
            const row = {
                invoiceNo: m.invoiceNo || `INV-${m.id}`,
                date: m.date,
                buyerName: m.customerName || "Cash Customer",
                gstin: party?.gstin || "",
                pos: party?.city || "Local",
                taxableValue: taxable,
                gstRate: m.gstRate || 18,
                cgst: (m.gstAmount || 0) / 2,
                sgst: (m.gstAmount || 0) / 2,
                igst: 0,
                total: m.total
            };

            if (row.gstin) {
                b2b.push(row);
            } else {
                b2c.push(row);
            }
            totalInvoices++;
            totalTaxable += taxable;
            totalGst += (m.gstAmount || 0);
        });

        return { b2b, b2c, totalInvoices, totalTaxable, totalGst, netPayable: totalGst };
    }, [monthlyMovements, shopParties]);

    // ===== GSTR-3B DATA =====
    const gstr3bData = useMemo(() => {
        const supplies = { "5": 0, "12": 0, "18": 0, "28": 0 };
        const suppliesTax = { "5": 0, "12": 0, "18": 0, "28": 0 };
        let itc = 0;

        monthlyMovements.forEach(m => {
            if (m.type === "SALE") {
                const rate = String(m.gstRate || 18);
                supplies[rate] = (supplies[rate] || 0) + (m.total - (m.gstAmount || 0));
                suppliesTax[rate] = (suppliesTax[rate] || 0) + (m.gstAmount || 0);
            } else if (m.type === "PURCHASE") {
                itc += (m.gstAmount || 0);
            }
        });

        const totalOutputTax = Object.values(suppliesTax).reduce((a, b) => a + b, 0);

        return { supplies, suppliesTax, itc, netPayable: totalOutputTax - itc };
    }, [monthlyMovements]);

    // ===== DAY BOOK DATA =====
    const dayBookData = useMemo(() => {
        const filtered = dailyMovements.filter(m => dayBookFilter === "ALL" || m.type === dayBookFilter);
        let totalDebits = 0;
        let totalCredits = 0;

        const rows = filtered.map(m => {
            const isDebit = m.type === "PURCHASE" || m.type === "PAYMENT" || m.type === "RETURN_IN";
            const amount = m.total || 0;
            if (isDebit) totalDebits += amount;
            else totalCredits += amount;

            return {
                time: m.date,
                type: m.type,
                refId: m.invoiceNo || m.id,
                debitAcc: isDebit ? (m.customerName || m.supplierName || "Cash") : "-",
                creditAcc: !isDebit ? (m.customerName || m.supplierName || "Sales") : "-",
                amount,
                isDebit
            };
        });

        return { rows, totalDebits, totalCredits };
    }, [dailyMovements, dayBookFilter]);

    // ===== ITC REGISTER DATA =====
    const itcRegisterData = useMemo(() => {
        return shopMovements.filter(m => m.type === "PURCHASE").map(m => ({
            date: m.date,
            supplier: m.supplierName || m.supplier || "Direct Purchase",
            invoiceNo: m.invoiceNo || m.id,
            hsn: "99", // Mock
            taxableValue: m.total - (m.gstAmount || 0),
            gstRate: m.gstRate || 18,
            cgst: (m.gstAmount || 0) / 2,
            sgst: (m.gstAmount || 0) / 2,
            igst: 0,
            eligible: "Yes"
        }));
    }, [shopMovements]);

    // ===== STOCK VALUATION DATA =====
    const stockValuationData = useMemo(() => {
        return shopProducts.map(p => {
            const cost = valuationMethod === "Weighted Average" ? calculateWeightedAvgCost(shopMovements, p.id) || p.buyPrice : p.buyPrice;
            const stockValue = p.stock * cost;
            const potentialProfit = (p.sellPrice - cost) * p.stock;
            return {
                ...p,
                cost,
                stockValue,
                potentialProfit
            };
        });
    }, [shopProducts, shopMovements, valuationMethod]);

    // ===== PARTY LEDGER TABLE =====
    const renderDebtTable = (title, list, isReceivable) => (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", flex: 1, minWidth: 300 }}>
            <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, color: T.t1, fontSize: 16 }}>{title}</div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 900, color: isReceivable ? T.emerald : T.crimson }}>
                    {fmt(list.reduce((s, x) => s + x.total, 0))}
                </div>
            </div>
            {list.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: T.t3, fontSize: 14 }}>No pending {title.toLowerCase()}. 🎉</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                        {list.map((item, i) => {
                            const aging = item.aging || getDebtAging(item.oldestDate || Date.now());
                            return (
                                <tr key={i} className="row-hover" style={{ borderBottom: i < list.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                    <td style={{ padding: "14px 20px" }}>
                                        <div style={{ fontWeight: 600, color: T.t1 }}>{item.name}</div>
                                        {item.phone && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{item.phone}</div>}
                                        {item.aging && (
                                            <span style={{ fontSize: 9, fontWeight: 800, color: aging.color, background: `${aging.color}18`, padding: "2px 6px", borderRadius: 4, marginTop: 4, display: "inline-block" }}>
                                                {aging.label}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: "14px 20px", textAlign: "right", fontFamily: FONT.mono, fontWeight: 800, color: T.t1, fontSize: 15 }}>{fmt(item.total)}</td>
                                    <td style={{ padding: "14px 20px", textAlign: "right", width: 100 }}>
                                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                            {isReceivable && (
                                                <Btn size="xs" variant="emerald" onClick={() => {
                                                    const amount = prompt(`Enter payment amount from ${item.name} (Max: ${item.total}):`, String(item.total));
                                                    if (amount && +amount > 0) {
                                                        onPaymentReceipt?.({
                                                            partyName: item.name, partyPhone: item.phone || "",
                                                            amount: Math.min(+amount, item.total), paymentMode: "Cash",
                                                            notes: `Udhaar settlement from ${item.name}`,
                                                        });
                                                    }
                                                }}>💰 Collect</Btn>
                                            )}
                                            {isReceivable && item.phone && (
                                                <Btn size="xs" variant="ghost" onClick={() => {
                                                    const msg = encodeURIComponent(`Hi ${item.name}, your pending balance at ${getCompanyInfo().companyName || "our shop"} is ${fmt(item.total)}. Please settle at your earliest convenience. Thank you! 🙏`);
                                                    window.open(`https://wa.me/${item.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                                                }} style={{ borderColor: T.border }}>💬</Btn>
                                            )}
                                            {!isReceivable && <Btn size="xs" variant="sky" onClick={() => {
                                                const amount = prompt(`Enter payment to ${item.name} (Max: ${item.total}):`, String(item.total));
                                                if (amount && +amount > 0) {
                                                    onPaymentReceipt?.({
                                                        partyName: item.name, partyPhone: "",
                                                        amount: Math.min(+amount, item.total), paymentMode: "Bank Transfer",
                                                        notes: `Supplier payment to ${item.name}`,
                                                        movementIds: item.transactions?.map(t => t.id) || [],
                                                    });
                                                }
                                            }}>Settle</Btn>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, overflowX: "auto" }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id)}
                        style={{ background: view === tab.id ? `${T.amber}22` : "transparent", color: view === tab.id ? T.amber : T.t3, border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 8, transition: "0.2s", whiteSpace: "nowrap" }}
                        className="btn-hover-subtle">
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Global Selectors */}
            {(view === "gstr1" || view === "gstr3b") && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ color: T.t2, fontSize: 14, fontWeight: 600 }}>Select Month:</div>
                    <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: 200 }} />
                </div>
            )}
            {view === "daybook" && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ color: T.t2, fontSize: 14, fontWeight: 600 }}>Select Date:</div>
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: 200 }} />
                    <Select value={dayBookFilter} onChange={e => setDayBookFilter(e.target.value)} options={[
                        { label: "All Transactions", value: "ALL" },
                        { label: "Sales", value: "SALE" },
                        { label: "Purchases", value: "PURCHASE" },
                        { label: "Payments", value: "PAYMENT" },
                        { label: "Receipts", value: "RECEIPT" },
                        { label: "Returns", value: "RETURN_IN" },
                    ]} style={{ width: 200 }} />
                </div>
            )}
            {view === "valuation" && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ color: T.t2, fontSize: 14, fontWeight: 600 }}>Valuation Method:</div>
                    <Select value={valuationMethod} onChange={e => setValuationMethod(e.target.value)} options={[
                        { label: "FIFO (First In First Out)", value: "FIFO" },
                        { label: "Weighted Average", value: "Weighted Average" },
                        { label: "Selling Price", value: "Selling Price" },
                    ]} style={{ width: 250 }} />
                </div>
            )}

            {/* ===== P&L OVERVIEW ===== */}
            {view === "overview" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        <StatCard label="Net Sales Revenue" value={fmt(stats.sales)} color={T.emerald} icon="📈" sub={`${stats.units} units sold`} />
                        <StatCard label="Total Purchases (COGS)" value={fmt(stats.purchases)} color={T.sky} icon="📥" />
                        <StatCard label="Gross Profit" value={fmt(stats.pnl)} color={T.amber} icon="💰" sub={`Margin: ${pct(stats.pnl, stats.sales)}`} />
                        <StatCard label="Net Profit" value={fmt(stats.netProfit)} color={stats.netProfit >= 0 ? T.emerald : T.crimson} icon="🏦" sub={`After losses: ${fmt(stats.damages + stats.returns)}`} />
                    </div>

                    {/* P&L Statement */}
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: T.t1, marginBottom: 20 }}>📊 Profit & Loss Statement</div>
                        <div style={{ maxWidth: 500 }}>
                            {[
                                { label: "Revenue (Sales)", value: stats.sales, color: T.emerald, bold: true },
                                { label: "Less: Cost of Goods Sold", value: -stats.purchases, color: T.sky, indent: true },
                                { label: "Gross Profit", value: stats.pnl, color: T.amber, bold: true, border: true },
                                { label: "Less: Customer Returns", value: -stats.returns, color: T.crimson, indent: true },
                                { label: "Less: Damages & Shrinkage", value: -stats.damages, color: T.crimson, indent: true },
                                { label: "Net Profit / (Loss)", value: stats.netProfit, color: stats.netProfit >= 0 ? T.emerald : T.crimson, bold: true, border: true, big: true },
                            ].map((row, i) => (
                                <div key={i} style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: `${row.big ? 14 : 10}px 0`, paddingLeft: row.indent ? 20 : 0,
                                    borderTop: row.border ? `1px solid ${T.border}` : "none",
                                    marginTop: row.border ? 8 : 0,
                                }}>
                                    <span style={{ fontSize: row.big ? 16 : 14, fontWeight: row.bold ? 800 : 500, color: row.bold ? T.t1 : T.t2 }}>{row.label}</span>
                                    <span style={{ fontSize: row.big ? 22 : 16, fontWeight: row.bold ? 900 : 600, fontFamily: FONT.mono, color: row.color }}>
                                        {row.value < 0 ? `(${fmt(Math.abs(row.value))})` : fmt(row.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick KPIs */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        <StatCard label="Accounts Receivable (Udhaar)" value={fmt(stats.recTotal)} color={T.crimson} icon="📋" sub={`${stats.recList.length} customers owe you`} />
                        <StatCard label="Accounts Payable" value={fmt(stats.payTotal)} color="#FB923C" icon="🏭" sub={`${stats.payList.length} suppliers to pay`} />
                        <StatCard label="Inventory Value (Cost)" value={fmt(stats.invValue)} color={T.sky} icon="📦" sub={`Potential revenue: ${fmt(stats.invSellValue)}`} />
                    </div>
                </div>
            )}

            {/* ===== GSTR-1 TAB ===== */}
            {view === "gstr1" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        <StatCard label="Total Invoices" value={gstr1Data.totalInvoices} color={T.sky} icon="📄" />
                        <StatCard label="Taxable Value" value={fmt(gstr1Data.totalTaxable)} color={T.amber} icon="💰" />
                        <StatCard label="Total GST" value={fmt(gstr1Data.totalGst)} color={T.emerald} icon="🏛️" />
                        <StatCard label="Net Payable" value={fmt(gstr1Data.netPayable)} color={T.crimson} icon="🏦" />
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                        <Btn variant="amber" onClick={() => {
                            const blob = new Blob([JSON.stringify(gstr1Data, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a"); a.href = url; a.download = `GSTR1_${selectedMonth}.json`; a.click();
                        }}>Export JSON</Btn>
                        <Btn variant="subtle" onClick={() => {
                            const headers = ["Invoice No", "Date", "Buyer", "GSTIN", "Taxable", "GST", "Total"];
                            const rows = [...gstr1Data.b2b, ...gstr1Data.b2c].map(r => [r.invoiceNo, fmtDate(r.date), r.buyerName, r.gstin, r.taxableValue, r.cgst + r.sgst, r.total]);
                            downloadCSV(`GSTR1_${selectedMonth}.csv`, generateCSV(headers, rows));
                        }}>Export CSV</Btn>
                    </div>

                    {/* B2B Table */}
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, fontSize: 16, fontWeight: 800 }}>B2B Sales (GSTIN Holders)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: `${T.surface}88` }}>
                                    {["Invoice No", "Date", "Buyer Name", "GSTIN", "Taxable Value", "GST Rate", "CGST", "SGST", "Total"].map(h => (
                                        <th key={h} style={{ padding: 12, textAlign: "left", color: T.t3, fontSize: 11 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gstr1Data.b2b.map((r, i) => (
                                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{r.invoiceNo}</td>
                                        <td style={{ padding: 12 }}>{fmtDate(r.date)}</td>
                                        <td style={{ padding: 12, fontWeight: 600 }}>{r.buyerName}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{r.gstin}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.taxableValue)}</td>
                                        <td style={{ padding: 12 }}>{r.gstRate}%</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.cgst)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.sgst)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono, fontWeight: 800 }}>{fmt(r.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* B2C Table */}
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, fontSize: 16, fontWeight: 800 }}>B2C Sales (Consumer)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: `${T.surface}88` }}>
                                    {["Invoice No", "Date", "Buyer Name", "Taxable Value", "GST Rate", "CGST", "SGST", "Total"].map(h => (
                                        <th key={h} style={{ padding: 12, textAlign: "left", color: T.t3, fontSize: 11 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gstr1Data.b2c.map((r, i) => (
                                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{r.invoiceNo}</td>
                                        <td style={{ padding: 12 }}>{fmtDate(r.date)}</td>
                                        <td style={{ padding: 12, fontWeight: 600 }}>{r.buyerName}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.taxableValue)}</td>
                                        <td style={{ padding: 12 }}>{r.gstRate}%</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.cgst)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.sgst)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono, fontWeight: 800 }}>{fmt(r.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== GSTR-3B TAB ===== */}
            {view === "gstr3b" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: T.t1 }}>GSTR-3B Summary Form</div>
                            <Btn variant="amber" onClick={() => {
                                const blob = new Blob([JSON.stringify(gstr3bData, null, 2)], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a"); a.href = url; a.download = `GSTR3B_${selectedMonth}.json`; a.click();
                            }}>Download GSTR-3B JSON</Btn>
                        </div>

                        {/* 3.1 Outward Supplies */}
                        <div style={{ marginBottom: 32 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: T.amber, marginBottom: 16, padding: "8px 16px", background: `${T.amber}15`, borderRadius: 8 }}>3.1 Details of Outward Taxable Supplies</div>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ textAlign: "left", color: T.t3, fontSize: 12 }}>
                                        <th style={{ padding: 12 }}>GST Rate Slab</th>
                                        <th style={{ padding: 12 }}>Total Taxable Value</th>
                                        <th style={{ padding: 12 }}>Integrated Tax (IGST)</th>
                                        <th style={{ padding: 12 }}>Central Tax (CGST)</th>
                                        <th style={{ padding: 12 }}>State/UT Tax (SGST)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {["5", "12", "18", "28"].map(rate => (
                                        <tr key={rate} style={{ borderBottom: `1px solid ${T.border}` }}>
                                            <td style={{ padding: 12, fontWeight: 700 }}>{rate}% Slab</td>
                                            <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(gstr3bData.supplies[rate] || 0)}</td>
                                            <td style={{ padding: 12, fontFamily: FONT.mono }}>₹0</td>
                                            <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt((gstr3bData.suppliesTax[rate] || 0) / 2)}</td>
                                            <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt((gstr3bData.suppliesTax[rate] || 0) / 2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Eligible ITC */}
                        <div style={{ marginBottom: 32 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: T.sky, marginBottom: 16, padding: "8px 16px", background: `${T.sky}15`, borderRadius: 8 }}>4. Eligible ITC (Input Tax Credit)</div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: 16, background: T.surface, borderRadius: 12 }}>
                                <div style={{ fontWeight: 600 }}>(A) ITC Available (Import of goods/services + Inward supplies)</div>
                                <div style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.sky, fontSize: 18 }}>{fmt(gstr3bData.itc)}</div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{ padding: 24, background: gstr3bData.netPayable > 0 ? `${T.crimson}15` : `${T.emerald}15`, borderRadius: 16, border: `1px solid ${gstr3bData.netPayable > 0 ? T.crimson : T.emerald}33` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 900 }}>Net Tax Payable / Refund</div>
                                    <div style={{ fontSize: 13, color: T.t2, marginTop: 4 }}>Output Tax (Sales) - Input Tax Credit (Purchases)</div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: FONT.mono, color: gstr3bData.netPayable > 0 ? T.crimson : T.emerald }}>
                                    {fmt(Math.abs(gstr3bData.netPayable))}
                                    <span style={{ fontSize: 14, marginLeft: 8 }}>{gstr3bData.netPayable > 0 ? "(Payable)" : "(ITC Carry Forward)"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== DAY BOOK TAB ===== */}
            {view === "daybook" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        <StatCard label="Total Debits" value={fmt(dayBookData.totalDebits)} color={T.crimson} icon="📤" />
                        <StatCard label="Total Credits" value={fmt(dayBookData.totalCredits)} color={T.emerald} icon="📥" />
                        <StatCard label="Net Movement" value={fmt(dayBookData.totalCredits - dayBookData.totalDebits)} color={T.sky} icon="⚖️" />
                    </div>

                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800 }}>Transactions for {fmtDate(selectedDate)}</div>
                            <Btn variant="subtle" size="sm" onClick={() => {
                                const headers = ["Time", "Type", "Ref ID", "Debit Acc", "Credit Acc", "Amount"];
                                const rows = dayBookData.rows.map(r => [fmtTime(r.time), r.type, r.refId, r.debitAcc, r.creditAcc, r.amount]);
                                downloadCSV(`DayBook_${selectedDate}.csv`, generateCSV(headers, rows));
                            }}>Export CSV</Btn>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: `${T.surface}88` }}>
                                    {["Time", "Type", "Reference ID", "Debit Account", "Credit Account", "Amount"].map(h => (
                                        <th key={h} style={{ padding: 12, textAlign: "left", color: T.t3, fontSize: 11 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dayBookData.rows.map((r, i) => (
                                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: 12 }}>{fmtTime(r.time)}</td>
                                        <td style={{ padding: 12 }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: `${T.t3}22`, color: T.t2 }}>{r.type}</span>
                                        </td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{r.refId}</td>
                                        <td style={{ padding: 12 }}>{r.debitAcc}</td>
                                        <td style={{ padding: 12 }}>{r.creditAcc}</td>
                                        <td style={{ padding: 12, textAlign: "right", fontFamily: FONT.mono, fontWeight: 700, color: r.isDebit ? T.crimson : T.emerald }}>
                                            {r.isDebit ? "-" : "+"}{fmt(r.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {dayBookData.rows.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: 40, textAlign: "center", color: T.t3 }}>No transactions found for this date.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== ITC REGISTER TAB ===== */}
            {view === "itc" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>Inward Supply (ITC) Register</div>
                        <Btn variant="subtle" onClick={() => {
                            const headers = ["Date", "Supplier", "Invoice No", "HSN", "Taxable Value", "CGST", "SGST", "IGST", "Eligible"];
                            const rows = itcRegisterData.map(r => [fmtDate(r.date), r.supplier, r.invoiceNo, r.hsn, r.taxableValue, r.cgst, r.sgst, r.igst, r.eligible]);
                            downloadCSV("ITC_Register.csv", generateCSV(headers, rows));
                        }}>Export CSV</Btn>
                    </div>

                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: `${T.surface}88` }}>
                                    {["Date", "Supplier", "Invoice No", "HSN", "Taxable Value", "Rate", "CGST", "SGST", "IGST", "ITC Eligible"].map(h => (
                                        <th key={h} style={{ padding: 12, textAlign: "left", color: T.t3, fontSize: 11 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {itcRegisterData.map((r, i) => (
                                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: 12 }}>{fmtDate(r.date)}</td>
                                        <td style={{ padding: 12, fontWeight: 600 }}>{r.supplier}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{r.invoiceNo}</td>
                                        <td style={{ padding: 12 }}>{r.hsn}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.taxableValue)}</td>
                                        <td style={{ padding: 12 }}>{r.gstRate}%</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.cgst)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.sgst)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(r.igst)}</td>
                                        <td style={{ padding: 12 }}>
                                            <span style={{ fontSize: 10, fontWeight: 900, background: `${T.emerald}22`, color: T.emerald, padding: "2px 6px", borderRadius: 4 }}>{r.eligible}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: T.surface, fontWeight: 900 }}>
                                    <td colSpan="6" style={{ padding: 16, textAlign: "right" }}>Total ITC Available:</td>
                                    <td colSpan="4" style={{ padding: 16, color: T.emerald, fontSize: 18, fontFamily: FONT.mono }}>
                                        {fmt(itcRegisterData.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== STOCK VALUATION TAB ===== */}
            {view === "valuation" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        <StatCard label="Total Items" value={shopProducts.length} color={T.sky} icon="📦" />
                        <StatCard label="Grand Total Valuation" value={fmt(stockValuationData.reduce((s, r) => s + r.stockValue, 0))} color={T.emerald} icon="💰" />
                        <StatCard label="Potential Profit" value={fmt(stockValuationData.reduce((s, r) => s + r.potentialProfit, 0))} color={T.amber} icon="📈" />
                    </div>

                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800 }}>Stock Valuation List ({valuationMethod})</div>
                            <Btn variant="subtle" size="sm" onClick={() => {
                                const headers = ["Product", "Category", "Stock", "Unit Cost", "Stock Value", "Sell Price", "Potential Profit"];
                                const rows = stockValuationData.map(r => [r.name, r.category, r.stock, r.cost, r.stockValue, r.sellPrice, r.potentialProfit]);
                                downloadCSV(`StockValuation_${valuationMethod}.csv`, generateCSV(headers, rows));
                            }}>Export CSV</Btn>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: `${T.surface}88` }}>
                                    {["Product Details", "Category", "Stock", "Unit Cost", "Stock Value", "Sell Price", "Profit Potential"].map(h => (
                                        <th key={h} style={{ padding: 12, textAlign: "left", color: T.t3, fontSize: 11 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {stockValuationData.map((p, i) => (
                                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: 12 }}>
                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                            <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono }}>{p.sku}</div>
                                        </td>
                                        <td style={{ padding: 12 }}>{p.category}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{p.stock}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(p.cost)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono, fontWeight: 700 }}>{fmt(p.stockValue)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono }}>{fmt(p.sellPrice)}</td>
                                        <td style={{ padding: 12, fontFamily: FONT.mono, color: T.emerald }}>{fmt(p.potentialProfit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== BALANCE SHEET ===== */}
            {view === "balance" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Assets */}
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", background: `${T.emerald}15`, borderBottom: `1px solid ${T.border}`, fontSize: 16, fontWeight: 900, color: T.emerald }}>ASSETS</div>
                            {[
                                { label: "Closing Stock Value (at Cost)", value: stats.invValue },
                                { label: "Accounts Receivable (Sundry Debtors)", value: stats.recTotal },
                                { label: "Cash & Bank Balance (Simulated)", value: 250000 },
                            ].map((row, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                                    <span style={{ color: T.t2 }}>{row.label}</span>
                                    <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{fmt(row.value)}</span>
                                </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", background: T.surface, fontWeight: 900 }}>
                                <span>TOTAL ASSETS</span>
                                <span style={{ fontFamily: FONT.mono, fontSize: 18, color: T.emerald }}>{fmt(stats.invValue + stats.recTotal + 250000)}</span>
                            </div>
                        </div>

                        {/* Liabilities */}
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", background: `${T.crimson}15`, borderBottom: `1px solid ${T.border}`, fontSize: 16, fontWeight: 900, color: T.crimson }}>LIABILITIES & EQUITY</div>
                            {[
                                { label: "Accounts Payable (Sundry Creditors)", value: stats.payTotal },
                                { label: "GST Payable (Net)", value: Math.max(0, stats.netGst) },
                                { label: "Owner's Equity / Capital", value: (stats.invValue + stats.recTotal + 250000) - stats.payTotal - Math.max(0, stats.netGst) },
                            ].map((row, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                                    <span style={{ color: T.t2 }}>{row.label}</span>
                                    <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{fmt(row.value)}</span>
                                </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", background: T.surface, fontWeight: 900 }}>
                                <span>TOTAL LIABILITIES</span>
                                <span style={{ fontFamily: FONT.mono, fontSize: 18, color: T.crimson }}>{fmt(stats.invValue + stats.recTotal + 250000)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== GST & TAX (Existing) ===== */}
            {view === "gst" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, marginBottom: 24 }}>GST Calculation Worksheet</div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px dashed ${T.border}` }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Output GST (Collected on Sales)</div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Tax collected from customers to be paid to Govt.</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT.mono, color: T.amber }}>{fmt(stats.outGst)}</div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px dashed ${T.border}` }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Input GST (Paid on Purchases)</div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>ITC available from supplier invoices.</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT.mono, color: T.sky }}>— {fmt(stats.inGst)}</div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 0 0", marginTop: 12 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Net GST Liability</div>
                                <div style={{ fontSize: 13, color: stats.netGst > 0 ? T.crimson : T.emerald, fontWeight: 600, marginTop: 4 }}>
                                    {stats.netGst > 0 ? "Amount payable to Government" : "Input Tax Credit Available"}
                                </div>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: FONT.mono, color: stats.netGst > 0 ? T.crimson : T.emerald, background: stats.netGst > 0 ? `${T.crimson}11` : `${T.emerald}11`, padding: "12px 24px", borderRadius: 12 }}>
                                {fmt(Math.abs(stats.netGst))} {stats.netGst < 0 && <span style={{ fontSize: 14 }}> (Cr)</span>}
                            </div>
                        </div>

                        {/* CGST/SGST Split */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 24 }}>
                            <StatCard label="Output CGST" value={fmt(stats.outGst / 2)} color={T.amber} icon="🏛️" />
                            <StatCard label="Output SGST" value={fmt(stats.outGst / 2)} color={T.amber} icon="🏛️" />
                            <StatCard label="Input CGST" value={fmt(stats.inGst / 2)} color={T.sky} icon="📥" />
                            <StatCard label="Input SGST" value={fmt(stats.inGst / 2)} color={T.sky} icon="📥" />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <Btn variant="amber" onClick={() => {
                                const gstr1Json = {
                                    gstin: getCompanyInfo().gstin || "NOT_CONFIGURED",
                                    fp: new Date().toISOString().slice(0, 7).replace("-", "").slice(2),
                                    b2b: [],
                                    b2cs: [],
                                    hsn: { data: [] },
                                };
                                const salesByCustomer = {};
                                shopMovements.filter(m => m.type === "SALE").forEach(m => {
                                    const prod = shopProducts.find(p => p.id === m.productId);
                                    const taxable = m.total - (m.gstAmount || 0);
                                    const rate = prod?.gstRate || prod?.gst || 18;
                                    if (m.customerName) {
                                        if (!salesByCustomer[m.customerName]) salesByCustomer[m.customerName] = [];
                                        salesByCustomer[m.customerName].push({ inum: m.invoiceNo || "INV-" + m.id, idt: fmtDate(m.date), val: m.total, txval: taxable, rt: rate, camt: (m.gstAmount || 0) / 2, samt: (m.gstAmount || 0) / 2 });
                                    } else {
                                        gstr1Json.b2cs.push({ typ: "OE", pos: "36", rt: rate, txval: taxable, camt: (m.gstAmount || 0) / 2, samt: (m.gstAmount || 0) / 2 });
                                    }
                                });
                                Object.entries(salesByCustomer).forEach(([name, invoices]) => {
                                    gstr1Json.b2b.push({ ctin: "36AAAAA0000A1Z5", inv: invoices });
                                });
                                hsnBreakdown.forEach(h => {
                                    const cgst = h.taxableValue * (h.rate / 100) / 2;
                                    gstr1Json.hsn.data.push({ hsn_sc: h.hsn, txval: Math.round(h.taxableValue), camt: Math.round(cgst), samt: Math.round(cgst), iamt: 0, qty: h.qty, uqc: "NOS" });
                                });
                                const blob = new Blob([JSON.stringify(gstr1Json, null, 2)], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a"); a.href = url; a.download = `GSTR1_${gstr1Json.fp}.json`; a.click(); URL.revokeObjectURL(url);
                                toast?.("GSTR-1 JSON exported — Upload to GST Portal!", "success", "🏛️ GST Filing");
                            }}>🏛️ Export GSTR-1 JSON (Portal Format)</Btn>
                            <Btn variant="subtle" onClick={() => {
                                const headers = ["Description", "Taxable Value", "CGST (9%)", "SGST (9%)", "IGST", "Total Tax"];
                                const rows = [
                                    ["3.1(a) Outward taxable supplies", stats.sales - stats.outGst, stats.outGst / 2, stats.outGst / 2, 0, stats.outGst],
                                    ["4(A) ITC Available - Inputs", stats.purchases - stats.inGst, stats.inGst / 2, stats.inGst / 2, 0, stats.inGst],
                                    ["6.1 Tax Payable", "", Math.max(0, (stats.outGst - stats.inGst) / 2), Math.max(0, (stats.outGst - stats.inGst) / 2), 0, Math.max(0, stats.netGst)],
                                ];
                                downloadCSV(`GSTR3B_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
                                toast?.("GSTR-3B worksheet downloaded!", "success");
                            }}>📥 GSTR-3B Excel</Btn>
                            <Btn variant="subtle" onClick={() => {
                                const salesMov = shopMovements.filter(m => m.type === "SALE");
                                const headers = ["Invoice No", "Date", "Customer", "GSTIN", "HSN", "Taxable Value", "CGST", "SGST", "Total"];
                                const rows = salesMov.map(m => {
                                    const prod = shopProducts.find(p => p.id === m.productId);
                                    const taxable = m.total - (m.gstAmount || 0);
                                    return [m.invoiceNo || "", fmtDate(m.date), m.customerName || "Walk-in", "", prod?.hsnCode || "99", taxable, (m.gstAmount || 0) / 2, (m.gstAmount || 0) / 2, m.total];
                                });
                                downloadCSV(`GSTR1_Sales_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
                                toast?.("GSTR-1 sales CSV downloaded!", "success");
                            }}>📥 GSTR-1 CSV</Btn>
                        </div>
                    </div>

                    {/* HSN-wise Tax Breakdown Table */}
                    {hsnBreakdown.length > 0 && (
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, fontSize: 16, fontWeight: 800, color: T.t1 }}>HSN-wise Tax Summary</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                        {["HSN Code", "Rate %", "Invoices", "Qty", "Taxable Value", "CGST", "SGST", "Total Tax"].map(h => (
                                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", fontFamily: FONT.ui }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hsnBreakdown.map((h, i) => {
                                        const cgst = h.taxableValue * (h.rate / 100) / 2;
                                        return (
                                            <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: T.t1 }}>{h.hsn}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.amber }}>{h.rate}%</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.t2 }}>{h.invoices}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.t2 }}>{h.qty}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: T.t1 }}>{fmt(h.taxableValue)}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.sky }}>{fmt(cgst)}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.sky }}>{fmt(cgst)}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 800, color: T.amber }}>{fmt(cgst * 2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== BALANCE SHEET ===== */}
            {view === "balance" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Assets */}
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.emerald, marginBottom: 20 }}>📈 Assets</div>
                            {[
                                { label: "Cash & Bank", value: stats.sales - stats.recTotal, sub: "Net cash from sales" },
                                { label: "Inventory (at Cost)", value: stats.invValue, sub: `${shopProducts.length} SKUs` },
                                { label: "Accounts Receivable", value: stats.recTotal, sub: `${stats.recList.length} customers` },
                                { label: "GST Input Credit", value: stats.inGst, sub: "ITC available" },
                            ].map((row, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? `1px solid ${T.border}` : "none" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: T.t1, fontSize: 14 }}>{row.label}</div>
                                        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{row.sub}</div>
                                    </div>
                                    <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.emerald, fontSize: 16 }}>{fmt(row.value)}</span>
                                </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "14px 0", borderTop: `2px solid ${T.emerald}` }}>
                                <span style={{ fontSize: 16, fontWeight: 900, color: T.t1 }}>Total Assets</span>
                                <span style={{ fontSize: 22, fontWeight: 900, fontFamily: FONT.mono, color: T.emerald }}>{fmt((stats.sales - stats.recTotal) + stats.invValue + stats.recTotal + stats.inGst)}</span>
                            </div>
                        </div>

                        {/* Liabilities + Equity */}
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.crimson, marginBottom: 20 }}>📉 Liabilities & Equity</div>
                            {[
                                { label: "Accounts Payable", value: stats.payTotal, sub: `${stats.payList.length} suppliers`, color: T.crimson },
                                { label: "GST Output Liability", value: stats.outGst, sub: "Tax collected to remit", color: T.crimson },
                                { label: "Net GST Payable", value: Math.max(0, stats.netGst), sub: stats.netGst > 0 ? "Due to Govt" : "ITC balance", color: T.amber },
                            ].map((row, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: T.t1, fontSize: 14 }}>{row.label}</div>
                                        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{row.sub}</div>
                                    </div>
                                    <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: row.color, fontSize: 16 }}>{fmt(row.value)}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: 16, padding: "10px 0", borderTop: `1px dashed ${T.border}` }}>
                                <div style={{ fontWeight: 600, color: T.t3, fontSize: 12, marginBottom: 4 }}>EQUITY</div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                                    <span style={{ fontWeight: 600, color: T.t1 }}>Retained Earnings (Net Profit)</span>
                                    <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: stats.netProfit >= 0 ? T.emerald : T.crimson, fontSize: 16 }}>{fmt(stats.netProfit)}</span>
                                </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "14px 0", borderTop: `2px solid ${T.crimson}` }}>
                                <span style={{ fontSize: 16, fontWeight: 900, color: T.t1 }}>Total Liab. + Equity</span>
                                <span style={{ fontSize: 22, fontWeight: 900, fontFamily: FONT.mono, color: T.crimson }}>{fmt(stats.payTotal + stats.outGst + Math.max(0, stats.netGst) + stats.netProfit)}</span>
                            </div>
                        </div>
                    </div>

                    <Btn variant="subtle" onClick={() => {
                        const headers = ["Category", "Account", "Amount"];
                        const rows = [
                            ["ASSETS", "Cash & Bank", stats.sales - stats.recTotal],
                            ["ASSETS", "Inventory at Cost", stats.invValue],
                            ["ASSETS", "Accounts Receivable", stats.recTotal],
                            ["ASSETS", "GST Input Credit", stats.inGst],
                            ["", "TOTAL ASSETS", (stats.sales - stats.recTotal) + stats.invValue + stats.recTotal + stats.inGst],
                            ["LIABILITIES", "Accounts Payable", stats.payTotal],
                            ["LIABILITIES", "GST Output Liability", stats.outGst],
                            ["EQUITY", "Retained Earnings", stats.netProfit],
                            ["", "TOTAL LIAB + EQUITY", stats.payTotal + stats.outGst + stats.netProfit],
                        ];
                        downloadCSV(`Balance_Sheet_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
                        toast?.("Balance sheet exported!", "success");
                    }}>📥 Export Balance Sheet CSV</Btn>
                </div>
            )}

            {/* ===== PARTY LEDGERS ===== */}
            {view === "parties" && (
                <div className="fade-in" style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {renderDebtTable("Receivables (Customer Udhaar)", stats.recList, true)}
                    {renderDebtTable("Payables (Supplier Udhaar)", stats.payList, false)}
                </div>
            )}

            {/* ===== INVENTORY VALUATION ===== */}
            {view === "inventory" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        <StatCard label="Inventory at Cost" value={fmt(stats.invValue)} color={T.sky} icon="📦" />
                        <StatCard label="Inventory at Sell Price" value={fmt(stats.invSellValue)} color={T.amber} icon="💰" />
                        <StatCard label="Potential Profit" value={fmt(stats.potentialProfit)} color={T.emerald} icon="📈" sub={`${pct(stats.potentialProfit, stats.invSellValue)} margin`} />
                        <StatCard label="Total SKUs" value={String(shopProducts.length)} color={T.violet} icon="🏷️" sub={`${shopProducts.filter(p => p.stock <= 0).length} out of stock`} />
                    </div>

                    {/* Category-wise breakdown */}
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", background: T.surface, borderBottom: `1px solid ${T.border}`, fontSize: 16, fontWeight: 800, color: T.t1 }}>Category-wise Inventory Valuation</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                    {["Category", "SKUs", "Total Qty", "Cost Value", "Sell Value", "Potential Profit", "Avg. Margin"].map(h => (
                                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", fontFamily: FONT.ui }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const cats = {};
                                    shopProducts.forEach(p => {
                                        if (!cats[p.category]) cats[p.category] = { count: 0, qty: 0, costVal: 0, sellVal: 0 };
                                        cats[p.category].count++;
                                        cats[p.category].qty += p.stock;
                                        cats[p.category].costVal += p.buyPrice * p.stock;
                                        cats[p.category].sellVal += p.sellPrice * p.stock;
                                    });
                                    return Object.entries(cats).sort((a, b) => b[1].costVal - a[1].costVal).map(([cat, data]) => (
                                        <tr key={cat} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                            <td style={{ padding: "12px 14px", fontWeight: 700, color: T.t1 }}>{cat}</td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.t2 }}>{data.count}</td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700 }}>{data.qty}</td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.sky }}>{fmt(data.costVal)}</td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, color: T.amber }}>{fmt(data.sellVal)}</td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 800, color: T.emerald }}>{fmt(data.sellVal - data.costVal)}</td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: data.sellVal > 0 ? T.emerald : T.t3 }}>{data.sellVal > 0 ? pct(data.sellVal - data.costVal, data.sellVal) : "—"}</td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Dead Stock */}
                    {(() => {
                        const dead = shopProducts.filter(p => p.stock > 0).filter(p => {
                            const lastSale = shopMovements.filter(m => m.productId === p.id && m.type === "SALE").sort((a, b) => b.date - a.date)[0];
                            return !lastSale || (Date.now() - lastSale.date > 90 * 86400000);
                        });
                        if (dead.length === 0) return null;
                        const deadValue = dead.reduce((s, p) => s + p.buyPrice * p.stock, 0);
                        return (
                            <div style={{ background: T.card, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 14, padding: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: T.crimson }}>💤 Dead Stock ({dead.length} products)</div>
                                        <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>No sales in 90+ days. Capital locked: <span style={{ color: T.crimson, fontWeight: 800, fontFamily: FONT.mono }}>{fmt(deadValue)}</span></div>
                                    </div>
                                    <Btn variant="danger" size="sm" onClick={() => {
                                        const headers = ["Product", "SKU", "Stock", "Original Price", "Flash Sale Price (20% off)", "Savings"];
                                        const rows = dead.map(p => {
                                            const discPrice = Math.round(p.sellPrice * 0.8);
                                            return [p.name, p.sku, p.stock, p.sellPrice, discPrice, p.sellPrice - discPrice];
                                        });
                                        downloadCSV(`Flash_Sale_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
                                        toast?.(`Flash sale list exported: ${dead.length} products at 20% off`, "success", "🏷️ Flash Sale Created");
                                    }}>🏷️ Create Flash Sale</Btn>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                                    {dead.slice(0, 8).map(p => {
                                        const lastSale = shopMovements.filter(m => m.productId === p.id && m.type === "SALE").sort((a, b) => b.date - a.date)[0];
                                        return (
                                            <div key={p.id} style={{ background: T.crimsonBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: "12px 14px" }}>
                                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                    <span style={{ fontSize: 22 }}>{p.image}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                                                        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{p.stock} units · {fmt(p.buyPrice * p.stock)} locked</div>
                                                        <div style={{ fontSize: 10, color: T.crimson, marginTop: 2 }}>Last sale: {lastSale ? daysAgo(lastSale.date) : "Never"}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    <Btn variant="subtle" onClick={() => {
                        const headers = ["SKU", "Product", "Category", "Stock", "Buy Price", "Cost Value", "Sell Price", "Sell Value", "Potential Profit", "Status"];
                        const rows = shopProducts.map(p => [p.sku, p.name, p.category, p.stock, p.buyPrice, p.buyPrice * p.stock, p.sellPrice, p.sellPrice * p.stock, (p.sellPrice - p.buyPrice) * p.stock, stockStatus(p) === "ok" ? "OK" : stockStatus(p) === "low" ? "LOW" : "OUT"]);
                        downloadCSV(`inventory_valuation_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
                        toast?.("Inventory valuation exported!", "success");
                    }}>📥 Export Inventory Valuation CSV</Btn>
                </div>
            )}

            {/* ===== AUDIT LOG ===== */}
            {view === "audit" && (
                <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ background: T.card, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: T.amber, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                        🔒 All actions are permanently logged for complete business transparency and accountability.
                    </div>

                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                    {["Timestamp", "Action", "Entity", "Details"].map(h => (
                                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", fontFamily: FONT.ui }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(auditLog || []).length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: T.t3 }}>No audit entries yet. Actions will be logged as you use the system.</td></tr>
                                ) : (auditLog || []).slice(0, 100).map((entry, i) => (
                                    <tr key={entry.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontSize: 11, color: T.t3, whiteSpace: "nowrap" }}>{fmtDate(entry.timestamp)}<br />{new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <span style={{ background: `${T.amber}18`, color: T.amber, fontSize: 10, padding: "3px 8px", borderRadius: 5, fontWeight: 700, fontFamily: FONT.mono }}>{entry.action}</span>
                                        </td>
                                        <td style={{ padding: "10px 14px", fontSize: 12, color: T.t2 }}>
                                            <span style={{ color: T.t3, fontSize: 10 }}>{entry.entityType}/</span>{entry.entityId}
                                        </td>
                                        <td style={{ padding: "10px 14px", fontSize: 12, color: T.t3, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{entry.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

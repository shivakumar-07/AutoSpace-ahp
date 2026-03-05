import { useState, useMemo } from "react";
import { T, FONT } from "../theme";
import { fmt, pct, fmtDate, fmtTime, getMovementConfig, exportMovementsCSV } from "../utils";
import { StatCard, Input, Btn } from "../components/ui";

export function HistoryPage({ movements, activeShopId }) {
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const shopMovements = useMemo(() => movements.filter(m => m.shopId === activeShopId), [movements, activeShopId]);

    const sorted = useMemo(() => [...shopMovements].sort((a, b) => b.date - a.date), [shopMovements]);

    const filtered = sorted
        .filter(m => {
            if (filter === "ALL") return true;
            if (filter === "ADJUSTMENTS") return ["RETURN_IN", "RETURN_OUT", "CREDIT_NOTE", "DEBIT_NOTE", "DAMAGE", "THEFT", "AUDIT", "OPENING", "TRANSFER_IN", "TRANSFER_OUT", "ADJUST"].includes(m.type);
            return m.type === filter;
        })
        .filter(m => !search || [m.productName, m.invoiceNo, m.supplier, m.supplierName, m.customerName, m.note].some(s => (s || "").toLowerCase().includes(search.toLowerCase())))
        .filter(m => {
            if (dateFrom) { const from = new Date(dateFrom).getTime(); if (m.date < from) return false; }
            if (dateTo) { const to = new Date(dateTo).setHours(23, 59, 59, 999); if (m.date > to) return false; }
            return true;
        });

    const totals = useMemo(() => ({
        purchases: shopMovements.filter(m => m.type === "PURCHASE").reduce((s, m) => s + m.total, 0),
        sales: shopMovements.filter(m => m.type === "SALE").reduce((s, m) => s + m.total, 0),
        profit: shopMovements.filter(m => m.type === "SALE").reduce((s, m) => s + (m.profit || 0), 0),
        count_p: shopMovements.filter(m => m.type === "PURCHASE").length,
        count_s: shopMovements.filter(m => m.type === "SALE").length,
        count_adj: shopMovements.filter(m => !["PURCHASE", "SALE", "ESTIMATE", "RECEIPT", "PAYMENT"].includes(m.type)).length,
    }), [shopMovements]);

    const filterChips = [
        ["ALL", "All"],
        ["PURCHASE", "Purchases"],
        ["SALE", "Sales"],
        ["ESTIMATE", "Quotations"],
        ["ADJUSTMENTS", "Adjustments"],
        ["RECEIPT", "Receipts"],
    ];

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <StatCard label="Total Purchases" value={fmt(totals.purchases)} icon="📥" color={T.sky} sub={`${totals.count_p} entries`} />
                <StatCard label="Total Sales" value={fmt(totals.sales)} icon="📤" color={T.amber} sub={`${totals.count_s} transactions`} />
                <StatCard label="Total Profit" value={fmt(totals.profit)} icon="📈" color={T.emerald} sub={pct(totals.profit, totals.sales) + " margin"} />
                <StatCard label="Adjustments" value={String(totals.count_adj)} icon="⚖️" color={T.violet} sub="Returns, damages, audits" />
            </div>

            <div style={{ background: T.card, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: T.amber, fontWeight: 500, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 8 }}>
                🔒 <span>Permanent audit trail — all entries are non-editable and auto-logged for accountability.</span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {filterChips.map(([v, l]) => {
                    const cfg = v !== "ALL" && v !== "ADJUSTMENTS" ? getMovementConfig(v) : null;
                    const isActive = filter === v;
                    const chipColor = cfg ? cfg.color : v === "ADJUSTMENTS" ? T.violet : T.borderHi;
                    return (
                        <button key={v} onClick={() => setFilter(v)} style={{
                            background: isActive ? chipColor : "transparent",
                            color: isActive ? "#000" : T.t2,
                            border: `1px solid ${isActive ? chipColor : T.border}`,
                            borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s"
                        }}>{l}</button>
                    );
                })}
                <div style={{ flex: 1, minWidth: 180 }}><Input value={search} onChange={setSearch} placeholder="Search product, invoice, customer…" icon="🔍" /></div>

                {/* Date Range */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 10px", color: T.t1, fontFamily: FONT.ui, fontSize: 12 }} />
                    <span style={{ color: T.t3, fontSize: 11 }}>to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 10px", color: T.t1, fontFamily: FONT.ui, fontSize: 12 }} />
                </div>

                <Btn variant="subtle" size="sm" onClick={() => exportMovementsCSV(filtered)}>⬇ Export CSV</Btn>
            </div>

            <div style={{ fontSize: 12, color: T.t3 }}>
                Showing <span style={{ color: T.t1, fontWeight: 700 }}>{filtered.length}</span> of {shopMovements.length} entries
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                            {["Date & Time", "Product", "Type", "Qty", "Amount", "Profit", "Invoice", "Party", "Payment", "Details"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: T.t3, fontFamily: FONT.ui }}>No records found.</td></tr>
                        ) : filtered.map((m, i) => {
                            const cfg = getMovementConfig(m.type);
                            const isExpanded = expandedId === m.id;
                            return (
                                <tr key={m.id} className="row-hover" onClick={() => setExpandedId(isExpanded ? null : m.id)} style={{
                                    borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none", background: isExpanded ? T.surface : T.card, cursor: "pointer", transition: "background 0.1s"
                                }}>
                                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                                        <div style={{ fontSize: 12, color: T.t1, fontFamily: FONT.mono }}>{fmtDate(m.date)}</div>
                                        <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{fmtTime(m.date)}</div>
                                    </td>
                                    <td style={{ padding: "12px 14px", maxWidth: 160 }}>
                                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.productName}</div>
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "3px 9px", borderRadius: 99, fontWeight: 700, fontFamily: FONT.ui, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                            <span style={{ fontSize: 12 }}>{cfg.icon}</span> {cfg.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 900, fontSize: 15, color: cfg.color }}>
                                        {cfg.sym}{Math.abs(m.qty)}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 600, color: T.t1 }}>{m.total ? fmt(m.total) : <span style={{ color: T.t4 }}>—</span>}</td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: m.profit > 0 ? T.emerald : m.profit < 0 ? T.crimson : T.t4 }}>
                                        {m.profit ? (m.profit > 0 ? "+" : "") + fmt(m.profit) : <span style={{ color: T.t4 }}>—</span>}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{m.invoiceNo || <span style={{ color: T.t4 }}>—</span>}</td>
                                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.t2, maxWidth: 130 }}>
                                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {m.type === "PURCHASE" ? (m.supplierName || m.supplier) : m.customerName || "Walk-in"}
                                        </div>
                                        {m.vehicleReg && <div style={{ fontSize: 10, color: T.amber, fontFamily: FONT.mono, marginTop: 2 }}>{m.vehicleReg}</div>}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        {(m.payment || m.paymentMode) && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
                                                    {(m.payment || m.paymentMode) === "Credit" ? <span style={{ color: T.crimson }}>💳 Credit</span> : (m.payment || m.paymentMode)}
                                                </span>
                                                {m.paymentStatus && (
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: m.paymentStatus === "paid" || m.paymentStatus === "completed" ? T.emerald : T.crimson, textTransform: "uppercase" }}>
                                                        {m.paymentStatus}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontSize: 11, color: T.t3, maxWidth: 140 }}>
                                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note || "—"}</span>
                                        {/* Expanded Details */}
                                        {isExpanded && m.adjustmentMeta && (
                                            <div style={{ marginTop: 8, padding: "8px 10px", background: T.bg, borderRadius: 6, fontSize: 11, color: T.t2, lineHeight: 1.6 }}>
                                                <div>Type: <span style={{ color: T.t1, fontWeight: 600 }}>{m.adjustmentMeta.type}</span></div>
                                                <div>Stock: {m.adjustmentMeta.previousStock} → {m.adjustmentMeta.newStock}</div>
                                                {m.adjustmentMeta.reason && <div>Reason: {m.adjustmentMeta.reason}</div>}
                                                {m.adjustmentMeta.refundMethod && <div>Refund: {m.adjustmentMeta.refundMethod}</div>}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

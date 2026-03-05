import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate, daysAgo, uid, downloadCSV, generateCSV, getDebtAging, generateWhatsAppReminder } from "../utils";
import { Btn, Input, Select, Modal, Field, Divider } from "../components/ui";

export function PartiesPage({ parties, movements, vehicles, activeShopId, onSaveParty, onSaveVehicle, toast, onPaymentReceipt }) {
    const [view, setView] = useState("customers");
    const [search, setSearch] = useState("");
    const [editParty, setEditParty] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [receiptModal, setReceiptModal] = useState(null);
    const [receiptAmount, setReceiptAmount] = useState("");
    const [receiptMode, setReceiptMode] = useState("Cash");
    const [receiptNotes, setReceiptNotes] = useState("");
    const [allocMode, setAllocMode] = useState("fifo");
    const [billAllocations, setBillAllocations] = useState({});

    const shopParties = useMemo(() => (parties || []).filter(p => p.shopId === activeShopId), [parties, activeShopId]);
    const shopVehicles = useMemo(() => (vehicles || []).filter(v => v.shopId === activeShopId), [vehicles, activeShopId]);
    const shopMovements = useMemo(() => (movements || []).filter(m => m.shopId === activeShopId), [movements, activeShopId]);

    const filtered = useMemo(() => {
        const typeFilter = view === "customers" ? "customer" : "supplier";
        return shopParties
            .filter(p => p.type === typeFilter || p.type === "both")
            .filter(p => !search || [p.name, p.phone, p.gstin, p.city].some(s => (s || "").toLowerCase().includes(search.toLowerCase())))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [shopParties, view, search]);

    const getBalance = (party) => {
        let balance = party.openingBalance || 0;
        shopMovements.forEach(m => {
            if (party.type === "customer" || party.type === "both") {
                if (m.customerName === party.name && m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) {
                    balance += (m.total || 0) - (m.paidAmount || 0);
                }
                if (m.type === "RECEIPT" && m.customerName === party.name && !m.allocations?.length) balance -= m.total;
            }
            if (party.type === "supplier" || party.type === "both") {
                if ((m.supplierName === party.name || m.supplier === party.name) && m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) {
                    balance += (m.total || 0) - (m.paidAmount || 0);
                }
                if (m.type === "PAYMENT" && m.supplierName === party.name && !m.allocations?.length) balance -= m.total;
            }
        });
        return balance;
    };

    const getTransactionCount = (party) => {
        return shopMovements.filter(m =>
            m.customerName === party.name || m.supplierName === party.name || m.supplier === party.name
        ).length;
    };

    const getAgingBreakdown = (party) => {
        const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
        const now = Date.now();
        shopMovements.forEach(m => {
            const isMatch = (party.type === "customer" || party.type === "both")
                ? (m.customerName === party.name && m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit"))
                : ((m.supplierName === party.name || m.supplier === party.name) && m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit"));
            if (!isMatch) return;
            const days = Math.floor((now - m.date) / 86400000);
            if (days <= 30) buckets["0-30"] += m.total;
            else if (days <= 60) buckets["31-60"] += m.total;
            else if (days <= 90) buckets["61-90"] += m.total;
            else buckets["90+"] += m.total;
        });
        return buckets;
    };

    const totalOutstanding = filtered.reduce((s, p) => s + getBalance(p), 0);

    const stats = {
        total: filtered.length,
        withCredit: filtered.filter(p => getBalance(p) > 0).length,
        totalOutstanding,
    };

    const getPartyLedger = (party) => {
        return shopMovements
            .filter(m => m.customerName === party.name || m.supplierName === party.name || m.supplier === party.name)
            .sort((a, b) => b.date - a.date)
            .slice(0, 20);
    };

    const handleExportCSV = () => {
        const headers = ["Name", "Type", "Phone", "GSTIN", "City", "Credit Limit", "Outstanding", "Transactions", "Tags"];
        const rows = filtered.map(p => [p.name, p.type, p.phone, p.gstin || "", p.city || "", p.creditLimit, getBalance(p), getTransactionCount(p), (p.tags || []).join(", ")]);
        downloadCSV(`${view}_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        toast?.("Party list exported!", "success");
    };

    const getOutstandingBills = (party) => {
        const isCustomer = party.type === "customer" || party.type === "both";
        const isSupplier = party.type === "supplier" || party.type === "both";
        return shopMovements
            .filter(m => {
                if (isCustomer && view === "customers" && m.customerName === party.name && m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) return true;
                if (isSupplier && view === "suppliers" && (m.supplierName === party.name || m.supplier === party.name) && m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) return true;
                return false;
            })
            .sort((a, b) => a.date - b.date)
            .map(m => ({
                ...m,
                billOutstanding: (m.total || 0) - (m.paidAmount || 0),
            }));
    };

    const doFifoAllocation = (bills, totalAmount) => {
        const allocs = {};
        let remaining = totalAmount;
        for (const bill of bills) {
            if (remaining <= 0) break;
            const allocAmt = Math.min(remaining, bill.billOutstanding);
            if (allocAmt > 0) {
                allocs[bill.id] = allocAmt;
                remaining -= allocAmt;
            }
        }
        return allocs;
    };

    const handleOpenReceiptModal = (party) => {
        setReceiptModal(party);
        const bal = getBalance(party);
        setReceiptAmount(String(bal));
        setAllocMode("fifo");
        const bills = getOutstandingBills(party);
        setBillAllocations(doFifoAllocation(bills, bal));
    };

    const handleAllocAmountChange = (billId, value) => {
        setAllocMode("manual");
        setBillAllocations(prev => {
            const next = { ...prev };
            const amt = parseFloat(value) || 0;
            if (amt <= 0) {
                delete next[billId];
            } else {
                next[billId] = amt;
            }
            return next;
        });
    };

    const handleToggleBill = (bill) => {
        setAllocMode("manual");
        setBillAllocations(prev => {
            const next = { ...prev };
            if (next[bill.id]) {
                delete next[bill.id];
            } else {
                const totalAllocated = Object.values(next).reduce((s, v) => s + v, 0);
                const receiptAmt = parseFloat(receiptAmount) || 0;
                const remaining = receiptAmt - totalAllocated;
                next[bill.id] = Math.min(remaining > 0 ? remaining : bill.billOutstanding, bill.billOutstanding);
            }
            return next;
        });
    };

    useEffect(() => {
        if (receiptModal && allocMode === "fifo") {
            const bills = getOutstandingBills(receiptModal);
            const amt = parseFloat(receiptAmount) || 0;
            setBillAllocations(doFifoAllocation(bills, amt));
        }
    }, [receiptAmount, allocMode, receiptModal]);

    const totalAllocated = Object.values(billAllocations).reduce((s, v) => s + v, 0);

    const handleRecordReceipt = () => {
        if (!receiptModal || !receiptAmount || +receiptAmount <= 0) return;
        const bal = getBalance(receiptModal);
        const amt = Math.min(+receiptAmount, bal);
        const allocations = Object.entries(billAllocations)
            .filter(([_, v]) => v > 0)
            .map(([movementId, amount]) => ({ movementId, amount }));
        onPaymentReceipt?.({
            partyName: receiptModal.name,
            partyPhone: receiptModal.phone || "",
            amount: amt,
            paymentMode: receiptMode,
            notes: receiptNotes || `Udhaar settlement from ${receiptModal.name}`,
            allocations,
        });
        toast?.(`Payment of ${fmt(amt)} allocated against ${allocations.length} bill(s) from ${receiptModal.name}`, "success");
        setReceiptModal(null);
        setReceiptAmount("");
        setReceiptMode("Cash");
        setReceiptNotes("");
        setBillAllocations({});
        setAllocMode("fifo");
    };

    const AGING_COLORS = {
        "0-30": T.emerald,
        "31-60": T.amber,
        "61-90": "#FB923C",
        "90+": T.crimson,
    };

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
                {[["customers", "👤 Customers"], ["suppliers", "🏭 Suppliers"], ["vehicles", "🚗 Vehicles"]].map(([id, label]) => (
                    <button key={id} onClick={() => setView(id)} className="btn-hover-subtle"
                        style={{ background: view === id ? `${T.amber}22` : "transparent", color: view === id ? T.amber : T.t3, border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, transition: "0.2s" }}>
                        {label}
                    </button>
                ))}
            </div>

            {view === "vehicles" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
                        {shopVehicles.map(v => {
                            const owner = shopParties.find(p => p.id === v.ownerId);
                            return (
                                <div key={v.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, transition: "0.2s" }} className="row-hover">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>{v.make} {v.model}</div>
                                            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{v.variant} · {v.year} · {v.fuelType}</div>
                                        </div>
                                        <span style={{ background: T.skyBg, color: T.sky, padding: "4px 10px", borderRadius: 6, fontWeight: 800, fontFamily: FONT.mono, fontSize: 13 }}>{v.registrationNumber}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                                        <div><span style={{ color: T.t3 }}>Owner:</span> <span style={{ color: T.t1, fontWeight: 600 }}>{owner?.name || "Unknown"}</span></div>
                                        <div><span style={{ color: T.t3 }}>Engine:</span> <span style={{ color: T.t2 }}>{v.engineType}</span></div>
                                        <div><span style={{ color: T.t3 }}>Odometer:</span> <span style={{ color: T.amber, fontWeight: 700, fontFamily: FONT.mono }}>{(v.odometer || 0).toLocaleString()} km</span></div>
                                        <div><span style={{ color: T.t3 }}>VIN:</span> <span style={{ color: T.t2, fontFamily: FONT.mono, fontSize: 10 }}>{v.vin}</span></div>
                                    </div>
                                    {v.notes && <div style={{ marginTop: 10, padding: "8px 12px", background: `${T.amber}0A`, borderRadius: 8, fontSize: 11, color: T.t3 }}>📝 {v.notes}</div>}
                                </div>
                            );
                        })}
                    </div>
                    {shopVehicles.length === 0 && <div style={{ textAlign: "center", padding: 48, color: T.t3 }}>No vehicles registered. Vehicles are added via Job Cards.</div>}
                </div>
            )}

            {view !== "vehicles" && (
                <>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 20px", flex: 1 }}>
                            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>Total {view}</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{stats.total}</div>
                        </div>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 20px", flex: 1 }}>
                            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>With Credit</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: T.crimson, fontFamily: FONT.mono }}>{stats.withCredit}</div>
                        </div>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 20px", flex: 2 }}>
                            <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase" }}>Total Outstanding</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: totalOutstanding > 0 ? T.crimson : T.emerald, fontFamily: FONT.mono }}>{fmt(totalOutstanding)}</div>
                        </div>
                    </div>

                    {totalOutstanding > 0 && (
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 20px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Aging Summary</div>
                            <div style={{ display: "flex", gap: 12 }}>
                                {(() => {
                                    const totals = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
                                    filtered.forEach(p => {
                                        const aging = getAgingBreakdown(p);
                                        Object.keys(totals).forEach(k => { totals[k] += aging[k]; });
                                    });
                                    return Object.entries(totals).map(([bucket, amount]) => (
                                        <div key={bucket} style={{ flex: 1, background: `${AGING_COLORS[bucket]}11`, border: `1px solid ${AGING_COLORS[bucket]}33`, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: AGING_COLORS[bucket], textTransform: "uppercase", marginBottom: 4 }}>{bucket} days</div>
                                            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT.mono, color: AGING_COLORS[bucket] }}>{fmt(amount)}</div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1 }}><Input value={search} onChange={setSearch} placeholder={`Search ${view}…`} icon="🔍" /></div>
                        <Btn variant="subtle" size="sm" onClick={handleExportCSV}>📥 Export CSV</Btn>
                        <Btn size="sm" onClick={() => { setEditParty(null); setShowAddModal(true); }}>＋ Add {view === "customers" ? "Customer" : "Supplier"}</Btn>
                    </div>

                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                    {["Name", "Phone", "GSTIN", "City", "Credit Limit", "Outstanding", "Aging", "Txns", "Actions"].map((h, i) => (
                                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", fontFamily: FONT.ui }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: T.t3 }}>No {view} found.</td></tr>
                                ) : filtered.map(p => {
                                    const bal = getBalance(p);
                                    const txns = getTransactionCount(p);
                                    const isExpanded = expandedId === p.id;
                                    const aging = bal > 0 ? getAgingBreakdown(p) : null;
                                    const oldestPending = shopMovements
                                        .filter(m => (m.customerName === p.name || m.supplierName === p.name || m.supplier === p.name) && (m.paymentStatus === "pending" || m.paymentMode === "Credit") && (m.type === "SALE" || m.type === "PURCHASE"))
                                        .sort((a, b) => a.date - b.date)[0];
                                    const debtAge = oldestPending ? getDebtAging(oldestPending.date) : null;
                                    return (
                                        <>
                                            <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{p.name}</div>
                                                    {p.email && <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{p.email}</div>}
                                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                                                        {(p.tags || []).map(t => (
                                                            <span key={t} style={{ background: `${T.amber}14`, color: T.amber, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{t}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{p.phone}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: p.gstin ? T.t2 : T.t4 }}>{p.gstin || "—"}</td>
                                                <td style={{ padding: "12px 14px", fontSize: 12, color: T.t2 }}>{p.city || "—"}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{fmt(p.creditLimit)}</td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, color: bal > 0 ? T.crimson : T.emerald }}>{bal > 0 ? fmt(bal) : "—"}</td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    {bal > 0 ? (
                                                        <div style={{ width: 120, height: 10, background: T.border, borderRadius: 5, overflow: "hidden", display: "flex" }}>
                                                            {Object.entries(aging || {}).map(([bucket, amount]) => {
                                                                const width = (amount / bal) * 100;
                                                                if (width === 0) return null;
                                                                return (
                                                                    <div key={bucket} 
                                                                        style={{ 
                                                                            width: `${width}%`, 
                                                                            height: "100%", 
                                                                            background: AGING_COLORS[bucket],
                                                                            position: "relative"
                                                                        }} 
                                                                        className="aging-segment"
                                                                    >
                                                                        <div className="aging-tooltip" style={{
                                                                            position: "absolute",
                                                                            bottom: "100%",
                                                                            left: "50%",
                                                                            transform: "translateX(-50%)",
                                                                            background: T.surface,
                                                                            border: `1px solid ${T.border}`,
                                                                            padding: "4px 8px",
                                                                            borderRadius: 4,
                                                                            fontSize: 10,
                                                                            color: T.t1,
                                                                            whiteSpace: "nowrap",
                                                                            visibility: "hidden",
                                                                            opacity: 0,
                                                                            transition: "0.2s",
                                                                            zIndex: 10,
                                                                            marginBottom: 4,
                                                                            pointerEvents: "none",
                                                                            boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                                                                        }}>
                                                                            {bucket}d: {fmt(amount)}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: T.t4, fontSize: 11 }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{txns}</td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
                                                        <Btn size="xs" variant="subtle" onClick={() => { setEditParty(p); setShowAddModal(true); }}>Edit</Btn>
                                                        {bal > 0 && (view === "customers" || view === "suppliers") && (
                                                            <Btn size="xs" variant="emerald" onClick={() => handleOpenReceiptModal(p)}>💰</Btn>
                                                        )}
                                                        {bal > 0 && p.phone && (
                                                            <Btn size="xs" onClick={() => {
                                                                const url = generateWhatsAppReminder(p.name, p.phone, bal);
                                                                window.open(url, "_blank");
                                                                navigator.clipboard.writeText(url).then(() => {
                                                                    toast?.("WhatsApp link copied!", "success");
                                                                });
                                                            }} style={{ background: "#25D366", color: "#fff", borderColor: "#25D366", fontWeight: 800 }}>
                                                                <span style={{ marginRight: 6 }}>💬</span> WhatsApp Reminder
                                                            </Btn>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr key={p.id + "_detail"}>
                                                    <td colSpan={9} style={{ padding: "0 14px 14px 14px", background: T.surface }}>
                                                        <div style={{ fontSize: 12, fontWeight: 800, color: T.t1, marginBottom: 8, marginTop: 12 }}>Credit Utilization</div>
                                                        <div style={{ width: "100%", height: 12, background: T.border, borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                                                            {(() => {
                                                                const pct = Math.min((bal / p.creditLimit) * 100, 100);
                                                                const color = pct > 80 ? T.crimson : pct > 50 ? T.amber : T.emerald;
                                                                return <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />;
                                                            })()}
                                                        </div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.t3, fontWeight: 600, marginBottom: 16 }}>
                                                            <span>Used: {fmt(bal)}</span>
                                                            <span>Limit: {fmt(p.creditLimit)}</span>
                                                            <span>Available: {fmt(Math.max(0, p.creditLimit - bal))}</span>
                                                        </div>

                                                        {bal > 0 && aging && (
                                                            <div style={{ marginTop: 10, marginBottom: 12 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 800, color: T.t1, marginBottom: 8 }}>Aging Breakdown</div>
                                                                <div style={{ display: "flex", gap: 8 }}>
                                                                    {Object.entries(aging).map(([bucket, amount]) => (
                                                                        <div key={bucket} style={{ flex: 1, background: amount > 0 ? `${AGING_COLORS[bucket]}11` : T.card, border: `1px solid ${amount > 0 ? AGING_COLORS[bucket] + "33" : T.border}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                                                                            <div style={{ fontSize: 9, fontWeight: 700, color: amount > 0 ? AGING_COLORS[bucket] : T.t4, textTransform: "uppercase" }}>{bucket}d</div>
                                                                            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT.mono, color: amount > 0 ? AGING_COLORS[bucket] : T.t4 }}>{amount > 0 ? fmt(amount) : "—"}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: 12, fontWeight: 800, color: T.t1, marginBottom: 8, marginTop: 8 }}>Recent Transactions</div>
                                                        {getPartyLedger(p).length === 0 ? (
                                                            <div style={{ color: T.t3, fontSize: 12 }}>No transactions yet.</div>
                                                        ) : (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                {getPartyLedger(p).map(m => {
                                                                    const billOutstanding = (m.type === "SALE" || m.type === "PURCHASE") && (m.paymentStatus === "pending" || m.paymentStatus === "partial")
                                                                        ? (m.total || 0) - (m.paidAmount || 0)
                                                                        : null;
                                                                    return (
                                                                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: T.card, borderRadius: 6, fontSize: 11 }}>
                                                                            <span style={{ color: T.t3, minWidth: 120 }}>{fmtDate(m.date)} · {m.type}</span>
                                                                            <span style={{ color: T.t2, flex: 1, marginLeft: 8 }}>{m.productName}{m.invoiceNo ? ` · ${m.invoiceNo}` : ""}</span>
                                                                            <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: m.type === "SALE" || m.type === "PURCHASE" ? T.amber : T.emerald, minWidth: 70, textAlign: "right" }}>{fmt(m.total)}</span>
                                                                            {billOutstanding !== null && (
                                                                                <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.crimson, fontSize: 10, minWidth: 70, textAlign: "right", marginLeft: 8 }}>Due: {fmt(billOutstanding)}</span>
                                                                            )}
                                                                            <span style={{ color: m.paymentStatus === "paid" ? T.emerald : m.paymentStatus === "partial" ? T.amber : T.crimson, fontWeight: 600, fontSize: 10, minWidth: 55, textAlign: "right", marginLeft: 8, textTransform: "uppercase" }}>{m.paymentStatus}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {p.notes && <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.amber}08`, borderRadius: 6, fontSize: 11, color: T.t3 }}>📝 {p.notes}</div>}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <PartyFormModal
                open={showAddModal}
                party={editParty}
                type={view === "customers" ? "customer" : "supplier"}
                onClose={() => { setShowAddModal(false); setEditParty(null); }}
                onSave={(p) => {
                    onSaveParty?.(p);
                    toast?.(editParty ? `${p.name} updated!` : `${p.name} added!`, "success");
                    setShowAddModal(false);
                    setEditParty(null);
                }}
                activeShopId={activeShopId}
            />

            <Modal open={!!receiptModal} onClose={() => { setReceiptModal(null); setReceiptAmount(""); setReceiptMode("Cash"); setReceiptNotes(""); setBillAllocations({}); setAllocMode("fifo"); }} title="Record Payment Receipt" width={640}>
                {receiptModal && (() => {
                    const outstandingBills = getOutstandingBills(receiptModal);
                    const bal = getBalance(receiptModal);
                    return (
                        <>
                            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>{receiptModal.name}</div>
                                        <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Outstanding: <span style={{ color: T.crimson, fontWeight: 800, fontFamily: FONT.mono }}>{fmt(bal)}</span></div>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.t3 }}>{outstandingBills.length} pending bill(s)</div>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                                <Field label="Amount (₹)">
                                    <Input type="number" value={receiptAmount} onChange={setReceiptAmount} prefix="₹" />
                                </Field>
                                <Field label="Payment Mode">
                                    <Select value={receiptMode} onChange={setReceiptMode} options={[
                                        { value: "Cash", label: "Cash" },
                                        { value: "UPI", label: "UPI" },
                                        { value: "Bank Transfer", label: "Bank Transfer" },
                                        { value: "Cheque", label: "Cheque" },
                                        { value: "Card", label: "Card" },
                                    ]} />
                                </Field>
                            </div>

                            {outstandingBills.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: T.t1 }}>Allocate Against Bills</div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => setAllocMode("fifo")} style={{ background: allocMode === "fifo" ? `${T.amber}22` : "transparent", color: allocMode === "fifo" ? T.amber : T.t3, border: `1px solid ${allocMode === "fifo" ? T.amber + "44" : T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>FIFO Auto</button>
                                            <button onClick={() => setAllocMode("manual")} style={{ background: allocMode === "manual" ? `${T.amber}22` : "transparent", color: allocMode === "manual" ? T.amber : T.t3, border: `1px solid ${allocMode === "manual" ? T.amber + "44" : T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>Manual</button>
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 10, background: T.surface }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}></th>
                                                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>Date</th>
                                                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>Invoice</th>
                                                    <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>Bill Amt</th>
                                                    <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>Outstanding</th>
                                                    <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>Allocate</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {outstandingBills.map(bill => {
                                                    const isSelected = !!billAllocations[bill.id];
                                                    const allocAmt = billAllocations[bill.id] || 0;
                                                    return (
                                                        <tr key={bill.id} style={{ borderBottom: `1px solid ${T.border}`, background: isSelected ? `${T.emerald}08` : "transparent" }}>
                                                            <td style={{ padding: "6px 10px" }}>
                                                                <input type="checkbox" checked={isSelected} onChange={() => handleToggleBill(bill)} style={{ cursor: "pointer", accentColor: T.emerald }} />
                                                            </td>
                                                            <td style={{ padding: "6px 10px", fontSize: 11, color: T.t2 }}>{fmtDate(bill.date)}</td>
                                                            <td style={{ padding: "6px 10px", fontSize: 11, color: T.t1, fontWeight: 600, fontFamily: FONT.mono }}>{bill.invoiceNo || bill.id.slice(0, 8)}</td>
                                                            <td style={{ padding: "6px 10px", fontSize: 11, color: T.t2, fontFamily: FONT.mono, textAlign: "right" }}>{fmt(bill.total)}</td>
                                                            <td style={{ padding: "6px 10px", fontSize: 11, color: T.crimson, fontWeight: 700, fontFamily: FONT.mono, textAlign: "right" }}>{fmt(bill.billOutstanding)}</td>
                                                            <td style={{ padding: "6px 10px", textAlign: "right" }}>
                                                                {isSelected ? (
                                                                    <input type="number" value={allocAmt} onChange={e => {
                                                                        const val = Math.min(parseFloat(e.target.value) || 0, bill.billOutstanding);
                                                                        handleAllocAmountChange(bill.id, val);
                                                                    }} style={{ width: 80, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", color: T.emerald, fontSize: 11, fontFamily: FONT.mono, fontWeight: 700, textAlign: "right", outline: "none" }} />
                                                                ) : (
                                                                    <span style={{ fontSize: 11, color: T.t4 }}>—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "6px 10px", background: T.card, borderRadius: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>Total Allocated:</span>
                                        <span style={{ fontSize: 12, fontWeight: 800, fontFamily: FONT.mono, color: Math.abs(totalAllocated - (+receiptAmount || 0)) < 0.01 ? T.emerald : T.amber }}>{fmt(totalAllocated)} / {fmt(+receiptAmount || 0)}</span>
                                    </div>
                                    {totalAllocated > (+receiptAmount || 0) + 0.01 && (
                                        <div style={{ fontSize: 10, color: T.crimson, fontWeight: 600, marginTop: 4 }}>⚠ Allocation exceeds receipt amount</div>
                                    )}
                                </div>
                            )}

                            <Field label="Notes (optional)">
                                <Input value={receiptNotes} onChange={setReceiptNotes} placeholder="e.g., Settled via Google Pay" />
                            </Field>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                                <Btn variant="ghost" onClick={() => { setReceiptModal(null); setReceiptAmount(""); setReceiptMode("Cash"); setReceiptNotes(""); setBillAllocations({}); setAllocMode("fifo"); }}>Cancel</Btn>
                                <Btn variant="emerald" onClick={handleRecordReceipt} disabled={!receiptAmount || +receiptAmount <= 0 || totalAllocated > (+receiptAmount || 0) + 0.01}>💰 Record Receipt</Btn>
                            </div>
                        </>
                    );
                })()}
            </Modal>
        </div>
    );
}

function PartyFormModal({ open, party, type, onClose, onSave, activeShopId }) {
    const isEdit = !!party;
    const blank = { name: "", phone: "", email: "", gstin: "", address: "", city: "", creditLimit: "0", creditDays: "30", loyaltyPoints: "0", openingBalance: "0", tags: "", notes: "" };
    const [f, setF] = useState(blank);

    useEffect(() => {
        if (party) {
            setF({ ...party, creditLimit: String(party.creditLimit || 0), creditDays: String(party.creditDays || 30), loyaltyPoints: String(party.loyaltyPoints || 0), openingBalance: String(party.openingBalance || 0), tags: (party.tags || []).join(", ") });
        } else {
            setF(blank);
        }
    }, [party, open]);

    const set = k => v => setF(p => ({ ...p, [k]: v }));

    const handleSave = () => {
        if (!f.name.trim()) return;
        onSave({
            ...f,
            id: party?.id || (type === "customer" ? "cust" : "sup") + "_" + uid(),
            shopId: party?.shopId || activeShopId,
            type: party?.type || type,
            creditLimit: +f.creditLimit || 0,
            creditDays: +f.creditDays || 30,
            loyaltyPoints: +f.loyaltyPoints || 0,
            openingBalance: +f.openingBalance || 0,
            tags: f.tags ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
            vehicles: party?.vehicles || [],
            isActive: true,
            createdAt: party?.createdAt || Date.now(),
        });
    };

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${type === "customer" ? "Customer" : "Supplier"}` : `Add ${type === "customer" ? "Customer" : "Supplier"}`} width={560}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "span 2" }}><Field label="Name" required><Input value={f.name} onChange={set("name")} placeholder="Business or person name" /></Field></div>
                <Field label="Phone"><Input value={f.phone} onChange={set("phone")} placeholder="+91 9876543210" /></Field>
                <Field label="Email"><Input value={f.email} onChange={set("email")} placeholder="email@example.com" /></Field>
                <Field label="GSTIN"><Input value={f.gstin} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" /></Field>
                <Field label="City"><Input value={f.city} onChange={set("city")} placeholder="Hyderabad" /></Field>
                <div style={{ gridColumn: "span 2" }}><Field label="Address"><Input value={f.address} onChange={set("address")} placeholder="Full address" /></Field></div>
                <Divider label="Credit & Finance" />
                <div style={{ gridColumn: "span 2" }} />
                <Field label="Credit Limit (₹)"><Input type="number" value={f.creditLimit} onChange={set("creditLimit")} prefix="₹" /></Field>
                <Field label="Credit Days"><Input type="number" value={f.creditDays} onChange={set("creditDays")} suffix="days" /></Field>
                <Field label="Opening Balance (₹)"><Input type="number" value={f.openingBalance} onChange={set("openingBalance")} prefix="₹" /></Field>
                {type === "customer" && <Field label="Loyalty Points"><Input type="number" value={f.loyaltyPoints} onChange={set("loyaltyPoints")} /></Field>}
                <div style={{ gridColumn: "span 2" }}><Field label="Tags (comma-separated)"><Input value={f.tags} onChange={set("tags")} placeholder="regular, mechanic, credit" /></Field></div>
                <div style={{ gridColumn: "span 2" }}><Field label="Notes"><Input value={f.notes} onChange={set("notes")} placeholder="Internal notes" /></Field></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn variant="amber" onClick={handleSave}>💾 {isEdit ? "Save Changes" : `Add ${type === "customer" ? "Customer" : "Supplier"}`}</Btn>
            </div>
        </Modal>
    );
}

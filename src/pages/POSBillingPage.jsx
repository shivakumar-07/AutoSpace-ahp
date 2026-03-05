import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDateTime, uid, margin, getCompanyInfo } from "../utils";
import { getNextVoucherNumber } from "../voucherNumbering";
import { Modal, Field, Input, Select, Divider, Btn } from "../components/ui";

/**
 * POSBillingPage — Multi-item Point of Sale billing for quick counter sales.
 * Supports:
 *   - Adding multiple products to a single invoice
 *   - Per-line quantity, price override, and discount
 *   - GST auto-calculation per line
 *   - Multi-tender payment splitting (Cash + UPI + Card + Credit)
 *   - Customer details, vehicle reg, mechanic info
 *   - Save as Sale or Quotation (no stock deduction)
 *   - Thermal-print-ready invoice preview
 */
export function POSBillingPage({ products, parties, movements, activeShopId, onMultiSale, toast, activeStaffMember, onSwitchStaff, onStaffLogout, staffHasPermission }) {
    const canViewMargin = !staffHasPermission || staffHasPermission("can_view_margin");
    const shopProducts = useMemo(() => products.filter(p => p.shopId === activeShopId && p.isActive !== false), [products, activeShopId]);
    const shopParties = useMemo(() => (parties || []).filter(p => p.shopId === activeShopId), [parties, activeShopId]);
    const shopMovements = useMemo(() => (movements || []).filter(m => m.shopId === activeShopId), [movements, activeShopId]);
    const companyInfo = getCompanyInfo();

    const [billType, setBillType] = useState("Sale");
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [vehicleReg, setVehicleReg] = useState("");
    const [mechanic, setMechanic] = useState("");
    const [notes, setNotes] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cash");
    const [showInvoice, setShowInvoice] = useState(false);
    const [saving, setSaving] = useState(false);
    const [invoiceNo, setInvoiceNo] = useState("");
    const searchRef = useRef(null);

    const [heldInvoices, setHeldInvoices] = useState(() => {
        try { return JSON.parse(localStorage.getItem("vl_held_invoices") || "[]"); } catch { return []; }
    });
    const [showHeldList, setShowHeldList] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [creditLimitWarning, setCreditLimitWarning] = useState(null);

    const persistHeld = useCallback((list) => {
        setHeldInvoices(list);
        localStorage.setItem("vl_held_invoices", JSON.stringify(list));
    }, []);

    const holdCurrentBill = useCallback(() => {
        if (items.length === 0) { toast?.("Nothing to hold — add items first", "warning"); return; }
        const held = {
            id: uid(),
            heldAt: Date.now(),
            billType, items, customerName, customerPhone, vehicleReg, mechanic, notes, paymentMode,
        };
        persistHeld([...heldInvoices, held]);
        toast?.(`Bill parked (${items.length} item${items.length > 1 ? "s" : ""} · ${customerName || "Walk-in"})`, "info", "Invoice Held");
        setItems([]); setCustomerName(""); setCustomerPhone(""); setVehicleReg(""); setMechanic(""); setNotes("");
        setPaymentMode("Cash"); setSearch("");
        if (searchRef.current) searchRef.current.focus();
    }, [items, billType, customerName, customerPhone, vehicleReg, mechanic, notes, paymentMode, heldInvoices, persistHeld, toast]);

    const resumeHeldBill = useCallback((heldId) => {
        const held = heldInvoices.find(h => h.id === heldId);
        if (!held) return;
        setBillType(held.billType);
        setItems(held.items);
        setCustomerName(held.customerName);
        setCustomerPhone(held.customerPhone);
        setVehicleReg(held.vehicleReg);
        setMechanic(held.mechanic);
        setNotes(held.notes);
        setPaymentMode(held.paymentMode);
        persistHeld(heldInvoices.filter(h => h.id !== heldId));
        setShowHeldList(false);
        toast?.("Held invoice resumed", "success");
        if (searchRef.current) searchRef.current.focus();
    }, [heldInvoices, persistHeld, toast]);

    const removeHeldBill = useCallback((heldId) => {
        persistHeld(heldInvoices.filter(h => h.id !== heldId));
        toast?.("Held invoice discarded", "warning");
    }, [heldInvoices, persistHeld, toast]);

    useEffect(() => { if (searchRef.current) searchRef.current.focus(); }, []);

    // Search results
    const searchResults = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        return shopProducts
            .filter(p => [p.name, p.sku, p.brand, p.category].some(s => (s || "").toLowerCase().includes(q)))
            .slice(0, 8);
    }, [search, shopProducts]);

    // Add product to bill
    const addProduct = useCallback((p) => {
        const existing = items.find(i => i.productId === p.id);
        if (existing) {
            setItems(prev => prev.map(i => i.productId === p.id ? { ...i, qty: Math.min(i.qty + 1, i.maxStock) } : i));
        } else {
            setItems(prev => [...prev, {
                productId: p.id, name: p.name, sku: p.sku || "", image: p.image || "📦",
                qty: 1, price: p.sellPrice, originalPrice: p.sellPrice, discount: 0, discountType: "%",
                gstRate: p.gstRate || 18, buyPrice: p.buyPrice, maxStock: p.stock,
                priceOverrideReason: "",
            }]);
        }
        setSearch("");
        if (searchRef.current) searchRef.current.focus();
    }, [items]);

    // Remove item
    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    // Update item field
    const updateItem = (idx, field, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

    // Calculations
    const lineCalcs = items.map(item => {
        const subtotal = item.price * item.qty;
        const discAmt = item.discountType === "%" ? subtotal * item.discount / 100 : item.discount;
        const afterDisc = subtotal - discAmt;
        const gstAmt = (afterDisc * item.gstRate) / (100 + item.gstRate); // GST inclusive
        const profit = (item.price - item.buyPrice) * item.qty - discAmt;
        return { subtotal, discAmt, afterDisc, gstAmt, profit };
    });

    const grandSubtotal = lineCalcs.reduce((s, l) => s + l.subtotal, 0);
    const grandDiscount = lineCalcs.reduce((s, l) => s + l.discAmt, 0);
    const grandTotal = lineCalcs.reduce((s, l) => s + l.afterDisc, 0);
    const grandGst = lineCalcs.reduce((s, l) => s + l.gstAmt, 0);
    const grandProfit = lineCalcs.reduce((s, l) => s + l.profit, 0);

    // Payment
    const isUdhaar = paymentMode === "Udhaar";

    const getCustomerOutstanding = useCallback((name) => {
        if (!name) return 0;
        const party = shopParties.find(p => p.name === name && (p.type === "customer" || p.type === "both"));
        if (!party) return 0;
        let balance = party.openingBalance || 0;
        shopMovements.forEach(m => {
            if (m.customerName === name && m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) {
                balance += (m.total || 0) - (m.paidAmount || 0);
            }
            if (m.type === "RECEIPT" && m.customerName === name && !m.allocations?.length) balance -= m.total;
        });
        return balance;
    }, [shopParties, shopMovements]);

    const getCustomerCreditLimit = useCallback((name) => {
        if (!name) return 0;
        const party = shopParties.find(p => p.name === name && (p.type === "customer" || p.type === "both"));
        return party?.creditLimit || 0;
    }, [shopParties]);

    const getCustomerPaymentTerms = useCallback((name) => {
        if (!name) return null;
        const party = shopParties.find(p => p.name === name && (p.type === "customer" || p.type === "both"));
        return party?.paymentTerms || null;
    }, [shopParties]);

    // Validation
    const validate = () => {
        if (items.length === 0) { toast?.("Add at least one product to the bill", "warning"); return false; }
        for (const item of items) {
            if (item.qty <= 0) { toast?.(`Invalid quantity for ${item.name}`, "warning"); return false; }
            if (billType === "Sale" && item.qty > item.maxStock) { toast?.(`Only ${item.maxStock} units of ${item.name} in stock`, "warning"); return false; }
        }

        if (isUdhaar && customerName) {
            const creditLimit = getCustomerCreditLimit(customerName);
            if (creditLimit > 0) {
                const outstanding = getCustomerOutstanding(customerName);
                const newTotal = outstanding + grandTotal;
                if (newTotal > creditLimit) {
                    setCreditLimitWarning({
                        customerName,
                        creditLimit,
                        outstanding,
                        newInvoice: grandTotal,
                        newTotal,
                        excess: newTotal - creditLimit,
                    });
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 300));

        const inv = getNextVoucherNumber(billType === "Sale" ? "SALE" : "ESTIMATE");
        setInvoiceNo(inv);

        const finalPayments = { [isUdhaar ? "Credit" : paymentMode]: grandTotal };

        onMultiSale({
            type: billType,
            invoiceNo: inv,
            items: items.map((item, idx) => {
                const isOverridden = item.price !== item.originalPrice && item.originalPrice > 0;
                const priceOverride = isOverridden ? {
                    originalPrice: item.originalPrice,
                    overriddenPrice: item.price,
                    difference: item.price - item.originalPrice,
                    percentChange: +((item.price - item.originalPrice) / item.originalPrice * 100).toFixed(1),
                    reason: item.priceOverrideReason || "",
                    overriddenBy: "shopOwner",
                    overriddenAt: Date.now(),
                } : null;
                return {
                    productId: item.productId,
                    name: item.name,
                    qty: item.qty,
                    sellPrice: item.price,
                    buyPrice: item.buyPrice,
                    discount: lineCalcs[idx].discAmt,
                    total: lineCalcs[idx].afterDisc,
                    gstAmount: lineCalcs[idx].gstAmt,
                    profit: lineCalcs[idx].profit,
                    gstRate: item.gstRate,
                    ...(priceOverride && { priceOverride }),
                };
            }),
            customerName, customerPhone, vehicleReg, mechanic, notes,
            payments: finalPayments,
            paymentMode,
            subtotal: grandSubtotal,
            discount: grandDiscount,
            total: grandTotal,
            gstAmount: grandGst,
            profit: grandProfit,
            date: Date.now(),
        });

        setSaving(false);
        setShowInvoice(true);
    }, [items, lineCalcs, billType, isUdhaar, paymentMode, grandTotal, grandSubtotal, grandDiscount, grandGst, grandProfit, customerName, customerPhone, vehicleReg, mechanic, notes, onMultiSale]);

    const handleForceSubmit = useCallback(async () => {
        setCreditLimitWarning(null);
        setSaving(true);
        await new Promise(r => setTimeout(r, 300));

        const inv = getNextVoucherNumber(billType === "Sale" ? "SALE" : "ESTIMATE");
        setInvoiceNo(inv);

        const finalPayments = { [isUdhaar ? "Credit" : paymentMode]: grandTotal };

        onMultiSale({
            type: billType,
            invoiceNo: inv,
            items: items.map((item, idx) => {
                const isOverridden = item.price !== item.originalPrice && item.originalPrice > 0;
                const priceOverride = isOverridden ? {
                    originalPrice: item.originalPrice,
                    overriddenPrice: item.price,
                    difference: item.price - item.originalPrice,
                    percentChange: +((item.price - item.originalPrice) / item.originalPrice * 100).toFixed(1),
                    reason: item.priceOverrideReason || "",
                    overriddenBy: "shopOwner",
                    overriddenAt: Date.now(),
                } : null;
                return {
                    productId: item.productId,
                    name: item.name,
                    qty: item.qty,
                    sellPrice: item.price,
                    buyPrice: item.buyPrice,
                    discount: lineCalcs[idx].discAmt,
                    total: lineCalcs[idx].afterDisc,
                    gstAmount: lineCalcs[idx].gstAmt,
                    profit: lineCalcs[idx].profit,
                    gstRate: item.gstRate,
                    ...(priceOverride && { priceOverride }),
                };
            }),
            customerName, customerPhone, vehicleReg, mechanic, notes,
            payments: finalPayments,
            paymentMode,
            subtotal: grandSubtotal,
            discount: grandDiscount,
            total: grandTotal,
            gstAmount: grandGst,
            profit: grandProfit,
            date: Date.now(),
            creditLimitOverride: true,
            staffId: activeStaffMember?.id || null,
            staffName: activeStaffMember?.name || null,
        });

        setSaving(false);
        setShowInvoice(true);
    }, [items, lineCalcs, billType, isUdhaar, paymentMode, grandTotal, grandSubtotal, grandDiscount, grandGst, grandProfit, customerName, customerPhone, vehicleReg, mechanic, notes, onMultiSale]);

    const newBill = useCallback(() => {
        setItems([]); setCustomerName(""); setCustomerPhone(""); setVehicleReg(""); setMechanic(""); setNotes("");
        setPaymentMode("Cash"); setShowInvoice(false); setSearch(""); setShowHeldList(false); setShowHelp(false);
        setCreditLimitWarning(null);
        if (searchRef.current) searchRef.current.focus();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "F1") { e.preventDefault(); setShowHelp(prev => !prev); return; }
            if (e.key === "Escape") {
                if (showHelp) { setShowHelp(false); return; }
                if (showHeldList) { setShowHeldList(false); return; }
                if (search) { setSearch(""); return; }
                if (items.length > 0) { newBill(); toast?.("Bill cleared", "info"); }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (!showInvoice) handleSubmit(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") { e.preventDefault(); holdCurrentBill(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") { e.preventDefault(); newBill(); toast?.("New bill started", "info"); return; }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [items, search, showInvoice, showHelp, showHeldList, newBill, holdCurrentBill, handleSubmit, toast]);

    // Invoice Preview
    if (showInvoice) return (
        <div className="page-in" style={{ maxWidth: 500, margin: "0 auto" }}>
            <div style={{ background: T.emeraldBg, border: `1px solid rgba(16,185,129,0.25)`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <div>
                    <div style={{ fontWeight: 800, color: T.emerald, fontSize: 16 }}>{billType === "Sale" ? "Sale Recorded Successfully!" : "Quotation Generated!"}</div>
                    <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>{items.length} item{items.length > 1 ? "s" : ""} · {invoiceNo}</div>
                </div>
            </div>

            {/* Thermal Receipt Style Invoice */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", fontFamily: FONT.ui }}>
                <div style={{ textAlign: "center", paddingBottom: 14, borderBottom: `1px dashed ${T.border}`, marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>{companyInfo.companyName || "AutoMobile Space"}</div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{[companyInfo.address, companyInfo.state].filter(Boolean).join(", ") || "Configure in Settings"}{companyInfo.gstin ? ` · GSTIN: ${companyInfo.gstin}` : ""}</div>
                    {companyInfo.phone && <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>Ph: {companyInfo.phone}{companyInfo.email ? ` · ${companyInfo.email}` : ""}</div>}
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>{invoiceNo} · {fmtDateTime(Date.now())}</div>
                    <div style={{ fontSize: 10, color: T.amber, fontWeight: 700, marginTop: 4 }}>{billType === "Sale" ? "TAX INVOICE" : "ESTIMATE / QUOTATION"}</div>
                </div>

                {customerName && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: T.t3 }}>Customer</span><span style={{ fontWeight: 600 }}>{customerName}</span></div>}
                {customerPhone && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: T.t3 }}>Phone</span><span style={{ fontFamily: FONT.mono }}>{customerPhone}</span></div>}
                {vehicleReg && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}><span style={{ color: T.t3 }}>Vehicle</span><span style={{ fontFamily: FONT.mono, color: T.amber, fontWeight: 700 }}>{vehicleReg}</span></div>}

                <div style={{ borderTop: `1px dashed ${T.border}`, paddingTop: 10, marginTop: 6 }}>
                    {items.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: 8, padding: "6px 10px", background: T.card, borderRadius: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, marginBottom: 2 }}>{item.image} {item.name}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3 }}>
                                <span>{item.qty} × {fmt(item.price)}</span>
                                <span style={{ color: T.t1, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(lineCalcs[idx].afterDisc)}</span>
                            </div>
                            {lineCalcs[idx].discAmt > 0 && <div style={{ fontSize: 11, color: T.crimson }}>Discount: −{fmt(lineCalcs[idx].discAmt)}</div>}
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 6 }}>
                    {grandDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.crimson, marginBottom: 4 }}><span>Total Discount</span><span>−{fmt(grandDiscount)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 4 }}><span>GST (Inclusive)</span><span style={{ fontFamily: FONT.mono }}>{fmt(grandGst)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 900, color: T.t1, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                        <span>TOTAL</span><span style={{ fontFamily: FONT.mono }}>{fmt(grandTotal)}</span>
                    </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 2 }}>
                        <span>{isUdhaar ? "Credit (Udhaar)" : `Paid via ${paymentMode}`}</span><span style={{ fontFamily: FONT.mono }}>{fmt(grandTotal)}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn variant="ghost" full style={{ fontSize: 12 }} onClick={() => window.print()}>🖨 Print</Btn>
                <Btn variant="ghost" full style={{ fontSize: 12 }} onClick={() => {
                    const itemsText = items.map((item, idx) => `${item.name}: ${item.qty} × ${fmt(item.price)} = ${fmt(lineCalcs[idx].afterDisc)}`).join("\n");
                    const msg = encodeURIComponent(`📋 ${billType === "Sale" ? "Invoice" : "Quotation"} ${invoiceNo}\n\n${itemsText}\n\nTotal: ${fmt(grandTotal)}${grandDiscount > 0 ? `\nDiscount: -${fmt(grandDiscount)}` : ""}\n\nThank you for your business!\n— ${companyInfo.companyName || "AutoMobile Space"}`);
                    const phone = customerPhone ? customerPhone.replace(/\D/g, "") : "";
                    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                }}>💬 WhatsApp</Btn>
                <Btn variant="amber" full onClick={newBill}>🆕 New Bill</Btn>
            </div>
        </div>
    );

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>🧾 POS — Quick Billing</div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Multi-item invoice with payment splitting</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {activeStaffMember && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: T.emerald }}>
                            🟢 {activeStaffMember.name}
                        </div>
                    )}
                    <button onClick={onSwitchStaff} style={{ background: T.surface, border: `1px solid ${T.amber}44`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: T.amber, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 4 }}>
                        👤 {activeStaffMember ? "Switch Staff" : "Staff Login"}
                    </button>
                    <button onClick={() => setShowHelp(true)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: T.t3, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13 }}>⌨</span> F1
                    </button>
                    <button onClick={() => setShowHeldList(true)} style={{ position: "relative", background: T.surface, border: `1px solid ${heldInvoices.length > 0 ? T.amber + "66" : T.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: heldInvoices.length > 0 ? T.amber : T.t3, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6 }}>
                        ⏸ Held
                        {heldInvoices.length > 0 && (
                            <span style={{ background: T.amber, color: "#000", fontSize: 10, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{heldInvoices.length}</span>
                        )}
                    </button>
                    <div style={{ display: "flex", gap: 4, background: T.surface, padding: 4, borderRadius: 10 }}>
                        {["Sale", "Quotation"].map(t => (
                            <button key={t} onClick={() => setBillType(t)} style={{
                                padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 800, fontFamily: FONT.ui, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                                background: billType === t ? (t === "Sale" ? T.amber : T.sky) : "transparent",
                                color: billType === t ? "#000" : T.t3,
                            }}>{t === "Sale" ? "🧾 Tax Invoice" : "📝 Quotation"}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ position: "relative" }}>
                <input
                    ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Search products by name, SKU, brand... (type to add)"
                    style={{
                        width: "100%", padding: "14px 18px", background: T.surface, border: `2px solid ${search ? T.amber : T.border}`,
                        borderRadius: 12, color: T.t1, fontSize: 15, fontFamily: FONT.ui, outline: "none", transition: "border-color 0.2s",
                    }}
                />
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 4, zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,0.4)", maxHeight: 320, overflowY: "auto" }}>
                        {searchResults.map(p => (
                            <button key={p.id} onClick={() => addProduct(p)} style={{
                                width: "100%", padding: "12px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`,
                                color: T.t1, cursor: "pointer", textAlign: "left", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 12, transition: "background 0.1s",
                            }} className="row-hover">
                                <span style={{ fontSize: 22 }}>{p.image}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono, marginTop: 2 }}>{p.sku} · {p.brand} · Stock: {p.stock}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.amber, fontSize: 15 }}>{fmt(p.sellPrice)}</div>
                                    {canViewMargin && <div style={{ fontSize: 10, color: T.t3 }}>Margin: {margin(p.buyPrice, p.sellPrice)}%</div>}
                                </div>
                                {items.some(i => i.productId === p.id) && <span style={{ background: T.emeraldBg, color: T.emerald, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 800 }}>Added</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Bill Items Table */}
            {items.length === 0 ? (
                <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>Start a new bill</div>
                    <div style={{ fontSize: 13, color: T.t3 }}>Search and add products above to create an invoice</div>
                </div>
            ) : (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                {["#", "Product", "Qty", "Rate (₹)", "Disc", "GST", "Total", ...(canViewMargin ? ["Profit"] : []), ""].map(h => (
                                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.ui }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const lc = lineCalcs[idx];
                                return (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: "10px 12px", color: T.t4, fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{idx + 1}</td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 18 }}>{item.image}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                                                    <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono, marginTop: 1 }}>{item.sku} · Stock: {item.maxStock}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 8px", width: 70 }}>
                                            <input type="number" value={item.qty} onChange={e => updateItem(idx, "qty", Math.max(1, +e.target.value))} min="1" max={billType === "Sale" ? item.maxStock : 999}
                                                style={{ width: 60, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.t1, fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, textAlign: "center" }} />
                                        </td>
                                        <td style={{ padding: "10px 8px", width: 100 }}>
                                            <input type="number" value={item.price} onChange={e => updateItem(idx, "price", +e.target.value)}
                                                style={{ width: 90, background: T.bg, border: `1px solid ${item.price !== item.originalPrice ? T.amber : T.border}`, borderRadius: 6, padding: "6px 8px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, textAlign: "right" }} />
                                            {item.price !== item.originalPrice && item.originalPrice > 0 && (
                                                <div style={{ fontSize: 9, color: T.amber, fontWeight: 700, marginTop: 2, textAlign: "right" }}>
                                                    was {fmt(item.originalPrice)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "10px 8px", width: 80 }}>
                                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                <input type="number" value={item.discount} onChange={e => updateItem(idx, "discount", Math.max(0, +e.target.value))} min="0"
                                                    style={{ width: 50, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 6px", color: T.t1, fontFamily: FONT.mono, fontSize: 12, textAlign: "center" }} />
                                                <span style={{ fontSize: 10, color: T.t3, cursor: "pointer" }} onClick={() => updateItem(idx, "discountType", item.discountType === "%" ? "flat" : "%")}>{item.discountType === "%" ? "%" : "₹"}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 8px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{item.gstRate}%</td>
                                        <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.t1 }}>{fmt(lc.afterDisc)}</td>
                                        {canViewMargin && <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: lc.profit >= 0 ? T.emerald : T.crimson }}>{lc.profit >= 0 ? "+" : ""}{fmt(lc.profit)}</td>}
                                        <td style={{ padding: "10px 8px" }}>
                                            <button onClick={() => removeItem(idx)} style={{ background: "transparent", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {items.length > 0 && (
                <>
                    {/* Customer Details (collapsible row) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Customer</label>
                            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name or garage"
                                style={{ width: "100%", padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontFamily: FONT.ui, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Phone</label>
                            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+91 98765 43210"
                                style={{ width: "100%", padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontFamily: FONT.ui, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Vehicle Reg.</label>
                            <input value={vehicleReg} onChange={e => setVehicleReg(e.target.value)} placeholder="MH 02 AB 1234"
                                style={{ width: "100%", padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontFamily: FONT.ui, fontSize: 13, fontWeight: 700 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Mechanic</label>
                            <input value={mechanic} onChange={e => setMechanic(e.target.value)} placeholder="Ramesh K"
                                style={{ width: "100%", padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontFamily: FONT.ui, fontSize: 13 }} />
                        </div>
                    </div>

                    {/* Totals + Payment */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {/* Bill Summary */}
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>📊 Bill Summary</div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: T.t3, fontSize: 13 }}>Subtotal ({items.length} items)</span><span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{fmt(grandSubtotal)}</span></div>
                            {grandDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: T.crimson, fontSize: 13 }}>Discount</span><span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.crimson }}>−{fmt(grandDiscount)}</span></div>}
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: T.t3, fontSize: 13 }}>GST (Inclusive)</span><span style={{ fontFamily: FONT.mono, fontWeight: 600, color: T.amber }}>{fmt(grandGst)}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${T.border}`, marginTop: 6 }}>
                                <span style={{ fontSize: 17, fontWeight: 900, color: T.t1 }}>TOTAL</span>
                                <span style={{ fontSize: 22, fontWeight: 900, fontFamily: FONT.mono, color: T.sky }}>{fmt(grandTotal)}</span>
                            </div>
                            {canViewMargin && (
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
                                <span style={{ fontSize: 12, color: T.t3 }}>Net Profit</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 16, color: grandProfit >= 0 ? T.emerald : T.crimson }}>{grandProfit >= 0 ? "+" : ""}{fmt(grandProfit)}</span>
                            </div>
                            )}
                        </div>

                        {/* Payment */}
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>💳 Payment</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                                {[
                                    { key: "Cash", icon: "💵", color: T.emerald },
                                    { key: "UPI", icon: "📱", color: T.sky },
                                    { key: "Card", icon: "💳", color: "#818CF8" },
                                    { key: "Udhaar", icon: "📋", color: T.crimson },
                                ].map(pm => {
                                    const active = paymentMode === pm.key;
                                    return (
                                        <button key={pm.key} onClick={() => setPaymentMode(pm.key)} type="button" style={{
                                            padding: "12px 10px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                                            background: active ? `${pm.color}22` : T.surface,
                                            border: `2px solid ${active ? pm.color : T.border}`,
                                            display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                                        }}>
                                            <span style={{ fontSize: 18 }}>{pm.icon}</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: active ? pm.color : T.t3 }}>{pm.key}</span>
                                            {active && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT.mono, color: pm.color }}>{fmt(grandTotal)}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {isUdhaar && (
                                <div>
                                    <div style={{ background: `${T.crimson}15`, border: `1px solid ${T.crimson}44`, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 16 }}>⚠️</span>
                                        <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>Full amount of {fmt(grandTotal)} will be added to credit ledger</div>
                                    </div>
                                    {customerName && (() => {
                                        const creditLimit = getCustomerCreditLimit(customerName);
                                        const outstanding = getCustomerOutstanding(customerName);
                                        const payTerms = getCustomerPaymentTerms(customerName);
                                        if (creditLimit <= 0 && !payTerms) return null;
                                        const newTotal = outstanding + grandTotal;
                                        const utilPct = creditLimit > 0 ? Math.min((newTotal / creditLimit) * 100, 100) : 0;
                                        const isOverLimit = creditLimit > 0 && newTotal > creditLimit;
                                        return (
                                            <div style={{ marginTop: 8, background: T.surface, border: `1px solid ${isOverLimit ? T.crimson + "66" : T.border}`, borderRadius: 8, padding: "10px 14px" }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 6 }}>Credit Status: {customerName}</div>
                                                {creditLimit > 0 && (
                                                    <>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                                            <span style={{ color: T.t3 }}>Outstanding</span>
                                                            <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.crimson }}>{fmt(outstanding)}</span>
                                                        </div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                                            <span style={{ color: T.t3 }}>+ This Invoice</span>
                                                            <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.amber }}>{fmt(grandTotal)}</span>
                                                        </div>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6, paddingTop: 4, borderTop: `1px dashed ${T.border}` }}>
                                                            <span style={{ color: T.t3 }}>New Total</span>
                                                            <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: isOverLimit ? T.crimson : T.t1 }}>{fmt(newTotal)} / {fmt(creditLimit)}</span>
                                                        </div>
                                                        <div style={{ width: "100%", height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                                                            <div style={{ width: `${utilPct}%`, height: "100%", background: isOverLimit ? T.crimson : utilPct > 80 ? T.amber : T.emerald, transition: "width 0.3s" }} />
                                                        </div>
                                                        {isOverLimit && (
                                                            <div style={{ fontSize: 10, color: T.crimson, fontWeight: 700, marginTop: 4 }}>Exceeds credit limit by {fmt(newTotal - creditLimit)}</div>
                                                        )}
                                                    </>
                                                )}
                                                {payTerms && (
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: creditLimit > 0 ? 6 : 0 }}>
                                                        <span style={{ color: T.t3 }}>Payment Terms</span>
                                                        <span style={{ fontWeight: 700, color: T.sky }}>{payTerms}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes: warranty info, special instructions..."
                            style={{ flex: 1, padding: "10px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontFamily: FONT.ui, fontSize: 13 }} />
                        <Btn variant="ghost" onClick={holdCurrentBill} style={{ whiteSpace: "nowrap" }}>⏸ Hold <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>Ctrl+H</span></Btn>
                        <Btn variant="ghost" onClick={newBill}>Clear <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>Esc</span></Btn>
                        <Btn variant={billType === "Sale" ? "amber" : "sky"} loading={saving} onClick={handleSubmit} style={{ padding: "12px 28px", whiteSpace: "nowrap" }}>
                            {billType === "Sale" ? "🧾 Record Sale" : "📝 Save Quotation"} <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>Ctrl+S</span>
                        </Btn>
                    </div>

                    <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                        {[
                            { keys: "Ctrl+S", label: "Save Bill" },
                            { keys: "Ctrl+H", label: "Hold Bill" },
                            { keys: "Ctrl+N", label: "New Bill" },
                            { keys: "Esc", label: "Clear" },
                            { keys: "F1", label: "Help" },
                        ].map(s => (
                            <div key={s.keys} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.t4 }}>
                                <span style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 6px", fontFamily: FONT.mono, fontSize: 10, fontWeight: 700, color: T.t3 }}>{s.keys}</span>
                                {s.label}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showHelp && (
                <div className="backdrop-in" onClick={() => setShowHelp(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                    <div className="modal-in" onClick={e => e.stopPropagation()} style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 420, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>⌨ Keyboard Shortcuts</div>
                            <button onClick={() => setShowHelp(false)} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {[
                                { keys: "Ctrl + S", desc: "Save / Submit current bill", icon: "💾" },
                                { keys: "Ctrl + H", desc: "Hold / Park current bill for later", icon: "⏸" },
                                { keys: "Ctrl + N", desc: "Start a new empty bill", icon: "🆕" },
                                { keys: "Escape", desc: "Clear search, close modals, or clear bill", icon: "✕" },
                                { keys: "F1", desc: "Toggle this help overlay", icon: "❓" },
                            ].map(s => (
                                <div key={s.keys} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
                                    <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{s.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{s.desc}</div>
                                    </div>
                                    <span style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontFamily: FONT.mono, fontSize: 12, fontWeight: 800, color: T.amber }}>{s.keys}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: T.t4 }}>Press F1 or Escape to close</div>
                    </div>
                </div>
            )}

            {showHeldList && (
                <div className="backdrop-in" onClick={() => setShowHeldList(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                    <div className="modal-in" onClick={e => e.stopPropagation()} style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 480, maxHeight: "70vh", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>⏸ Held Invoices ({heldInvoices.length})</div>
                            <button onClick={() => setShowHeldList(false)} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
                        </div>
                        {heldInvoices.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px 20px", color: T.t3 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>No held invoices</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Use Ctrl+H to park a bill for later</div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", flex: 1 }}>
                                {heldInvoices.map(h => {
                                    const total = h.items.reduce((s, i) => {
                                        const sub = i.price * i.qty;
                                        const disc = i.discountType === "%" ? sub * i.discount / 100 : i.discount;
                                        return s + sub - disc;
                                    }, 0);
                                    return (
                                        <div key={h.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: T.t1, marginBottom: 4 }}>
                                                    {h.customerName || "Walk-in"} <span style={{ fontSize: 11, color: T.t3, fontWeight: 500 }}>· {h.billType}</span>
                                                </div>
                                                <div style={{ fontSize: 12, color: T.t3 }}>
                                                    {h.items.length} item{h.items.length > 1 ? "s" : ""} · {fmt(total)}
                                                    {h.vehicleReg ? ` · ${h.vehicleReg}` : ""}
                                                </div>
                                                <div style={{ fontSize: 10, color: T.t4, marginTop: 2, fontFamily: FONT.mono }}>{fmtDateTime(h.heldAt)}</div>
                                            </div>
                                            <Btn variant="amber" size="sm" onClick={() => resumeHeldBill(h.id)}>Resume</Btn>
                                            <button onClick={() => removeHeldBill(h.id)} style={{ background: "transparent", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {creditLimitWarning && (
                <div className="backdrop-in" onClick={() => setCreditLimitWarning(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                    <div className="modal-in" onClick={e => e.stopPropagation()} style={{ background: T.card, border: `1px solid ${T.crimson}44`, borderRadius: 16, width: 440, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <span style={{ fontSize: 32 }}>🚫</span>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: T.crimson }}>Credit Limit Exceeded</div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{creditLimitWarning.customerName}</div>
                            </div>
                        </div>
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                                <span style={{ color: T.t3 }}>Credit Limit</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.t1 }}>{fmt(creditLimitWarning.creditLimit)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                                <span style={{ color: T.t3 }}>Current Outstanding</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.crimson }}>{fmt(creditLimitWarning.outstanding)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                                <span style={{ color: T.t3 }}>This Invoice</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.amber }}>{fmt(creditLimitWarning.newInvoice)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                                <span style={{ color: T.t3 }}>New Total</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 900, color: T.crimson }}>{fmt(creditLimitWarning.newTotal)}</span>
                            </div>
                            <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.crimson}15`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: T.crimson, textAlign: "center" }}>
                                Exceeds limit by {fmt(creditLimitWarning.excess)}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <Btn variant="ghost" full onClick={() => setCreditLimitWarning(null)}>Cancel</Btn>
                            <Btn variant="amber" full onClick={handleForceSubmit} style={{ background: `${T.crimson}22`, borderColor: T.crimson, color: T.crimson }}>⚠ Override & Proceed</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDateTime, fmtDate, uid } from "../utils";
import { Modal, Field, Input, Select, Divider, Btn } from "../components/ui";
import { getNextVoucherNumber, peekNextVoucherNumber } from "../voucherNumbering";

export function PurchaseEntryPage({ products, activeShopId, parties, purchaseOrders, onMultiPurchase, toast }) {
    const shopProducts = useMemo(() => products.filter(p => p.shopId === activeShopId && p.isActive !== false), [products, activeShopId]);
    const suppliers = useMemo(() => (parties || []).filter(p => p.type === "supplier" || p.type === "vendor"), [parties]);

    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
    const [vendorInvoiceDate, setVendorInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
    const [poReference, setPoReference] = useState("");
    const [warehouse, setWarehouse] = useState("Main Warehouse");
    const [notes, setNotes] = useState("");
    const [paymentMode, setPaymentMode] = useState("Credit");
    const [creditDays, setCreditDays] = useState("30");
    const [showInvoice, setShowInvoice] = useState(false);
    const [saving, setSaving] = useState(false);
    const [voucherNo, setVoucherNo] = useState("");
    const searchRef = useRef(null);

    useEffect(() => { if (searchRef.current) searchRef.current.focus(); }, []);

    const searchResults = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        return shopProducts
            .filter(p => [p.name, p.sku, p.brand, p.category, p.oemNumber].some(s => (s || "").toLowerCase().includes(q)))
            .slice(0, 8);
    }, [search, shopProducts]);

    const addProduct = useCallback((p) => {
        const existing = items.find(i => i.productId === p.id);
        if (existing) {
            setItems(prev => prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setItems(prev => [...prev, {
                productId: p.id, name: p.name, sku: p.sku || "", image: p.image || "📦",
                hsn: p.hsnCode || "", qty: 1, rate: p.buyPrice, newSellPrice: p.sellPrice,
                discount: 0, discountType: "%", gstRate: p.gstRate || 18,
                currentStock: p.stock, unit: p.unit || "pcs",
            }]);
        }
        setSearch("");
        if (searchRef.current) searchRef.current.focus();
    }, [items]);

    const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx, field, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

    const lineCalcs = items.map(item => {
        const subtotal = item.rate * item.qty;
        const discAmt = item.discountType === "%" ? subtotal * item.discount / 100 : item.discount;
        const afterDisc = subtotal - discAmt;
        const gstAmt = (afterDisc * item.gstRate) / 100;
        const lineTotal = afterDisc + gstAmt;
        return { subtotal, discAmt, afterDisc, gstAmt, lineTotal };
    });

    const grandSubtotal = lineCalcs.reduce((s, l) => s + l.subtotal, 0);
    const grandDiscount = lineCalcs.reduce((s, l) => s + l.discAmt, 0);
    const grandTaxable = lineCalcs.reduce((s, l) => s + l.afterDisc, 0);
    const grandGst = lineCalcs.reduce((s, l) => s + l.gstAmt, 0);
    const grandTotal = lineCalcs.reduce((s, l) => s + l.lineTotal, 0);

    const loadFromPO = useCallback((poId) => {
        if (!purchaseOrders) return;
        const po = purchaseOrders.find(p => p.id === poId);
        if (!po) { toast?.("PO not found", "warning"); return; }
        if (po.vendorName) setVendorName(po.vendorName);
        if (po.items && po.items.length > 0) {
            const newItems = po.items.map(poItem => {
                const prod = shopProducts.find(p => p.id === poItem.productId);
                return {
                    productId: poItem.productId, name: poItem.name || prod?.name || "", sku: prod?.sku || "",
                    image: prod?.image || "📦", hsn: prod?.hsnCode || "",
                    qty: poItem.qty || 1, rate: poItem.rate || prod?.buyPrice || 0,
                    newSellPrice: prod?.sellPrice || 0, discount: 0, discountType: "%",
                    gstRate: poItem.gstRate || prod?.gstRate || 18,
                    currentStock: prod?.stock || 0, unit: prod?.unit || "pcs",
                };
            }).filter(i => i.productId);
            if (newItems.length > 0) {
                setItems(newItems);
                toast?.(`Loaded ${newItems.length} items from PO ${poId}`, "success");
            }
        }
    }, [purchaseOrders, shopProducts, toast]);

    const validate = () => {
        if (items.length === 0) { toast?.("Add at least one item to the purchase bill", "warning"); return false; }
        if (!vendorName.trim()) { toast?.("Enter vendor/supplier name", "warning"); return false; }
        for (const item of items) {
            if (item.qty <= 0) { toast?.(`Invalid quantity for ${item.name}`, "warning"); return false; }
            if (item.rate <= 0) { toast?.(`Invalid rate for ${item.name}`, "warning"); return false; }
        }
        return true;
    };

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 300));

        const vNo = getNextVoucherNumber("PURCHASE");
        setVoucherNo(vNo);

        onMultiPurchase({
            voucherNo: vNo,
            vendorName,
            vendorInvoiceNo,
            vendorInvoiceDate,
            poReference,
            warehouse,
            notes,
            paymentMode,
            creditDays: paymentMode === "Credit" ? +creditDays : 0,
            items: items.map((item, idx) => ({
                productId: item.productId,
                name: item.name,
                qty: item.qty,
                buyPrice: item.rate,
                newSellPrice: item.newSellPrice,
                discount: lineCalcs[idx].discAmt,
                gstRate: item.gstRate,
                gstAmount: lineCalcs[idx].gstAmt,
                taxableAmount: lineCalcs[idx].afterDisc,
                total: lineCalcs[idx].lineTotal,
                hsn: item.hsn,
                unit: item.unit,
            })),
            subtotal: grandSubtotal,
            discount: grandDiscount,
            taxableAmount: grandTaxable,
            gstAmount: grandGst,
            total: grandTotal,
            date: Date.now(),
        });

        setSaving(false);
        setShowInvoice(true);
    }, [items, lineCalcs, vendorName, vendorInvoiceNo, vendorInvoiceDate, poReference, warehouse, notes, paymentMode, creditDays, grandSubtotal, grandDiscount, grandTaxable, grandGst, grandTotal, onMultiPurchase]);

    const newBill = useCallback(() => {
        setItems([]); setVendorName(""); setVendorInvoiceNo(""); setVendorInvoiceDate(new Date().toISOString().slice(0, 10));
        setPoReference(""); setWarehouse("Main Warehouse"); setNotes("");
        setPaymentMode("Credit"); setCreditDays("30"); setShowInvoice(false); setSearch("");
        if (searchRef.current) searchRef.current.focus();
    }, []);

    const paymentModes = ["Credit", "Cash", "UPI", "Bank Transfer", "Cheque"];

    if (showInvoice) return (
        <div className="page-in" style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ background: T.skyBg, border: `1px solid rgba(56,189,248,0.25)`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <div>
                    <div style={{ fontWeight: 800, color: T.sky, fontSize: 16 }}>Purchase Bill Recorded Successfully!</div>
                    <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>{items.length} item{items.length > 1 ? "s" : ""} · {voucherNo}</div>
                </div>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", fontFamily: FONT.ui }}>
                <div style={{ textAlign: "center", paddingBottom: 14, borderBottom: `1px dashed ${T.border}`, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: T.sky, fontWeight: 700, marginBottom: 4 }}>PURCHASE BILL</div>
                    <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{voucherNo} · {fmtDateTime(Date.now())}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14, fontSize: 12 }}>
                    <div><span style={{ color: T.t3 }}>Vendor: </span><span style={{ fontWeight: 600, color: T.t1 }}>{vendorName}</span></div>
                    {vendorInvoiceNo && <div><span style={{ color: T.t3 }}>Vendor Inv: </span><span style={{ fontFamily: FONT.mono }}>{vendorInvoiceNo}</span></div>}
                    {vendorInvoiceDate && <div><span style={{ color: T.t3 }}>Inv Date: </span><span>{vendorInvoiceDate}</span></div>}
                    {poReference && <div><span style={{ color: T.t3 }}>PO Ref: </span><span style={{ fontFamily: FONT.mono }}>{poReference}</span></div>}
                    <div><span style={{ color: T.t3 }}>Payment: </span><span style={{ fontWeight: 600, color: paymentMode === "Credit" ? T.crimson : T.emerald }}>{paymentMode}{paymentMode === "Credit" ? ` (${creditDays}d)` : ""}</span></div>
                    <div><span style={{ color: T.t3 }}>Warehouse: </span><span>{warehouse}</span></div>
                </div>

                <div style={{ borderTop: `1px dashed ${T.border}`, paddingTop: 10, marginTop: 6 }}>
                    {items.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: 8, padding: "6px 10px", background: T.card, borderRadius: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, marginBottom: 2 }}>{item.image} {item.name}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3 }}>
                                <span>{item.qty} {item.unit} × {fmt(item.rate)}</span>
                                <span style={{ color: T.t1, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(lineCalcs[idx].lineTotal)}</span>
                            </div>
                            {lineCalcs[idx].discAmt > 0 && <div style={{ fontSize: 11, color: T.crimson }}>Discount: −{fmt(lineCalcs[idx].discAmt)}</div>}
                            <div style={{ fontSize: 10, color: T.t3 }}>GST {item.gstRate}%: {fmt(lineCalcs[idx].gstAmt)}</div>
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 6 }}>
                    {grandDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.crimson, marginBottom: 4 }}><span>Total Discount</span><span>−{fmt(grandDiscount)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 4 }}><span>Taxable Amount</span><span style={{ fontFamily: FONT.mono }}>{fmt(grandTaxable)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 4 }}><span>GST</span><span style={{ fontFamily: FONT.mono }}>{fmt(grandGst)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 900, color: T.t1, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                        <span>TOTAL</span><span style={{ fontFamily: FONT.mono }}>{fmt(grandTotal)}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn variant="ghost" full style={{ fontSize: 12 }} onClick={() => window.print()}>🖨 Print</Btn>
                <Btn variant="sky" full onClick={newBill}>🆕 New Purchase</Btn>
            </div>
        </div>
    );

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>📥 Purchase Entry</div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Multi-item purchase bill with GST & payment tracking</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.mono, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>
                        Next: {peekNextVoucherNumber("PURCHASE")}
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Vendor / Supplier *</label>
                    <div style={{ position: "relative" }}>
                        <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                            placeholder="Supplier name" list="vendor-list"
                            style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${vendorName ? T.sky : T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                        <datalist id="vendor-list">
                            {suppliers.map(s => <option key={s.id} value={s.name} />)}
                        </datalist>
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Vendor Invoice No</label>
                    <input value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)}
                        placeholder="e.g. BINV-2024-1042"
                        style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Vendor Invoice Date</label>
                    <input type="date" value={vendorInvoiceDate} onChange={e => setVendorInvoiceDate(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>PO Reference</label>
                    <div style={{ display: "flex", gap: 6 }}>
                        <input value={poReference} onChange={e => setPoReference(e.target.value)}
                            placeholder="PO number (optional)"
                            style={{ flex: 1, padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                        {poReference && (
                            <button onClick={() => loadFromPO(poReference)} style={{ background: T.sky, border: "none", borderRadius: 8, padding: "0 12px", color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>
                                Load PO
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Warehouse / Location</label>
                    <input value={warehouse} onChange={e => setWarehouse(e.target.value)}
                        placeholder="Main Warehouse"
                        style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Notes / Remarks</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="e.g. Monthly restock"
                        style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                </div>
            </div>

            <div style={{ position: "relative" }}>
                <input
                    ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Search products by name, SKU, brand, OEM number... (type to add)"
                    style={{
                        width: "100%", padding: "14px 18px", background: T.surface, border: `2px solid ${search ? T.sky : T.border}`,
                        borderRadius: 12, color: T.t1, fontSize: 15, fontFamily: FONT.ui, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
                    }}
                />
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
                                    <div style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.sky, fontSize: 15 }}>{fmt(p.buyPrice)}</div>
                                    <div style={{ fontSize: 10, color: T.t3 }}>Buy Price</div>
                                </div>
                                {items.some(i => i.productId === p.id) && <span style={{ background: T.skyBg, color: T.sky, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 800 }}>Added</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {items.length === 0 ? (
                <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>Add items to purchase bill</div>
                    <div style={{ fontSize: 13, color: T.t3 }}>Search and add products above, or load from a Purchase Order</div>
                </div>
            ) : (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                {["#", "Product", "HSN", "Qty", "Rate (₹)", "Disc", "GST%", "Tax", "Total", ""].map(h => (
                                    <th key={h} style={{ padding: "10px 10px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.ui }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const lc = lineCalcs[idx];
                                return (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                                        <td style={{ padding: "10px", color: T.t4, fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{idx + 1}</td>
                                        <td style={{ padding: "10px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 18 }}>{item.image}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                                                    <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono, marginTop: 1 }}>{item.sku} · Stock: {item.currentStock}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 6px", width: 80 }}>
                                            <input value={item.hsn} onChange={e => updateItem(idx, "hsn", e.target.value)}
                                                placeholder="HSN"
                                                style={{ width: 70, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.t1, fontFamily: FONT.mono, fontSize: 11, textAlign: "center" }} />
                                        </td>
                                        <td style={{ padding: "10px 6px", width: 70 }}>
                                            <input type="number" value={item.qty} onChange={e => updateItem(idx, "qty", Math.max(1, +e.target.value))} min="1"
                                                style={{ width: 60, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.t1, fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, textAlign: "center" }} />
                                        </td>
                                        <td style={{ padding: "10px 6px", width: 100 }}>
                                            <input type="number" value={item.rate} onChange={e => updateItem(idx, "rate", Math.max(0, +e.target.value))}
                                                style={{ width: 90, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, textAlign: "right" }} />
                                        </td>
                                        <td style={{ padding: "10px 6px", width: 80 }}>
                                            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                                                <input type="number" value={item.discount} onChange={e => updateItem(idx, "discount", Math.max(0, +e.target.value))}
                                                    style={{ width: 44, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 4px", color: T.t1, fontFamily: FONT.mono, fontSize: 12, textAlign: "center" }} />
                                                <button onClick={() => updateItem(idx, "discountType", item.discountType === "%" ? "₹" : "%")}
                                                    style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "4px 6px", color: T.t3, fontSize: 10, cursor: "pointer", fontWeight: 700, fontFamily: FONT.mono }}>{item.discountType}</button>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 6px", width: 70 }}>
                                            <select value={item.gstRate} onChange={e => updateItem(idx, "gstRate", +e.target.value)}
                                                style={{ width: 60, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 4px", color: T.t1, fontFamily: FONT.mono, fontSize: 12, cursor: "pointer" }}>
                                                {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: "10px 6px", textAlign: "right", fontFamily: FONT.mono, fontSize: 12, color: T.amber, fontWeight: 600 }}>
                                            {fmt(lc.gstAmt)}
                                        </td>
                                        <td style={{ padding: "10px 6px", textAlign: "right", fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, color: T.t1 }}>
                                            {fmt(lc.lineTotal)}
                                        </td>
                                        <td style={{ padding: "10px 6px" }}>
                                            <button onClick={() => removeItem(idx)} style={{ background: "transparent", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 4 }} title="Remove">✕</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {items.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Payment Mode</label>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {paymentModes.map(pm => (
                                <button key={pm} onClick={() => setPaymentMode(pm)} style={{
                                    flex: 1, minWidth: 80, background: paymentMode === pm ? (pm === "Credit" ? T.crimson : T.sky) : "transparent",
                                    color: paymentMode === pm ? "#000" : T.t2, border: `1px solid ${paymentMode === pm ? (pm === "Credit" ? T.crimson : T.sky) : T.border}`,
                                    borderRadius: 7, padding: "10px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s", textAlign: "center",
                                }}>
                                    {pm === "Cash" ? "💵" : pm === "UPI" ? "📱" : pm === "Bank Transfer" ? "🏦" : pm === "Cheque" ? "📝" : "💳"} {pm}
                                </button>
                            ))}
                        </div>
                        {paymentMode === "Credit" && (
                            <div style={{ marginTop: 10 }}>
                                <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, display: "block", marginBottom: 4 }}>Credit Period (days)</label>
                                <input type="number" value={creditDays} onChange={e => setCreditDays(e.target.value)}
                                    style={{ width: 120, padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 14, fontFamily: FONT.mono, fontWeight: 700, outline: "none" }} />
                                <span style={{ fontSize: 11, color: T.t3, marginLeft: 8 }}>Due: {fmtDate(Date.now() + (+creditDays || 0) * 86400000)}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Order Summary</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2, marginBottom: 6 }}>
                            <span>Subtotal ({items.length} items)</span>
                            <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{fmt(grandSubtotal)}</span>
                        </div>
                        {grandDiscount > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.crimson, marginBottom: 6 }}>
                                <span>Discount</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>−{fmt(grandDiscount)}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2, marginBottom: 6 }}>
                            <span>Taxable Amount</span>
                            <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{fmt(grandTaxable)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.amber, marginBottom: 10 }}>
                            <span>GST</span>
                            <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{fmt(grandGst)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 900, color: T.t1, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                            <span>TOTAL</span>
                            <span style={{ fontFamily: FONT.mono, color: T.sky }}>{fmt(grandTotal)}</span>
                        </div>
                    </div>
                </div>
            )}

            {items.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                    <Btn variant="ghost" onClick={newBill}>Clear All</Btn>
                    <Btn variant="sky" loading={saving} onClick={handleSubmit} style={{ minWidth: 200, fontSize: 15 }}>📥 Record Purchase</Btn>
                </div>
            )}
        </div>
    );
}

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDateTime, fmtDate, uid } from "../utils";
import { Modal, Field, Input, Select, Divider, Btn } from "../components/ui";
import { getNextVoucherNumber, peekNextVoucherNumber } from "../voucherNumbering";

const GRN_STATUS = {
    Draft: { label: "DRAFT", color: T.t3, bg: T.surface },
    Received: { label: "RECEIVED", color: T.emerald, bg: "rgba(16,185,129,0.1)" },
    Billed: { label: "BILLED", color: T.sky, bg: "rgba(56,189,248,0.1)" },
};

const MATCH_LEVEL = {
    match: { label: "Match", color: T.emerald, bg: "rgba(16,185,129,0.12)", icon: "✓" },
    minor: { label: "Minor Discrepancy", color: T.amber, bg: "rgba(245,158,11,0.12)", icon: "⚠" },
    major: { label: "Major Discrepancy", color: T.crimson, bg: "rgba(239,68,68,0.12)", icon: "✕" },
};

function StatusBadge({ status }) {
    const cfg = GRN_STATUS[status] || GRN_STATUS.Draft;
    return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, letterSpacing: "0.05em" }}>
            {cfg.label}
        </span>
    );
}

function MatchIndicator({ level }) {
    const cfg = MATCH_LEVEL[level] || MATCH_LEVEL.match;
    return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: cfg.bg, color: cfg.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function getMatchLevel(poVal, compareVal, tolerancePct = 5) {
    if (poVal === 0 && compareVal === 0) return "match";
    if (poVal === 0) return "major";
    const diff = Math.abs(poVal - compareVal);
    const pct = (diff / poVal) * 100;
    if (pct === 0) return "match";
    if (pct <= tolerancePct) return "minor";
    return "major";
}

export function PurchaseEntryPage({ products, movements, activeShopId, parties, purchaseOrders, grns, saveGrns, savePurchaseOrders, saveProducts, saveMovements, onMultiPurchase, logAudit, toast }) {
    const shopProducts = useMemo(() => products.filter(p => p.shopId === activeShopId && p.isActive !== false), [products, activeShopId]);
    const suppliers = useMemo(() => (parties || []).filter(p => p.type === "supplier" || p.type === "vendor"), [parties]);
    const shopPOs = useMemo(() => (purchaseOrders || []).filter(po => po.shopId === activeShopId), [purchaseOrders, activeShopId]);
    const shopGrns = useMemo(() => (grns || []).filter(g => g.shopId === activeShopId), [grns, activeShopId]);

    const [activeTab, setActiveTab] = useState("bill");

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

    const [grnSelectedPO, setGrnSelectedPO] = useState("");
    const [grnItems, setGrnItems] = useState([]);
    const [grnNotes, setGrnNotes] = useState("");
    const [grnWarehouse, setGrnWarehouse] = useState("Main Warehouse");
    const [showGrnSuccess, setShowGrnSuccess] = useState(false);
    const [lastGrn, setLastGrn] = useState(null);

    const [matchBillId, setMatchBillId] = useState("");

    useEffect(() => { if (searchRef.current && activeTab === "bill") searchRef.current.focus(); }, [activeTab]);

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
                    qty: poItem.qty || 1, rate: poItem.rate || poItem.unitPrice || prod?.buyPrice || 0,
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

    const loadPOForGrn = useCallback((poId) => {
        const po = shopPOs.find(p => p.id === poId);
        if (!po) { setGrnItems([]); return; }
        const existingGrnsForPO = shopGrns.filter(g => g.poId === poId);
        const receivedQtyMap = {};
        existingGrnsForPO.forEach(g => {
            (g.items || []).forEach(gi => {
                receivedQtyMap[gi.productId] = (receivedQtyMap[gi.productId] || 0) + gi.receivedQty;
            });
        });

        const newGrnItems = (po.items || []).map(poItem => {
            const prod = shopProducts.find(p => p.id === poItem.productId);
            const alreadyReceived = receivedQtyMap[poItem.productId] || 0;
            const poQty = poItem.qty || 0;
            const remaining = Math.max(0, poQty - alreadyReceived);
            return {
                productId: poItem.productId,
                name: poItem.name || prod?.name || "Item",
                sku: prod?.sku || "",
                image: prod?.image || "📦",
                poQty,
                alreadyReceived,
                receivedQty: remaining,
                rate: poItem.unitPrice || poItem.rate || prod?.buyPrice || 0,
                unit: prod?.unit || "pcs",
                accepted: remaining > 0,
                rejectedQty: 0,
                rejectionReason: "",
            };
        });
        setGrnItems(newGrnItems);
    }, [shopPOs, shopGrns, shopProducts]);

    useEffect(() => {
        if (grnSelectedPO) loadPOForGrn(grnSelectedPO);
    }, [grnSelectedPO, loadPOForGrn]);

    const handleCreateGrn = useCallback(() => {
        const po = shopPOs.find(p => p.id === grnSelectedPO);
        if (!po) { toast?.("Select a valid PO", "warning"); return; }
        const validItems = grnItems.filter(i => i.accepted && i.receivedQty > 0);
        if (validItems.length === 0) { toast?.("No items to receive", "warning"); return; }

        const grnNo = "GRN-" + uid().toUpperCase().slice(0, 8);
        const newGrn = {
            id: "grn-" + uid(),
            grnNo,
            shopId: activeShopId,
            poId: po.id,
            poNo: po.poNo || po.id,
            vendorName: po.vendorName || "",
            warehouse: grnWarehouse,
            notes: grnNotes,
            status: "Received",
            createdAt: Date.now(),
            items: validItems.map(i => ({
                productId: i.productId,
                name: i.name,
                poQty: i.poQty,
                receivedQty: i.receivedQty,
                rejectedQty: i.rejectedQty,
                rejectionReason: i.rejectionReason,
                rate: i.rate,
                unit: i.unit,
            })),
        };

        const updatedGrns = [...(grns || []), newGrn];
        saveGrns(updatedGrns);

        let updatedProducts = [...products];
        const newMovements = [];
        validItems.forEach(item => {
            updatedProducts = updatedProducts.map(p => p.id === item.productId ? { ...p, stock: p.stock + item.receivedQty } : p);
            newMovements.push({
                id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
                type: "PURCHASE", qty: item.receivedQty, unitPrice: item.rate,
                total: item.receivedQty * item.rate, gstAmount: 0, profit: null,
                supplier: po.vendorName, supplierName: po.vendorName,
                invoiceNo: grnNo, note: `GRN from PO ${po.poNo || po.id}`,
                date: Date.now(), paymentMode: "Credit", paymentStatus: "pending",
            });
        });
        saveProducts(updatedProducts);
        saveMovements([...(movements || []), ...newMovements]);

        const totalReceivedForPO = {};
        updatedGrns.filter(g => g.poId === po.id).forEach(g => {
            (g.items || []).forEach(gi => {
                totalReceivedForPO[gi.productId] = (totalReceivedForPO[gi.productId] || 0) + gi.receivedQty;
            });
        });
        const allReceived = (po.items || []).every(pi => (totalReceivedForPO[pi.productId] || 0) >= pi.qty);
        if (allReceived) {
            const updatedPOs = (purchaseOrders || []).map(p => p.id === po.id ? { ...p, status: "RECEIVED" } : p);
            savePurchaseOrders(updatedPOs);
        }

        logAudit?.("GRN_CREATED", "grn", grnNo, `${validItems.length} items received from PO ${po.poNo || po.id}`);
        toast?.(`GRN ${grnNo} created successfully!`, "success");
        setLastGrn(newGrn);
        setShowGrnSuccess(true);
    }, [grnSelectedPO, grnItems, grnWarehouse, grnNotes, shopPOs, grns, products, movements, activeShopId, saveGrns, saveProducts, saveMovements, savePurchaseOrders, purchaseOrders, logAudit, toast]);

    const resetGrnForm = () => {
        setGrnSelectedPO("");
        setGrnItems([]);
        setGrnNotes("");
        setGrnWarehouse("Main Warehouse");
        setShowGrnSuccess(false);
        setLastGrn(null);
    };

    const threeWayData = useMemo(() => {
        if (!matchBillId) return null;
        const bill = (movements || []).find(m => m.invoiceNo === matchBillId && m.type === "PURCHASE");
        if (!bill) {
            const billGroup = (movements || []).filter(m => m.invoiceNo === matchBillId && m.type === "PURCHASE");
            if (billGroup.length === 0) return null;
            const poRef = billGroup[0]?.note?.match(/PO\s+([\w-]+)/)?.[1] || "";
            const po = shopPOs.find(p => (p.poNo || p.id) === poRef || p.id === poRef);
            const relatedGrns = shopGrns.filter(g => g.poId === (po?.id || ""));
            return { bills: billGroup, po, grns: relatedGrns, invoiceNo: matchBillId };
        }
        return null;
    }, [matchBillId, movements, shopPOs, shopGrns]);

    const allBillInvoices = useMemo(() => {
        const invoiceSet = new Set();
        (movements || []).filter(m => m.shopId === activeShopId && m.type === "PURCHASE" && m.invoiceNo).forEach(m => invoiceSet.add(m.invoiceNo));
        return Array.from(invoiceSet);
    }, [movements, activeShopId]);

    const threeWayMatchResult = useMemo(() => {
        if (!matchBillId) return null;
        const billMovements = (movements || []).filter(m => m.invoiceNo === matchBillId && m.type === "PURCHASE" && m.shopId === activeShopId);
        if (billMovements.length === 0) return null;

        const billTotal = billMovements.reduce((s, m) => s + (m.total || 0), 0);
        const billQtyMap = {};
        const billRateMap = {};
        billMovements.forEach(m => {
            billQtyMap[m.productId] = (billQtyMap[m.productId] || 0) + m.qty;
            billRateMap[m.productId] = m.unitPrice || 0;
        });

        const noteMatch = billMovements[0]?.note?.match(/PO\s+([\w-]+)/);
        const poRef = noteMatch ? noteMatch[1] : (billMovements[0]?.poReference || "");
        const po = shopPOs.find(p => (p.poNo || p.id) === poRef || p.id === poRef);

        const relatedGrns = po ? shopGrns.filter(g => g.poId === po.id) : [];
        const grnQtyMap = {};
        const grnRateMap = {};
        relatedGrns.forEach(g => {
            (g.items || []).forEach(gi => {
                grnQtyMap[gi.productId] = (grnQtyMap[gi.productId] || 0) + gi.receivedQty;
                grnRateMap[gi.productId] = gi.rate || 0;
            });
        });

        const poQtyMap = {};
        const poRateMap = {};
        let poTotal = 0;
        if (po) {
            (po.items || []).forEach(pi => {
                poQtyMap[pi.productId] = (poQtyMap[pi.productId] || 0) + (pi.qty || 0);
                poRateMap[pi.productId] = pi.unitPrice || pi.rate || 0;
                poTotal += (pi.qty || 0) * (pi.unitPrice || pi.rate || 0);
            });
        }

        const grnTotal = Object.keys(grnQtyMap).reduce((s, pid) => s + (grnQtyMap[pid] * (grnRateMap[pid] || 0)), 0);

        const allProductIds = new Set([...Object.keys(billQtyMap), ...Object.keys(poQtyMap), ...Object.keys(grnQtyMap)]);
        const itemMatches = [];
        allProductIds.forEach(pid => {
            const prod = (products || []).find(p => p.id === pid);
            const pQty = poQtyMap[pid] || 0;
            const pRate = poRateMap[pid] || 0;
            const gQty = grnQtyMap[pid] || 0;
            const gRate = grnRateMap[pid] || 0;
            const bQty = billQtyMap[pid] || 0;
            const bRate = billRateMap[pid] || 0;

            const qtyMatchPOvsGRN = getMatchLevel(pQty, gQty);
            const qtyMatchGRNvsBill = getMatchLevel(gQty, bQty);
            const rateMatchPOvsBill = getMatchLevel(pRate, bRate, 3);
            const totalPO = pQty * pRate;
            const totalGRN = gQty * gRate;
            const totalBill = bQty * bRate;
            const overallMatch = [qtyMatchPOvsGRN, qtyMatchGRNvsBill, rateMatchPOvsBill].includes("major") ? "major"
                : [qtyMatchPOvsGRN, qtyMatchGRNvsBill, rateMatchPOvsBill].includes("minor") ? "minor" : "match";

            itemMatches.push({
                productId: pid,
                productName: prod?.name || billMovements.find(m => m.productId === pid)?.productName || pid,
                poQty: pQty, poRate: pRate, poTotal: totalPO,
                grnQty: gQty, grnRate: gRate, grnTotal: totalGRN,
                billQty: bQty, billRate: bRate, billTotal: totalBill,
                qtyMatchPOvsGRN, qtyMatchGRNvsBill, rateMatchPOvsBill, overallMatch,
            });
        });

        const overallTotalMatch = getMatchLevel(poTotal, billTotal, 3);
        const overallGrnMatch = getMatchLevel(poTotal, grnTotal, 3);

        return {
            invoiceNo: matchBillId,
            vendorName: billMovements[0]?.supplierName || billMovements[0]?.supplier || "",
            billDate: billMovements[0]?.date,
            po, relatedGrns, billMovements,
            poTotal, grnTotal, billTotal,
            overallTotalMatch, overallGrnMatch,
            itemMatches,
            hasPO: !!po,
            hasGRN: relatedGrns.length > 0,
        };
    }, [matchBillId, movements, shopPOs, shopGrns, products, activeShopId]);

    const tabStyle = (tabId) => ({
        padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
        background: activeTab === tabId ? T.sky : "transparent", color: activeTab === tabId ? "#000" : T.t3,
        transition: "all 0.2s", fontFamily: FONT.ui,
    });

    const labelStyle = { fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };
    const inputStyle = { width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" };

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
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Purchase bills, GRN & 3-way matching</div>
                </div>
                <div style={{ display: "flex", background: T.surface, padding: 4, borderRadius: 12, border: `1px solid ${T.border}`, gap: 2 }}>
                    <button onClick={() => setActiveTab("bill")} style={tabStyle("bill")}>📄 Purchase Bill</button>
                    <button onClick={() => setActiveTab("grn")} style={tabStyle("grn")}>📦 GRN</button>
                    <button onClick={() => setActiveTab("grn_list")} style={tabStyle("grn_list")}>📋 GRN List</button>
                    <button onClick={() => setActiveTab("match")} style={tabStyle("match")}>🔍 3-Way Match</button>
                </div>
            </div>

            {activeTab === "bill" && (
                <>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.mono, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>
                            Next: {peekNextVoucherNumber("PURCHASE")}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Vendor / Supplier *</label>
                            <div style={{ position: "relative" }}>
                                <input value={vendorName} onChange={e => setVendorName(e.target.value)}
                                    placeholder="Supplier name" list="vendor-list"
                                    style={{ ...inputStyle, borderColor: vendorName ? T.sky : T.border }} />
                                <datalist id="vendor-list">
                                    {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                </datalist>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Vendor Invoice No</label>
                            <input value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)}
                                placeholder="e.g. BINV-2024-1042" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Vendor Invoice Date</label>
                            <input type="date" value={vendorInvoiceDate} onChange={e => setVendorInvoiceDate(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>PO Reference</label>
                            <div style={{ display: "flex", gap: 6 }}>
                                <input value={poReference} onChange={e => setPoReference(e.target.value)}
                                    placeholder="PO number (optional)"
                                    style={{ ...inputStyle, flex: 1 }} />
                                {poReference && (
                                    <button onClick={() => loadFromPO(poReference)} style={{ background: T.sky, border: "none", borderRadius: 8, padding: "0 12px", color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>
                                        Load PO
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Warehouse / Location</label>
                            <input value={warehouse} onChange={e => setWarehouse(e.target.value)} placeholder="Main Warehouse" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Notes / Remarks</label>
                            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Monthly restock" style={inputStyle} />
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
                </>
            )}

            {activeTab === "grn" && (
                showGrnSuccess ? (
                    <div style={{ maxWidth: 600, margin: "0 auto" }}>
                        <div style={{ background: "rgba(16,185,129,0.1)", border: `1px solid rgba(16,185,129,0.25)`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ fontSize: 28 }}>✓</span>
                            <div>
                                <div style={{ fontWeight: 800, color: T.emerald, fontSize: 16 }}>GRN Created Successfully!</div>
                                <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>{lastGrn?.grnNo} · {lastGrn?.items?.length} items received</div>
                            </div>
                        </div>
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14, fontSize: 12 }}>
                                <div><span style={{ color: T.t3 }}>GRN No: </span><span style={{ fontWeight: 600, fontFamily: FONT.mono }}>{lastGrn?.grnNo}</span></div>
                                <div><span style={{ color: T.t3 }}>PO: </span><span style={{ fontFamily: FONT.mono }}>{lastGrn?.poNo}</span></div>
                                <div><span style={{ color: T.t3 }}>Vendor: </span><span style={{ fontWeight: 600 }}>{lastGrn?.vendorName}</span></div>
                                <div><span style={{ color: T.t3 }}>Warehouse: </span><span>{lastGrn?.warehouse}</span></div>
                            </div>
                            {lastGrn?.items?.map((item, idx) => (
                                <div key={idx} style={{ padding: "8px 10px", background: T.card, borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{item.name}</div>
                                    <div style={{ fontSize: 13, fontFamily: FONT.mono, color: T.emerald, fontWeight: 700 }}>{item.receivedQty} / {item.poQty} {item.unit}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                            <Btn variant="ghost" full onClick={resetGrnForm}>📦 New GRN</Btn>
                            <Btn variant="sky" full onClick={() => setActiveTab("grn_list")}>📋 View All GRNs</Btn>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 16 }}>📦 Create Goods Receipt Note</div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={labelStyle}>Select Purchase Order *</label>
                                    <select value={grnSelectedPO} onChange={e => setGrnSelectedPO(e.target.value)}
                                        style={{ ...inputStyle, cursor: "pointer" }}>
                                        <option value="">-- Select PO --</option>
                                        {shopPOs.filter(po => po.status !== "RECEIVED" || true).map(po => (
                                            <option key={po.id} value={po.id}>
                                                {po.poNo || po.id} — {po.vendorName} ({po.status || "SENT"})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Warehouse</label>
                                    <input value={grnWarehouse} onChange={e => setGrnWarehouse(e.target.value)} placeholder="Main Warehouse" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Notes</label>
                                    <input value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="Inspection notes..." style={inputStyle} />
                                </div>
                            </div>

                            {grnItems.length === 0 && grnSelectedPO && (
                                <div style={{ textAlign: "center", padding: 30, color: T.t3, fontSize: 14 }}>No pending items for this PO</div>
                            )}

                            {grnItems.length > 0 && (
                                <div style={{ background: T.surface, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                                {["", "Product", "PO Qty", "Already Recd", "Receive Now", "Rejected", "Reason", "Rate"].map(h => (
                                                    <th key={h} style={{ padding: "10px 10px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grnItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, opacity: item.accepted ? 1 : 0.5 }}>
                                                    <td style={{ padding: "10px 8px", width: 40 }}>
                                                        <input type="checkbox" checked={item.accepted} onChange={e => {
                                                            const next = [...grnItems];
                                                            next[idx] = { ...next[idx], accepted: e.target.checked };
                                                            setGrnItems(next);
                                                        }} style={{ cursor: "pointer" }} />
                                                    </td>
                                                    <td style={{ padding: "10px" }}>
                                                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{item.image} {item.name}</div>
                                                        <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono }}>{item.sku}</div>
                                                    </td>
                                                    <td style={{ padding: "10px 8px", fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: T.t2 }}>{item.poQty} {item.unit}</td>
                                                    <td style={{ padding: "10px 8px", fontFamily: FONT.mono, fontSize: 13, color: item.alreadyReceived > 0 ? T.sky : T.t4 }}>{item.alreadyReceived}</td>
                                                    <td style={{ padding: "10px 6px", width: 90 }}>
                                                        <input type="number" value={item.receivedQty} min="0" max={item.poQty - item.alreadyReceived}
                                                            onChange={e => {
                                                                const next = [...grnItems];
                                                                next[idx] = { ...next[idx], receivedQty: Math.max(0, Math.min(item.poQty - item.alreadyReceived, +e.target.value || 0)) };
                                                                setGrnItems(next);
                                                            }}
                                                            style={{ width: 70, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.emerald, fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, textAlign: "center" }} />
                                                    </td>
                                                    <td style={{ padding: "10px 6px", width: 70 }}>
                                                        <input type="number" value={item.rejectedQty} min="0"
                                                            onChange={e => {
                                                                const next = [...grnItems];
                                                                next[idx] = { ...next[idx], rejectedQty: Math.max(0, +e.target.value || 0) };
                                                                setGrnItems(next);
                                                            }}
                                                            style={{ width: 60, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.crimson, fontFamily: FONT.mono, fontSize: 13, textAlign: "center" }} />
                                                    </td>
                                                    <td style={{ padding: "10px 6px" }}>
                                                        <input value={item.rejectionReason} placeholder="If rejected..."
                                                            onChange={e => {
                                                                const next = [...grnItems];
                                                                next[idx] = { ...next[idx], rejectionReason: e.target.value };
                                                                setGrnItems(next);
                                                            }}
                                                            style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.t1, fontSize: 12, outline: "none" }} />
                                                    </td>
                                                    <td style={{ padding: "10px 8px", fontFamily: FONT.mono, fontSize: 13, fontWeight: 600, color: T.t2 }}>{fmt(item.rate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {grnItems.length > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                                    <div style={{ fontSize: 13, color: T.t3 }}>
                                        Receiving: <span style={{ fontWeight: 800, color: T.emerald }}>{grnItems.filter(i => i.accepted).reduce((s, i) => s + i.receivedQty, 0)}</span> items
                                        {grnItems.some(i => i.rejectedQty > 0) && <>, Rejected: <span style={{ fontWeight: 800, color: T.crimson }}>{grnItems.reduce((s, i) => s + i.rejectedQty, 0)}</span></>}
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <Btn variant="ghost" onClick={resetGrnForm}>Cancel</Btn>
                                        <Btn variant="sky" onClick={handleCreateGrn}>📦 Create GRN</Btn>
                                    </div>
                                </div>
                            )}

                            {!grnSelectedPO && (
                                <div style={{ textAlign: "center", padding: "40px 20px", color: T.t3 }}>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>Select a Purchase Order</div>
                                    <div style={{ fontSize: 13 }}>Choose a PO from the dropdown to begin receiving goods</div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            )}

            {activeTab === "grn_list" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {shopGrns.length === 0 ? (
                        <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No GRNs yet</div>
                            <div style={{ fontSize: 13, color: T.t3 }}>Create a GRN by receiving goods against a Purchase Order</div>
                            <Btn variant="sky" style={{ marginTop: 16 }} onClick={() => setActiveTab("grn")}>📦 Create GRN</Btn>
                        </div>
                    ) : (
                        shopGrns.sort((a, b) => b.createdAt - a.createdAt).map(grn => (
                            <div key={grn.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{grn.grnNo}</div>
                                        <StatusBadge status={grn.status} />
                                    </div>
                                    <div style={{ fontSize: 12, color: T.t3 }}>{fmtDateTime(grn.createdAt)}</div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, fontSize: 12, color: T.t3, marginBottom: 12 }}>
                                    <div><span style={{ fontWeight: 700 }}>PO:</span> <span style={{ fontFamily: FONT.mono }}>{grn.poNo}</span></div>
                                    <div><span style={{ fontWeight: 700 }}>Vendor:</span> {grn.vendorName}</div>
                                    <div><span style={{ fontWeight: 700 }}>Warehouse:</span> {grn.warehouse}</div>
                                    <div><span style={{ fontWeight: 700 }}>Items:</span> {grn.items?.length || 0}</div>
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {grn.items?.map((item, idx) => (
                                        <div key={idx} style={{ background: T.surface, borderRadius: 8, padding: "6px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
                                            <span style={{ color: T.t1, fontWeight: 600 }}>{item.name}</span>
                                            <span style={{ color: T.emerald, fontWeight: 800, fontFamily: FONT.mono }}>{item.receivedQty}/{item.poQty}</span>
                                            {item.rejectedQty > 0 && <span style={{ color: T.crimson, fontSize: 10 }}>({item.rejectedQty} rejected)</span>}
                                        </div>
                                    ))}
                                </div>
                                {grn.status === "Received" && (
                                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                                        <Btn variant="ghost" size="sm" onClick={() => {
                                            const updatedGrns = (grns || []).map(g => g.id === grn.id ? { ...g, status: "Billed" } : g);
                                            saveGrns(updatedGrns);
                                            toast?.(`GRN ${grn.grnNo} marked as Billed`, "success");
                                        }}>Mark as Billed</Btn>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "match" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 4 }}>🔍 3-Way Matching</div>
                        <div style={{ fontSize: 12, color: T.t3, marginBottom: 16 }}>Compare Purchase Order → GRN → Purchase Bill to flag discrepancies</div>

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, alignItems: "end" }}>
                            <div>
                                <label style={labelStyle}>Select Purchase Bill / Invoice</label>
                                <select value={matchBillId} onChange={e => setMatchBillId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                                    <option value="">-- Select Invoice --</option>
                                    {allBillInvoices.map(inv => (
                                        <option key={inv} value={inv}>{inv}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ fontSize: 12, color: T.t3, padding: "10px 0" }}>
                                {allBillInvoices.length} purchase bills available
                            </div>
                        </div>
                    </div>

                    {matchBillId && !threeWayMatchResult && (
                        <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "30px 20px", textAlign: "center", color: T.t3 }}>
                            No purchase movements found for this invoice
                        </div>
                    )}

                    {threeWayMatchResult && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Purchase Order</div>
                                    {threeWayMatchResult.hasPO ? (
                                        <>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(threeWayMatchResult.poTotal)}</div>
                                            <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{threeWayMatchResult.po.poNo || threeWayMatchResult.po.id}</div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: 13, color: T.t4 }}>No linked PO found</div>
                                    )}
                                </div>
                                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>GRN (Received)</div>
                                    {threeWayMatchResult.hasGRN ? (
                                        <>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(threeWayMatchResult.grnTotal)}</div>
                                            <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{threeWayMatchResult.relatedGrns.length} GRN(s)</div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: 13, color: T.t4 }}>No GRN found</div>
                                    )}
                                </div>
                                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Purchase Bill</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(threeWayMatchResult.billTotal)}</div>
                                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{threeWayMatchResult.invoiceNo}</div>
                                </div>
                            </div>

                            {(threeWayMatchResult.hasPO || threeWayMatchResult.hasGRN) && (
                                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                                    {threeWayMatchResult.hasPO && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 12, color: T.t3 }}>PO vs Bill:</span>
                                            <MatchIndicator level={threeWayMatchResult.overallTotalMatch} />
                                        </div>
                                    )}
                                    {threeWayMatchResult.hasPO && threeWayMatchResult.hasGRN && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 12, color: T.t3 }}>PO vs GRN:</span>
                                            <MatchIndicator level={threeWayMatchResult.overallGrnMatch} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                                <div style={{ padding: "12px 16px", background: T.surface, borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 800, color: T.t1 }}>
                                    Item-wise Comparison
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                            <th style={{ padding: "10px 12px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Product</th>
                                            <th style={{ padding: "10px 8px", textAlign: "center", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>PO Qty</th>
                                            <th style={{ padding: "10px 8px", textAlign: "center", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>GRN Qty</th>
                                            <th style={{ padding: "10px 8px", textAlign: "center", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Bill Qty</th>
                                            <th style={{ padding: "10px 8px", textAlign: "center", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>PO Rate</th>
                                            <th style={{ padding: "10px 8px", textAlign: "center", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Bill Rate</th>
                                            <th style={{ padding: "10px 8px", textAlign: "center", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {threeWayMatchResult.itemMatches.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, background: item.overallMatch === "major" ? "rgba(239,68,68,0.04)" : item.overallMatch === "minor" ? "rgba(245,158,11,0.04)" : "transparent" }}>
                                                <td style={{ padding: "10px 12px", fontWeight: 600, color: T.t1, fontSize: 13 }}>{item.productName}</td>
                                                <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: FONT.mono, fontSize: 13, color: T.t2 }}>{item.poQty || "—"}</td>
                                                <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: FONT.mono, fontSize: 13 }}>
                                                    <span style={{ color: MATCH_LEVEL[item.qtyMatchPOvsGRN]?.color || T.t2, fontWeight: 700 }}>{item.grnQty || "—"}</span>
                                                </td>
                                                <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: FONT.mono, fontSize: 13 }}>
                                                    <span style={{ color: MATCH_LEVEL[item.qtyMatchGRNvsBill]?.color || T.t2, fontWeight: 700 }}>{item.billQty || "—"}</span>
                                                </td>
                                                <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{item.poRate ? fmt(item.poRate) : "—"}</td>
                                                <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: FONT.mono, fontSize: 12 }}>
                                                    <span style={{ color: MATCH_LEVEL[item.rateMatchPOvsBill]?.color || T.t2, fontWeight: 600 }}>{item.billRate ? fmt(item.billRate) : "—"}</span>
                                                </td>
                                                <td style={{ padding: "10px 8px", textAlign: "center" }}>
                                                    <MatchIndicator level={item.overallMatch} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, marginBottom: 10, textTransform: "uppercase" }}>Match Summary</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.emerald, display: "inline-block" }}></span>
                                        <span style={{ color: T.t2 }}>Matched: {threeWayMatchResult.itemMatches.filter(i => i.overallMatch === "match").length}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.amber, display: "inline-block" }}></span>
                                        <span style={{ color: T.t2 }}>Minor: {threeWayMatchResult.itemMatches.filter(i => i.overallMatch === "minor").length}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.crimson, display: "inline-block" }}></span>
                                        <span style={{ color: T.t2 }}>Major: {threeWayMatchResult.itemMatches.filter(i => i.overallMatch === "major").length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!matchBillId && (
                        <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>Select a Purchase Bill</div>
                            <div style={{ fontSize: 13, color: T.t3 }}>Choose a purchase bill from the dropdown to compare with PO and GRN data</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../theme";
import { fmt, uid, daysAgo, fmtDate } from "../utils";
import { Badge, Btn, Input, Select, Modal, StatCard } from "../components/ui";
import { useStore } from "../store";

const RFQ_STATUS = {
    DRAFT: { label: "DRAFT", color: T.t3, bg: T.surface },
    PUBLISHED: { label: "PUBLISHED", color: T.sky, bg: T.skyBg },
    BIDDING: { label: "BIDDING", color: T.amber, bg: T.amberGlow, pulse: true },
    AWARDED: { label: "AWARDED", color: T.emerald, bg: T.emeraldBg },
    CANCELLED: { label: "CANCELLED", color: T.crimson, bg: T.crimsonBg },
};

const PO_STATUS = {
    SENT: { label: "SENT", color: T.sky, bg: T.skyBg },
    ACKNOWLEDGED: { label: "ACKNOWLEDGED", color: T.violet, bg: T.violetBg },
    PARTIALLY_RECEIVED: { label: "PARTIALLY RECEIVED", color: T.amber, bg: T.amberGlow },
    RECEIVED: { label: "RECEIVED", color: T.emerald, bg: T.emeraldBg },
    PAID: { label: "PAID", color: T.t2, bg: T.surface },
};

export default function VendorRFQPage() {
    const { 
        products, activeShopId, 
        rfqs = [], saveRfqs,
        vendors = [], saveVendors,
        purchaseOrders = [], savePurchaseOrders,
        movements, saveMovements,
        saveProducts,
        logAudit
    } = useStore();

    const [tab, setTab] = useState("my_rfqs");
    const [expandedRfqId, setExpandedRfqId] = useState(null);

    // Seed data if empty
    useEffect(() => {
        if (!vendors || vendors.length === 0) {
            const seedVendors = [
                { id: "v1", name: "Apex Auto Wholesale", rating: 4.8, categories: ["Brakes", "Engine"], trustScore: 95 },
                { id: "v2", name: "Global Spares Ltd", rating: 4.2, categories: ["Electrical", "Filters"], trustScore: 88 },
                { id: "v3", name: "Reliable Parts Co", rating: 4.5, categories: ["Suspension", "Body"], trustScore: 92 },
            ];
            saveVendors(seedVendors);
        }

        if (!rfqs || rfqs.length === 0) {
            const seedRfqs = [
                {
                    id: "rfq-" + uid(),
                    shopId: activeShopId,
                    rfqNo: "RFQ-OCT-001",
                    title: "Brake Parts Restock - October",
                    status: "BIDDING",
                    createdAt: Date.now() - 2 * 86400000,
                    deadline: Date.now() + 3 * 86400000,
                    requiredBy: Date.now() + 7 * 86400000,
                    paymentTerms: "Net-30",
                    deliveryRequirements: "Standard Ground Shipping",
                    items: [
                        { id: uid(), name: "Bosch Brake Pad Set", qty: 20, unit: "set", targetPrice: 1100 },
                    ],
                    bids: [
                        {
                            id: "bid-1",
                            vendorId: "v1",
                            vendorName: "Apex Auto Wholesale",
                            totalAmount: 21000,
                            items: [{ productId: "p1", unitPrice: 1050, qty: 20 }],
                            deliveryDate: Date.now() + 5 * 86400000,
                            paymentTerms: "Net-30",
                            notes: "Best price for bulk order.",
                            rating: 4.8
                        },
                        {
                            id: "bid-2",
                            vendorId: "v3",
                            vendorName: "Reliable Parts Co",
                            totalAmount: 22000,
                            items: [{ productId: "p1", unitPrice: 1100, qty: 20 }],
                            deliveryDate: Date.now() + 4 * 86400000,
                            paymentTerms: "Net-15",
                            notes: "Faster delivery guaranteed.",
                            rating: 4.5
                        }
                    ]
                },
                {
                    id: "rfq-" + uid(),
                    shopId: activeShopId,
                    rfqNo: "RFQ-SEP-098",
                    title: "Engine Oil Bulk Purchase",
                    status: "AWARDED",
                    createdAt: Date.now() - 15 * 86400000,
                    deadline: Date.now() - 10 * 86400000,
                    requiredBy: Date.now() - 5 * 86400000,
                    paymentTerms: "Immediate",
                    items: [
                        { id: uid(), name: "Castrol Edge 5W-30", qty: 10, unit: "can", targetPrice: 1800 },
                    ],
                    bids: [],
                    awardedTo: "v1"
                }
            ];
            saveRfqs(seedRfqs);
        }
    }, [rfqs, vendors, activeShopId, saveRfqs, saveVendors]);

    // RFQ Create Form State
    const [rfqForm, setRfqForm] = useState({
        title: "",
        requiredBy: "",
        paymentTerms: "Immediate",
        deliveryRequirements: "",
        items: [{ id: uid(), name: "", qty: 1, unit: "Pcs", targetPrice: "" }]
    });

    const handleAddItem = () => {
        setRfqForm(prev => ({
            ...prev,
            items: [...prev.items, { id: uid(), name: "", qty: 1, unit: "Pcs", targetPrice: "" }]
        }));
    };

    const handleRemoveItem = (id) => {
        setRfqForm(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const handleImportLowStock = () => {
        const lowStock = products.filter(p => p.shopId === activeShopId && p.stock < p.minStock);
        if (lowStock.length === 0) return;
        
        const newItems = lowStock.map(p => ({
            id: uid(),
            name: p.name,
            productId: p.id,
            qty: Math.max(p.minStock * 2 - p.stock, p.minStock),
            unit: p.unit || "Pcs",
            targetPrice: p.buyPrice
        }));

        setRfqForm(prev => ({
            ...prev,
            items: [...prev.items.filter(i => i.name !== ""), ...newItems]
        }));
    };

    const handleSubmitRfq = () => {
        const newRfq = {
            id: "rfq-" + uid(),
            shopId: activeShopId,
            rfqNo: "RFQ-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
            status: "PUBLISHED",
            createdAt: Date.now(),
            deadline: Date.now() + 7 * 86400000,
            bids: [],
            ...rfqForm
        };
        saveRfqs([newRfq, ...rfqs]);
        setRfqForm({ title: "", requiredBy: "", paymentTerms: "Immediate", deliveryRequirements: "", items: [{ id: uid(), name: "", qty: 1, unit: "Pcs", targetPrice: "" }] });
        setTab("my_rfqs");
        logAudit("RFQ_CREATED", "rfq", newRfq.rfqNo, newRfq.title);
    };

    const awardBid = (rfq, bid) => {
        const updatedRfqs = rfqs.map(r => r.id === rfq.id ? { ...r, status: "AWARDED", awardedTo: bid.vendorId } : r);
        saveRfqs(updatedRfqs);

        const newPo = {
            id: "po-" + uid(),
            poNo: "PO-" + uid().toUpperCase(),
            rfqId: rfq.id,
            rfqNo: rfq.rfqNo,
            shopId: activeShopId,
            vendorId: bid.vendorId,
            vendorName: bid.vendorName,
            items: bid.items.map(bi => {
                const rfqItem = rfq.items.find(ri => ri.id === bi.rfqItemId) || {};
                return { ...bi, name: rfqItem.name || "Item" };
            }),
            totalAmount: bid.totalAmount,
            status: "SENT",
            createdAt: Date.now()
        };
        savePurchaseOrders([newPo, ...purchaseOrders]);
        logAudit("PO_CREATED", "purchase_order", newPo.poNo, `Awarded from ${rfq.rfqNo}`);
    };

    const markReceived = (po) => {
        const updatedPos = purchaseOrders.map(p => p.id === po.id ? { ...p, status: "RECEIVED" } : p);
        savePurchaseOrders(updatedPos);

        const newMovements = po.items.map(item => ({
            id: "m" + uid(),
            shopId: activeShopId,
            productId: item.productId || "misc",
            productName: item.name,
            type: "PURCHASE",
            qty: item.qty,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.qty,
            date: Date.now(),
            invoiceNo: po.poNo,
            supplierName: po.vendorName,
            note: `Received via PO ${po.poNo}`
        }));
        saveMovements([...movements, ...newMovements]);

        // Update inventory stocks
        const updatedProducts = products.map(p => {
            const poItem = po.items.find(item => item.productId === p.id);
            if (poItem) {
                return { ...p, stock: p.stock + poItem.qty };
            }
            return p;
        });
        saveProducts(updatedProducts);
        logAudit("PO_RECEIVED", "purchase_order", po.poNo, `Stock updated for ${po.items.length} items`);
    };

    const rankBids = (bids) => {
        if (!bids || bids.length === 0) return [];
        return [...bids].sort((a, b) => {
            // Price (50%) - lower is better
            const priceScore = (1 / a.totalAmount) - (1 / b.totalAmount);
            // Rating (30%) - higher is better
            const ratingScore = a.rating - b.rating;
            // Delivery (20%) - sooner is better
            const deliveryScore = b.deliveryDate - a.deliveryDate;
            
            return (priceScore * 0.5) + (ratingScore * 0.3) + (deliveryScore * 0.2);
        });
    };

    return (
        <div className="page-in" style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, marginBottom: 4 }}>🤝 Vendor RFQ & Bidding</h1>
                    <p style={{ color: T.t3, fontSize: 14 }}>Manage your B2B procurement pipeline and vendor relationships.</p>
                </div>
                <div style={{ display: "flex", background: T.surface, padding: 4, borderRadius: 12, border: `1px solid ${T.border}` }}>
                    {[
                        { id: "my_rfqs", label: "My RFQs" },
                        { id: "create_rfq", label: "Create RFQ" },
                        { id: "vendor_bids", label: "Vendor Bids" },
                        { id: "purchase_orders", label: "Purchase Orders" }
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{ 
                            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, 
                            background: tab === t.id ? T.amber : "transparent", color: tab === t.id ? "#000" : T.t3,
                            transition: "all 0.2s"
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "my_rfqs" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
                    {rfqs.filter(r => r.shopId === activeShopId).map(rfq => (
                        <div key={rfq.id} style={{ 
                            background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, 
                            cursor: "pointer", transition: "all 0.2s" 
                        }} className="card-hover" onClick={() => setExpandedRfqId(expandedRfqId === rfq.id ? null : rfq.id)}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <Badge status={rfq.status} />
                                <div style={{ fontFamily: FONT.mono, fontSize: 12, color: T.t3 }}>{rfq.rfqNo}</div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, marginBottom: 8 }}>{rfq.title}</div>
                            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>Bids</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{rfq.bids?.length || 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>Deadline</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.amber }}>{daysAgo(rfq.deadline)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>Required By</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.t2 }}>{fmtDate(rfq.requiredBy)}</div>
                                </div>
                            </div>
                            {expandedRfqId === rfq.id && (
                                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, marginBottom: 8 }}>LINE ITEMS</div>
                                    {rfq.items.map(item => (
                                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                                            <div style={{ fontSize: 13, color: T.t1 }}>{item.name}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{item.qty} {item.unit}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {rfqs.filter(r => r.shopId === activeShopId).length === 0 && (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 80, background: T.card, borderRadius: 20, border: `1px dotted ${T.border}` }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>📑</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.t2 }}>No RFQs yet</div>
                            <Btn variant="outline" size="sm" sx={{ marginTop: 16 }} onClick={() => setTab("create_rfq")}>Create your first RFQ</Btn>
                        </div>
                    )}
                </div>
            )}

            {tab === "create_rfq" && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 32 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>New Request for Quotation</h2>
                        <Btn variant="subtle" size="sm" onClick={handleImportLowStock}>📦 Import Low Stock Items</Btn>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
                        <Input label="RFQ Title" value={rfqForm.title} onChange={v => setRfqForm({ ...rfqForm, title: v })} placeholder="e.g. October Brake Parts Restock" />
                        <Input label="Required By Date" type="date" value={rfqForm.requiredBy} onChange={v => setRfqForm({ ...rfqForm, requiredBy: v })} />
                        <Select label="Payment Terms" value={rfqForm.paymentTerms} onChange={v => setRfqForm({ ...rfqForm, paymentTerms: v })} options={[
                            { value: "Immediate", label: "Immediate" },
                            { value: "Net-15", label: "Net-15" },
                            { value: "Net-30", label: "Net-30" },
                            { value: "Net-45", label: "Net-45" }
                        ]} />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <Input label="Delivery Requirements" value={rfqForm.deliveryRequirements} onChange={v => setRfqForm({ ...rfqForm, deliveryRequirements: v })} placeholder="e.g. Standard Ground Shipping, Liftgate required..." />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.t2 }}>LINE ITEMS</div>
                            <Btn variant="ghost" size="xs" onClick={handleAddItem}>＋ Add Item</Btn>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                    <th style={{ textAlign: "left", padding: 12, fontSize: 11, color: T.t4 }}>PRODUCT NAME</th>
                                    <th style={{ textAlign: "left", padding: 12, fontSize: 11, color: T.t4, width: 100 }}>QTY</th>
                                    <th style={{ textAlign: "left", padding: 12, fontSize: 11, color: T.t4, width: 120 }}>UNIT</th>
                                    <th style={{ textAlign: "left", padding: 12, fontSize: 11, color: T.t4, width: 150 }}>TARGET PRICE</th>
                                    <th style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rfqForm.items.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}44` }}>
                                        <td style={{ padding: 8 }}>
                                            <input value={item.name} onChange={e => {
                                                const newItems = [...rfqForm.items];
                                                newItems[idx].name = e.target.value;
                                                setRfqForm({ ...rfqForm, items: newItems });
                                            }} style={{ width: "100%", background: "transparent", border: "none", color: T.t1, fontSize: 14, outline: "none" }} placeholder="Enter part name..." />
                                        </td>
                                        <td style={{ padding: 8 }}>
                                            <input type="number" value={item.qty} onChange={e => {
                                                const newItems = [...rfqForm.items];
                                                newItems[idx].qty = parseInt(e.target.value) || 0;
                                                setRfqForm({ ...rfqForm, items: newItems });
                                            }} style={{ width: "100%", background: "transparent", border: "none", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.mono }} />
                                        </td>
                                        <td style={{ padding: 8 }}>
                                            <select value={item.unit} onChange={e => {
                                                const newItems = [...rfqForm.items];
                                                newItems[idx].unit = e.target.value;
                                                setRfqForm({ ...rfqForm, items: newItems });
                                            }} style={{ background: "transparent", border: "none", color: T.t2, fontSize: 13, outline: "none", width: "100%" }}>
                                                <option value="Pcs">Pcs</option>
                                                <option value="Set">Set</option>
                                                <option value="Litre">Litre</option>
                                                <option value="Box">Box</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: 8 }}>
                                            <input type="number" value={item.targetPrice} onChange={e => {
                                                const newItems = [...rfqForm.items];
                                                newItems[idx].targetPrice = parseInt(e.target.value) || 0;
                                                setRfqForm({ ...rfqForm, items: newItems });
                                            }} style={{ width: "100%", background: "transparent", border: "none", color: T.amber, fontSize: 14, outline: "none", fontFamily: FONT.mono }} placeholder="Optional" />
                                        </td>
                                        <td style={{ padding: 8 }}>
                                            <button onClick={() => handleRemoveItem(item.id)} style={{ background: "transparent", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16 }}>×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <Btn variant="subtle" onClick={() => setTab("my_rfqs")}>Cancel</Btn>
                        <Btn onClick={handleSubmitRfq}>🚀 Publish RFQ</Btn>
                    </div>
                </div>
            )}

            {tab === "vendor_bids" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {rfqs.filter(r => r.status === "PUBLISHED" || r.status === "BIDDING").map(rfq => (
                        <div key={rfq.id}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>{rfq.title}</div>
                                <div style={{ fontFamily: FONT.mono, fontSize: 12, color: T.t4 }}>{rfq.rfqNo}</div>
                                <Badge status={rfq.status} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
                                {rankBids(rfq.bids).map((bid, idx) => (
                                    <div key={bid.id} style={{ 
                                        background: T.card, border: idx === 0 ? `2px solid ${T.amber}` : `1px solid ${T.border}`, 
                                        borderRadius: 16, padding: 24, position: "relative" 
                                    }}>
                                        {idx === 0 && <div style={{ position: "absolute", top: -12, right: 20, background: T.amber, color: "#000", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 20 }}>TOP RANKED</div>}
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                                            <div>
                                                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{bid.vendorName}</div>
                                                <div style={{ color: T.amber, fontSize: 12 }}>{"★".repeat(Math.floor(bid.rating))} <span style={{ color: T.t3 }}>({bid.rating})</span></div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(bid.totalAmount)}</div>
                                                <div style={{ fontSize: 11, color: T.t4 }}>Total Bid Amount</div>
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                                            <div>
                                                <div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>Delivery Date</div>
                                                <div style={{ fontSize: 13, color: T.t2, fontWeight: 600 }}>{fmtDate(bid.deliveryDate)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>Payment Terms</div>
                                                <div style={{ fontSize: 13, color: T.t2, fontWeight: 600 }}>{bid.paymentTerms}</div>
                                            </div>
                                        </div>
                                        <div style={{ background: T.surface, padding: 12, borderRadius: 12, marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: T.t3, fontStyle: "italic" }}>"{bid.notes}"</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <Btn full variant="amber" onClick={() => awardBid(rfq, bid)}>Award to Vendor</Btn>
                                            <Btn variant="subtle" onClick={() => {}}>Counter</Btn>
                                        </div>
                                    </div>
                                ))}
                                {(!rfq.bids || rfq.bids.length === 0) && (
                                    <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", background: T.surface, borderRadius: 16, border: `1px dashed ${T.border}` }}>
                                        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                                        <div style={{ color: T.t3 }}>Waiting for vendor bids...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {rfqs.filter(r => r.status === "PUBLISHED" || r.status === "BIDDING").length === 0 && (
                        <div style={{ textAlign: "center", padding: 100 }}>
                            <div style={{ fontSize: 48, marginBottom: 20 }}>🎯</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: T.t3 }}>No active bidding cycles</div>
                        </div>
                    )}
                </div>
            )}

            {tab === "purchase_orders" && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                <th style={{ textAlign: "left", padding: 16, fontSize: 11, color: T.t4 }}>PO NUMBER</th>
                                <th style={{ textAlign: "left", padding: 16, fontSize: 11, color: T.t4 }}>VENDOR</th>
                                <th style={{ textAlign: "left", padding: 16, fontSize: 11, color: T.t4 }}>ITEMS</th>
                                <th style={{ textAlign: "left", padding: 16, fontSize: 11, color: T.t4 }}>TOTAL COST</th>
                                <th style={{ textAlign: "left", padding: 16, fontSize: 11, color: T.t4 }}>STATUS</th>
                                <th style={{ textAlign: "right", padding: 16, fontSize: 11, color: T.t4 }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.filter(po => po.shopId === activeShopId).map(po => (
                                <tr key={po.id} style={{ borderBottom: `1px solid ${T.border}33` }}>
                                    <td style={{ padding: 16, fontFamily: FONT.mono, fontSize: 13, color: T.t1 }}>{po.poNo}</td>
                                    <td style={{ padding: 16, fontWeight: 700, color: T.t1 }}>{po.vendorName}</td>
                                    <td style={{ padding: 16, color: T.t3, fontSize: 13 }}>{po.items?.length} items</td>
                                    <td style={{ padding: 16, fontFamily: FONT.mono, fontWeight: 700, color: T.t1 }}>{fmt(po.totalAmount)}</td>
                                    <td style={{ padding: 16 }}><Badge status={po.status} /></td>
                                    <td style={{ padding: 16, textAlign: "right" }}>
                                        {po.status === "SENT" && <Btn size="xs" onClick={() => markReceived(po)}>Mark Received</Btn>}
                                        {po.status === "RECEIVED" && <span style={{ fontSize: 12, color: T.emerald, fontWeight: 700 }}>✓ Stock Updated</span>}
                                    </td>
                                </tr>
                            ))}
                            {purchaseOrders.filter(po => po.shopId === activeShopId).length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: 60, textAlign: "center", color: T.t4 }}>No purchase orders generated yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

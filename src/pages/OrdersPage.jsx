import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../theme";
import { fmt, daysAgo } from "../utils";
import { Btn, Modal } from "../components/ui";
import { useStore } from "../store";

const S = {
    NEW: { bg: `${T.sky}18`, color: T.sky, label: "New Order", next: "Accept" },
    ACCEPTED: { bg: "rgba(45,212,191,0.12)", color: "#2DD4BF", label: "Accepted", next: "Pack" },
    PACKED: { bg: `${T.amber}18`, color: T.amber, label: "Packed", next: "Dispatch" },
    DISPATCHED: { bg: `${T.violet}18`, color: T.violet, label: "Dispatched", next: "Delivered" },
    DELIVERED: { bg: `${T.emerald}18`, color: T.emerald, label: "Delivered", next: null },
    CANCELLED: { bg: `${T.crimson}18`, color: T.crimson, label: "Cancelled", next: null },
    RETURN_REQUESTED: { bg: "rgba(251,146,60,0.12)", color: "#FB923C", label: "Return Requested", next: null },
    RETURN_APPROVED: { bg: `${T.emerald}18`, color: T.emerald, label: "Return Approved", next: null },
    RETURN_REJECTED: { bg: `${T.crimson}18`, color: T.crimson, label: "Return Rejected", next: null },
    return_requested: { bg: "rgba(251,146,60,0.12)", color: "#FB923C", label: "Return Pending", next: null },
    return_approved: { bg: `${T.sky}18`, color: T.sky, label: "Return Approved", next: null },
    return_rejected: { bg: `${T.crimson}18`, color: T.crimson, label: "Return Rejected", next: null },
    return_received: { bg: `${T.violet}18`, color: T.violet, label: "Stock Received", next: null },
    refund_processed: { bg: `${T.emerald}18`, color: T.emerald, label: "Refund Processed", next: null },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

function OrderAcceptTimer({ orderTime }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const elapsed = now - orderTime;
    const limit = 5 * 60 * 1000;
    const remaining = Math.max(0, limit - elapsed);

    if (remaining > 0) {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        return (
            <div style={{ color: T.amber, fontSize: 12, fontWeight: 700, animation: "pulse 2s infinite" }}>
                Accept within {mins}:{secs.toString().padStart(2, "0")}
            </div>
        );
    }
    return (
        <div style={{ color: T.crimson, fontSize: 12, fontWeight: 800 }}>
            ⚠️ LATE — Respond Now
        </div>
    );
}

export function OrdersPage({ products, activeShopId, onSale, toast }) {
    const { orders, saveOrders, movements, saveMovements } = useStore();
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [tab, setTab] = useState("active");

    const shopOrders = useMemo(() => (orders || []).filter(o => o.shopId === activeShopId).sort((a, b) => b.time - a.time), [orders, activeShopId]);

    const returnRequests = useMemo(() => shopOrders.filter(o => o.status?.includes("return_") || o.status === "refund_processed"), [shopOrders]);

    const filteredOrders = useMemo(() => {
        if (tab === "returns") return returnRequests;
        if (tab === "completed") return shopOrders.filter(o => o.status === "DELIVERED" || o.status === "CANCELLED" || o.status === "refund_processed");
        return shopOrders.filter(o => !["DELIVERED", "CANCELLED", "refund_processed"].includes(o.status) && !o.status?.startsWith("return_"));
    }, [shopOrders, tab, returnRequests]);

    const handleApproveReturn = (order) => {
        const updatedOrders = orders.map(o => {
            if (o.id === order.id) {
                return {
                    ...o,
                    status: 'return_approved',
                    returnRequest: { ...o.returnRequest, status: 'APPROVED' }
                };
            }
            return o;
        });
        saveOrders(updatedOrders);

        // Add RETURN_IN movement
        // We need to parse order items. Assuming items is like "Product Name x Qty"
        // In a real app we'd have a line_items array. Here we'll try to find the product.
        const items = order.items.split(", ");
        const newMovements = [...movements];
        items.forEach(itemStr => {
            const parts = itemStr.split(" x ");
            const name = parts[0];
            const qty = parseInt(parts[1]) || 1;
            const product = products.find(p => p.name === name);
            if (product) {
                newMovements.push({
                    id: "m_ret_" + Math.random().toString(36).slice(2, 10),
                    shopId: activeShopId,
                    productId: product.id,
                    productName: product.name,
                    type: "RETURN_IN",
                    qty: qty,
                    unitPrice: product.buyPrice,
                    total: product.buyPrice * qty,
                    date: Date.now(),
                    note: `Return from customer order #${order.id}`
                });
            }
        });
        saveMovements(newMovements);
        toast?.("Return approved and stock updated.", "success");
    };

    const handleRejectReturn = (orderId, reason) => {
        const updatedOrders = orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    status: 'return_rejected',
                    returnRequest: { ...o.returnRequest, status: 'REJECTED', rejectionReason: reason }
                };
            }
            return o;
        });
        saveOrders(updatedOrders);
        setRejectModal(null);
        setRejectReason("");
        toast?.("Return request rejected.", "info");
    };

    const handleMarkReceived = (order) => {
        const updatedOrders = orders.map(o => {
            if (o.id === order.id) {
                return { ...o, status: 'return_received', returnRequest: { ...o.returnRequest, status: 'RECEIVED' } };
            }
            return o;
        });
        saveOrders(updatedOrders);
        toast?.("Stock marked as received.", "success");
    };

    const handleProcessRefund = (order) => {
        const updatedOrders = orders.map(o => {
            if (o.id === order.id) {
                return { ...o, status: 'refund_processed', refundedAt: Date.now(), returnRequest: { ...o.returnRequest, status: 'PROCESSED' } };
            }
            return o;
        });
        saveOrders(updatedOrders);
        toast?.("Refund processed successfully.", "success");
    };

    const returnStats = useMemo(() => {
        const total = returnRequests.length;
        const pending = returnRequests.filter(o => o.status === 'return_requested').length;
        const approved = returnRequests.filter(o => o.status === 'return_approved').length;
        const refundedAmount = returnRequests.filter(o => o.status === 'refund_processed').reduce((acc, o) => acc + o.total, 0);
        return { total, pending, approved, refundedAmount };
    }, [returnRequests]);

    const advance = id => saveOrders(orders.map(o => {
        if (o.id !== id) return o;
        const i = FLOW.indexOf(o.status);
        if (i === -1 || i === FLOW.length - 1) return o;
        const nextStatus = FLOW[i + 1];
        return { ...o, status: nextStatus, ...(nextStatus === "DELIVERED" ? { deliveredAt: Date.now() } : {}) };
    }));

    const reject = id => saveOrders(orders.map(o => o.id !== id ? o : { ...o, status: "CANCELLED" }));

    const approveReturn = (orderId) => {
        saveOrders(orders.map(o => o.id !== orderId ? o : {
            ...o,
            status: "RETURN_APPROVED",
            returnRequest: { ...o.returnRequest, status: "approved", processedAt: Date.now() },
        }));
        toast?.("Return approved. Customer will be notified.", "success");
    };

    const rejectReturn = (orderId) => {
        if (!rejectReason.trim()) return;
        saveOrders(orders.map(o => o.id !== orderId ? o : {
            ...o,
            status: "DELIVERED",
            returnRequest: { ...o.returnRequest, status: "rejected", processedAt: Date.now(), rejectionReason: rejectReason },
        }));
        setRejectModal(null);
        setRejectReason("");
        toast?.("Return rejected. Customer will be notified.", "info");
    };

    const getDisplayStatus = (o) => {
        if (o.returnRequest) {
            if (o.returnRequest.status === "approved") return "RETURN_APPROVED";
            if (o.returnRequest.status === "rejected") return "RETURN_REJECTED";
            return "RETURN_REQUESTED";
        }
        return o.status;
    };

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                {["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED"].map(s => {
                    const m = S[s]; const cnt = shopOrders.filter(o => o.status === s && !o.returnRequest).length;
                    return (
                        <div key={s} style={{ background: m.bg, border: `1px solid ${m.color}28`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: m.color, fontFamily: FONT.mono }}>{cnt}</div>
                            <div style={{ fontSize: 10, color: m.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                {[
                    ["active", "🔄 Active Orders"],
                    ["returns", `↩️ Returns${returnRequests.filter(o => o.status === 'return_requested').length > 0 ? ` (${returnRequests.filter(o => o.status === 'return_requested').length})` : ""}`],
                    ["completed", "✅ Completed"],
                ].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)} className="btn-hover-subtle"
                        style={{ background: tab === id ? `${T.amber}22` : "transparent", color: tab === id ? T.amber : T.t3, border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "0.2s" }}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === "returns" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
                    {[
                        { label: "Total Returns", val: returnStats.total, color: T.sky },
                        { label: "Pending", val: returnStats.pending, color: T.amber },
                        { label: "Approved", val: returnStats.approved, color: T.violet },
                        { label: "Refunded", val: fmt(returnStats.refundedAmount), color: T.emerald },
                    ].map((stat, i) => (
                        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>{stat.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: stat.color, fontFamily: FONT.mono }}>{stat.val}</div>
                        </div>
                    ))}
                </div>
            )}

            {filteredOrders.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: T.t3, fontSize: 14 }}>
                    {tab === "returns" ? "No return requests." : tab === "completed" ? "No completed orders yet." : "No active orders."}
                </div>
            )}

            {tab === "completed" && filteredOrders.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                    {[
                        { label: "Total Revenue", val: fmt(filteredOrders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + (o.total || 0), 0)), color: T.emerald },
                        { label: "Avg. Order Value", val: fmt(filteredOrders.filter(o => o.status === "DELIVERED").length ? filteredOrders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + (o.total || 0), 0) / filteredOrders.filter(o => o.status === "DELIVERED").length : 0), color: T.sky },
                        { label: "Total Items Shipped", val: filteredOrders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + (o.items?.split(",").length || 1), 0), color: T.violet },
                    ].map((stat, i) => (
                        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>{stat.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: stat.color, fontFamily: FONT.mono }}>{stat.val}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredOrders.map(o => {
                    const displayStatus = getDisplayStatus(o);
                    const m = S[displayStatus] || S.NEW;
                    const isReturnPending = o.returnRequest && o.returnRequest.status === "pending";
                    const isNew = o.status === "NEW" && !o.returnRequest;

                    return (
                        <div key={o.id} className="card-hover" style={{ 
                            background: T.card, 
                            border: `1px solid ${isReturnPending ? "#FB923C44" : isNew ? T.amber : T.border}`, 
                            borderRadius: 16, 
                            padding: "18px 22px", 
                            boxShadow: isNew ? `0 0 20px ${T.amber}15` : "0 2px 8px rgba(0,0,0,0.2)",
                            animation: isNew ? "borderGlow 2s infinite" : "none",
                            position: "relative",
                            overflow: "hidden"
                        }}>
                            {isNew && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: T.amber }} />}
                            
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                        <div style={{ fontFamily: FONT.mono, color: T.amber, fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>#{o.id}</div>
                                        <span style={{ 
                                            background: m.bg, 
                                            color: m.color, 
                                            fontSize: 10, 
                                            padding: "3px 10px", 
                                            borderRadius: 6, 
                                            fontWeight: 800, 
                                            fontFamily: FONT.ui, 
                                            textTransform: "uppercase", 
                                            letterSpacing: "0.05em" 
                                        }}>
                                            {m.label}
                                        </span>
                                        {isNew && <OrderAcceptTimer orderTime={o.time} />}
                                        <span style={{ fontSize: 12, color: T.t3, marginLeft: "auto" }}>{daysAgo(o.time)}</span>
                                    </div>

                                    {o.returnRequest && (
                                        <div style={{ background: `${m.bg}`, padding: "12px 16px", borderRadius: 12, border: `1px solid ${m.color}22`, marginBottom: 16 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: m.color }}>RETURN REQUEST</span>
                                                <span style={{ fontSize: 11, color: T.t3 }}>Requested {daysAgo(o.returnRequest.createdAt)}</span>
                                            </div>
                                            <div style={{ fontSize: 14, color: T.t1, marginBottom: 4 }}><strong>Reason:</strong> {o.returnRequest.reason}</div>
                                            <div style={{ fontSize: 13, color: T.t2, marginBottom: 8 }}>{o.returnRequest.description}</div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div style={{ fontSize: 11, color: T.t3 }}>Expected Refund: <span style={{ color: T.sky, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(o.returnRequest.expectedRefund)}</span></div>
                                                {o.returnRequest.evidenceFile && <div style={{ fontSize: 11, color: T.t3 }}>📷 {o.returnRequest.evidenceFile}</div>}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: T.t1, fontSize: 17, marginBottom: 2 }}>{o.customer}</div>
                                            <div style={{ fontSize: 13, color: T.t2, display: "flex", alignItems: "center", gap: 6 }}>
                                                <span>📱 {o.phone}</span>
                                                <span style={{ color: T.t4 }}>•</span>
                                                <span>💳 {o.payment || "Prepaid"}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontWeight: 900, fontSize: 22, color: T.t1, fontFamily: FONT.mono, lineHeight: 1 }}>{fmt(o.total)}</div>
                                            <div style={{ fontSize: 11, color: T.t3, marginTop: 4, fontWeight: 600 }}>TOTAL AMOUNT</div>
                                        </div>
                                    </div>

                                    <div style={{ background: `${T.bg}88`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, border: `1px solid ${T.border}44` }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" }}>Order Items</div>
                                        <div style={{ fontSize: 13, color: T.t1, lineHeight: 1.5, fontWeight: 500 }}>
                                            {o.items?.length > 100 ? o.items.substring(0, 100) + "..." : o.items}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                                        <div style={{ fontSize: 12, color: T.t2, display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ opacity: 0.7 }}>📍</span>
                                            <span style={{ color: T.t1, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.address || "No address provided"}</span>
                                        </div>
                                        {o.vehicle && (
                                            <div style={{ fontSize: 12, color: T.amber, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                                                <span>🚗</span>
                                                <span style={{ fontFamily: FONT.mono }}>{o.vehicle}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 120 }}>
                                    {o.status === "return_requested" && (
                                        <>
                                            <Btn size="sm" variant="emerald" onClick={() => handleApproveReturn(o)}>Approve</Btn>
                                            <Btn size="sm" variant="danger" onClick={() => setRejectModal(o)}>Reject</Btn>
                                        </>
                                    )}
                                    {o.status === "return_approved" && (
                                        <Btn size="sm" variant="violet" onClick={() => handleMarkReceived(o)}>Mark Stock Received</Btn>
                                    )}
                                    {o.status === "return_received" && (
                                        <Btn size="sm" variant="emerald" onClick={() => handleProcessRefund(o)}>Process Refund</Btn>
                                    )}
                                    {!o.status?.startsWith("return_") && o.status !== "refund_processed" && S[o.status]?.next && (
                                        <Btn size="md" variant="emerald" onClick={() => advance(o.id)} sx={{ width: "100%", justifyContent: "center" }}>
                                            ✓ {S[o.status].next}
                                        </Btn>
                                    )}
                                    {!o.status?.startsWith("return_") && o.status !== "refund_processed" && o.status === "NEW" && (
                                        <Btn size="md" variant="danger" onClick={() => reject(o.id)} sx={{ width: "100%", justifyContent: "center" }}>
                                            ✕ Reject
                                        </Btn>
                                    )}
                                </div>
                            </div>

                            {isReturnPending && (
                                <div style={{ marginTop: 18, background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 12, padding: 16, animation: "fadeIn 0.3s ease" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <span style={{ fontSize: 18 }}>↩️</span>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: "#FB923C" }}>Return Request Received</div>
                                                <span style={{ fontSize: 11, color: T.t3, background: "rgba(251,146,60,0.1)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{daysAgo(o.returnRequest.requestedAt)}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: T.t2, marginBottom: 4 }}><strong>Reason:</strong> <span style={{ color: T.t1 }}>{o.returnRequest.reason}</span></div>
                                            {o.returnRequest.detail && <div style={{ fontSize: 13, color: T.t3, fontStyle: "italic", marginBottom: 10 }}>"{o.returnRequest.detail}"</div>}
                                            
                                            {o.returnRequest.photos?.length > 0 && (
                                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                                    {o.returnRequest.photos.map((p, i) => (
                                                        <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: T.t2, display: "flex", alignItems: "center", gap: 6 }}>
                                                            <span>📷</span> {p.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <Btn size="sm" variant="emerald" sx={{ padding: "10px 20px", fontWeight: 700 }} onClick={() => approveReturn(o.id)}>✅ Approve Return</Btn>
                                            <Btn size="sm" variant="danger" sx={{ padding: "10px 20px", fontWeight: 700 }} onClick={() => setRejectModal(o)}>✕ Reject Return</Btn>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {o.returnRequest && o.returnRequest.status !== "pending" && (
                                <div style={{ marginTop: 14, fontSize: 12, color: T.t3, padding: "10px 16px", background: `${T.bg}66`, borderRadius: 10, border: `1px solid ${T.border}44`, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>{o.returnRequest.status === "approved" ? "✅" : "❌"}</span>
                                    <span>
                                        Return {o.returnRequest.status === "approved" ? "approved" : "rejected"} · {o.returnRequest.processedAt ? daysAgo(o.returnRequest.processedAt) : ""}
                                        {o.returnRequest.rejectionReason && <span style={{ color: T.crimson, fontWeight: 600 }}> — {o.returnRequest.rejectionReason}</span>}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(""); }} title="Reject Return Request" width={440}>
                <div style={{ fontSize: 13, color: T.t3, marginBottom: 14 }}>Please provide a reason for rejecting this return request. The customer will see this message.</div>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3}
                    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                    <Btn variant="ghost" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancel</Btn>
                    <Btn variant="danger" onClick={() => handleRejectReturn(rejectModal?.id, rejectReason)} disabled={!rejectReason.trim()}>✕ Reject Return</Btn>
                </div>
            </Modal>
        </div>
    );
}

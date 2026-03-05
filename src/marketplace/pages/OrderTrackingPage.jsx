import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, fmtDateTime, daysAgo, uid, RETURN_REASONS } from "../../utils";
import { Btn, Modal } from "../../components/ui";

const STATUS_META = {
    NEW: { label: "Order Placed", icon: "📋", color: T.sky, desc: "Your order has been placed and is awaiting confirmation from the seller." },
    ACCEPTED: { label: "Confirmed by Seller", icon: "✅", color: T.emerald, desc: "The seller has confirmed your order and is preparing it." },
    PACKED: { label: "Packed & Ready", icon: "📦", color: T.amber, desc: "Your order has been packed and is ready for pickup by the delivery partner." },
    DISPATCHED: { label: "Out for Delivery", icon: "🚚", color: T.violet, desc: "Your order is on its way! Delivery partner is en route." },
    DELIVERED: { label: "Delivered", icon: "✓", color: T.emerald, desc: "Your order has been delivered successfully." },
    CANCELLED: { label: "Cancelled", icon: "✕", color: T.crimson, desc: "This order was cancelled." },
    RETURN_REQUESTED: { label: "Return Requested", icon: "↩️", color: "#FB923C", desc: "Your return request is being reviewed by the seller." },
    RETURN_APPROVED: { label: "Return Approved", icon: "✅", color: T.emerald, desc: "Your return has been approved. Please ship the item back." },
    RETURN_REJECTED: { label: "Return Rejected", icon: "✕", color: T.crimson, desc: "Your return request was rejected by the seller." },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

function DeliveryCountdown({ orderTime }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Estimated delivery 45 mins after order
    const deliveryTime = orderTime + 45 * 60 * 1000;
    const remaining = Math.max(0, deliveryTime - now);

    if (remaining === 0) return <div style={{ fontSize: 12, color: T.emerald, fontWeight: 700 }}>Arriving any moment!</div>;

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return (
        <div style={{ fontSize: 12, color: T.amber, fontWeight: 700 }}>
            Estimated delivery in {mins}m {secs}s
        </div>
    );
}

export function OrderTrackingPage({ onBack }) {
    const { orders, saveOrders, shops, reviews, saveReviews } = useStore();
    const safeOrders = orders || [];

    const [returnModal, setReturnModal] = useState(null);
    const [reviewModal, setReviewModal] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnDetail, setReturnDetail] = useState("");
    const [returnPhotos, setReturnPhotos] = useState([]);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [returnStep, setReturnStep] = useState(null); // 'request' | null
    const [selectedReturnReason, setSelectedReturnReason] = useState("");
    const [returnDescription, setReturnDescription] = useState("");
    const [evidenceFile, setEvidenceFile] = useState("");

    const myOrders = useMemo(
        () => safeOrders.filter(o => o.address || o.payment?.includes("Escrow") || o.payment?.includes("COD") || o.payment?.includes("Prepaid")).sort((a, b) => b.time - a.time),
        [safeOrders]
    );

    const RETURN_POLICY = {
        standard: 7,
        wrongPart: 14,
        consumables: 0
    };

    const handleReturnSubmit = (order) => {
        if (!selectedReturnReason || returnDescription.length < 20) return;
        
        const returnReq = {
            id: "RET-" + uid().toUpperCase(),
            reason: selectedReturnReason,
            description: returnDescription,
            status: 'PENDING',
            createdAt: Date.now(),
            evidenceFile: evidenceFile || "evidence_photo.jpg",
            expectedRefund: order.total
        };

        const updatedOrders = safeOrders.map(o => 
            o.id === order.id ? { ...o, status: 'return_requested', returnRequest: returnReq } : o
        );
        
        saveOrders(updatedOrders);
        setReturnStep(null);
        setSelectedReturnReason("");
        setReturnDescription("");
        setEvidenceFile("");
    };

    const canRequestReturn = (order) => {
        if (order.status !== "DELIVERED") return false;
        if (order.returnRequest) return false;
        const daysSinceDelivery = Math.floor((Date.now() - (order.deliveredAt || order.time)) / 86400000);
        return daysSinceDelivery <= 7;
    };

    const daysLeftForReturn = (order) => {
        const daysSinceDelivery = Math.floor((Date.now() - (order.deliveredAt || order.time)) / 86400000);
        return Math.max(0, 7 - daysSinceDelivery);
    };

    const getOrderReview = (orderId) => {
        return (reviews || []).find(r => r.orderId === orderId);
    };

    const handleSubmitReturn = () => {
        if (!returnReason || !returnModal) return;
        const updated = safeOrders.map(o => o.id !== returnModal.id ? o : {
            ...o,
            status: "RETURN_REQUESTED",
            returnRequest: {
                id: "ret_" + uid(),
                reason: returnReason,
                detail: returnDetail,
                photos: returnPhotos,
                requestedAt: Date.now(),
                status: "pending",
            },
        });
        saveOrders(updated);
        setReturnModal(null);
        setReturnReason("");
        setReturnDetail("");
        setReturnPhotos([]);
    };

    const handleSubmitReview = () => {
        if (!reviewModal) return;
        const review = {
            id: "rev_" + uid(),
            orderId: reviewModal.id,
            productName: reviewModal.items,
            shopId: reviewModal.shopId,
            rating: reviewRating,
            text: reviewText,
            createdAt: Date.now(),
        };
        saveReviews([...(reviews || []), review]);
        setReviewModal(null);
        setReviewRating(5);
        setReviewText("");
    };

    const simulatePhotoUpload = () => {
        const photoNames = ["IMG_001.jpg", "IMG_002.jpg", "IMG_003.jpg", "photo_damage.jpg", "receipt_scan.jpg"];
        const randomPhoto = photoNames[Math.floor(Math.random() * photoNames.length)];
        setReturnPhotos(prev => [...prev, { name: randomPhoto, size: Math.floor(Math.random() * 2000 + 500) + "KB", uploadedAt: Date.now() }]);
    };

    if (myOrders.length === 0) {
        return (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 30 }}>← Back to Marketplace</button>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>📦</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>No orders yet</div>
                <p style={{ color: T.t3, marginTop: 8 }}>Your order history will appear here after your first purchase.</p>
                <button onClick={onBack} style={{ marginTop: 24, background: T.amber, color: "#000", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Start Shopping →</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
            <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 24 }}>← Back to Marketplace</button>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: "0 0 8px" }}>My Orders</h1>
            <p style={{ fontSize: 14, color: T.t3, margin: "0 0 32px" }}>{myOrders.length} order{myOrders.length > 1 ? "s" : ""} found</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {myOrders.map(order => {
                    const shop = (shops || []).find(s => s.id === order.shopId);
                    const statusKey = order.returnRequest ? (order.returnRequest.status === "approved" ? "RETURN_APPROVED" : order.returnRequest.status === "rejected" ? "RETURN_REJECTED" : "RETURN_REQUESTED") : order.status;
                    const statusMeta = STATUS_META[statusKey] || STATUS_META.NEW;
                    const currentFlowIdx = FLOW.indexOf(order.status);
                    const isCancelled = order.status === "CANCELLED";
                    const existingReview = getOrderReview(order.id);

                    return (
                        <div key={order.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>{order.id}</div>
                                    <div style={{ background: `${statusMeta.color}22`, color: statusMeta.color, padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                                        {statusMeta.icon} {statusMeta.label}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(order.total)}</div>
                                    <div style={{ fontSize: 11, color: T.t3 }}>{daysAgo(order.time)}</div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

                                <div style={{ padding: "24px 28px", borderRight: `1px solid ${T.border}` }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Order Details</div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                                        <span style={{ fontSize: 20 }}>{shop?.imageEmoji || "🏪"}</span>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{shop?.name || "Local Shop"}</div>
                                            <div style={{ fontSize: 12, color: T.t3 }}>{shop?.address || ""}</div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.7 }}>
                                        <div><strong>Items:</strong> {order.items}</div>
                                        <div><strong>Payment:</strong> {order.payment}</div>
                                        {order.address && <div><strong>Address:</strong> {order.address}</div>}
                                        <div><strong>Placed:</strong> {fmtDateTime(order.time)}</div>
                                    </div>

                                    {order.status === "DELIVERED" && (
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                {canRequestReturn(order) && (
                                                    <Btn size="sm" variant="danger" onClick={() => setReturnStep(order.id === returnStep ? null : order.id)}>
                                                        ↩️ {order.id === returnStep ? "Cancel Return" : `Request Return (${daysLeftForReturn(order)}d left)`}
                                                    </Btn>
                                                )}
                                                {!canRequestReturn(order) && !order.returnRequest && (
                                                    <span style={{ fontSize: 11, color: T.t4, fontStyle: "italic" }}>Return window expired</span>
                                                )}
                                                {!existingReview ? (
                                                    <Btn size="sm" variant="amber" onClick={() => setReviewModal(order)}>⭐ Write Review</Btn>
                                                ) : (
                                                    <div style={{ background: `${T.amber}11`, border: `1px solid ${T.amber}33`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                                        <div style={{ color: T.amber, fontWeight: 700 }}>{"★".repeat(existingReview.rating)}{"☆".repeat(5 - existingReview.rating)}</div>
                                                        {existingReview.text && <div style={{ color: T.t3, marginTop: 4 }}>{existingReview.text}</div>}
                                                    </div>
                                                )}
                                            </div>

                                            {returnStep === order.id && (
                                                <div style={{ marginTop: 20, padding: 20, background: T.surface, borderRadius: 12, border: `1px solid ${T.borderHi}`, animation: "fadeUp 0.3s ease" }}>
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 16 }}>Request Return</div>
                                                    
                                                    <div style={{ marginBottom: 16 }}>
                                                        <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, fontWeight: 600 }}>RETURN REASON</div>
                                                        <select 
                                                            value={selectedReturnReason} 
                                                            onChange={e => setSelectedReturnReason(e.target.value)}
                                                            style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, padding: "10px 12px", borderRadius: 8, color: T.t1, outline: "none" }}
                                                        >
                                                            <option value="">Select a reason...</option>
                                                            <option value="Wrong Part Delivered">Wrong Part Delivered</option>
                                                            <option value="Damaged in Transit">Damaged in Transit</option>
                                                            <option value="Not as Described">Not as Described</option>
                                                            <option value="Defective Product">Defective Product</option>
                                                            <option value="Change of Mind">Change of Mind</option>
                                                            <option value="Fitment Issue">Fitment Issue</option>
                                                        </select>
                                                    </div>

                                                    <div style={{ marginBottom: 16 }}>
                                                        <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, fontWeight: 600 }}>DESCRIPTION (min 20 chars)</div>
                                                        <textarea 
                                                            value={returnDescription}
                                                            onChange={e => setReturnDescription(e.target.value)}
                                                            placeholder="Please describe the issue in detail..."
                                                            style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, padding: "10px 12px", borderRadius: 8, color: T.t1, outline: "none", minHeight: 80, resize: "vertical" }}
                                                        />
                                                        <div style={{ fontSize: 10, color: returnDescription.length < 20 ? T.crimson : T.emerald, marginTop: 4 }}>
                                                            {returnDescription.length} / 20 characters
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: 16 }}>
                                                        <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, fontWeight: 600 }}>UPLOAD EVIDENCE</div>
                                                        <div 
                                                            onClick={() => setEvidenceFile("IMG_" + Math.floor(Math.random()*9000+1000) + ".jpg")}
                                                            style={{ height: 60, border: `2px dashed ${T.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.t3, fontSize: 13 }}
                                                        >
                                                            {evidenceFile ? `✅ ${evidenceFile}` : "Click to simulate upload"}
                                                        </div>
                                                    </div>

                                                    <div style={{ background: `${T.sky}11`, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                            <span style={{ fontSize: 12, color: T.t2 }}>Estimated Refund:</span>
                                                            <span style={{ fontSize: 14, fontWeight: 800, color: T.sky, fontFamily: FONT.mono }}>{fmt(order.total)}</span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: T.t3, lineHeight: 1.4 }}>
                                                            <strong>Policy:</strong> 7 days standard return. 14 days for wrong parts. No returns for consumables.
                                                        </div>
                                                    </div>

                                                    <Btn 
                                                        variant="danger" 
                                                        fullWidth 
                                                        disabled={!selectedReturnReason || returnDescription.length < 20}
                                                        onClick={() => handleReturnSubmit(order)}
                                                    >
                                                        Submit Return Request
                                                    </Btn>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {order.returnRequest && (
                                        <div style={{ marginTop: 14, background: `${STATUS_META[statusKey]?.color || T.amber}11`, border: `1px solid ${STATUS_META[statusKey]?.color || T.amber}33`, borderRadius: 10, padding: 12 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: STATUS_META[statusKey]?.color || T.amber, marginBottom: 4 }}>
                                                {statusKey === "RETURN_APPROVED" ? "✅ Return Approved" : statusKey === "RETURN_REJECTED" ? "✕ Return Rejected" : "↩️ Return Requested"}
                                            </div>
                                            <div style={{ fontSize: 11, color: T.t3 }}>Reason: {order.returnRequest.reason}</div>
                                            {order.returnRequest.detail && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{order.returnRequest.detail}</div>}
                                            {order.returnRequest.photos?.length > 0 && (
                                                <div style={{ fontSize: 10, color: T.t4, marginTop: 4 }}>📷 {order.returnRequest.photos.length} photo(s) attached</div>
                                            )}
                                            {order.returnRequest.rejectionReason && (
                                                <div style={{ fontSize: 11, color: T.crimson, marginTop: 4 }}>Seller note: {order.returnRequest.rejectionReason}</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: "24px 28px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tracking Timeline</div>
                                        {order.status === "DISPATCHED" && <DeliveryCountdown orderTime={order.time} />}
                                    </div>

                                    {isCancelled ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 20, background: `${T.crimson}11`, border: `1px solid ${T.crimson}33`, borderRadius: 12 }}>
                                            <span style={{ fontSize: 28 }}>✕</span>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: T.crimson }}>Order Cancelled</div>
                                                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>This order was cancelled by the seller.</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ position: "relative", paddingLeft: 24, paddingRight: 10 }}>
                                            {/* Vertical line connector */}
                                            <div style={{ 
                                                position: "absolute", left: -1, top: 13, bottom: 13, width: 2, 
                                                background: T.border, zIndex: 1
                                            }} />
                                            
                                            {FLOW.map((status, i) => {
                                                const meta = STATUS_META[status];
                                                const isDone = i <= currentFlowIdx;
                                                const isCurrent = i === currentFlowIdx;
                                                const isLast = i === FLOW.length - 1;

                                                const stepTime = isDone ? order.time + i * 1200000 : null;

                                                return (
                                                    <div key={status} style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: isLast ? 0 : 32, position: "relative" }}>
                                                        {/* Segment of line that is colored if done */}
                                                        {i < currentFlowIdx && (
                                                            <div style={{ 
                                                                position: "absolute", left: -25, top: 22, height: 36, width: 2, 
                                                                background: meta.color, zIndex: 2
                                                            }} />
                                                        )}

                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                                            background: isDone ? meta.color : T.card,
                                                            border: `2px solid ${isDone ? meta.color : T.border}`,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            zIndex: 3, position: "relative", left: -12,
                                                            boxShadow: isCurrent ? `0 0 12px ${meta.color}66` : "none",
                                                            animation: isCurrent ? "pulse 2s infinite" : "none",
                                                            transition: "all 0.3s ease"
                                                        }}>
                                                            {isDone ? (
                                                                <span style={{ fontSize: 11, color: "#000", fontWeight: 900 }}>✓</span>
                                                            ) : (
                                                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.border }} />
                                                            )}
                                                        </div>

                                                        <div style={{ flex: 1, marginTop: -2 }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                                                <div style={{ fontSize: 14, fontWeight: 700, color: isDone ? T.t1 : T.t3, transition: "color 0.3s" }}>{meta.label}</div>
                                                                {isDone && stepTime && (
                                                                    <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono, opacity: 0.8 }}>{fmtDateTime(stepTime).split(", ")[1]}</div>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: isCurrent ? T.t2 : T.t4, marginTop: 4, lineHeight: 1.5, maxWidth: "90%" }}>
                                                                {isCurrent ? meta.desc : isDone ? "Completed" : "Awaiting previous steps..."}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal open={!!returnModal} onClose={() => { setReturnModal(null); setReturnReason(""); setReturnDetail(""); setReturnPhotos([]); }} title="Request Return" width={520}>
                <div style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>You have 7 days from delivery to request a return. Please select a reason and optionally attach photos.</div>

                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Reason for Return *</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {RETURN_REASONS.map(reason => (
                            <label key={reason} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: returnReason === reason ? `${T.amber}18` : T.surface, border: `1px solid ${returnReason === reason ? T.amber + "66" : T.border}`, borderRadius: 10, cursor: "pointer", transition: "0.15s" }}>
                                <input type="radio" name="returnReason" checked={returnReason === reason} onChange={() => setReturnReason(reason)} style={{ accentColor: T.amber }} />
                                <span style={{ fontSize: 13, color: returnReason === reason ? T.t1 : T.t2, fontWeight: returnReason === reason ? 700 : 500 }}>{reason}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Additional Details</div>
                    <textarea value={returnDetail} onChange={e => setReturnDetail(e.target.value)} placeholder="Describe the issue in detail..." rows={3}
                        style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Photo Evidence</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        {returnPhotos.map((p, i) => (
                            <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                                <span>📷</span>
                                <span style={{ color: T.t2 }}>{p.name}</span>
                                <span style={{ color: T.t4 }}>({p.size})</span>
                                <button onClick={() => setReturnPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
                            </div>
                        ))}
                    </div>
                    <Btn size="sm" variant="subtle" onClick={simulatePhotoUpload}>📷 Upload Photo</Btn>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                    <Btn variant="ghost" onClick={() => { setReturnModal(null); setReturnReason(""); setReturnDetail(""); setReturnPhotos([]); }}>Cancel</Btn>
                    <Btn variant="danger" onClick={handleSubmitReturn} disabled={!returnReason}>↩️ Submit Return Request</Btn>
                </div>
            </Modal>

            <Modal open={!!reviewModal} onClose={() => { setReviewModal(null); setReviewRating(5); setReviewText(""); }} title="Write a Review" width={460}>
                <div style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>Share your experience with this order to help other buyers.</div>

                {reviewModal && (
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: T.t2 }}>
                        <strong>{reviewModal.items}</strong>
                        <div style={{ color: T.t3, marginTop: 4 }}>{reviewModal.id} · {fmt(reviewModal.total)}</div>
                    </div>
                )}

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Rating</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} onClick={() => setReviewRating(star)}
                                style={{ background: "none", border: "none", fontSize: 32, cursor: "pointer", color: star <= reviewRating ? T.amber : T.t4, transition: "transform 0.1s", transform: star <= reviewRating ? "scale(1.1)" : "scale(1)" }}>
                                {star <= reviewRating ? "★" : "☆"}
                            </button>
                        ))}
                        <span style={{ fontSize: 14, color: T.t2, fontWeight: 700, alignSelf: "center", marginLeft: 8 }}>
                            {reviewRating === 5 ? "Excellent!" : reviewRating === 4 ? "Very Good" : reviewRating === 3 ? "Good" : reviewRating === 2 ? "Fair" : "Poor"}
                        </span>
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Your Review</div>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="What did you like or dislike about this product?" rows={4}
                        style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                    <Btn variant="ghost" onClick={() => { setReviewModal(null); setReviewRating(5); setReviewText(""); }}>Cancel</Btn>
                    <Btn variant="amber" onClick={handleSubmitReview}>⭐ Submit Review</Btn>
                </div>
            </Modal>
        </div>
    );
}

import { useState, useRef, useEffect } from "react";
import { T, FONT } from "../../theme";

export function NotificationBell({ notifications = [], onMarkRead, onMarkAllRead, onClear, onOpenSettings }) {
    const [open, setOpen] = useState(false);
    const [shaking, setShaking] = useState(false);
    const ref = useRef(null);
    const unread = notifications.filter(n => !n.read).length;

    // Helper to format time ago
    const timeAgo = (ts) => {
        const seconds = Math.floor((Date.now() - ts) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    useEffect(() => {
        if (unread > 0) {
            setShaking(true);
            const t = setTimeout(() => setShaking(false), 600);
            return () => clearTimeout(t);
        }
    }, [unread]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const typeIcon = { 
        ORDER_NEW: "📦", 
        ORDER_ACCEPTED: "✅", 
        ORDER_PACKED: "🎁", 
        ORDER_SHIPPED: "🚚", 
        ORDER_DELIVERED: "🏠", 
        LOW_STOCK: "📉", 
        PAYMENT_DUE: "💰", 
        REVIEW_RECEIVED: "⭐", 
        RFQ_BID_RECEIVED: "🤝", 
        SYSTEM: "⚙️",
        order: "📦", stock: "📉", payment: "💰", alert: "⚠️", info: "ℹ️" 
    };
    
    const typeColor = { 
        ORDER_NEW: T.sky, 
        LOW_STOCK: T.amber, 
        PAYMENT_DUE: T.crimson, 
        RFQ_BID_RECEIVED: T.violet,
        SYSTEM: T.t3,
        order: T.sky, stock: T.crimson, payment: T.emerald, alert: T.amber, info: T.t3 
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                onClick={() => setOpen(o => !o)}
                className={shaking ? "bell-shake" : ""}
                style={{
                    background: open ? T.amberGlow : "transparent", border: `1px solid ${open ? T.amber + "33" : T.border}`,
                    cursor: "pointer", width: 36, height: 36, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", fontSize: 18, transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = T.borderHi; }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = T.border; }}
            >
                🔔
                {unread > 0 && (
                    <span style={{
                        position: "absolute", top: -4, right: -4, minWidth: 16, height: 16,
                        borderRadius: 8, background: T.crimson, color: "#fff",
                        fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center",
                        justifyContent: "center", padding: "0 4px", fontFamily: FONT.mono,
                        boxShadow: `0 0 8px ${T.crimson}60`
                    }}>{unread > 9 ? "9+" : unread}</span>
                )}
            </button>

            {open && (
                <div className="modal-in" style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 360, maxHeight: 480, background: T.card,
                    border: `1px solid ${T.borderHi}`, borderRadius: 14,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5)", overflow: "hidden",
                    zIndex: 1000, fontFamily: FONT.ui, display: "flex", flexDirection: "column"
                }}>
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "14px 16px", borderBottom: `1px solid ${T.border}`
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>
                            Notifications {unread > 0 && <span style={{ fontSize: 11, color: T.amber, fontWeight: 600 }}>({unread} new)</span>}
                        </span>
                        <div style={{ display: "flex", gap: 10 }}>
                            {onMarkAllRead && unread > 0 && (
                                <button onClick={onMarkAllRead} style={{ background: "none", border: "none", color: T.t2, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Mark all read</button>
                            )}
                            {onClear && notifications.length > 0 && (
                                <button onClick={onClear} style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Clear all</button>
                            )}
                        </div>
                    </div>

                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: "48px 16px", textAlign: "center", color: T.t3, fontSize: 13 }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                                You're all caught up
                            </div>
                        ) : (
                            notifications.slice(0, 10).map(n => (
                                <div key={n.id}
                                    onClick={() => onMarkRead && onMarkRead(n.id)}
                                    className="row-hover"
                                    style={{
                                        padding: "14px 16px", display: "flex", gap: 12, cursor: "pointer",
                                        borderBottom: `1px solid ${T.border}`,
                                        background: n.read ? "transparent" : `${T.amberSoft}`,
                                        position: "relative"
                                    }}>
                                    {!n.read && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: T.amber }} />}
                                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{typeIcon[n.type] || "📌"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, fontWeight: n.read ? 600 : 800, color: T.t1,
                                            marginBottom: 2
                                        }}>{n.title}</div>
                                        <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.4 }}>{n.body || n.message}</div>
                                        <div style={{ fontSize: 10, color: T.t4, marginTop: 6, fontFamily: FONT.mono }}>{timeAgo(n.timestamp)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ 
                        padding: "10px 16px", borderTop: `1px solid ${T.border}`, background: T.surface,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                        <button onClick={() => {}} style={{ background: "none", border: "none", color: T.sky, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>See all</button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenSettings && onOpenSettings(); setOpen(false); }} 
                            style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                            ⚙️ Notification settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

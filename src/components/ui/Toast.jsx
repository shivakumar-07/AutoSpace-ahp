import { useState, useCallback, useEffect, useRef } from "react";
import { T, FONT } from "../../theme";
import { uid } from "../../utils";

function ToastItem({ t, onRemove }) {
    const [exiting, setExiting] = useState(false);
    const timerRef = useRef(null);
    const duration = t.duration || 4500;

    const cfg = {
        success: { icon: "✓", bg: T.emeraldBg, border: "rgba(16,185,129,0.3)", color: T.emerald },
        error: { icon: "✕", bg: T.crimsonBg, border: "rgba(239,68,68,0.3)", color: T.crimson },
        info: { icon: "ℹ", bg: T.skyBg, border: "rgba(56,189,248,0.3)", color: T.sky },
        warn: { icon: "⚠", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", color: T.amber },
    }[t.type] || { icon: "ℹ", bg: T.skyBg, border: "rgba(56,189,248,0.3)", color: T.sky };

    const handleRemove = useCallback(() => {
        setExiting(true);
        setTimeout(() => onRemove(t.id), 200);
    }, [t.id, onRemove]);

    useEffect(() => {
        timerRef.current = setTimeout(handleRemove, duration);
        return () => clearTimeout(timerRef.current);
    }, [duration, handleRemove]);

    return (
        <div className={exiting ? "toast-out" : "toast-in"} style={{
            background: T.card, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 10, padding: "12px 16px", minWidth: 300, maxWidth: 380,
            display: "flex", gap: 10, alignItems: "flex-start",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)", fontFamily: FONT.ui,
            position: "relative", overflow: "hidden"
        }}>
            <span style={{
                fontSize: 14, color: cfg.color, flexShrink: 0, marginTop: 1,
                width: 22, height: 22, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: cfg.bg, fontWeight: 700
            }}>{cfg.icon}</span>
            <div style={{ flex: 1 }}>
                {t.title && <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 2 }}>{t.title}</div>}
                <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.4 }}>{t.msg}</div>
            </div>
            <button onClick={handleRemove} style={{
                background: "none", border: "none", cursor: "pointer", color: T.t3,
                fontSize: 16, marginTop: -2, padding: "0 2px", fontFamily: FONT.ui,
                transition: "color 0.15s"
            }}
                onMouseEnter={e => e.currentTarget.style.color = T.t1}
                onMouseLeave={e => e.currentTarget.style.color = T.t3}
            >×</button>
            <div style={{
                position: "absolute", bottom: 0, left: 0, height: 2,
                background: cfg.color, opacity: 0.6,
                animation: `progressShrink ${duration}ms linear both`
            }} />
        </div>
    );
}

export function Toast({ items, onRemove }) {
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(t => <ToastItem key={t.id} t={t} onRemove={onRemove} />)}
        </div>
    );
}

export function useToast() {
    const [items, setItems] = useState([]);
    const add = useCallback((msg, type = "success", title = "", duration = 4500) => {
        const id = uid();
        setItems(p => [...p, { id, msg, type, title, duration }]);
    }, []);
    const remove = useCallback(id => setItems(p => p.filter(i => i.id !== id)), []);
    return { items, add, remove };
}

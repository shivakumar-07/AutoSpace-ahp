import { T, FONT } from "../../theme";

const BTN_STYLES = {
    amber: { bg: T.amber, text: "#000", shadow: "rgba(245,158,11,0.4)", hoverBg: "#D97706" },
    emerald: { bg: T.emerald, text: "#000", shadow: "rgba(16,185,129,0.35)", hoverBg: "#059669" },
    sky: { bg: T.sky, text: "#000", shadow: "rgba(56,189,248,0.35)", hoverBg: "#0EA5E9" },
    crimson: { bg: T.crimson, text: "#fff", shadow: "rgba(239,68,68,0.35)", hoverBg: "#DC2626" },
    ghost: { bg: "transparent", text: T.t2, border: `1px solid ${T.border}`, shadow: "none" },
    subtle: { bg: T.surface, text: T.t2, border: `1px solid ${T.border}`, shadow: "none" },
    danger: { bg: T.crimsonBg, text: T.crimson, border: `1px solid rgba(239,68,68,0.25)`, shadow: "none" },
    outline: { bg: "transparent", text: T.amber, border: `1px solid ${T.amber}33`, shadow: "none" },
};

export function Btn({ children, onClick, variant = "amber", size = "md", full, disabled, loading, icon, style: sx = {} }) {
    const v = BTN_STYLES[variant] || BTN_STYLES.ghost;
    const pad = size === "xs" ? "4px 10px" : size === "sm" ? "6px 14px" : size === "lg" ? "12px 28px" : "9px 20px";
    const fs = size === "xs" ? 11 : size === "sm" ? 12 : size === "lg" ? 15 : 13;
    return (
        <button className="btn-hover" onClick={onClick} disabled={disabled || loading}
            style={{ background: v.bg, color: v.text, border: v.border || "none", borderRadius: 8, padding: pad, fontSize: fs, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT.ui, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: full ? "100%" : "auto", opacity: disabled ? 0.45 : 1, letterSpacing: "0.01em", boxShadow: v.shadow && v.shadow !== "none" ? `0 2px 12px ${v.shadow}` : "none", transition: "filter 0.15s, transform 0.1s, box-shadow 0.15s", position: "relative", overflow: "hidden", ...sx }}>
            {loading && <span style={{ animation: "spinOnce 0.8s linear infinite", display: "inline-block" }}>⟳</span>}
            {!loading && icon && <span style={{ fontSize: fs + 2, lineHeight: 1 }}>{icon}</span>}
            {children}
        </button>
    );
}

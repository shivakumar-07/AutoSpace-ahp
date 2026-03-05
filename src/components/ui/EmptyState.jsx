import { T, FONT } from "../../theme";

export function EmptyState({ icon = "📭", title = "Nothing here yet", message, action, actionLabel, compact }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: compact ? "32px 20px" : "60px 20px", textAlign: "center"
        }}>
            <div className="float-anim" style={{ fontSize: compact ? 40 : 56, marginBottom: compact ? 12 : 20, lineHeight: 1 }}>{icon}</div>
            <div style={{ fontSize: compact ? 16 : 20, fontWeight: 700, color: T.t1, fontFamily: FONT.ui, marginBottom: 6 }}>{title}</div>
            {message && <div style={{ fontSize: 13, color: T.t3, maxWidth: 340, lineHeight: 1.5, fontFamily: FONT.ui }}>{message}</div>}
            {action && (
                <button className="btn-hover" onClick={action} style={{
                    marginTop: 20, background: T.amberGlow, color: T.amber,
                    border: `1px solid rgba(245,158,11,0.25)`, borderRadius: 8,
                    padding: "8px 20px", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s"
                }}>{actionLabel || "Get Started"}</button>
            )}
        </div>
    );
}

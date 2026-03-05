import { useState, useRef, useEffect } from "react";
import { T, FONT } from "../../theme";

export function Input({ value, onChange, placeholder, type = "text", prefix, suffix, icon, autoFocus, onKeyDown, readOnly, style: sx = {} }) {
    const [focus, setF] = useState(false);
    const ref = useRef(null);
    useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            {(icon || prefix) && <span style={{ position: "absolute", left: 10, fontSize: prefix ? 13 : 14, color: T.t3, fontFamily: prefix ? FONT.mono : undefined, fontWeight: 600, pointerEvents: "none", zIndex: 1 }}>{icon || prefix}</span>}
            <input ref={ref} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                readOnly={readOnly} autoFocus={autoFocus} onKeyDown={onKeyDown}
                onFocus={() => setF(true)} onBlur={() => setF(false)}
                style={{ width: "100%", background: T.surface, border: `1px solid ${focus ? T.amber : T.border}`, color: T.t1, borderRadius: 8, padding: `9px ${suffix ? "36px" : "12px"} 9px ${(icon || prefix) ? "34px" : "12px"}`, fontSize: 14, outline: "none", fontFamily: type === "number" ? FONT.mono : FONT.ui, transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: focus ? `0 0 0 3px ${T.amberGlow}` : "none", ...sx }}
            />
            {suffix && <span style={{ position: "absolute", right: 10, fontSize: 12, color: T.t3, fontFamily: FONT.mono, pointerEvents: "none" }}>{suffix}</span>}
        </div>
    );
}

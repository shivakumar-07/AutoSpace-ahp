import { useState } from "react";
import { T, FONT } from "../../theme";
import { fmt, getMrp, getDiscount, getDeliveryEta, getStarRating, renderStars } from "../../utils";

export function ProductCard({ item, onClick, selectedVehicle }) {
    const { product, bestPrice, availability, shopCount, fastestEta, rankScore, listings, fitmentType } = item;
    const [wishlisted, setWishlisted] = useState(false);

    let stockColor = T.emerald, stockLabel = "In Stock";
    if (availability === 0) { stockColor = T.crimson; stockLabel = "Out of Stock"; }
    else if (availability < 5) { stockColor = T.amber; stockLabel = `Only ${availability} left`; }

    const mrp = product.mrp || Math.round(bestPrice * 1.25);
    const discountPct = mrp > bestPrice ? Math.round(((mrp - bestPrice) / mrp) * 100) : 0;

    const { rating, count } = getStarRating(product.id);

    const eta = getDeliveryEta();

    const sellerName = listings?.[0]?.shop?.name || "Local Shop";
    const sellerDist = listings?.[0]?.distance || (1 + (product.id.charCodeAt(1) % 8)).toFixed(1);

    const hasFitment = fitmentType === "exact" || fitmentType === "universal";
    const isIncompatible = selectedVehicle && fitmentType === "none";

    return (
        <div
            onClick={onClick}
            style={{
                background: T.card,
                border: `1px solid ${isIncompatible ? T.t4 : hasFitment ? `${fitmentType === "exact" ? T.emerald : T.sky}44` : T.border}`,
                borderRadius: 16,
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxShadow: isIncompatible ? "none" : "0 2px 8px rgba(0,0,0,0.15)",
                width: 260,
                flexShrink: 0,
                overflow: "hidden",
                opacity: isIncompatible ? 0.55 : 1,
            }}
            className="mp-card-hover"
        >
            <button
                onClick={(e) => { e.stopPropagation(); setWishlisted(!wishlisted); }}
                style={{
                    position: "absolute", top: 12, right: 12, zIndex: 10,
                    width: 32, height: 32, borderRadius: "50%",
                    background: wishlisted ? `${T.crimson}22` : "rgba(0,0,0,0.4)",
                    border: "none", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 16, transition: "all 0.2s",
                    backdropFilter: "blur(4px)",
                }}
            >
                {wishlisted ? "❤️" : "🤍"}
            </button>

            {hasFitment && (
                <div style={{
                    position: "absolute", top: 12, left: 12, zIndex: 10,
                    background: fitmentType === "exact" ? T.emerald : T.sky,
                    color: "#000",
                    padding: "4px 10px", borderRadius: 20,
                    fontSize: 9, fontWeight: 900, fontFamily: FONT.ui,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", gap: 4,
                    boxShadow: `0 2px 8px ${fitmentType === "exact" ? T.emerald : T.sky}44`,
                }}>
                    {fitmentType === "exact" ? "✓ EXACT FIT" : "⚡ UNIVERSAL"}
                </div>
            )}

            {!hasFitment && (
                <div style={{
                    position: "absolute", top: 12, left: 12, zIndex: 10,
                    background: `${stockColor}22`, color: stockColor,
                    padding: "4px 10px", borderRadius: 20,
                    fontSize: 10, fontWeight: 900, fontFamily: FONT.ui,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    backdropFilter: "blur(4px)",
                }}>
                    {stockLabel}
                </div>
            )}

            <div style={{ width: "100%", height: 160, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {product.image ? (
                    typeof product.image === "string" && product.image.length <= 4
                        ? <span style={{ fontSize: 56, opacity: 0.9 }}>{product.image}</span>
                        : <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <span style={{ fontSize: 48, opacity: 0.3 }}>📦</span>
                )}
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: "3px 8px", borderRadius: 6, fontSize: 10, color: T.t2, fontFamily: FONT.mono, fontWeight: 700 }}>
                    {shopCount} {shopCount === 1 ? "Seller" : "Sellers"}
                </div>
            </div>

            <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>

                <div style={{ fontSize: 10, color: T.sky, fontFamily: FONT.ui, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>{product.brand}</div>

                <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.7em" }}>
                    {product.name}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#FBBF24", fontSize: 13, letterSpacing: 1 }}>{renderStars(+rating)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{rating}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>({count})</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(bestPrice)}</span>
                        {discountPct > 0 && (
                            <span style={{ background: `${T.crimson}22`, color: T.crimson, fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>{discountPct}% off</span>
                        )}
                    </div>
                    {discountPct > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: T.t3, textDecoration: "line-through" }}>M.R.P: {fmt(mrp)}</span>
                        </div>
                    )}
                    {shopCount > 1 && (
                        <div style={{ fontSize: 11, color: T.amber, fontWeight: 700 }}>
                            Starting from {fmt(bestPrice)} ({shopCount} sellers)
                        </div>
                    )}
                </div>

                <div style={{ fontSize: 11, color: eta.fast ? T.emerald : T.t3, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <span>🚚</span> {eta.text}
                </div>

                <div style={{ fontSize: 11, color: T.t3, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>📍</span> {sellerName} ({sellerDist} km)
                </div>
            </div>

            <div style={{ padding: "0 16px 16px" }}>
                <div style={{
                    background: isIncompatible ? T.border : T.amber,
                    color: isIncompatible ? T.t3 : "#000",
                    padding: "10px 14px", borderRadius: 10,
                    fontSize: 13, fontWeight: 900, fontFamily: FONT.ui,
                    textAlign: "center",
                    boxShadow: isIncompatible ? "none" : `0 4px 12px ${T.amber}44`,
                    transition: "all 0.15s"
                }}>
                    {isIncompatible ? "May Not Fit" : "View Details →"}
                </div>
            </div>
        </div>
    );
}

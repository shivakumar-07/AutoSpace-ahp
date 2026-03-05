import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, pct, margin, getStarRating, renderStars, getDeliveryEta, getDiscount, getMrp, uid, fmtDate } from "../../utils";
import { ProductComparisonModal } from "../components/ProductComparisonModal";
import { ProductCard } from "../components/ProductCard";
import { rankingEngine } from "../api/engine";
import { useToast } from "../../components/ui";

export function ProductDetailsPage({ productId, onBack }) {
    const { products, shops, selectedVehicle, cart, saveCart, setIsCartOpen, reviews, saveReviews, wishlist, saveWishlist } = useStore();
    const { add: toast } = useToast();
    const [qty, setQty] = useState(1);
    const [showBuyBox, setShowBuyBox] = useState(false);
    const [activeTab, setActiveTab] = useState("specs"); // specs | reviews | shipping
    const [reviewForm, setReviewForm] = useState({ rating: 5, text: "" });

    const isWished = wishlist.some(item => item.productId === productId);

    const toggleWishlist = () => {
        if (isWished) {
            if (window.confirm("Remove from wishlist?")) {
                const next = wishlist.filter(item => item.productId !== productId);
                saveWishlist(next);
                toast("Removed from Wishlist", "info");
            }
        } else {
            const next = [...wishlist, { productId, addedAt: Date.now() }];
            saveWishlist(next);
            toast("Added to Wishlist", "success");
        }
    };

    // Scroll to top on mount or product change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [productId]);

    const productListings = useMemo(() => {
        if (!products || !Array.isArray(products)) return [];
        // Find the base product (could be any shop's copy)
        const baseProduct = products.find(p => p.id === productId);
        const sku = baseProduct?.sku;

        return products.filter(p => (p.id === productId || (sku && p.sku === sku)) && p.stock > 0)
            .map(p => {
                const shop = shops?.find(s => s.id === p.shopId);
                const dist = (2 + (p.shopId?.charCodeAt(1) % 8 || 0)).toFixed(1);
                return { ...p, shop, distance: +dist };
            })
            .sort((a, b) => {
                // Buy Box Algorithm: (1/price * 0.6) + (1/distance * 0.2) + (rating/5 * 0.2)
                const scoreA = (1 / a.sellPrice) * 0.6 + (1 / (a.distance + 0.1)) * 0.2 + ((a.shop?.rating || 4) / 5) * 0.2;
                const scoreB = (1 / b.sellPrice) * 0.6 + (1 / (b.distance + 0.1)) * 0.2 + ((b.shop?.rating || 4) / 5) * 0.2;
                return scoreB - scoreA;
            });
    }, [products, productId, shops]);

    const buyBoxWinner = productListings[0];
    const otherSellers = productListings.slice(1);

    const relatedProducts = useMemo(() => {
        if (!buyBoxWinner || !products || !shops) return [];
        
        // Use rankingEngine to get properly formatted ProductCard items
        // We filter by category and exclude current product (same SKU)
        const categoryProducts = products.filter(p => p.category === buyBoxWinner.category && p.sku !== buyBoxWinner.sku);
        
        // Need to group them as rankingEngine does
        const ranked = rankingEngine(categoryProducts, shops, selectedVehicle);
        return ranked.slice(0, 6);
    }, [buyBoxWinner, products, shops, selectedVehicle, rankingEngine]);

    if (!buyBoxWinner) {
        return (
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t2, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    ← Back to Marketplace
                </button>
                <div style={{ padding: 60, textAlign: "center", background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>🚫</div>
                    <div style={{ fontSize: 18, color: T.t1, fontWeight: 700 }}>Product currently unavailable</div>
                    <div style={{ fontSize: 14, color: T.t3, marginTop: 8 }}>Check back later or search for alternatives.</div>
                </div>
            </div>
        );
    }

    // Fitment
    const isFit = selectedVehicle && buyBoxWinner.compatibleVehicles.some(v => {
        const vLower = v.toLowerCase();
        const make = (selectedVehicle.make || selectedVehicle.brand || "").toLowerCase();
        const model = (selectedVehicle.model || "").toLowerCase();
        return vLower.includes("universal") || vLower.includes(make) || (model && vLower.includes(model));
    });

    // Rating
    const productReviews = reviews.filter(r => r.productId === buyBoxWinner.sku || r.productId === buyBoxWinner.id);
    const avgRating = productReviews.length > 0 
        ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
        : getStarRating(buyBoxWinner.id).rating;
    const reviewCount = productReviews.length > 0 ? productReviews.length : getStarRating(buyBoxWinner.id).count;

    const eta = getDeliveryEta();
    const mrp = getMrp(buyBoxWinner);
    const discountPct = getDiscount(buyBoxWinner);

    const handleAddToCart = (listing) => {
        const itemIndex = cart.findIndex(i => i.listing.product_id === listing.id && i.listing.shop_id === listing.shopId);
        let newCart = [...cart];

        if (itemIndex > -1) {
            newCart[itemIndex].qty += qty;
        } else {
            newCart.push({
                qty: qty,
                product: { name: listing.name, brand: listing.brand, category: listing.category, sku: listing.sku, image: listing.image },
                listing: {
                    shop_id: listing.shopId,
                    shop: listing.shop,
                    product_id: listing.id,
                    selling_price: listing.sellPrice,
                    mrp: listing.mrp,
                    stock: listing.stock,
                    product: { name: listing.name },
                }
            });
        }
        saveCart(newCart);
        setIsCartOpen(true);
    };

    const handleSubmitReview = (e) => {
        e.preventDefault();
        if (!reviewForm.text.trim()) return;
        
        const newReview = {
            id: uid(),
            productId: buyBoxWinner.sku, // Use SKU to link across sellers
            userName: "You",
            rating: reviewForm.rating,
            text: reviewForm.text,
            date: Date.now(),
        };
        
        saveReviews([newReview, ...reviews]);
        setReviewForm({ rating: 5, text: "" });
    };

    // Specs data (from product fields or defaults)
    const specs = [
        { label: "Brand", value: buyBoxWinner.brand },
        { label: "SKU", value: buyBoxWinner.sku },
        { label: "Category", value: buyBoxWinner.category },
        buyBoxWinner.oemNumber && { label: "OEM Number", value: buyBoxWinner.oemNumber },
        buyBoxWinner.position && { label: "Position", value: buyBoxWinner.position },
        buyBoxWinner.engineType && { label: "Engine Type", value: buyBoxWinner.engineType },
        buyBoxWinner.transmission && { label: "Transmission", value: buyBoxWinner.transmission },
        { label: "GST Rate", value: `${buyBoxWinner.gstRate || 18}%` },
        { label: "Unit", value: buyBoxWinner.unit || "pcs" },
    ].filter(Boolean);

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
            {/* Fitment Banner at the very top */}
            {selectedVehicle ? (
                <div style={{ 
                    padding: "12px 20px", 
                    background: isFit ? `${T.emerald}22` : `${T.amber}22`, 
                    border: `1px solid ${isFit ? T.emerald : T.amber}44`, 
                    borderRadius: 12, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12,
                    marginBottom: 20,
                    animation: "fadeUp 0.3s ease"
                }}>
                    <div style={{ fontSize: 20 }}>{isFit ? "✅" : "⚠️"}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isFit ? T.emerald : T.amber }}>
                        {isFit 
                            ? `CONFIRMED FIT for your ${selectedVehicle.brand || selectedVehicle.make} ${selectedVehicle.model}` 
                            : `Check Compatibility: This part may not fit your ${selectedVehicle.brand || selectedVehicle.make} ${selectedVehicle.model}`}
                    </div>
                </div>
            ) : (
                <div style={{ 
                    padding: "12px 20px", 
                    background: `${T.t4}22`, 
                    border: `1px solid ${T.border}`, 
                    borderRadius: 12, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12,
                    marginBottom: 20,
                    color: T.t2
                }}>
                    <div style={{ fontSize: 20 }}>ℹ️</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>No vehicle selected. Select a vehicle to confirm fitment.</div>
                </div>
            )}

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: T.t3 }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sky, fontSize: 13, cursor: "pointer", fontWeight: 700 }}>← Marketplace</button>
                <span>›</span>
                <span>{buyBoxWinner.category}</span>
                <span>›</span>
                <span style={{ color: T.t2 }}>{buyBoxWinner.brand}</span>
            </div>

            <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Left: Image */}
                <div style={{ flex: "1 1 40%", minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ width: "100%", aspectRatio: "1/1", background: T.card, border: `1px solid ${T.border}`, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, position: "relative", overflow: "hidden" }}>
                        <span style={{ animation: "float 6s ease-in-out infinite" }}>{buyBoxWinner.image || "⚙️"}</span>
                        {isFit && (
                            <div style={{ position: "absolute", top: 20, left: 20, background: T.emerald, color: "#000", padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 16px ${T.emerald}66` }}>
                                ✓ EXACT FIT
                            </div>
                        )}
                        {discountPct > 10 && (
                            <div style={{ position: "absolute", top: 20, right: 20, background: T.crimson, color: "#fff", padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 900 }}>
                                {discountPct}% OFF
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Details */}
                <div style={{ flex: "1 1 50%", minWidth: 320, display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Brand + SKU */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <span style={{ background: `${T.sky}22`, color: T.sky, padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{buyBoxWinner.brand}</span>
                            <span style={{ color: T.t3, fontSize: 12, fontFamily: FONT.mono }}>SKU: {buyBoxWinner.sku}</span>
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, lineHeight: 1.2, margin: 0 }}>
                            {buyBoxWinner.name}
                        </h1>

                        {/* Star Rating */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                            <span style={{ color: "#FBBF24", fontSize: 15 }}>{renderStars(+avgRating)}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{avgRating}</span>
                            <span style={{ fontSize: 13, color: T.t3 }}>({reviewCount} ratings)</span>
                        </div>

                        <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.6, marginTop: 12 }}>
                            {buyBoxWinner.description || "Premium automotive spare part designed for high performance, durability, and guaranteed fitment."}
                        </p>
                    </div>

                    {/* Fitment Alert in Right Col */}
                    {selectedVehicle && (
                        <div style={{ padding: "14px 20px", background: isFit ? `${T.emerald}11` : `${T.crimson}11`, border: `1px solid ${isFit ? T.emerald : T.crimson}44`, borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ fontSize: 22 }}>{isFit ? "✅" : "❌"}</div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: isFit ? T.emerald : T.crimson }}>
                                    {isFit ? `Guaranteed to fit your ${selectedVehicle.make} ${selectedVehicle.model}` : `Does NOT fit your ${selectedVehicle.make} ${selectedVehicle.model}`}
                                </div>
                                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
                                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.variant}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Price Block */}
                    <div style={{ padding: "20px 0", borderTop: `1px solid ${T.borderHi}`, borderBottom: `1px solid ${T.borderHi}` }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                            <div style={{ fontSize: 36, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, lineHeight: 1 }}>
                                {fmt(buyBoxWinner.sellPrice)}
                            </div>
                            <div style={{ paddingBottom: 4 }}>
                                <div style={{ fontSize: 14, color: T.t3, textDecoration: "line-through" }}>MRP: {fmt(mrp)}</div>
                                {discountPct > 0 && <div style={{ fontSize: 14, color: T.amber, fontWeight: 700 }}>Save {fmt(mrp - buyBoxWinner.sellPrice)} ({discountPct}% off)</div>}
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Inclusive of all taxes</div>

                        {/* Delivery ETA */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                            <span style={{ fontSize: 16 }}>🚚</span>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: eta.fast ? T.emerald : T.t1 }}>Get it {eta.text}</div>
                                <div style={{ fontSize: 12, color: T.t3 }}>Hyperlocal delivery via Porter/Dunzo</div>
                            </div>
                        </div>

                        {/* Seller */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.card, padding: "14px 16px", borderRadius: 12, border: `2px solid ${T.amber}44`, marginTop: 16, boxShadow: `0 4px 20px ${T.amber}11` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ fontSize: 24 }}>{buyBoxWinner.shop?.imageEmoji || "🏪"}</div>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ fontSize: 12, color: T.t3 }}>Best Price from</div>
                                        <span style={{ background: T.amber, color: "#000", fontSize: 9, fontWeight: 900, padding: "1px 4px", borderRadius: 4 }}>WINNER</span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>{buyBoxWinner.shop?.name}</div>
                                    <div style={{ fontSize: 11, color: T.t3 }}>⭐ {buyBoxWinner.shop?.rating} · {buyBoxWinner.distance} km away</div>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, color: T.emerald, fontWeight: 800 }}>In Stock</div>
                                <div style={{ fontSize: 11, color: T.t3 }}>{buyBoxWinner.stock} units</div>
                            </div>
                        </div>
                    </div>

                    {/* Qty + Add to Cart */}
                    <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 10 }}>
                            <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 44, height: 44, background: "transparent", border: "none", color: T.t2, fontSize: 18, cursor: "pointer" }}>−</button>
                            <div style={{ width: 44, textAlign: "center", fontSize: 16, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{qty}</div>
                            <button onClick={() => setQty(Math.min(buyBoxWinner.stock, qty + 1))} style={{ width: 44, height: 44, background: "transparent", border: "none", color: T.t2, fontSize: 18, cursor: "pointer" }}>+</button>
                        </div>
                        <button onClick={() => handleAddToCart(buyBoxWinner)} style={{ flex: 1, background: T.amber, color: "#000", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: `0 8px 24px ${T.amber}44`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} className="btn-hover-solid">
                            Add to Cart →
                        </button>
                    </div>

                    <button 
                        onClick={toggleWishlist}
                        style={{ 
                            background: isWished ? `${T.crimson}11` : "transparent", 
                            border: `1px solid ${isWished ? T.crimson : T.borderHi}`, 
                            color: isWished ? T.crimson : T.t1, 
                            padding: "12px 20px", 
                            borderRadius: 10, 
                            fontSize: 14, 
                            fontWeight: 700, 
                            cursor: "pointer", 
                            width: "100%", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            gap: 8,
                            transition: "0.2s" 
                        }} 
                        className="btn-hover-subtle"
                    >
                        {isWished ? "♥ Saved to Wishlist" : "♡ Save to Wishlist"}
                    </button>

                    {/* Compare Sellers Button */}
                    {otherSellers.length > 0 && (
                        <button onClick={() => {
                            const el = document.getElementById("seller-comparison");
                            el?.scrollIntoView({ behavior: "smooth" });
                        }} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.t2, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", transition: "0.2s" }} className="btn-hover-subtle">
                            🔄 Compare {otherSellers.length} other seller{otherSellers.length > 1 ? "s" : ""} · Starting from {fmt(otherSellers[0]?.sellPrice)}
                        </button>
                    )}
                </div>
            </div>

            {/* SELLER COMPARISON TABLE */}
            <div id="seller-comparison" style={{ marginTop: 60, background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>🏪 Compare All Sellers</div>
                    <div style={{ fontSize: 13, color: T.t3 }}>Showing {productListings.length} results</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                {["Shop Name", "Rating", "Distance", "Price", "Stock", "Delivery ETA", ""].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {productListings.map((listing, idx) => (
                                <tr key={listing.id} style={{ 
                                    borderBottom: `1px solid ${T.border}`,
                                    background: idx === 0 ? `${T.amber}08` : "transparent",
                                    borderLeft: idx === 0 ? `4px solid ${T.amber}` : "none"
                                }} className="row-hover">
                                    <td style={{ padding: "16px", fontSize: 14, fontWeight: 700, color: T.t1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {listing.shop?.imageEmoji} {listing.shop?.name}
                                            {idx === 0 && <span style={{ background: T.amber, color: "#000", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4, marginLeft: 4 }}>BEST VALUE</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px", fontSize: 14, color: "#FBBF24" }}>⭐ {listing.shop?.rating}</td>
                                    <td style={{ padding: "16px", fontSize: 14, color: T.t2 }}>{listing.distance} km</td>
                                    <td style={{ padding: "16px", fontSize: 16, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(listing.sellPrice)}</td>
                                    <td style={{ padding: "16px", fontSize: 14, color: listing.stock < 5 ? T.amber : T.emerald, fontWeight: 700 }}>
                                        {listing.stock > 0 ? listing.stock : "Out of Stock"}
                                    </td>
                                    <td style={{ padding: "16px", fontSize: 13, color: T.t3 }}>
                                        {listing.distance < 5 ? "2-4 Hours" : "Same Day"}
                                    </td>
                                    <td style={{ padding: "16px", textAlign: "right" }}>
                                        <button 
                                            onClick={() => handleAddToCart(listing)} 
                                            style={{ 
                                                background: idx === 0 ? T.amber : `${T.amber}11`, 
                                                border: `1px solid ${T.amber}44`, 
                                                color: idx === 0 ? "#000" : T.amber, 
                                                padding: "8px 16px", 
                                                borderRadius: 8, 
                                                fontSize: 12, 
                                                fontWeight: 800, 
                                                cursor: "pointer",
                                                transition: "0.2s"
                                            }}
                                            className="btn-hover"
                                        >
                                            Add to Cart
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABS: Specifications | Reviews | Shipping */}
            <div style={{ marginTop: 40 }}>
                <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 20 }}>
                    {[["specs", "📋 Specifications"], ["reviews", "⭐ Reviews"], ["shipping", "🚚 Shipping & Returns"]].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                background: "transparent", border: "none", borderBottom: activeTab === key ? `2px solid ${T.amber}` : "2px solid transparent",
                                color: activeTab === key ? T.amber : T.t3, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                                marginBottom: -2, transition: "all 0.15s"
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === "specs" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fadeIn 0.3s ease" }}>
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                            {specs.map((s, i) => (
                                <div key={s.label} style={{ display: "flex", borderBottom: i < specs.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                    <div style={{ flex: "0 0 200px", padding: "12px 16px", background: T.surface, fontSize: 13, fontWeight: 700, color: T.t2 }}>{s.label}</div>
                                    <div style={{ flex: 1, padding: "12px 16px", fontSize: 13, color: T.t1, fontWeight: 700 }}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                        
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, marginBottom: 12 }}>🚗 Compatible Vehicles</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {buyBoxWinner.compatibleVehicles?.map(v => (
                                    <span key={v} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{v}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "reviews" && (
                    <div style={{ display: "flex", gap: 32, flexWrap: "wrap", animation: "fadeIn 0.3s ease" }}>
                        {/* Summary */}
                        <div style={{ flex: "0 0 300px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, height: "fit-content" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                                <div style={{ fontSize: 48, fontWeight: 900, color: T.t1 }}>{avgRating}</div>
                                <div>
                                    <div style={{ color: "#FBBF24", fontSize: 20 }}>{renderStars(+avgRating)}</div>
                                    <div style={{ fontSize: 14, color: T.t3 }}>Based on {reviewCount} reviews</div>
                                </div>
                            </div>
                            
                            {/* Review Form */}
                            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 20, marginTop: 20 }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 16 }}>Write a Review</div>
                                <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <button 
                                                key={s} 
                                                type="button" 
                                                onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                                                style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: s <= reviewForm.rating ? "#FBBF24" : T.t4 }}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <textarea 
                                        placeholder="Share your experience with this part..."
                                        value={reviewForm.text}
                                        onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                                        style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, color: T.t1, fontSize: 13, minHeight: 80, resize: "none" }}
                                    />
                                    <button 
                                        type="submit" 
                                        style={{ background: T.amber, color: "#000", border: "none", borderRadius: 8, padding: "10px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                                        className="btn-hover"
                                    >
                                        Submit Review
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Review List */}
                        <div style={{ flex: 1, minWidth: 320 }}>
                            {productReviews.length === 0 ? (
                                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
                                    <div style={{ fontSize: 40, marginBottom: 16 }}>⭐</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Be the first to review!</div>
                                    <div style={{ fontSize: 14, color: T.t3, marginTop: 8 }}>Help others by sharing your installation experience.</div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {productReviews.map((r) => (
                                        <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: T.t2 }}>
                                                        {r.userName[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{r.userName}</div>
                                                        <div style={{ color: "#FBBF24", fontSize: 11 }}>{renderStars(r.rating)}</div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 11, color: T.t3 }}>{fmtDate(r.date)}</span>
                                            </div>
                                            <p style={{ fontSize: 13, color: T.t2, margin: "12px 0 0", lineHeight: 1.6 }}>{r.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "shipping" && (
                    <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", gap: 24 }}>
                        <div style={{ display: "flex", gap: 20 }}>
                            <div style={{ width: 48, height: 48, background: `${T.emerald}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🚚</div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>Hyperlocal Express Delivery</div>
                                <div style={{ fontSize: 13, color: T.t3, marginTop: 4, lineHeight: 1.5 }}>
                                    Get this part delivered to your doorstep or workshop within 45-90 minutes. 
                                    Available in Hyderabad through our delivery partners Porter and Dunzo.
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 20 }}>
                            <div style={{ width: 48, height: 48, background: `${T.sky}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔄</div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>7-Day Easy Returns</div>
                                <div style={{ fontSize: 13, color: T.t3, marginTop: 4, lineHeight: 1.5 }}>
                                    Not the right fit? Don't worry. We offer a 7-day no-questions-asked return policy 
                                    as long as the part is in its original packaging and has not been installed.
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 20 }}>
                            <div style={{ width: 48, height: 48, background: `${T.amber}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🛡️</div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>Genuine Part Guarantee</div>
                                <div style={{ fontSize: 13, color: T.t3, marginTop: 4, lineHeight: 1.5 }}>
                                    All parts sold on AutoMobile Space are verified genuine and sourced directly 
                                    from authorized distributors.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RELATED PRODUCTS */}
            {relatedProducts.length > 0 && (
                <div style={{ marginTop: 80 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: T.t1 }}>Other Products in {buyBoxWinner.category}</div>
                    </div>
                    <div className="no-scrollbar" style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 20 }}>
                        {relatedProducts.map((item, idx) => (
                            <ProductCard 
                                key={idx} 
                                item={item} 
                                selectedVehicle={selectedVehicle}
                                onClick={() => {
                                    // Normally we'd navigate to the new PDP
                                    // For this simple SPA, we just trigger the onBack/re-render
                                    window.scrollTo(0, 0);
                                    // We'll let the parent handle the click if it's passed down, 
                                    // but usually ProductCard onClick navigates.
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            <ProductComparisonModal
                open={showBuyBox}
                product={{ id: productId, name: buyBoxWinner.name, brand: buyBoxWinner.brand, category: buyBoxWinner.category, sku: buyBoxWinner.sku }}
                onClose={() => setShowBuyBox(false)}
            />
        </div>
    );
}

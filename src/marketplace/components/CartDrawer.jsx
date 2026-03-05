import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, calcDeliveryFee } from "../../utils";
import { useToast } from "../../components/ui";

export function CartDrawer() {
    const { cart, saveCart, isCartOpen, setIsCartOpen, toggleCart, products, setMarketplacePage } = useStore();
    const { add: toast } = useToast();
    const [stockErrors, setStockErrors] = useState({});
    const [alternatives, setAlternatives] = useState({});
    const [checkingOut, setCheckingOut] = useState(false);

    if (!isCartOpen) return null;

    const safeCart = cart || [];
    const safeProducts = products || [];

    const cartByShop = useMemo(() => {
        return safeCart.reduce((acc, item) => {
            const shopId = item.listing.shop_id;
            if (!acc[shopId]) {
                acc[shopId] = {
                    shopId: shopId,
                    shop: item.listing.shop,
                    items: [],
                    subtotal: 0,
                    shipping: calcDeliveryFee(shopId)
                };
            }
            acc[shopId].items.push(item);
            acc[shopId].subtotal += item.listing.selling_price * item.qty;
            return acc;
        }, {});
    }, [safeCart]);

    const totalItems = safeCart.reduce((s, i) => s + i.qty, 0);
    const totalCartValue = Object.values(cartByShop).reduce((sum, g) => sum + g.subtotal + g.shipping, 0);
    const gstInclusive = Math.round((totalCartValue * 18) / (100 + 18));

    const updateQty = (productId, shopId, delta) => {
        const newCart = safeCart.map(item => {
            if (item.listing.product_id === productId && item.listing.shop_id === shopId) {
                const newQty = Math.max(1, Math.min(item.listing.stock, item.qty + delta));
                return { ...item, qty: newQty };
            }
            return item;
        });
        saveCart(newCart);
    };

    const removeItem = (productId, shopId) => {
        saveCart(safeCart.filter(item => !(item.listing.product_id === productId && item.listing.shop_id === shopId)));
    };

    const swapWithAlternative = (originalKey, alt) => {
        const newCart = safeCart.filter(item => {
            const key = `${item.listing.product_id}_${item.listing.shop_id}`;
            return key !== originalKey;
        });
        newCart.push({
            product: { name: alt.name, image: alt.image },
            listing: {
                product_id: alt.id,
                shop_id: alt.shopId,
                shop: { name: alt.shopName },
                selling_price: alt.sellPrice,
                stock: alt.stock
            },
            qty: 1
        });
        saveCart(newCart);
        setAlternatives(prev => {
            const next = { ...prev };
            delete next[originalKey];
            return next;
        });
        setStockErrors(prev => {
            const next = { ...prev };
            delete next[originalKey];
            return next;
        });
        toast(`Swapped to ${alt.name} from ${alt.shopName}`, "success");
    };

    const handleCheckout = async () => {
        setCheckingOut(true);
        setStockErrors({});
        setAlternatives({});

        await new Promise(r => setTimeout(r, 400));

        const errors = {};
        const alts = {};
        let hasError = false;

        safeCart.forEach(item => {
            const key = `${item.listing.product_id}_${item.listing.shop_id}`;
            const currentProduct = safeProducts.find(p => p.id === item.listing.product_id && p.shopId === item.listing.shop_id);

            if (!currentProduct || currentProduct.stock <= 0) {
                errors[key] = "Sold Out";
                hasError = true;
                const similar = safeProducts.filter(p =>
                    p.stock > 0 &&
                    p.name === (currentProduct?.name || item.product?.name) &&
                    p.shopId !== item.listing.shop_id
                );
                if (similar.length > 0) {
                    alts[key] = similar.map(p => ({
                        id: p.id, shopId: p.shopId, name: p.name, image: p.image,
                        sellPrice: p.sellPrice, stock: p.stock,
                        shopName: p.shopName || "Other Shop"
                    }));
                }
            } else if (currentProduct.stock < item.qty) {
                errors[key] = `Only ${currentProduct.stock} left`;
                hasError = true;
            }
        });

        if (hasError) {
            setStockErrors(errors);
            setAlternatives(alts);
            setCheckingOut(false);
            toast("Some items are no longer available. Please update your cart.", "error", "Stock Changed");
            return;
        }

        setIsCartOpen(false);
        setMarketplacePage("checkout");
        setCheckingOut(false);
        toast("Stock verified! Complete your order.", "success", "Checkout Ready");
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.2s" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,29,0.7)", backdropFilter: "blur(4px)" }} onClick={toggleCart} />

            <div style={{ position: "relative", width: 500, maxWidth: "100vw", height: "100%", background: T.surface, boxShadow: "-20px 0 60px rgba(0,0,0,0.5)", borderLeft: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", animation: "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

                <div style={{ padding: "24px 32px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: T.t1 }}>Your Cart</div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{totalItems} item{totalItems !== 1 ? "s" : ""} from {Object.keys(cartByShop).length} shop{Object.keys(cartByShop).length !== 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={toggleCart} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 24, cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }} className="custom-scroll">
                    {safeCart.length === 0 ? (
                        <div style={{ textAlign: "center", color: T.t3, marginTop: 60 }}>
                            <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>🛒</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Your cart is empty</div>
                            <p style={{ fontSize: 14, color: T.t3 }}>Browse parts and add them to your cart.</p>
                        </div>
                    ) : (
                        Object.values(cartByShop).map((group, idx) => (
                            <div key={group.shopId} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>

                                <div style={{ background: T.bg, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 18 }}>📦</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: T.t1 }}>{group.shop?.name || "Local Shop"}</div>
                                            <div style={{ fontSize: 11, color: T.t3 }}>Shipment {idx + 1}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: T.sky, fontWeight: 700 }}>🚚 ~45 min</span>
                                        <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono, background: T.surface, padding: "2px 8px", borderRadius: 6 }}>Del: {fmt(group.shipping)}</span>
                                    </div>
                                </div>

                                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                                    {group.items.map((item, idxx) => {
                                        const errKey = `${item.listing.product_id}_${item.listing.shop_id}`;
                                        const err = stockErrors[errKey];
                                        const itemAlts = alternatives[errKey];
                                        return (
                                            <div key={idxx}>
                                                <div style={{ display: "flex", gap: 14, alignItems: "center", opacity: err === "Sold Out" ? 0.4 : 1 }}>
                                                    <div style={{ width: 52, height: 52, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                                                        {item.product?.image || "⚙️"}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, lineHeight: 1.3 }}>{item.listing.product?.name || item.product?.name}</div>
                                                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{fmt(item.listing.selling_price)} each</div>
                                                        {err && <div style={{ fontSize: 11, color: T.crimson, fontWeight: 800, marginTop: 4, background: `${T.crimson}22`, padding: "2px 8px", borderRadius: 4, display: "inline-block" }}>⚠ {err}</div>}
                                                    </div>

                                                    <div style={{ display: "flex", alignItems: "center", gap: 0, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                                                        <button onClick={() => updateQty(item.listing.product_id, item.listing.shop_id, -1)} style={{ width: 30, height: 30, background: "transparent", border: "none", color: T.t2, fontSize: 16, cursor: "pointer" }}>−</button>
                                                        <div style={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{item.qty}</div>
                                                        <button onClick={() => updateQty(item.listing.product_id, item.listing.shop_id, 1)} style={{ width: 30, height: 30, background: "transparent", border: "none", color: T.t2, fontSize: 16, cursor: "pointer" }}>+</button>
                                                    </div>

                                                    <div style={{ textAlign: "right", minWidth: 64 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{fmt(item.listing.selling_price * item.qty)}</div>
                                                    </div>

                                                    <button onClick={() => removeItem(item.listing.product_id, item.listing.shop_id)} style={{ background: "transparent", border: "none", color: T.t4, cursor: "pointer", fontSize: 16, padding: 4, transition: "0.1s" }} title="Remove">🗑️</button>
                                                </div>

                                                {itemAlts && itemAlts.length > 0 && (
                                                    <div style={{ marginTop: 10, marginLeft: 66, background: `${T.sky}11`, border: `1px solid ${T.sky}33`, borderRadius: 10, padding: 12 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: T.sky, marginBottom: 8 }}>🔄 Available from other sellers:</div>
                                                        {itemAlts.map((alt, ai) => (
                                                            <div key={ai} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: ai > 0 ? `1px solid ${T.border}` : "none" }}>
                                                                <div>
                                                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{alt.shopName}</div>
                                                                    <div style={{ fontSize: 11, color: T.t3 }}>{fmt(alt.sellPrice)} · {alt.stock} in stock</div>
                                                                </div>
                                                                <button onClick={() => swapWithAlternative(errKey, alt)} style={{ background: T.sky, color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Swap</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ padding: "14px 20px", background: `${T.bg}88`, borderTop: `1px dashed ${T.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t2 }}>
                                        <span>Items Subtotal</span>
                                        <span style={{ fontFamily: FONT.mono }}>{fmt(group.subtotal)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t2 }}>
                                        <span>Hyperlocal Delivery</span>
                                        <span style={{ fontFamily: FONT.mono }}>{fmt(group.shipping)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: T.t1, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${T.border}` }}>
                                        <span>Shop Total</span>
                                        <span style={{ fontFamily: FONT.mono, color: T.sky }}>{fmt(group.subtotal + group.shipping)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {safeCart.length > 0 && (
                    <div style={{ padding: 28, background: T.card, borderTop: `1px solid ${T.borderHi}` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2 }}>
                                <span>Items ({totalItems})</span>
                                <span style={{ fontFamily: FONT.mono }}>{fmt(totalCartValue - Object.values(cartByShop).reduce((s, g) => s + g.shipping, 0))}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2 }}>
                                <span>Delivery ({Object.keys(cartByShop).length} shipment{Object.keys(cartByShop).length !== 1 ? "s" : ""})</span>
                                <span style={{ fontFamily: FONT.mono }}>{fmt(Object.values(cartByShop).reduce((s, g) => s + g.shipping, 0))}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3 }}>
                                <span>GST (inclusive)</span>
                                <span style={{ fontFamily: FONT.mono }}>{fmt(gstInclusive)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 900, color: T.t1, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                                <span>Grand Total</span>
                                <span style={{ fontFamily: FONT.mono, color: T.amber }}>{fmt(totalCartValue)}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={checkingOut}
                            style={{
                                width: "100%", background: checkingOut ? T.t3 : T.amber, color: "#000", border: "none",
                                borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 900, cursor: checkingOut ? "wait" : "pointer",
                                boxShadow: `0 8px 24px ${T.amber}44`, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, transition: "all 0.2s"
                            }}
                            className="btn-hover-solid"
                        >
                            {checkingOut ? "Verifying Stock..." : "Proceed to Secure Checkout →"}
                        </button>
                        <div style={{ textAlign: "center", fontSize: 11, color: T.t3, marginTop: 12 }}>
                            🔒 Payments held in escrow until parts delivered and verified.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

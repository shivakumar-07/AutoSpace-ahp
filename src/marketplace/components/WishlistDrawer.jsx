import { useMemo } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, stockStatus } from "../../utils";
import { useToast } from "../../components/ui";

export function WishlistDrawer() {
    const { 
        wishlist, saveWishlist, isWishlistOpen, setIsWishlistOpen, toggleWishlist, 
        products, cart, saveCart, setIsCartOpen 
    } = useStore();
    const { add: toast } = useToast();

    if (!isWishlistOpen) return null;

    const wishlistProducts = useMemo(() => {
        if (!wishlist || !products) return [];
        return wishlist.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;
            return { ...product, wishlistAddedAt: item.addedAt };
        }).filter(Boolean);
    }, [wishlist, products]);

    const removeFromWishlist = (productId) => {
        const next = wishlist.filter(item => item.productId !== productId);
        saveWishlist(next);
        toast("Removed from Wishlist", "info");
    };

    const addToCart = (product) => {
        if (product.stock <= 0) return;
        
        const itemIndex = cart.findIndex(i => i.listing.product_id === product.id && i.listing.shop_id === product.shopId);
        let newCart = [...cart];

        if (itemIndex > -1) {
            newCart[itemIndex].qty += 1;
        } else {
            newCart.push({
                qty: 1,
                product: { name: product.name, brand: product.brand, category: product.category, sku: product.sku, image: product.image },
                listing: {
                    shop_id: product.shopId,
                    product_id: product.id,
                    selling_price: product.sellPrice,
                    mrp: product.mrp,
                    stock: product.stock,
                    product: { name: product.name },
                }
            });
        }
        saveCart(newCart);
        setIsCartOpen(true);
        toast(`Added ${product.name} to cart`, "success");
    };

    const addAllToCart = () => {
        const inStock = wishlistProducts.filter(p => p.stock > 0);
        if (inStock.length === 0) return;

        let newCart = [...cart];
        inStock.forEach(product => {
            const itemIndex = newCart.findIndex(i => i.listing.product_id === product.id && i.listing.shop_id === product.shopId);
            if (itemIndex > -1) {
                newCart[itemIndex].qty += 1;
            } else {
                newCart.push({
                    qty: 1,
                    product: { name: product.name, brand: product.brand, category: product.category, sku: product.sku, image: product.image },
                    listing: {
                        shop_id: product.shopId,
                        product_id: product.id,
                        selling_price: product.sellPrice,
                        mrp: product.mrp,
                        stock: product.stock,
                        product: { name: product.name },
                    }
                });
            }
        });
        saveCart(newCart);
        setIsCartOpen(true);
        toast(`Added ${inStock.length} items to cart`, "success");
    };

    const daysAgo = (ts) => {
        const days = Math.floor((Date.now() - ts) / 86400000);
        if (days === 0) return "Added today";
        if (days === 1) return "Added yesterday";
        return `Added ${days} days ago`;
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.2s" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,29,0.7)", backdropFilter: "blur(4px)" }} onClick={toggleWishlist} />

            <div style={{ position: "relative", width: 500, maxWidth: "100vw", height: "100%", background: T.surface, boxShadow: "-20px 0 60px rgba(0,0,0,0.5)", borderLeft: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", animation: "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
                
                <div style={{ padding: "24px 32px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: T.t1 }}>My Wishlist</div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{wishlistProducts.length} items saved</div>
                    </div>
                    <button onClick={toggleWishlist} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 24, cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }} className="custom-scroll">
                    {wishlistProducts.length === 0 ? (
                        <div style={{ textAlign: "center", color: T.t3, marginTop: 60 }}>
                            <div style={{ fontSize: 72, marginBottom: 24, opacity: 0.2 }}>♡</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Your wishlist is empty</div>
                            <p style={{ fontSize: 14, color: T.t3, marginTop: 8 }}>Heart a product while browsing to save it here.</p>
                        </div>
                    ) : (
                        wishlistProducts.map((p) => {
                            const isDeal = p.sellPrice % 10 === 9;
                            const status = stockStatus(p);
                            const statusColor = status === "ok" ? T.emerald : status === "low" ? T.amber : T.crimson;
                            const statusLabel = status === "ok" ? "In Stock" : status === "low" ? "Low Stock" : "Out of Stock";

                            return (
                                <div key={p.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, display: "flex", gap: 16, position: "relative" }}>
                                    {isDeal && (
                                        <div style={{ position: "absolute", top: -8, right: 12, background: T.crimson, color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 900, zIndex: 1 }}>DEAL</div>
                                    )}
                                    <div style={{ width: 80, height: 80, background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                                        {p.image || "⚙️"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 800, color: T.sky, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.category}</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginTop: 2 }}>{p.name}</div>
                                            </div>
                                            <button onClick={() => removeFromWishlist(p.id)} style={{ background: "transparent", border: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>🗑️</button>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(p.sellPrice)}</div>
                                                <div style={{ fontSize: 10, color: statusColor, fontWeight: 700, marginTop: 4 }}>● {statusLabel}</div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 10, color: T.t3, marginBottom: 8 }}>{daysAgo(p.wishlistAddedAt)}</div>
                                                <button 
                                                    onClick={() => addToCart(p)}
                                                    disabled={p.stock <= 0}
                                                    style={{ 
                                                        background: p.stock > 0 ? T.amber : T.t4, 
                                                        color: "#000", 
                                                        border: "none", 
                                                        borderRadius: 8, 
                                                        padding: "6px 12px", 
                                                        fontSize: 12, 
                                                        fontWeight: 800, 
                                                        cursor: p.stock > 0 ? "pointer" : "not-allowed" 
                                                    }}
                                                >
                                                    Add to Cart
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {wishlistProducts.some(p => p.stock > 0) && (
                    <div style={{ padding: 24, background: T.card, borderTop: `1px solid ${T.borderHi}` }}>
                        <button
                            onClick={addAllToCart}
                            style={{
                                width: "100%", background: T.amber, color: "#000", border: "none",
                                borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 900, cursor: "pointer",
                                boxShadow: `0 8px 24px ${T.amber}44`, display: "flex", justifyContent: "center", alignItems: "center", gap: 10
                            }}
                            className="btn-hover-solid"
                        >
                            Add All In-Stock to Cart →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

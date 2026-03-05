import { T, FONT } from "../../theme";
import { fmt } from "../../utils";
import { useStore } from "../../store";

export function ProductCompareOverlay({ selectedProducts, onUpdateProducts, onClose }) {
    const { cart, saveCart, setIsCartOpen } = useStore();

    if (!selectedProducts || selectedProducts.length === 0) return null;

    const handleAddToCart = (product) => {
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
    };

    const minPrice = Math.min(...selectedProducts.map(p => p.sellPrice));
    const maxStock = Math.max(...selectedProducts.map(p => p.stock));

    const rows = [
        { label: "Name", key: "name", isMono: false },
        { label: "Brand", key: "brand", isMono: false },
        { label: "Category", key: "category", isMono: false },
        { label: "Price", key: "sellPrice", isMono: true, isPrice: true },
        { label: "GST Rate", key: "gstRate", isMono: true, suffix: "%" },
        { label: "Current Stock", key: "stock", isMono: true },
        { label: "In Stock", key: "stock", isBoolean: true },
        { label: "Seller", key: "shopName", isMono: false },
    ];

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 11000, background: "rgba(5,8,13,0.95)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", animation: "fadeIn 0.3s" }}>
            <div style={{ padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}` }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: T.t1 }}>Compare Products</h2>
                <button onClick={onClose} style={{ background: T.card, border: `1px solid ${T.border}`, color: T.t1, width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "40px" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "12px 0" }}>
                    <thead>
                        <tr>
                            <th style={{ width: 200, padding: "20px", textAlign: "left", color: T.t3, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Features</th>
                            {selectedProducts.map(p => (
                                <th key={p.id} style={{ width: 300, padding: "20px", background: T.card, borderRadius: "16px 16px 0 0", border: `1px solid ${T.border}`, borderBottom: "none" }}>
                                    <div style={{ fontSize: 64, marginBottom: 16 }}>{p.image || "⚙️"}</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, minHeight: 40 }}>{p.name}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.label}>
                                <td style={{ padding: "16px 20px", color: T.t2, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{row.label}</td>
                                {selectedProducts.map(p => {
                                    const value = p[row.key];
                                    const isLowestPrice = row.key === "sellPrice" && p.sellPrice === minPrice;
                                    const isHighestStock = row.key === "stock" && p.stock === maxStock && !row.isBoolean;
                                    
                                    return (
                                        <td key={p.id} style={{ 
                                            padding: "16px 20px", 
                                            background: isLowestPrice ? `${T.emerald}22` : isHighestStock ? `${T.sky}22` : T.card, 
                                            color: isLowestPrice ? T.emerald : isHighestStock ? T.sky : T.t1,
                                            fontSize: 14,
                                            fontWeight: (isLowestPrice || isHighestStock) ? 800 : 500,
                                            fontFamily: row.isMono ? FONT.mono : FONT.ui,
                                            borderLeft: `1px solid ${T.border}`,
                                            borderRight: `1px solid ${T.border}`,
                                            borderBottom: `1px solid ${T.border}`,
                                            textAlign: "center"
                                        }}>
                                            {row.isPrice ? fmt(value) : row.isBoolean ? (value > 0 ? "✅ Yes" : "❌ No") : `${value}${row.suffix || ""}`}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        <tr>
                            <td style={{ padding: "24px 20px" }}></td>
                            {selectedProducts.map(p => (
                                <td key={p.id} style={{ padding: "24px 20px", background: T.card, borderRadius: "0 0 16px 16px", border: `1px solid ${T.border}`, borderTop: "none", textAlign: "center" }}>
                                    <button 
                                        onClick={() => handleAddToCart(p)}
                                        disabled={p.stock <= 0}
                                        style={{ 
                                            width: "100%", 
                                            background: p.stock > 0 ? T.amber : T.t4, 
                                            color: "#000", 
                                            border: "none", 
                                            borderRadius: 10, 
                                            padding: "12px", 
                                            fontSize: 14, 
                                            fontWeight: 900, 
                                            cursor: p.stock > 0 ? "pointer" : "not-allowed" 
                                        }}
                                    >
                                        Add to Cart
                                    </button>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import { useState, useEffect, useMemo } from "react";
import { T, FONT, GLOBAL_CSS } from "../../theme";
import { useStore } from "../../store";
import { getHomeData, searchEngine } from "../api/engine";
import { CATEGORIES, fmt } from "../../utils";

// Components
import { SearchBar } from "../components/SearchBar";
import { VehicleSelectorModal } from "../components/VehicleSelectorModal";
import { ProductComparisonModal } from "../components/ProductComparisonModal";
import { ProductCompareOverlay } from "../components/ProductCompareOverlay";
import { ProductCard } from "../components/ProductCard";
import { ShopCard, SectionCarousel, SkeletonLoader, EmptyState } from "../components/SharedUI";
import { CustomerProfile } from "./CustomerProfile";
import { ProductDetailsPage } from "./ProductDetailsPage";
import { useToast } from "../../components/ui";

function SearchResultsPage({ query, products, shops, selectedVehicle, onBack, onSelectProduct }) {
  const { wishlist, saveWishlist } = useStore();
  const { add: toast } = useToast();
  const [sortBy, setSortBy] = useState("relevance");
  const [activeFilters, setActiveFilters] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [showCompareOverlay, setShowCompareOverlay] = useState(false);

  const toggleWishlist = (productId) => {
    const isWished = wishlist.some(item => item.productId === productId);
    let next;
    if (isWished) {
      next = wishlist.filter(item => item.productId !== productId);
      toast("Removed from Wishlist", "info");
    } else {
      next = [...wishlist, { productId, addedAt: Date.now() }];
      toast("Added to Wishlist", "success");
    }
    saveWishlist(next);
  };

  const toggleCompare = (product) => {
    const isComparing = compareList.some(p => p.id === product.id);
    if (isComparing) {
      setCompareList(compareList.filter(p => p.id !== product.id));
    } else {
      if (compareList.length >= 3) {
        toast("Max 3 products for comparison", "warning");
        return;
      }
      setCompareList([...compareList, product]);
    }
  };

  const results = useMemo(() => {
    let res = searchEngine(query, products, shops, selectedVehicle);
    let filtered = [...res.products];

    // Brand filter
    const brandFilters = activeFilters.filter(f => f.label === "Brand").map(f => f.value);
    if (brandFilters.length > 0) {
      filtered = filtered.filter(p => brandFilters.includes(p.product.brand));
    }

    // Category filter
    const catFilters = activeFilters.filter(f => f.label === "Category").map(f => f.value);
    if (catFilters.length > 0) {
      filtered = filtered.filter(p => catFilters.includes(p.product.category));
    }

    // In Stock Only
    if (inStockOnly) {
      filtered = filtered.filter(p => p.availability > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "price_asc") return a.bestPrice - b.bestPrice;
      if (sortBy === "price_desc") return b.bestPrice - a.bestPrice;
      if (sortBy === "newest") return (b.product.createdAt || 0) - (a.product.createdAt || 0);
      return (b.rankScore || 0) - (a.rankScore || 0);
    });

    return { ...res, products: filtered };
  }, [query, products, shops, selectedVehicle, sortBy, activeFilters, inStockOnly]);

  const allBrands = useMemo(() => {
    const brands = new Set();
    const rawResults = searchEngine(query, products, shops, selectedVehicle);
    rawResults.products.forEach(p => brands.add(p.product.brand));
    return Array.from(brands).sort();
  }, [query, products, shops, selectedVehicle]);

  const allCats = useMemo(() => {
    const cats = new Set();
    const rawResults = searchEngine(query, products, shops, selectedVehicle);
    rawResults.products.forEach(p => cats.add(p.product.category));
    return Array.from(cats).sort();
  }, [query, products, shops, selectedVehicle]);

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      {showCompareOverlay && (
        <ProductCompareOverlay 
          selectedProducts={compareList} 
          onClose={() => setShowCompareOverlay(false)} 
        />
      )}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sky, fontWeight: 700, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>← Back to Home</button>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: 0 }}>Results for "{query}"</h1>
          <div style={{ fontSize: 15, color: T.t3 }}>Found {results.products.length} parts matching your search.</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: T.t1, cursor: "pointer", fontFamily: FONT.ui }}
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Enhanced Sort/Filter Bar */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter by Brand</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allBrands.map(b => {
                const isActive = activeFilters.some(f => f.label === "Brand" && f.value === b);
                return (
                  <button
                    key={b}
                    onClick={() => {
                      if (isActive) setActiveFilters(activeFilters.filter(f => !(f.label === "Brand" && f.value === b)));
                      else setActiveFilters([...activeFilters, { label: "Brand", value: b }]);
                    }}
                    style={{
                      background: isActive ? T.amber : T.card,
                      border: `1px solid ${isActive ? T.amber : T.border}`,
                      color: isActive ? "#000" : T.t2,
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {b}
                  </button>
                );
              })}
              {allBrands.length === 0 && <span style={{ fontSize: 12, color: T.t4 }}>No brands found</span>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter by Category</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allCats.map(c => {
                const isActive = activeFilters.some(f => f.label === "Category" && f.value === c);
                return (
                  <button
                    key={c}
                    onClick={() => {
                      if (isActive) setActiveFilters(activeFilters.filter(f => !(f.label === "Category" && f.value === c)));
                      else setActiveFilters([...activeFilters, { label: "Category", value: c }]);
                    }}
                    style={{
                      background: isActive ? T.amber : T.card,
                      border: `1px solid ${isActive ? T.amber : T.border}`,
                      color: isActive ? "#000" : T.t2,
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {c}
                  </button>
                );
              })}
              {allCats.length === 0 && <span style={{ fontSize: 12, color: T.t4 }}>No categories found</span>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", alignSelf: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: inStockOnly ? `${T.emerald}15` : T.card, border: `1px solid ${inStockOnly ? T.emerald : T.border}`, padding: "8px 16px", borderRadius: 12, transition: "all 0.2s" }}>
              <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.emerald }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: inStockOnly ? T.emerald : T.t1 }}>In Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {results.products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <EmptyState title="No matches found" desc="Try adjusting your filters or searching for something else." />
          {results.suggestions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, color: T.t3, marginBottom: 12 }}>Maybe try:</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {results.suggestions.map(s => (
                  <button key={s} onClick={() => {}} style={{ background: T.card, border: `1px solid ${T.border}`, color: T.sky, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
          {results.products.map(p => {
            const isWished = wishlist.some(item => item.productId === p.product.id);
            const isComparing = compareList.some(comp => comp.id === p.product.id);
            return (
              <div key={p.product.id} style={{ position: "relative" }}>
                <ProductCard item={p} selectedVehicle={selectedVehicle} onClick={() => onSelectProduct(p.product.id)} />
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(p.product.id); }}
                  style={{ position: "absolute", top: 12, right: 12, background: "rgba(10,15,29,0.6)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, color: isWished ? T.crimson : T.t3 }}
                >
                  {isWished ? "♥" : "♡"}
                </button>
                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(10,15,29,0.6)", backdropFilter: "blur(4px)", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700, color: T.t2 }}>
                    <input type="checkbox" checked={isComparing} onChange={() => toggleCompare(p.product)} style={{ width: 12, height: 12 }} />
                    Compare
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {compareList.length >= 2 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.surface, border: `1px solid ${T.amber}`, padding: "16px 24px", borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", gap: 20, animation: "fadeUp 0.3s" }}>
          <div style={{ color: T.t1, fontSize: 14, fontWeight: 700 }}>
            Comparing {compareList.length} products: <span style={{ color: T.t3 }}>{compareList.map(p => p.name).join(", ")}</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setCompareList([])} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.t3, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Clear</button>
            <button onClick={() => setShowCompareOverlay(true)} style={{ background: T.amber, border: "none", color: "#000", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Compare Now</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketplaceHome() {
  const { products, shops, selectedVehicle, toggleCart, cart, wishlist, toggleWishlist } = useStore();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Simple Internal Routing
  const [page, setPage] = useState("home"); // "home" | "profile" | "pdp" | "search"
  const [pdpProductId, setPdpProductId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);

  // UI Modals State
  const [vehModalOpen, setVehModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  // Faceted Filter State
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortBy, setSortBy] = useState("relevance"); // relevance | price_asc | price_desc | newest

  const categoryCounts = useMemo(() => {
    if (!products) return {};
    const counts = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  useEffect(() => {
    if (!products || !shops) return;
    setLoading(true);
    const timer = setTimeout(() => {
      try {
        const resp = getHomeData(products, shops, selectedVehicle);
        setData(resp);
      } catch (e) {
        console.error("getHomeData error:", e);
        setData(selectedVehicle ? { compatibleParts: [] } : { topSelling: [], trendingNearYou: [], bestDeals: [], popularCategories: [] });
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [products, shops, selectedVehicle]);

  const handleCategoryClick = (cat) => {
    setCategoryFilter(cat);
    const productsEl = document.getElementById("marketplace-products");
    if (productsEl) productsEl.scrollIntoView({ behavior: "smooth" });
  };

  const onSearchSubmit = (q) => {
    setSearchQuery(q);
    setPage("search");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, color: T.t1, paddingBottom: 60 }}>
      {/* GLOBAL CSS INJECTION */}
      <style>{GLOBAL_CSS}</style>

      {/* TOP NAVIGATION */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 32 }}>
          {/* Logo */}
          <div onClick={() => { setPage("home"); setCategoryFilter(null); }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${T.amber}, ${T.amberDim})`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#000", boxShadow: `0 4px 16px ${T.amber}66` }}>
              ⚙️
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>Velvet Parts</div>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, letterSpacing: "0.1em" }}>MARKETPLACE</div>
            </div>
          </div>

          {/* Search Engine */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <SearchBar 
              onSelectProduct={(p) => {
                setPdpProductId(p.product.id);
                setPage("pdp");
              }} 
              onSubmitSearch={onSearchSubmit}
              onSelectCategory={(cat) => {
                setSearchQuery(cat);
                setPage("search");
              }}
            />
          </div>

          {/* Right Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              onClick={() => setVehModalOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: selectedVehicle ? `${T.emerald}22` : T.card, border: `1px solid ${selectedVehicle ? T.emerald : T.border}`, padding: "8px 16px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
              className="mp-card-hover"
            >
              <span style={{ fontSize: 18 }}>{selectedVehicle ? (selectedVehicle.type === "Car" ? "🚙" : "🏍️") : "🚘"}</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 10, color: selectedVehicle ? T.emerald : T.t3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {selectedVehicle ? "Vehicle Saved" : "Select Vehicle"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>
                  {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Add for exact fit"}
                </span>
              </div>
            </div>

            <button onClick={toggleWishlist} style={{ width: 42, height: 42, borderRadius: "50%", background: T.card, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", position: "relative" }}>
              ♡
              {wishlist.length > 0 && (
                <span style={{ position: "absolute", top: -2, right: -2, background: T.crimson, color: "#fff", width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{wishlist.length}</span>
              )}
            </button>

            <button onClick={() => setPage("profile")} style={{ width: 42, height: 42, borderRadius: "50%", background: page === "profile" ? T.amber : T.card, border: `1px solid ${page === "profile" ? T.amber : T.border}`, color: page === "profile" ? "#000" : T.t1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", transition: "0.2s" }}>
              🧔
            </button>

            <button onClick={toggleCart} style={{ width: 42, height: 42, borderRadius: "50%", background: T.card, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", position: "relative" }}>
              🛒
              {cart.length > 0 && (
                <span style={{ position: "absolute", top: -2, right: -2, background: T.amber, color: "#000", width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{cart.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {page === "profile" && <CustomerProfile />}
        {page === "pdp" && <ProductDetailsPage productId={pdpProductId} onBack={() => setPage("home")} />}
        {page === "search" && (
          <SearchResultsPage 
            query={searchQuery} 
            products={products} 
            shops={shops} 
            selectedVehicle={selectedVehicle} 
            onBack={() => setPage("home")} 
            onSelectProduct={(id) => { setPdpProductId(id); setPage("pdp"); }}
          />
        )}
        
        {page === "home" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                <div style={{ width: "100%", height: 300, background: T.surface, borderRadius: 20 }} className="pulse" />
                <SkeletonLoader type="product" count={5} />
              </div>
            ) : (
              <>
                {/* PREMIUM HERO SECTION */}
                <div style={{ 
                  width: "100%", 
                  minHeight: 480, 
                  borderRadius: 24, 
                  background: `linear-gradient(135deg, #0A0F1D 0%, #0f172a 100%)`, 
                  border: `1px solid ${T.borderHi}`, 
                  marginBottom: 60, 
                  display: "flex", 
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "60px", 
                  position: "relative", 
                  overflow: "hidden",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
                }}>
                  <div style={{ position: "relative", zIndex: 10, maxWidth: 700 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", background: `${T.amber}15`, border: `1px solid ${T.amber}30`, color: T.amber, padding: "10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 28 }} className="fade-in">
                      <span style={{ marginRight: 8 }}>✨</span> India's #1 Hyperlocal Parts Platform
                    </div>
                    <h1 style={{ fontSize: 58, fontWeight: 900, color: "#fff", margin: "0 0 24px 0", lineHeight: 1.05, letterSpacing: "-0.04em" }}>
                      Find the right part. <br />
                      <span style={{ background: `linear-gradient(to right, ${T.amber}, #fbbf24, ${T.amber})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% auto", animation: "shimmer 3s linear infinite" }}>Faster than a pit stop.</span>
                    </h1>
                    <p style={{ fontSize: 20, color: T.t2, marginBottom: 40, lineHeight: 1.6, maxWidth: 500 }}>
                      Get genuine spares from 7,00,000+ local trusted shops delivered in under 45 minutes.
                    </p>
                    <div style={{ display: "flex", gap: 16 }}>
                      <button 
                        onClick={() => setVehModalOpen(true)} 
                        style={{ background: T.amber, color: "#000", border: "none", borderRadius: 14, padding: "18px 36px", fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: `0 8px 24px ${T.amber}44` }} 
                        className="btn-hover"
                      >
                        Select Your Vehicle 🚘
                      </button>
                      <button 
                        onClick={() => {
                          const productsEl = document.getElementById("marketplace-products");
                          if (productsEl) productsEl.scrollIntoView({ behavior: "smooth" });
                        }} 
                        style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 14, padding: "18px 36px", fontSize: 17, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(10px)" }} 
                        className="btn-hover"
                      >
                        Browse All Parts
                      </button>
                    </div>
                  </div>
                  
                  {/* Floating Gear Animation */}
                  <div className="float-anim" style={{ position: "absolute", right: -40, top: "10%", fontSize: 320, opacity: 0.07, pointerEvents: "none", filter: "blur(2px)" }}>⚙️</div>
                  <div className="float-anim" style={{ position: "absolute", right: 240, bottom: "15%", fontSize: 160, opacity: 0.04, animationDelay: "1.5s", pointerEvents: "none", filter: "blur(1px)" }}>🔧</div>

                  {/* Trust Badges */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.3)", borderTop: `1px solid rgba(255,255,255,0.08)`, padding: "16px 60px", display: "flex", justifyContent: "space-between", backdropFilter: "blur(12px)" }}>
                    {[
                      { l: "7 Lakh+ Shops", i: "🏪" },
                      { l: "3 Crore+ Parts", i: "📦" },
                      { l: "45-min Delivery", i: "⚡" },
                      { l: "GST Invoice", i: "🧾" }
                    ].map(b => (
                      <div key={b.l} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: T.t2 }}>
                        <span style={{ fontSize: 18, filter: "drop-shadow(0 0 8px rgba(255,255,255,0.2))" }}>{b.i}</span> {b.l}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CATEGORY GRID */}
                <div style={{ marginBottom: 60 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                    <h2 style={{ fontSize: 26, fontWeight: 800, color: T.t1, letterSpacing: "-0.02em" }}>Shop by Category</h2>
                  </div>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
                    gap: 20,
                  }}>
                    {CATEGORIES.map(c => {
                      const icon = c === "Engine" ? "⚙️" : c === "Brakes" ? "🛑" : c === "Electrical" ? "⚡" : c === "Suspension" ? "🛞" : c === "Filters" ? "💨" : c === "Cooling" ? "❄️" : c === "Body" ? "🚗" : c === "Tyres" ? "⭕" : c === "Lubrication" ? "🛢️" : c === "Transmission" ? "🕹️" : c === "Clutch" ? "⚙️" : "🔧";
                      return (
                        <div 
                          key={c} 
                          onClick={() => handleCategoryClick(c)}
                          style={{ 
                            background: categoryFilter === c ? `${T.amber}15` : T.card, 
                            border: `1px solid ${categoryFilter === c ? T.amber : T.border}`, 
                            borderRadius: 20, 
                            padding: "32px 24px", 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center", 
                            gap: 16, 
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            overflow: "hidden"
                          }} 
                          className="mp-card-hover"
                        >
                          {categoryFilter === c && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: T.amber }} />
                          )}
                          <span style={{ fontSize: 56, transition: "transform 0.3s", transform: categoryFilter === c ? "scale(1.1)" : "none" }}>{icon}</span>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 4 }}>{c}</div>
                            <div style={{ fontSize: 12, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{categoryCounts[c] || 0} Items</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div id="marketplace-products" style={{ scrollMarginTop: 100 }}>
                  {/* VIEW A: VEHICLE SELECTED OR CATEGORY FILTERED */}
                  {(selectedVehicle || categoryFilter) && (
                    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
                      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: "0 0 8px 0" }}>
                            {categoryFilter ? `${categoryFilter} Parts` : `Parts for ${selectedVehicle.brand} ${selectedVehicle.model}`}
                          </h1>
                          <div style={{ fontSize: 15, color: T.t3 }}>
                            {selectedVehicle ? `Showing verified compatible parts.` : `Browse genuine parts in ${categoryFilter}.`}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: T.t1, cursor: "pointer", fontFamily: FONT.ui, appearance: "none" }}
                          >
                            <option value="relevance">Sort: Relevance</option>
                            <option value="price_asc">Price: Low → High</option>
                            <option value="price_desc">Price: High → Low</option>
                            <option value="newest">Newest First</option>
                          </select>
                        </div>
                      </div>

                      {data?.compatibleParts ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                          {data.compatibleParts
                            .filter(p => !categoryFilter || p.product.category === categoryFilter)
                            .sort((a, b) => {
                              if (sortBy === "price_asc") return a.bestPrice - b.bestPrice;
                              if (sortBy === "price_desc") return b.bestPrice - a.bestPrice;
                              if (sortBy === "newest") return (b.product.createdAt || 0) - (a.product.createdAt || 0);
                              return (b.rankScore || 0) - (a.rankScore || 0);
                            }).map(p => (
                              <ProductCard key={p.product.id} item={p} selectedVehicle={selectedVehicle} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} />
                            ))}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                          {products
                            .filter(p => !categoryFilter || p.category === categoryFilter)
                            .map(p => {
                                // Simple ranking if not using rankingEngine for compatibility
                                const item = { product: p, bestPrice: p.sellPrice, availability: p.stock, shopCount: 1, listings: [{ product_id: p.id, selling_price: p.sellPrice }] };
                                return <ProductCard key={p.id} item={item} onClick={() => { setPdpProductId(p.id); setPage("pdp"); }} />
                            })
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW B: GENERAL MARKETPLACE */}
                  {!selectedVehicle && !categoryFilter && data && (
                    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
                      {/* Top Selling Overall */}
                      <SectionCarousel title="🔥 Global Top Selling Parts">
                        {data.topSelling.map(p => (
                          <ProductCard key={p.product.id} item={p} selectedVehicle={selectedVehicle} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} />
                        ))}
                      </SectionCarousel>

                      {data.bestDeals.length > 0 && (
                        <SectionCarousel title="💰 Best Deals Today">
                          {data.bestDeals.map(p => (
                            <ProductCard key={p.product.id} item={p} selectedVehicle={selectedVehicle} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} />
                          ))}
                        </SectionCarousel>
                      )}

                      <SectionCarousel title="⚡ Trending Near You">
                        {data.trendingNearYou.map(p => (
                          <ProductCard key={p.product.id} item={p} selectedVehicle={selectedVehicle} onClick={() => { setPdpProductId(p.product.id); setPage("pdp"); }} />
                        ))}
                      </SectionCarousel>

                      {/* Nearby Shops Preview */}
                      <SectionCarousel title="🏪 Trusted Shops Near You">
                        {data.trendingNearYou.filter((v, i, a) => a.findIndex(t => (t.listings[0].shop_id === v.listings[0].shop_id)) === i).map(p => (
                          <ShopCard key={p.listings[0].shop_id} shop={p.listings[0].shop} />
                        ))}
                      </SectionCarousel>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* MODALS */}
      <VehicleSelectorModal open={vehModalOpen} onClose={() => setVehModalOpen(false)} />
      <ProductComparisonModal open={!!activeProduct} productData={activeProduct} onClose={() => setActiveProduct(null)} />
    </div>
  );
}

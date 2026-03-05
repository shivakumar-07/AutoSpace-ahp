import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { T, FONT } from "../theme";
import { CATEGORIES, fmt, fmtN, pct, stockStatus, STATUS, margin, getOverduePayments, generateReminderMessage, getExpiringProducts, getGSTSummary, getDeadStock, getChannelBreakdown } from "../utils";
import { StatCard, ChartTip, Badge, Btn } from "../components/ui";

const PIE_C = [T.amber, T.sky, T.emerald, T.violet, "#FB923C", "#F472B6", "#34D399", "#60A5FA"];

export function DashboardPage({ products, movements, orders, activeShopId, onNavigate, jobCards, parties, vehicles }) {
  const [period, setPeriod] = useState("30");
  const [profitView, setProfitView] = useState("unit_profit");
  const [chartMode, setChartMode] = useState("area");
  const [batchPO, setBatchPO] = useState([]);
  const [dismissedReorders, setDismissedReorders] = useState(() => {
    try {
      const stored = localStorage.getItem("vl_dismissed_reorder");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem("vl_dismissed_alerts");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [showDismissedReorders, setShowDismissedReorders] = useState(false);
  const [plMonth, setPlMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const now = Date.now();
  const days = +period;
  const cutoff = now - days * 86400000;
  const prevCut = now - days * 2 * 86400000;

  const shopProducts = useMemo(() => products.filter(p => p.shopId === activeShopId), [products, activeShopId]);
  const shopMovements = useMemo(() => movements.filter(m => m.shopId === activeShopId), [movements, activeShopId]);

  const curMov = useMemo(() => shopMovements.filter(m => m.date >= cutoff), [shopMovements, cutoff]);
  const prevMov = useMemo(() => shopMovements.filter(m => m.date >= prevCut && m.date < cutoff), [shopMovements, prevCut, cutoff]);

  const curSales = curMov.filter(m => m.type === "SALE");
  const curPurch = curMov.filter(m => m.type === "PURCHASE");

  const revenue = curSales.reduce((s, m) => s + m.total, 0);
  const expenses = curPurch.reduce((s, m) => s + m.total, 0);
  const profit = curSales.reduce((s, m) => s + (m.profit || 0), 0);
  const units = curSales.reduce((s, m) => s + m.qty, 0);
  const discounts = curSales.reduce((s, m) => s + (m.discount || 0), 0);

  const prevRev = prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + m.total, 0);
  const prevProf = prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + (m.profit || 0), 0);
  const prevUnits = prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + m.qty, 0);
  const prevExpenses = prevMov.filter(m => m.type === "PURCHASE").reduce((s, m) => s + m.total, 0);

  const revTrend = prevRev > 0 ? (((revenue - prevRev) / prevRev) * 100).toFixed(0) : null;
  const profTrend = prevProf > 0 ? (((profit - prevProf) / prevProf) * 100).toFixed(0) : null;
  const unitsTrend = prevUnits > 0 ? (((units - prevUnits) / prevUnits) * 100).toFixed(0) : null;
  const expTrend = prevExpenses > 0 ? (((expenses - prevExpenses) / prevExpenses) * 100).toFixed(0) : null;

  const invValue = shopProducts.reduce((s, p) => s + (p.buyPrice * p.stock), 0);
  const potProfit = shopProducts.reduce((s, p) => s + ((p.sellPrice - p.buyPrice) * p.stock), 0);
  const lowProducts = shopProducts.filter(p => stockStatus(p) !== "ok");

  const pendingReceivables = shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0);
  const creditCustomers = new Set(shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").map(m => m.customerName)).size;

  const pendingOrderCount = (orders || []).filter(o => o.shopId === activeShopId && (o.status === "NEW" || o.status === "placed")).length;
  const pendingOrders = (orders || []).filter(o => o.shopId === activeShopId && (o.status === "NEW" || o.status === "placed"));

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const gst = useMemo(() => getGSTSummary(shopMovements, cutoff), [shopMovements, cutoff]);
  const channelBreakdown = useMemo(() => getChannelBreakdown(shopMovements, cutoff), [shopMovements, cutoff]);
  const deadStock = useMemo(() => getDeadStock(shopProducts, shopMovements, 180), [shopProducts, shopMovements]);
  const overduePayments = useMemo(() => getOverduePayments(shopMovements, parties || []), [shopMovements, parties]);
  const expiringProducts = useMemo(() => getExpiringProducts(shopProducts, 60), [shopProducts]);

  const deadStockValue = deadStock.reduce((s, p) => s + (p.buyPrice * p.stock), 0);
  const workshopRevenue = (jobCards || []).filter(jc => jc.shopId === activeShopId && jc.status === "COMPLETED").reduce((s, jc) => s + (jc.actualAmount || 0), 0);

  // Demand Forecasting
  const demandForecasting = useMemo(() => {
    const last30Days = currentTime - 30 * 86400000;
    const sales30d = shopMovements.filter(m => m.type === "SALE" && m.date >= last30Days);
    
    return shopProducts.map(p => {
      const sold = sales30d.filter(m => m.productId === p.id).reduce((s, m) => s + m.qty, 0);
      const avgDailySales = sold / 30;
      const daysUntilDepletion = avgDailySales > 0 ? p.stock / avgDailySales : Infinity;
      
      let urgency = "OK";
      let color = T.emerald;
      if (daysUntilDepletion < 7) { urgency = "CRITICAL"; color = T.crimson; }
      else if (daysUntilDepletion < 14) { urgency = "WARNING"; color = T.amber; }
      else if (daysUntilDepletion < 30) { urgency = "WATCH"; color = T.sky; }

      return { ...p, avgDailySales, daysUntilDepletion, urgency, color };
    })
    .filter(p => p.avgDailySales > 0)
    .sort((a, b) => a.daysUntilDepletion - b.daysUntilDepletion)
    .slice(0, 5);
  }, [shopProducts, shopMovements, currentTime]);

  // Smart Reorder Queue
  const reorderQueue = useMemo(() => {
    return shopProducts.filter(p => p.stock <= p.minStock && p.stock > 0)
      .map(p => {
        const reorderQty = Math.max( (p.maxStock || p.minStock * 3) - p.stock, p.minStock);
        const estimatedCost = reorderQty * p.buyPrice;
        const isDismissed = dismissedReorders[p.id] && (currentTime - dismissedReorders[p.id]) < 7 * 86400000;
        return { ...p, reorderQty, estimatedCost, isDismissed };
      });
  }, [shopProducts, dismissedReorders, currentTime]);

  const handleDismissReorder = (pid) => {
    const next = { ...dismissedReorders, [pid]: currentTime };
    setDismissedReorders(next);
    localStorage.setItem("vl_dismissed_reorder", JSON.stringify(next));
  };

  const handleAddToBatchPO = (item) => {
    if (batchPO.find(i => i.id === item.id)) return;
    setBatchPO([...batchPO, item]);
  };

  // P&L Summary
  const plSummary = useMemo(() => {
    const [y, m] = plMonth.split("-").map(Number);
    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 1).getTime();
    
    const monthSales = shopMovements.filter(m => m.type === "SALE" && m.date >= start && m.date < end);
    const rev = monthSales.reduce((s, m) => s + m.total, 0);
    const cogs = monthSales.reduce((s, m) => {
      const prod = shopProducts.find(p => p.id === m.productId);
      return s + (m.qty * (prod?.buyPrice || 0));
    }, 0);
    const grossProfit = rev - cogs;
    const grossMargin = rev > 0 ? (grossProfit / rev) * 100 : 0;
    const netProfitEst = grossProfit * 0.85;

    return { rev, cogs, grossProfit, grossMargin, netProfitEst };
  }, [plMonth, shopMovements, shopProducts]);

  // Intelligent Business Alerts
  const intelligenceAlerts = useMemo(() => {
    const alerts = [];
    
    // 1. Dead stock
    const deadStock60 = shopProducts.filter(p => {
      const lastSale = shopMovements.filter(m => m.productId === p.id && m.type === "SALE").sort((a,b) => b.date - a.date)[0];
      return !lastSale || (currentTime - lastSale.date) > 60 * 86400000;
    });
    if (deadStock60.length > 0) {
      alerts.push({ id: "dead_stock", icon: "🛑", text: `${deadStock60.length} products have had no sales in 60+ days. Consider a flash sale.`, severity: T.amber });
    }

    // 2. Overdue credit
    overduePayments.forEach(p => {
      const lastTx = shopMovements.filter(m => (m.customerName === p.name || m.customerPhone === p.phone)).sort((a,b) => b.date - a.date)[0];
      if (lastTx && (currentTime - lastTx.date) > 30 * 86400000) {
        alerts.push({ id: `overdue_${p.id}`, icon: "💸", text: `Party ${p.name} has been outstanding for 30+ days`, severity: T.crimson });
      }
    });

    // 3. Pending orders SLA
    const lateOrders = pendingOrders.filter(o => o.status === "placed" && (currentTime - o.time) > 10 * 60000);
    if (lateOrders.length > 0) {
      alerts.push({ id: "sla_late", icon: "⏰", text: `${lateOrders.length} orders need acceptance within SLA — accept now`, severity: T.crimson });
    }

    // 4. Top seller
    const weekAgo = currentTime - 7 * 86400000;
    const weekSales = shopMovements.filter(m => m.type === "SALE" && m.date >= weekAgo);
    const salesMap = {};
    weekSales.forEach(m => { salesMap[m.productId] = (salesMap[m.productId] || 0) + m.qty; });
    const topId = Object.keys(salesMap).sort((a,b) => salesMap[b] - salesMap[a])[0];
    if (topId) {
      const topProd = shopProducts.find(p => p.id === topId);
      alerts.push({ id: "top_seller", icon: "🏆", text: `Top seller: ${topProd?.name || 'Item'} — ${salesMap[topId]} units this week. Restock soon?`, severity: T.emerald });
    }

    // 5. Recurring invoices due
    try {
      const riData = localStorage.getItem("vl_recurring_invoices");
      if (riData) {
        const ris = JSON.parse(riData);
        const RECURRENCE_DAYS_MAP = { monthly: 30, quarterly: 90, half_yearly: 182, yearly: 365 };
        const dueCount = ris.filter(ri => {
          if (!ri.isActive || ri.shopId !== activeShopId) return false;
          if (ri.endDate && currentTime > ri.endDate) return false;
          const intervalMs = (RECURRENCE_DAYS_MAP[ri.recurrence] || 30) * 86400000;
          const nextDue = ri.lastGeneratedDate ? ri.lastGeneratedDate + intervalMs : ri.startDate || ri.createdAt;
          return currentTime >= nextDue;
        }).length;
        if (dueCount > 0) {
          alerts.push({ id: "recurring_due", icon: "🔄", text: `${dueCount} recurring invoice(s) are due for generation. Go to Sales Docs → Recurring.`, severity: T.amber });
        }
      }
    } catch {}

    // 6. Best margin
    const bestMarginProd = [...shopProducts].sort((a,b) => ((b.sellPrice - b.buyPrice)/b.buyPrice) - ((a.sellPrice - a.buyPrice)/a.buyPrice))[0];
    if (bestMarginProd) {
      const mg = ((bestMarginProd.sellPrice - bestMarginProd.buyPrice) / bestMarginProd.buyPrice * 100).toFixed(1);
      alerts.push({ id: "best_margin", icon: "📈", text: `Highest margin item: ${bestMarginProd.name} at ${mg}% margin. Feature it!`, severity: T.emerald });
    }

    return alerts.filter(a => {
      const d = dismissedAlerts[a.id];
      return !d || (currentTime - d) > 24 * 3600000;
    });
  }, [shopProducts, shopMovements, currentTime, overduePayments, pendingOrders, dismissedAlerts]);

  const handleDismissAlert = (id) => {
    const next = { ...dismissedAlerts, [id]: currentTime };
    setDismissedAlerts(next);
    localStorage.setItem("vl_dismissed_alerts", JSON.stringify(next));
  };

  const handleGeneratePO = () => {
    const headers = ["Supplier", "Product", "Current Stock", "Min Stock", "Reorder Qty", "Unit Price", "Total Cost"];
    const rows = shopProducts.filter(p => p.stock < p.minStock).map(p => [
      p.supplier || "Unknown", p.name, p.stock, p.minStock, p.minStock * 2 - p.stock, p.buyPrice, (p.minStock * 2 - p.stock) * p.buyPrice
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PO_LowStock_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prodStats = useMemo(() =>
    shopProducts.map(p => {
      const s = curSales.filter(m => m.productId === p.id);
      const pu = curPurch.filter(m => m.productId === p.id);
      const sold = s.reduce((t, m) => t + m.qty, 0);
      const revP = s.reduce((t, m) => t + m.total, 0);
      const profP = s.reduce((t, m) => t + (m.profit || 0), 0);
      const bought = pu.reduce((t, m) => t + m.qty, 0);
      const spentP = pu.reduce((t, m) => t + m.total, 0);
      const profitPU = p.sellPrice - p.buyPrice;
      const mg = +margin(p.buyPrice, p.sellPrice);
      return { ...p, sold, revP, profP, bought, spentP, profitPU, mg };
    }), [shopProducts, curSales, curPurch]);

  const chartData = useMemo(() => {
    const pts = Math.min(days, 30);
    return Array.from({ length: pts }, (_, i) => {
      const end = now - i * 86400000;
      const start = end - 86400000;
      const ds = shopMovements.filter(m => m.type === "SALE" && m.date >= start && m.date < end);
      const dp = shopMovements.filter(m => m.type === "PURCHASE" && m.date >= start && m.date < end);
      const lbl = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return { date: lbl, Revenue: ds.reduce((t, m) => t + m.total, 0), Profit: ds.reduce((t, m) => t + (m.profit || 0), 0), Expenses: dp.reduce((t, m) => t + m.total, 0) };
    }).reverse();
  }, [shopMovements, days, now]);

  const catPie = useMemo(() =>
    CATEGORIES.map(c => ({
      name: c,
      value: curSales.filter(m => shopProducts.find(p => p.id === m.productId)?.category === c).reduce((t, m) => t + m.total, 0)
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value), [curSales, shopProducts]);

  const sortedProds = [...prodStats].sort((a, b) => {
    if (profitView === "unit_profit") return b.profitPU - a.profitPU;
    if (profitView === "total_profit") return b.profP - a.profP;
    if (profitView === "margin") return b.mg - a.mg;
    if (profitView === "revenue") return b.revP - a.revP;
    return 0;
  });

  const signal = p => {
    if (p.profitPU < 0) return { icon: "🔴", label: "Loss Product", color: T.crimson };
    if (p.mg < 10) return { icon: "🟡", label: "Very Low Margin", color: T.amber };
    if (p.sold === 0) return { icon: "💤", label: "No Sales", color: T.t3 };
    if (p.mg > 35 && p.sold > 3) return { icon: "🏆", label: "Star Performer", color: T.emerald };
    if (p.mg > 20) return { icon: "✅", label: "Healthy", color: T.emerald };
    return { icon: "⚡", label: "Average", color: T.sky };
  };

  const alertCount = pendingOrderCount + lowProducts.length + overduePayments.length + expiringProducts.length;

  return (
    <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.t3, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 4, fontFamily: FONT.ui }}>Period:</span>
        {[["7", "7D"], ["30", "30D"], ["90", "3M"], ["180", "6M"], ["365", "1Y"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ background: period === v ? T.amber : "transparent", color: period === v ? "#000" : T.t2, border: `1px solid ${period === v ? T.amber : T.border}`, borderRadius: 7, padding: "5px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s" }}>{l}</button>
        ))}
        <span style={{ flex: 1 }} />

        <div style={{ background: `${T.emerald}14`, border: `1px solid ${T.emerald}44`, borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.emerald, boxShadow: `0 0 8px ${T.emerald}` }} className="pulse" />
          <span style={{ fontSize: 13, color: T.emerald, fontWeight: 800 }}>Marketplace Sync Active</span>
          <span style={{ fontSize: 11, color: T.t3, marginLeft: 8 }}>Rating: ⭐ 4.9 (Top Tier)</span>
        </div>
      </div>

      {/* Actionable Alerts Panel */}
      {alertCount > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.amber}33`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>🔔</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>Action Required</div>
                <div style={{ fontSize: 12, color: T.t3 }}>{alertCount} items need your attention</div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {pendingOrders.length > 0 && (
              <div onClick={() => onNavigate("orders")} className="card-hover" style={{ background: `${T.sky}12`, border: `1px solid ${T.sky}33`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>🌐</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.sky }}>Pending Orders</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{pendingOrders.length}</div>
                  {pendingOrders.some(o => o.status === "NEW") && (
                    (() => {
                      const newest = [...pendingOrders].filter(o => o.status === "NEW").sort((a, b) => a.time - b.time)[0];
                      const elapsed = currentTime - newest.time;
                      const remaining = Math.max(0, 5 * 60 * 1000 - elapsed);
                      const mm = Math.floor(remaining / 60000);
                      const ss = Math.floor((remaining % 60000) / 1000);
                      const isLate = remaining === 0;
                      return (
                        <div style={{ fontSize: 11, fontWeight: 800, color: isLate ? T.crimson : T.amber, background: isLate ? T.crimsonBg : T.amberGlow, padding: "2px 6px", borderRadius: 4 }} className={!isLate ? "pulse" : ""}>
                          {isLate ? "LATE" : `${mm}:${ss < 10 ? "0" : ""}${ss} remaining`}
                        </div>
                      );
                    })()
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>Accept within 5 min to maintain rankings</div>
                <div style={{ marginTop: 8 }}>
                  <Btn size="xs" variant="sky" onClick={(e) => { e.stopPropagation(); onNavigate("orders"); }}>Accept Orders →</Btn>
                </div>
              </div>
            )}

            {lowProducts.length > 0 && (
              <div onClick={() => onNavigate("inventory")} className="card-hover" style={{ background: T.amberGlow, border: `1px solid ${T.amber}33`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.amber }}>Low Stock</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{lowProducts.length}</div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                  {lowProducts.filter(p => p.stock <= 0).length > 0 && <span style={{ color: T.crimson, fontWeight: 700 }}>{lowProducts.filter(p => p.stock <= 0).length} out of stock · </span>}
                  {lowProducts.filter(p => p.stock > 0).length} running low
                </div>
                <div style={{ marginTop: 8 }}>
                  <Btn size="xs" variant="amber" onClick={(e) => { e.stopPropagation(); onNavigate("inventory"); }}>📥 Reorder</Btn>
                </div>
              </div>
            )}

            {overduePayments.length > 0 && (
              <div onClick={() => onNavigate("parties")} className="card-hover" style={{ background: T.crimsonBg, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>📢</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.crimson }}>Overdue Udhaar</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{fmt(overduePayments.reduce((s, c) => s + c.total, 0))}</div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{overduePayments.length} customers overdue</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  {overduePayments[0]?.phone && (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const msg = generateReminderMessage(overduePayments[0]);
                      window.open(`https://wa.me/${overduePayments[0].phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                    }} style={{ background: "#25D366", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                      💬 WhatsApp Remind
                    </button>
                  )}
                </div>
              </div>
            )}

            {expiringProducts.length > 0 && (
              <div onClick={() => onNavigate("inventory")} className="card-hover" style={{ background: `rgba(251,146,60,0.1)`, border: `1px solid rgba(251,146,60,0.25)`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>⏳</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#FB923C" }}>Expiring Batches</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{expiringProducts.length}</div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                  {expiringProducts.filter(p => p.isExpired).length > 0 && <span style={{ color: T.crimson, fontWeight: 700 }}>{expiringProducts.filter(p => p.isExpired).length} expired · </span>}
                  Within 60 days
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Demand Intelligence */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: T.card, border: `1px solid ${T.violet}33`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>AI Demand Intelligence</div>
                <div style={{ fontSize: 12, color: T.t3 }}>Predictive stock depletion analysis</div>
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Product</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Stock</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Avg Daily</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Depletion</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {demandForecasting.map(p => (
                  <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px", fontWeight: 600, color: T.t1 }}>{p.name}</td>
                    <td style={{ padding: "12px", color: T.t2, fontFamily: FONT.mono }}>{p.stock}</td>
                    <td style={{ padding: "12px", color: T.t2, fontFamily: FONT.mono }}>{p.avgDailySales.toFixed(1)}</td>
                    <td style={{ padding: "12px", color: T.t1, fontWeight: 800, fontFamily: FONT.mono }}>{p.daysUntilDepletion === Infinity ? "∞" : p.daysUntilDepletion.toFixed(0)}d</td>
                    <td style={{ padding: "12px" }}>
                      <span className={p.urgency === "CRITICAL" ? "pulse" : ""} style={{ fontSize: 10, fontWeight: 800, color: p.color, background: `${p.color}18`, padding: "2px 6px", borderRadius: 4 }}>{p.urgency}</span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <Btn size="xs" variant="outline" onClick={() => onNavigate("rfq")}>Order Now</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Intelligence Alerts */}
        <div style={{ background: T.card, border: `1px solid ${T.sky}33`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>Platform Intelligence</div>
                <div style={{ fontSize: 12, color: T.t3 }}>Business insight signals</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {intelligenceAlerts.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.t3, fontSize: 14 }}>No new intelligence alerts today.</div>
            ) : intelligenceAlerts.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: T.surface, borderLeft: `4px solid ${a.severity}`, borderRadius: "4px 10px 10px 4px" }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: T.t2, fontWeight: 500 }}>{a.text}</span>
                <button onClick={() => handleDismissAlert(a.id)} style={{ background: "transparent", border: "none", color: T.t3, cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly P&L Summary Card */}
      <div style={{ background: T.card, border: `1px solid ${T.emerald}33`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>Monthly P&L Summary</div>
              <div style={{ fontSize: 12, color: T.t3 }}>Real-time profitability tracking</div>
            </div>
          </div>
          <input type="month" value={plMonth} onChange={e => setPlMonth(e.target.value)} 
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: T.emerald, fontFamily: FONT.mono }}>{fmt(plSummary.rev)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>COGS</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: T.crimson, fontFamily: FONT.mono }}>{fmt(plSummary.cogs)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Gross Profit</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: plSummary.grossProfit >= 0 ? T.emerald : T.crimson, fontFamily: FONT.mono }}>{fmt(plSummary.grossProfit)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: plSummary.grossProfit >= 0 ? T.emerald : T.crimson }}>{plSummary.grossMargin.toFixed(1)}% Margin</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Est. Net Profit</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: T.sky, fontFamily: FONT.mono }}>{fmt(plSummary.netProfitEst)}</div>
            <div style={{ fontSize: 11, color: T.t3 }}>Est. after 15% expenses</div>
          </div>
        </div>
        <div style={{ height: 12, background: T.surface, borderRadius: 6, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${(plSummary.cogs / Math.max(plSummary.rev, 1)) * 100}%`, background: T.crimson, transition: "width 0.4s" }} />
          <div style={{ flex: 1, background: T.emerald, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: T.t3, fontWeight: 600 }}>
          <span>COGS ({pct(plSummary.cogs, plSummary.rev)})</span>
          <span>GROSS PROFIT ({pct(plSummary.grossProfit, plSummary.rev)})</span>
        </div>
      </div>

      {/* Smart Reorder Queue */}
      <div style={{ background: T.card, border: `1px solid ${T.amber}33`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>Smart Reorder Queue</div>
              <div style={{ fontSize: 12, color: T.t3 }}>Auto-suggested inventory replenishment</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {reorderQueue.filter(i => i.isDismissed).length > 0 && (
              <button onClick={() => setShowDismissedReorders(!showDismissedReorders)} style={{ background: "transparent", border: "none", color: T.sky, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                {showDismissedReorders ? "Hide" : "Show"} {reorderQueue.filter(i => i.isDismissed).length} Dismissed
              </button>
            )}
            {batchPO.length > 0 && (
              <Btn size="sm" onClick={() => alert(`Creating PO for ${batchPO.length} items. Total: ${fmt(batchPO.reduce((s,i)=>s+i.estimatedCost, 0))}`)}>
                Create PO for {batchPO.length} items — Total: {fmt(batchPO.reduce((s,i)=>s+i.estimatedCost, 0))}
              </Btn>
            )}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: "left" }}>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Product</th>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Current</th>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Min</th>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Suggest Qty</th>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Est. Cost</th>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Supplier</th>
                <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reorderQueue.filter(i => showDismissedReorders ? true : !i.isDismissed).map(p => (
                <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}`, opacity: p.isDismissed ? 0.5 : 1 }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: T.t1 }}>{p.name}</td>
                  <td style={{ padding: "12px", color: T.crimson, fontWeight: 700, fontFamily: FONT.mono }}>{p.stock}</td>
                  <td style={{ padding: "12px", color: T.t3, fontFamily: FONT.mono }}>{p.minStock}</td>
                  <td style={{ padding: "12px", color: T.amber, fontWeight: 800, fontFamily: FONT.mono }}>{p.reorderQty}</td>
                  <td style={{ padding: "12px", color: T.t1, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(p.estimatedCost)}</td>
                  <td style={{ padding: "12px", color: T.t2 }}>{p.supplier || "N/A"}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {!p.isDismissed && <Btn size="xs" variant="sky" onClick={() => handleAddToBatchPO(p)}>Add to PO</Btn>}
                      {!p.isDismissed && <Btn size="xs" variant="ghost" onClick={() => handleDismissReorder(p.id)}>Dismiss</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reorderQueue.filter(i => showDismissedReorders ? true : !i.isDismissed).length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: T.t3, fontSize: 14 }}>Inventory levels are healthy. No items in reorder queue.</div>
          )}
        </div>
      </div>

      {/* DEAD STOCK PANEL */}
      {deadStock.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.crimson}33`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>🛑</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>Dead Stock Alert</div>
                <div style={{ fontSize: 12, color: T.t3 }}>Items not sold in 180+ days</div>
              </div>
            </div>
            <Btn size="sm" variant="outline" onClick={handleGeneratePO}>Generate PO for Low Stock</Btn>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Product</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Qty</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Value</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Days Since Sale</th>
                  <th style={{ padding: "8px 12px", color: T.t3, fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.slice(0, 5).map(p => {
                  const suggestedPrice = p.buyPrice * 1.05;
                  const daysSinceLastSale = p.lastSaleDate ? Math.floor((currentTime - p.lastSaleDate) / 86400000) : "180+";
                  return (
                    <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "12px", fontWeight: 600, color: T.t1 }}>{p.name}</td>
                      <td style={{ padding: "12px", color: T.t2 }}>{p.category}</td>
                      <td style={{ padding: "12px", color: T.t2, fontFamily: FONT.mono }}>{p.stock} {p.unit}</td>
                      <td style={{ padding: "12px", color: T.t2, fontFamily: FONT.mono }}>{fmt(p.buyPrice * p.stock)}</td>
                      <td style={{ padding: "12px", color: T.t2 }}>{daysSinceLastSale} days</td>
                      <td style={{ padding: "12px" }}>
                        <Btn size="xs" variant="danger" onClick={() => alert(`Flash sale price suggested: ${fmt(suggestedPrice)} (5% margin)`)}>Flash Sale -20%</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "New Sale", icon: "📤", page: "pos", color: T.amber },
          { label: "Add Purchase", icon: "📥", page: "inventory", color: T.sky },
          { label: "Manage Inventory", icon: "📦", page: "inventory", color: T.violet },
          { label: "View Reports", icon: "📊", page: "reports", color: T.emerald },
          { label: "Workshop", icon: "🔧", page: "workshop", color: "#FB923C" },
          { label: "Parties & Udhaar", icon: "👥", page: "parties", color: T.crimson },
        ].map(a => (
          <button key={a.label} onClick={() => onNavigate(a.page)} className="btn-hover" style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
            color: T.t1, fontFamily: FONT.ui, transition: "all 0.15s"
          }}>
            <span style={{ fontSize: 16 }}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* KPIs Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <StatCard label="Revenue" value={fmt(revenue)} icon="💰" color={T.amber} trend={revTrend} sub={`vs prev ${days}d: ${fmt(prevRev)}`} glow="amber" />
        <StatCard label="Profit" value={fmt(profit)} icon="📈" color={T.emerald} trend={profTrend} sub={`${pct(profit, revenue)} margin · prev: ${fmt(prevProf)}`} glow="emerald" />
        <StatCard label="Purchases" value={fmt(expenses)} icon="🛒" color={T.sky} trend={expTrend} sub={`${curPurch.length} entries · prev: ${fmt(prevExpenses)}`} />
        <StatCard label="Units Sold" value={fmtN(units)} icon="📦" color={T.violet} trend={unitsTrend} sub={`${curSales.length} txns · prev: ${fmtN(prevUnits)}`} />
        <StatCard label="Udhaar (Receivables)" value={fmt(pendingReceivables)} icon="📋" color={T.crimson} sub={`${creditCustomers} customers owe you`} glow={pendingReceivables > 0 ? "crimson" : undefined} />
        <StatCard label="Online Orders" value={String(pendingOrderCount)} icon="🌐" color={T.sky} sub={pendingOrderCount > 0 ? "Requires action" : "All clear"} glow={pendingOrderCount > 0 ? "sky" : undefined} />
      </div>

      {/* KPIs Row 2 - Inventory & Business Health */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatCard label="Inventory Value" value={fmt(invValue)} icon="📦" color={T.sky} sub="Total asset value (at cost)" />
        <StatCard label="Potential Profit" value={fmt(potProfit)} icon="🔮" color={T.emerald} sub="Expected on current stock" />
        <StatCard label="Dead Stock Value" value={fmt(deadStockValue)} icon="🛑" color={T.crimson} sub={`${deadStock.length} stagnant items`} glow={deadStockValue > 0 ? "crimson" : undefined} />
        <StatCard label="Workshop Revenue" value={fmt(workshopRevenue)} icon="🔧" color={T.violet} sub="Total from completed jobs" />
      </div>

      {/* ONLINE vs OFFLINE + GST SUMMARY */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Online vs Offline Sales Breakdown */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <span>📡</span> Sales Channel Breakdown
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ background: `${T.sky}12`, borderRadius: 10, padding: "14px 16px", border: `1px solid ${T.sky}22` }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>🌐 Online</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: FONT.mono, color: T.sky }}>{fmt(channelBreakdown.online.revenue)}</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{channelBreakdown.online.count} orders · Profit: {fmt(channelBreakdown.online.profit)}</div>
            </div>
            <div style={{ background: T.amberGlow, borderRadius: 10, padding: "14px 16px", border: `1px solid ${T.amber}22` }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>🏪 Offline</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: FONT.mono, color: T.amber }}>{fmt(channelBreakdown.offline.revenue)}</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{channelBreakdown.offline.count} sales · Profit: {fmt(channelBreakdown.offline.profit)}</div>
            </div>
          </div>
          {revenue > 0 && (
            <div style={{ height: 8, borderRadius: 4, background: T.surface, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(channelBreakdown.online.revenue / revenue) * 100}%`, background: T.sky, borderRadius: "4px 0 0 4px", transition: "width 0.3s" }} />
              <div style={{ flex: 1, background: T.amber, borderRadius: "0 4px 4px 0" }} />
            </div>
          )}
          {revenue > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>
              <span>Online: {((channelBreakdown.online.revenue / revenue) * 100).toFixed(0)}%</span>
              <span>Offline: {((channelBreakdown.offline.revenue / revenue) * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
        
        {/* GST SUMMARY */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <span>📝</span> Tax Summary (GST)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ background: T.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Output GST (Sales)</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{fmt(gst.output)}</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>Collected from customers</div>
            </div>
            <div style={{ background: T.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Input Tax Credit (ITC)</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{fmt(gst.input)}</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>Paid on purchases</div>
            </div>
          </div>
          <div style={{ background: gst.net >= 0 ? `${T.amber}14` : `${T.emerald}14`, border: `1px solid ${gst.net >= 0 ? T.amber : T.emerald}33`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: gst.net >= 0 ? T.amber : T.emerald, textTransform: "uppercase" }}>{gst.net >= 0 ? "Net GST Payable" : "Excess ITC (Carry Forward)"}</div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT.mono, color: T.t1 }}>{fmt(gst.net)}</div>
            </div>
            <Btn size="xs" variant={gst.net >= 0 ? "amber" : "emerald"} onClick={() => alert("GST portal filing integration coming soon!")}>View GST Report</Btn>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 12 }}>
        {/* Main Chart */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>📈</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>Performance Over Time</div>
            </div>
            <div style={{ display: "flex", background: T.surface, borderRadius: 8, padding: 3, border: `1px solid ${T.border}` }}>
              {["area", "bar"].map(m => (
                <button key={m} onClick={() => setChartMode(m)} style={{ background: chartMode === m ? T.border : "transparent", border: "none", color: chartMode === m ? T.t1 : T.t3, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "area" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.amber} stopOpacity={0.3} /><stop offset="95%" stopColor={T.amber} stopOpacity={0} /></linearGradient>
                    <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.emerald} stopOpacity={0.3} /><stop offset="95%" stopColor={T.emerald} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="date" stroke={T.t3} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={T.t3} fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="Revenue" stroke={T.amber} strokeWidth={3} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="Profit" stroke={T.emerald} strokeWidth={3} fill="url(#gProf)" />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="date" stroke={T.t3} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={T.t3} fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTip />} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                  <Bar dataKey="Revenue" fill={T.amber} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill={T.sky} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill={T.emerald} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
            <span>🏷️</span> Sales by Category
          </div>
          {catPie.length > 0 ? (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catPie} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {catPie.map((_, i) => <Cell key={i} fill={PIE_C[i % PIE_C.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 10 }}>
                {catPie.map((c, i) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_C[i % PIE_C.length] }} />
                    <span style={{ fontSize: 11, color: T.t2 }}>{c.name} ({pct(c.value, revenue)})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: T.t3, fontSize: 13 }}>No sales data for this period</div>
          )}
        </div>
      </div>

      {/* Profitability Analysis */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>💎</span>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>Profitability Analysis</div>
          </div>
          <div style={{ display: "flex", background: T.surface, borderRadius: 8, padding: 3, border: `1px solid ${T.border}` }}>
            {[["unit_profit", "Per Unit"], ["total_profit", "Total Profit"], ["margin", "Margin %"], ["revenue", "Revenue"]].map(([v, l]) => (
              <button key={v} onClick={() => setProfitView(v)} style={{ background: profitView === v ? T.border : "transparent", border: "none", color: profitView === v ? T.t1 : T.t3, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: "left" }}>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Buy</th>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Sell</th>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Sold</th>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Margin</th>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Profit (Net)</th>
                <th style={{ padding: "10px 12px", color: T.t3, fontSize: 11, fontWeight: 600 }}>Health Signal</th>
              </tr>
            </thead>
            <tbody>
              {sortedProds.slice(0, 8).map(p => {
                const sig = signal(p);
                return (
                  <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px", color: T.t1, fontWeight: 700, fontSize: 13 }}>{p.name}</td>
                    <td style={{ padding: "12px", color: T.t3, fontFamily: FONT.mono, fontSize: 12 }}>{fmt(p.buyPrice)}</td>
                    <td style={{ padding: "12px", color: T.t1, fontFamily: FONT.mono, fontSize: 13 }}>{fmt(p.sellPrice)}</td>
                    <td style={{ padding: "12px", color: T.t1, fontFamily: FONT.mono, fontWeight: 700 }}>{p.sold}</td>
                    <td style={{ padding: "12px", color: +p.mg > 20 ? T.emerald : T.amber, fontWeight: 800, fontFamily: FONT.mono }}>{p.mg}%</td>
                    <td style={{ padding: "12px", color: p.profP >= 0 ? T.emerald : T.crimson, fontWeight: 900, fontFamily: FONT.mono }}>{fmt(p.profP)}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: sig.color, fontWeight: 800, background: `${sig.color}14`, padding: "4px 8px", borderRadius: 6, width: "fit-content" }}>
                        <span>{sig.icon}</span>
                        <span>{sig.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { T, FONT } from "../theme";
import { fmt, fmtN, daysAgo, uid, normalizeOrderStatus } from "../utils";
import { StatCard, Badge, Btn, Modal } from "../components/ui";

const PIE_C = [T.amber, T.sky, T.emerald, T.violet, "#FB923C", "#F472B6"];

export default function AdminDashboard({ shops, products, orders, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [auditModal, setAuditModal] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Aggregate Metrics
  const totalGMV = useMemo(() => orders.reduce((s, o) => s + (o.total || 0), 0), [orders]);
  const totalOrders = orders.length;
  const activeShopsCount = shops.filter(s => s.isActive).length;
  const totalProducts = products.length;

  const shopStats = useMemo(() => {
    return shops.map(shop => {
      const shopOrders = orders.filter(o => o.shopId === shop.id);
      const revenue = shopOrders.reduce((s, o) => s + (o.total || 0), 0);
      const trustScore = 85 + (Math.random() * 14); // Simulated 85-99
      return { ...shop, orderCount: shopOrders.length, revenue, trustScore };
    });
  }, [shops, orders]);

  const recentOrders = useMemo(() => {
    return [...orders].sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 20);
  }, [orders]);

  const dailyGMV = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayOrders = orders.filter(o => {
        const od = new Date(o.time);
        return od.getDate() === d.getDate() && od.getMonth() === d.getMonth();
      });
      return { name: dayStr, gmv: dayOrders.reduce((s, o) => s + (o.total || 0), 0) };
    }).reverse();
    return last14Days;
  }, [orders]);

  const shopRevenueSplit = useMemo(() => {
    return shopStats.map(s => ({ name: s.name, value: s.revenue })).filter(s => s.value > 0);
  }, [shopStats]);

  const platformAlerts = useMemo(() => {
    const alerts = [];
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    shops.forEach(s => {
      const shopOrders = orders.filter(o => o.shopId === s.id && o.time > sevenDaysAgo);
      if (shopOrders.length === 0) {
        alerts.push({ type: "INACTIVE", shopName: s.name, message: "No orders in last 7 days" });
      }
    });
    shopStats.forEach(s => {
      if (s.trustScore < 90) {
        alerts.push({ type: "TRUST", shopName: s.name, message: `Trust score dipped to ${s.trustScore.toFixed(1)}` });
      }
    });
    return alerts;
  }, [shops, orders, shopStats]);

  const disputes = useMemo(() => {
    return orders.filter(o => normalizeOrderStatus(o.status) === "RETURN_REQUESTED");
  }, [orders]);

  const handleBroadcast = () => {
    const announcements = JSON.parse(localStorage.getItem("vl_announcements") || "[]");
    announcements.push({ id: uid(), text: announcement, time: Date.now() });
    localStorage.setItem("vl_announcements", JSON.stringify(announcements));
    setBroadcastModal(false);
    setAnnouncement("");
    alert("Announcement broadcasted!");
  };

  const exportReport = () => {
    const headers = ["Order ID", "Shop", "Customer", "Total", "Status", "Date"];
    const rows = orders.map(o => [
      o.id,
      shops.find(s => s.id === o.shopId)?.name || "Unknown",
      o.customerName || "Guest",
      o.total,
      o.status,
      new Date(o.time).toLocaleString()
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Platform_Report_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zHost: 9999, background: T.bg, color: T.t1, overflowY: "auto", padding: "40px 60px", fontFamily: FONT.ui }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em" }}>🛡️ Admin Control Center</h1>
            <Badge variant="violet" size="lg">Platform Admin</Badge>
          </div>
          <p style={{ color: T.t3, marginTop: 4, fontWeight: 600 }}>{new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</p>
        </div>
        <Btn variant="outline" onClick={onBack}>Exit Admin Mode</Btn>
      </header>

      {/* KPI ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
        <StatCard label="Total Platform GMV" value={fmt(totalGMV)} icon="💰" color={T.amber} trend="+12" glow="amber" />
        <StatCard label="Total Orders" value={fmtN(totalOrders)} icon="📦" color={T.sky} trend="+5" glow="sky" />
        <StatCard label="Active Shops" value={fmtN(activeShopsCount)} icon="🏪" color={T.emerald} />
        <StatCard label="Total Products Listed" value={fmtN(totalProducts)} icon="🏷️" color={T.violet} />
      </div>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 40 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Revenue Analytics (Last 14 Days)</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyGMV}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" stroke={T.t3} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={T.t3} fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} />
                <Bar dataKey="gmv" fill={T.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Revenue by Shop</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={shopRevenueSplit} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {shopRevenueSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_C[index % PIE_C.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SHOP MANAGEMENT */}
      <section style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Shop Management</h3>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
              <tr>
                {["Shop Name", "City", "Plan", "Status", "Orders", "Revenue", "Trust", "Actions"].map(h => (
                  <th key={h} style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shopStats.map(shop => (
                <tr key={shop.id} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                  <td style={{ padding: "16px 20px", fontWeight: 700 }}>{shop.name}</td>
                  <td style={{ padding: "16px 20px", color: T.t2 }}>{shop.city}</td>
                  <td style={{ padding: "16px 20px" }}><Badge variant="sky">PRO</Badge></td>
                  <td style={{ padding: "16px 20px" }}><Badge variant={shop.isActive ? "emerald" : "amber"}>{shop.isActive ? "ACTIVE" : "PENDING_KYC"}</Badge></td>
                  <td style={{ padding: "16px 20px", fontFamily: FONT.mono }}>{shop.orderCount}</td>
                  <td style={{ padding: "16px 20px", fontFamily: FONT.mono }}>{fmt(shop.revenue)}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: T.surface, borderRadius: 2 }}>
                        <div style={{ width: `${shop.trustScore}%`, height: "100%", background: T.emerald, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT.mono }}>{shop.trustScore.toFixed(0)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn size="xs" variant="outline">Suspend</Btn>
                      <Btn size="xs" variant="amber">Upgrade</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* DISPUTE QUEUE & ALERTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚖️</span> Dispute Queue
          </h3>
          {disputes.length === 0 ? (
            <p style={{ color: T.t3, textAlign: "center", padding: "40px 0" }}>No active disputes 🎉</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {disputes.map(d => (
                <div key={d.id} style={{ padding: 16, background: T.surface, borderRadius: 12, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>#{d.id}</span>
                    <Badge variant="crimson">Return Requested</Badge>
                  </div>
                  <p style={{ fontSize: 13, color: T.t2, marginBottom: 12 }}>Customer: {d.customerName} · Reason: {d.returnReason || "Not specified"}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn size="xs" variant="emerald">Approve Return</Btn>
                    <Btn size="xs" variant="outline">Reject</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span> Platform Alerts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {platformAlerts.map((alert, i) => (
              <div key={i} style={{ padding: 12, background: alert.type === "INACTIVE" ? `${T.amber}11` : `${T.crimson}11`, borderRadius: 10, border: `1px solid ${alert.type === "INACTIVE" ? T.amber : T.crimson}33`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{alert.type === "INACTIVE" ? "⌛" : "📉"}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{alert.shopName}</div>
                  <div style={{ fontSize: 12, color: T.t3 }}>{alert.message}</div>
                </div>
              </div>
            ))}
            {platformAlerts.length === 0 && <p style={{ color: T.t3, textAlign: "center", padding: "40px 0" }}>All systems nominal</p>}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS FOOTER */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginRight: 12 }}>Quick Actions:</h3>
        <Btn variant="violet" onClick={() => setBroadcastModal(true)}>📣 Broadcast Announcement</Btn>
        <Btn variant="sky" onClick={exportReport}>📥 Export Platform Report</Btn>
        <Btn variant="outline" onClick={() => setAuditModal(true)}>📜 View Audit Log</Btn>
      </div>

      {/* MODALS */}
      <Modal open={broadcastModal} onClose={() => setBroadcastModal(false)} title="Broadcast Announcement">
        <div style={{ padding: "20px 0" }}>
          <textarea
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            placeholder="Enter announcement text for all shop owners..."
            style={{ width: "100%", height: 120, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, color: T.t1, fontFamily: FONT.ui, resize: "none", marginBottom: 20 }}
          />
          <Btn block variant="violet" onClick={handleBroadcast}>Send to All Shops</Btn>
        </div>
      </Modal>

      <Modal open={auditModal} onClose={() => setAuditModal(false)} title="Platform Audit Log">
        <div style={{ maxHeight: 400, overflowY: "auto", padding: "10px 0" }}>
          {/* Simulation of audit logs */}
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: T.sky }}>SHOP_UPGRADED</span>
                <span style={{ color: T.t3, fontSize: 11 }}>{daysAgo(Date.now() - i * 3600000)}</span>
              </div>
              <p style={{ color: T.t2 }}>Shop "National Spares" upgraded to PRO plan by Admin.</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

import { useState, useMemo, useCallback, useEffect } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate, fmtDateTime, uid } from "../utils";
import { getNextVoucherNumber } from "../voucherNumbering";
import { Modal, Field, Input, Select, Divider, Btn, EmptyState } from "../components/ui";

const LS_SO = "vl_sales_orders";
const LS_DN = "vl_delivery_notes";

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

const SO_STATUSES = ["Draft", "Confirmed", "Invoiced"];
const DN_STATUSES = ["Draft", "Dispatched", "Invoiced"];

const statusColors = {
  Draft: { bg: "rgba(100,116,139,0.12)", color: T.t3 },
  Confirmed: { bg: "rgba(56,189,248,0.12)", color: T.sky },
  Dispatched: { bg: "rgba(245,158,11,0.12)", color: T.amber },
  Invoiced: { bg: "rgba(16,185,129,0.12)", color: T.emerald },
};

function StatusBadge({ status }) {
  const s = statusColors[status] || statusColors.Draft;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.03em" }}>{status}</span>
  );
}

function ItemsEditor({ items, setItems, products }) {
  const [search, setSearch] = useState("");
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter(p => [p.name, p.sku, p.brand, p.category].some(s => (s || "").toLowerCase().includes(q)) && !items.some(i => i.productId === p.id)).slice(0, 6);
  }, [search, products, items]);

  const addItem = (p) => {
    setItems(prev => [...prev, { productId: p.id, name: p.name, sku: p.sku || "", image: p.image || "📦", qty: 1, rate: p.sellPrice, gstRate: p.gstRate || 18, buyPrice: p.buyPrice, stock: p.stock }]);
    setSearch("");
  };
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search products to add..."
          style={{ width: "100%", padding: "10px 14px", background: T.surface, border: `1px solid ${search ? T.amber : T.border}`, borderRadius: 10, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none" }} />
        {results.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, marginTop: 4, zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,0.4)", maxHeight: 240, overflowY: "auto" }}>
            {results.map(p => (
              <button key={p.id} onClick={() => addItem(p)} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`, color: T.t1, cursor: "pointer", textAlign: "left", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }} className="row-hover">
                <span style={{ fontSize: 18 }}>{p.image}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{p.sku} · Stock: {p.stock}</div>
                </div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.amber, fontSize: 13 }}>{fmt(p.sellPrice)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: T.t3, fontSize: 13, background: T.surface, borderRadius: 10, border: `1px dashed ${T.border}` }}>No items added yet. Search above to add products.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["#", "Product", "Qty", "Rate (₹)", "GST%", "Total", ""].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const subtotal = item.rate * item.qty;
              const gst = (subtotal * item.gstRate) / (100 + item.gstRate);
              return (
                <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "8px 10px", color: T.t4, fontFamily: FONT.mono, fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{item.image}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono }}>{item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "8px 6px", width: 70 }}>
                    <input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, "qty", Math.max(1, +e.target.value || 1))}
                      style={{ width: 60, padding: "6px 8px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, color: T.t1, fontSize: 13, fontFamily: FONT.mono, textAlign: "center", outline: "none" }} />
                  </td>
                  <td style={{ padding: "8px 6px", width: 100 }}>
                    <input type="number" min={0} value={item.rate} onChange={e => updateItem(idx, "rate", +e.target.value || 0)}
                      style={{ width: 90, padding: "6px 8px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, color: T.t1, fontSize: 13, fontFamily: FONT.mono, textAlign: "right", outline: "none" }} />
                  </td>
                  <td style={{ padding: "8px 10px", fontFamily: FONT.mono, fontSize: 12, color: T.t3 }}>{item.gstRate}%</td>
                  <td style={{ padding: "8px 10px", fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: T.t1 }}>{fmt(subtotal)}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <button onClick={() => removeItem(idx)} style={{ background: T.crimsonBg, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: T.crimson, fontSize: 12, fontWeight: 800 }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {items.length > 0 && (() => {
        const sub = items.reduce((s, i) => s + i.rate * i.qty, 0);
        const gst = items.reduce((s, i) => s + (i.rate * i.qty * i.gstRate) / (100 + i.gstRate), 0);
        return (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 4 }}><span>Subtotal</span><span style={{ fontFamily: FONT.mono }}>{fmt(sub)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 6 }}><span>GST (incl.)</span><span style={{ fontFamily: FONT.mono }}>{fmt(gst)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900, color: T.t1, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}><span>Total</span><span style={{ fontFamily: FONT.mono }}>{fmt(sub)}</span></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const LS_RI = "vl_recurring_invoices";

const RECURRENCE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
];

const RECURRENCE_DAYS = { monthly: 30, quarterly: 90, half_yearly: 182, yearly: 365 };

function RecurringInvoicesList({ invoices, onEdit, onDelete, onToggle, onGenerateNow }) {
  if (invoices.length === 0) return (
    <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No Recurring Invoices</div>
      <div style={{ fontSize: 13, color: T.t3 }}>Set up automatic invoice generation for regular customers</div>
    </div>
  );

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            {["Customer", "Items", "Amount", "Recurrence", "Next Due", "Last Generated", "Status", "Actions"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.sort((a, b) => b.createdAt - a.createdAt).map(ri => {
            const total = (ri.items || []).reduce((s, i) => s + i.rate * i.qty, 0);
            const nextDue = ri.lastGeneratedDate
              ? ri.lastGeneratedDate + (RECURRENCE_DAYS[ri.recurrence] || 30) * 86400000
              : ri.startDate || ri.createdAt;
            const isOverdue = ri.isActive && nextDue <= Date.now();
            const isPastEnd = ri.endDate && Date.now() > ri.endDate;
            return (
              <tr key={ri.id} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.t1 }}>{ri.customerName || "—"}</div>
                  {ri.customerPhone && <div style={{ fontSize: 11, color: T.t3 }}>{ri.customerPhone}</div>}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, color: T.t2 }}>{(ri.items || []).length} item{(ri.items || []).length !== 1 ? "s" : ""}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: T.amber }}>{fmt(total)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: `${T.violet}18`, color: T.violet, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    {RECURRENCE_OPTIONS.find(r => r.value === ri.recurrence)?.label || ri.recurrence}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: FONT.mono, color: isOverdue ? T.crimson : T.t2, fontWeight: isOverdue ? 800 : 400 }}>
                  {isPastEnd ? "Ended" : fmtDate(nextDue)}
                  {isOverdue && <span style={{ fontSize: 10, color: T.crimson, display: "block" }}>OVERDUE</span>}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: T.t3 }}>
                  {ri.lastGeneratedDate ? fmtDate(ri.lastGeneratedDate) : "Never"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
                    background: ri.isActive && !isPastEnd ? `${T.emerald}18` : `${T.t3}18`,
                    color: ri.isActive && !isPastEnd ? T.emerald : T.t3,
                  }}>
                    {isPastEnd ? "Expired" : ri.isActive ? "Active" : "Paused"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {ri.isActive && !isPastEnd && (
                      <Btn size="sm" variant="amber" onClick={() => onGenerateNow(ri)}>🧾 Generate</Btn>
                    )}
                    <Btn size="sm" variant="ghost" onClick={() => onEdit(ri)}>✏️</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => onToggle(ri.id)}>
                      {ri.isActive ? "⏸" : "▶️"}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => onDelete(ri.id)} style={{ color: T.crimson }}>🗑</Btn>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecurringInvoiceModal({ open, ri, products, parties, activeShopId, onSave, onClose }) {
  const isEdit = !!ri;
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([]);
  const [recurrence, setRecurrence] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (ri) {
      setCustomerName(ri.customerName || "");
      setCustomerPhone(ri.customerPhone || "");
      setItems(ri.items || []);
      setRecurrence(ri.recurrence || "monthly");
      setStartDate(ri.startDate ? new Date(ri.startDate).toISOString().split("T")[0] : "");
      setEndDate(ri.endDate ? new Date(ri.endDate).toISOString().split("T")[0] : "");
      setNotes(ri.notes || "");
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setItems([]);
      setRecurrence("monthly");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setNotes("");
    }
  }, [ri, open]);

  const shopParties = useMemo(() => (parties || []).filter(p => p.shopId === activeShopId && (p.type === "customer" || p.type === "both")), [parties, activeShopId]);

  const handleSave = () => {
    if (!customerName.trim() || items.length === 0) return;
    onSave({
      id: ri?.id || "ri_" + uid(),
      shopId: activeShopId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items,
      recurrence,
      startDate: startDate ? new Date(startDate).getTime() : Date.now(),
      endDate: endDate ? new Date(endDate).getTime() : null,
      lastGeneratedDate: ri?.lastGeneratedDate || null,
      isActive: ri?.isActive ?? true,
      notes,
      createdAt: ri?.createdAt || Date.now(),
    });
    onClose();
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Recurring Invoice" : "New Recurring Invoice"} width={700}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Field label="Customer Name *">
          <div style={{ position: "relative" }}>
            <Input value={customerName} onChange={setCustomerName} placeholder="Customer name" />
            {customerName && shopParties.filter(p => p.name.toLowerCase().includes(customerName.toLowerCase()) && p.name !== customerName).length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 2, zIndex: 100, maxHeight: 150, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {shopParties.filter(p => p.name.toLowerCase().includes(customerName.toLowerCase()) && p.name !== customerName).slice(0, 5).map(p => (
                  <button key={p.id} onClick={() => { setCustomerName(p.name); setCustomerPhone(p.phone || ""); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`, color: T.t1, cursor: "pointer", textAlign: "left", fontSize: 13, fontFamily: FONT.ui }} className="row-hover">
                    {p.name} {p.phone && <span style={{ color: T.t3, fontSize: 11 }}>· {p.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        <Field label="Phone">
          <Input value={customerPhone} onChange={setCustomerPhone} placeholder="Phone number" />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Field label="Recurrence *">
          <Select value={recurrence} onChange={setRecurrence} options={RECURRENCE_OPTIONS} />
        </Field>
        <Field label="Start Date">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
        </Field>
        <Field label="End Date (optional)">
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
        </Field>
      </div>

      <Field label="Items *">
        <ItemsEditor items={items} setItems={setItems} products={products} />
      </Field>

      <Field label="Notes">
        <Input value={notes} onChange={setNotes} placeholder="Optional notes for this recurring invoice" />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="amber" onClick={handleSave} disabled={!customerName.trim() || items.length === 0}>
          {isEdit ? "💾 Update" : "＋ Create"} Recurring Invoice
        </Btn>
      </div>
    </Modal>
  );
}

export function SalesDocumentsPage({ products, movements, activeShopId, onMultiSale, saveProducts, saveMovements, toast, parties }) {
  const shopProducts = useMemo(() => (products || []).filter(p => p.shopId === activeShopId && p.isActive !== false), [products, activeShopId]);
  const [tab, setTab] = useState("orders");
  const [salesOrders, setSalesOrders] = useState(() => loadLS(LS_SO));
  const [deliveryNotes, setDeliveryNotes] = useState(() => loadLS(LS_DN));
  const [recurringInvoices, setRecurringInvoices] = useState(() => loadLS(LS_RI));
  const [showSOModal, setShowSOModal] = useState(false);
  const [showDNModal, setShowDNModal] = useState(false);
  const [showRIModal, setShowRIModal] = useState(false);
  const [editSO, setEditSO] = useState(null);
  const [editDN, setEditDN] = useState(null);
  const [editRI, setEditRI] = useState(null);
  const [viewSO, setViewSO] = useState(null);
  const [viewDN, setViewDN] = useState(null);

  const persistSO = useCallback((data) => { setSalesOrders(data); saveLS(LS_SO, data); }, []);
  const persistDN = useCallback((data) => { setDeliveryNotes(data); saveLS(LS_DN, data); }, []);
  const persistRI = useCallback((data) => { setRecurringInvoices(data); saveLS(LS_RI, data); }, []);

  const estimates = useMemo(() => (movements || []).filter(m => m.shopId === activeShopId && m.type === "ESTIMATE"), [movements, activeShopId]);

  const shopSOs = useMemo(() => salesOrders.filter(so => so.shopId === activeShopId), [salesOrders, activeShopId]);
  const shopDNs = useMemo(() => deliveryNotes.filter(dn => dn.shopId === activeShopId), [deliveryNotes, activeShopId]);

  const saveSO = useCallback((so) => {
    const exists = salesOrders.find(x => x.id === so.id);
    const next = exists ? salesOrders.map(x => x.id === so.id ? so : x) : [...salesOrders, so];
    persistSO(next);
    toast?.(exists ? "Sales Order updated" : "Sales Order created", "success");
  }, [salesOrders, persistSO, toast]);

  const saveDN = useCallback((dn) => {
    const exists = deliveryNotes.find(x => x.id === dn.id);
    const next = exists ? deliveryNotes.map(x => x.id === dn.id ? dn : x) : [...deliveryNotes, dn];
    persistDN(next);
    toast?.(exists ? "Delivery Note updated" : "Delivery Note created", "success");
  }, [deliveryNotes, persistDN, toast]);

  const confirmSO = useCallback((soId) => {
    persistSO(salesOrders.map(x => x.id === soId ? { ...x, status: "Confirmed", confirmedAt: Date.now() } : x));
    toast?.("Sales Order confirmed", "success");
  }, [salesOrders, persistSO, toast]);

  const createDNFromSO = useCallback((so) => {
    const dnNo = getNextVoucherNumber("DN");
    const dn = {
      id: "dn_" + uid(),
      shopId: activeShopId,
      dnNumber: dnNo,
      soId: so.id,
      soNumber: so.soNumber,
      customerName: so.customerName,
      customerPhone: so.customerPhone,
      address: so.address || "",
      items: so.items.map(i => ({ ...i, dispatched: i.qty })),
      status: "Draft",
      createdAt: Date.now(),
      notes: `Delivery against ${so.soNumber}`,
    };
    saveDN(dn);
    setShowDNModal(false);
    setTab("delivery");
    toast?.(`Delivery Note ${dnNo} created from ${so.soNumber}`, "info");
  }, [activeShopId, saveDN, toast]);

  const dispatchDN = useCallback((dnId) => {
    const dn = deliveryNotes.find(x => x.id === dnId);
    if (!dn) return;
    let updatedProducts = [...products];
    dn.items.forEach(item => {
      updatedProducts = updatedProducts.map(p => p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.dispatched) } : p);
    });
    saveProducts(updatedProducts);

    const stockMvts = dn.items.map(item => ({
      id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
      type: "DELIVERY_NOTE", qty: item.dispatched, unitPrice: item.rate, sellingPrice: item.rate,
      total: item.rate * item.dispatched, gstAmount: (item.rate * item.dispatched * (item.gstRate || 18)) / (100 + (item.gstRate || 18)),
      profit: 0, customerName: dn.customerName, invoiceNo: dn.dnNumber,
      payment: "Pending", paymentMode: "Pending", paymentStatus: "pending",
      note: `Delivery Note: ${dn.dnNumber}${dn.soNumber ? ` (SO: ${dn.soNumber})` : ""}`,
      date: Date.now(), deliveryNoteMeta: { dnId: dn.id, soId: dn.soId },
    }));
    saveMovements([...movements, ...stockMvts]);
    persistDN(deliveryNotes.map(x => x.id === dnId ? { ...x, status: "Dispatched", dispatchedAt: Date.now() } : x));
    toast?.(`Delivery Note dispatched — stock updated for ${dn.items.length} item(s)`, "success");
  }, [deliveryNotes, products, movements, saveProducts, saveMovements, persistDN, activeShopId, toast]);

  const convertToInvoice = useCallback((source, type) => {
    if (!onMultiSale) { toast?.("Invoice conversion not available", "warning"); return; }
    const inv = getNextVoucherNumber("SALE");
    const invoiceItems = source.items.map(item => ({
      productId: item.productId,
      name: item.name,
      qty: type === "DN" ? (item.dispatched || item.qty) : item.qty,
      sellPrice: item.rate,
      buyPrice: item.buyPrice || 0,
      discount: 0,
      total: item.rate * (type === "DN" ? (item.dispatched || item.qty) : item.qty),
      gstAmount: (item.rate * (type === "DN" ? (item.dispatched || item.qty) : item.qty) * (item.gstRate || 18)) / (100 + (item.gstRate || 18)),
      profit: ((item.rate - (item.buyPrice || 0)) * (type === "DN" ? (item.dispatched || item.qty) : item.qty)),
      gstRate: item.gstRate || 18,
    }));

    const grandTotal = invoiceItems.reduce((s, i) => s + i.total, 0);
    const grandGst = invoiceItems.reduce((s, i) => s + i.gstAmount, 0);
    const grandProfit = invoiceItems.reduce((s, i) => s + i.profit, 0);

    const skipStockUpdate = type === "DN";

    if (type === "SO") {
      onMultiSale({
        type: "Sale",
        invoiceNo: inv,
        items: invoiceItems,
        customerName: source.customerName || "",
        customerPhone: source.customerPhone || "",
        vehicleReg: "",
        mechanic: "",
        notes: `Converted from ${source.soNumber || source.dnNumber}`,
        payments: { Cash: grandTotal },
        paymentMode: "Cash",
        subtotal: grandTotal,
        discount: 0,
        total: grandTotal,
        gstAmount: grandGst,
        profit: grandProfit,
        date: Date.now(),
      });
      persistSO(salesOrders.map(x => x.id === source.id ? { ...x, status: "Invoiced", invoiceNo: inv, invoicedAt: Date.now() } : x));
    } else {
      if (!skipStockUpdate) {
        onMultiSale({
          type: "Sale",
          invoiceNo: inv,
          items: invoiceItems,
          customerName: source.customerName || "",
          customerPhone: source.customerPhone || "",
          vehicleReg: "",
          mechanic: "",
          notes: `Converted from ${source.dnNumber}`,
          payments: { Cash: grandTotal },
          paymentMode: "Cash",
          subtotal: grandTotal,
          discount: 0,
          total: grandTotal,
          gstAmount: grandGst,
          profit: grandProfit,
          date: Date.now(),
        });
      } else {
        const receiptMvts = invoiceItems.map(item => ({
          id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
          type: "SALE", qty: item.qty, unitPrice: item.sellPrice, sellingPrice: item.sellPrice,
          total: item.total, gstAmount: item.gstAmount, profit: item.profit,
          customerName: source.customerName, invoiceNo: inv,
          payment: "Cash", paymentMode: "Cash", paymentStatus: "paid",
          note: `Invoice from DN ${source.dnNumber}`, date: Date.now(),
          multiItemInvoice: true, skipStockUpdate: true,
        }));
        saveMovements([...movements, ...receiptMvts]);
      }
      persistDN(deliveryNotes.map(x => x.id === source.id ? { ...x, status: "Invoiced", invoiceNo: inv, invoicedAt: Date.now() } : x));
    }

    toast?.(`Converted to Invoice ${inv}`, "success", "Invoice Created");
    setViewSO(null);
    setViewDN(null);
  }, [onMultiSale, salesOrders, deliveryNotes, movements, saveMovements, persistSO, persistDN, activeShopId, toast]);

  const deleteSO = useCallback((id) => {
    persistSO(salesOrders.filter(x => x.id !== id));
    toast?.("Sales Order deleted", "warning");
    setViewSO(null);
  }, [salesOrders, persistSO, toast]);

  const deleteDN = useCallback((id) => {
    persistDN(deliveryNotes.filter(x => x.id !== id));
    toast?.("Delivery Note deleted", "warning");
    setViewDN(null);
  }, [deliveryNotes, persistDN, toast]);

  const shopRIs = useMemo(() => recurringInvoices.filter(ri => ri.shopId === activeShopId), [recurringInvoices, activeShopId]);

  const saveRI = useCallback((ri) => {
    const exists = recurringInvoices.find(x => x.id === ri.id);
    const next = exists ? recurringInvoices.map(x => x.id === ri.id ? ri : x) : [...recurringInvoices, ri];
    persistRI(next);
    toast?.(exists ? "Recurring invoice updated" : "Recurring invoice created", "success");
  }, [recurringInvoices, persistRI, toast]);

  const deleteRI = useCallback((id) => {
    persistRI(recurringInvoices.filter(x => x.id !== id));
    toast?.("Recurring invoice deleted", "warning");
  }, [recurringInvoices, persistRI, toast]);

  const toggleRI = useCallback((id) => {
    const ri = recurringInvoices.find(x => x.id === id);
    if (!ri) return;
    persistRI(recurringInvoices.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
    toast?.(ri.isActive ? "Recurring invoice paused" : "Recurring invoice activated", "info");
  }, [recurringInvoices, persistRI, toast]);

  const generateRecurringInvoice = useCallback((ri) => {
    if (!onMultiSale) { toast?.("Invoice generation not available", "warning"); return; }
    const inv = getNextVoucherNumber("SALE");
    const invoiceItems = (ri.items || []).map(item => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      sellPrice: item.rate,
      buyPrice: item.buyPrice || 0,
      discount: 0,
      total: item.rate * item.qty,
      gstAmount: (item.rate * item.qty * (item.gstRate || 18)) / (100 + (item.gstRate || 18)),
      profit: (item.rate - (item.buyPrice || 0)) * item.qty,
      gstRate: item.gstRate || 18,
    }));
    const grandTotal = invoiceItems.reduce((s, i) => s + i.total, 0);
    const grandGst = invoiceItems.reduce((s, i) => s + i.gstAmount, 0);
    const grandProfit = invoiceItems.reduce((s, i) => s + i.profit, 0);

    onMultiSale({
      type: "Sale",
      invoiceNo: inv,
      items: invoiceItems,
      customerName: ri.customerName || "",
      customerPhone: ri.customerPhone || "",
      vehicleReg: "",
      mechanic: "",
      notes: `Auto-generated recurring invoice`,
      payments: { Cash: grandTotal },
      paymentMode: "Cash",
      subtotal: grandTotal,
      discount: 0,
      total: grandTotal,
      gstAmount: grandGst,
      profit: grandProfit,
      date: Date.now(),
    });

    persistRI(recurringInvoices.map(x => x.id === ri.id ? { ...x, lastGeneratedDate: Date.now() } : x));
    toast?.(`Recurring invoice generated: ${inv} for ${ri.customerName}`, "success");
  }, [onMultiSale, recurringInvoices, persistRI, toast]);

  const tabs = [
    { key: "orders", label: "Sales Orders", icon: "📋", count: shopSOs.length },
    { key: "delivery", label: "Delivery Notes", icon: "🚚", count: shopDNs.length },
    { key: "estimates", label: "Estimates", icon: "📝", count: estimates.length },
    { key: "recurring", label: "Recurring", icon: "🔄", count: shopRIs.filter(r => r.isActive).length },
  ];

  return (
    <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>📋 Sales Documents</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Sales Orders, Delivery Notes & Estimates</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "orders" && <Btn variant="amber" onClick={() => { setEditSO(null); setShowSOModal(true); }}>＋ New Sales Order</Btn>}
          {tab === "delivery" && <Btn variant="amber" onClick={() => { setEditDN(null); setShowDNModal(true); }}>＋ New Delivery Note</Btn>}
          {tab === "recurring" && <Btn variant="amber" onClick={() => { setEditRI(null); setShowRIModal(true); }}>＋ New Recurring Invoice</Btn>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: T.surface, padding: 4, borderRadius: 10, alignSelf: "flex-start" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 700, fontFamily: FONT.ui, fontSize: 13, cursor: "pointer",
            background: tab === t.key ? T.amber : "transparent", color: tab === t.key ? "#000" : T.t3,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>{t.icon}</span>{t.label}
            {t.count > 0 && <span style={{ background: tab === t.key ? "rgba(0,0,0,0.15)" : T.card, fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 800 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "orders" && <SOList salesOrders={shopSOs} onView={setViewSO} onConfirm={confirmSO} onConvert={(so) => convertToInvoice(so, "SO")} onCreateDN={createDNFromSO} />}
      {tab === "delivery" && <DNList deliveryNotes={shopDNs} onView={setViewDN} onDispatch={dispatchDN} onConvert={(dn) => convertToInvoice(dn, "DN")} />}
      {tab === "estimates" && <EstimatesList estimates={estimates} />}
      {tab === "recurring" && <RecurringInvoicesList invoices={shopRIs} onEdit={(ri) => { setEditRI(ri); setShowRIModal(true); }} onDelete={deleteRI} onToggle={toggleRI} onGenerateNow={generateRecurringInvoice} />}

      {showSOModal && <SOModal products={shopProducts} so={editSO} activeShopId={activeShopId} onSave={saveSO} onClose={() => setShowSOModal(false)} />}
      {showDNModal && <DNModal products={shopProducts} dn={editDN} activeShopId={activeShopId} salesOrders={shopSOs.filter(s => s.status === "Confirmed")} onSave={saveDN} onCreateFromSO={createDNFromSO} onClose={() => setShowDNModal(false)} />}
      {showRIModal && <RecurringInvoiceModal open={showRIModal} ri={editRI} products={shopProducts} parties={parties} activeShopId={activeShopId} onSave={saveRI} onClose={() => { setShowRIModal(false); setEditRI(null); }} />}

      {viewSO && <SODetail so={viewSO} onClose={() => setViewSO(null)} onConfirm={confirmSO} onConvert={(so) => convertToInvoice(so, "SO")} onCreateDN={createDNFromSO} onDelete={deleteSO} />}
      {viewDN && <DNDetail dn={viewDN} onClose={() => setViewDN(null)} onDispatch={dispatchDN} onConvert={(dn) => convertToInvoice(dn, "DN")} onDelete={deleteDN} />}
    </div>
  );
}

function SOList({ salesOrders, onView, onConfirm, onConvert, onCreateDN }) {
  if (salesOrders.length === 0) return (
    <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No Sales Orders yet</div>
      <div style={{ fontSize: 13, color: T.t3 }}>Create your first Sales Order to start the workflow</div>
    </div>
  );

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            {["SO Number", "Customer", "Items", "Total", "Expected Date", "Status", "Actions"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {salesOrders.sort((a, b) => b.createdAt - a.createdAt).map(so => {
            const total = so.items.reduce((s, i) => s + i.rate * i.qty, 0);
            return (
              <tr key={so.id} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }} className="row-hover" onClick={() => onView(so)}>
                <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: T.amber }}>{so.soNumber}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{so.customerName || "—"}</div>
                  {so.customerPhone && <div style={{ fontSize: 11, color: T.t3 }}>{so.customerPhone}</div>}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 13, color: T.t2 }}>{so.items.length} item{so.items.length > 1 ? "s" : ""}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>{fmt(total)}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: T.t3 }}>{so.expectedDate ? fmtDate(so.expectedDate) : "—"}</td>
                <td style={{ padding: "10px 14px" }}><StatusBadge status={so.status} /></td>
                <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {so.status === "Draft" && <Btn size="sm" variant="ghost" onClick={() => onConfirm(so.id)}>✓ Confirm</Btn>}
                    {so.status === "Confirmed" && <Btn size="sm" variant="ghost" onClick={() => onCreateDN(so)}>🚚 DN</Btn>}
                    {(so.status === "Confirmed" || so.status === "Draft") && <Btn size="sm" variant="amber" onClick={() => onConvert(so)}>🧾 Invoice</Btn>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DNList({ deliveryNotes, onView, onDispatch, onConvert }) {
  if (deliveryNotes.length === 0) return (
    <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚚</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No Delivery Notes yet</div>
      <div style={{ fontSize: 13, color: T.t3 }}>Create a Delivery Note to dispatch stock</div>
    </div>
  );

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            {["DN Number", "Customer", "SO Ref", "Items", "Total", "Status", "Actions"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deliveryNotes.sort((a, b) => b.createdAt - a.createdAt).map(dn => {
            const total = dn.items.reduce((s, i) => s + i.rate * (i.dispatched || i.qty), 0);
            return (
              <tr key={dn.id} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }} className="row-hover" onClick={() => onView(dn)}>
                <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: T.sky }}>{dn.dnNumber}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13 }}>{dn.customerName || "—"}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t3 }}>{dn.soNumber || "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, color: T.t2 }}>{dn.items.length} item{dn.items.length > 1 ? "s" : ""}</td>
                <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>{fmt(total)}</td>
                <td style={{ padding: "10px 14px" }}><StatusBadge status={dn.status} /></td>
                <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {dn.status === "Draft" && <Btn size="sm" variant="amber" onClick={() => onDispatch(dn.id)}>📦 Dispatch</Btn>}
                    {dn.status === "Dispatched" && <Btn size="sm" variant="amber" onClick={() => onConvert(dn)}>🧾 Invoice</Btn>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EstimatesList({ estimates }) {
  if (estimates.length === 0) return (
    <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No Estimates yet</div>
      <div style={{ fontSize: 13, color: T.t3 }}>Estimates created from POS Billing will appear here</div>
    </div>
  );

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            {["Invoice#", "Customer", "Product", "Qty", "Total", "Date"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: T.t3, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {estimates.sort((a, b) => b.date - a.date).map(est => (
            <tr key={est.id} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: T.violet }}>{est.invoiceNo || "—"}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 13 }}>{est.customerName || "Walk-in"}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, color: T.t2 }}>{est.productName}</td>
              <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontSize: 13 }}>{est.qty}</td>
              <td style={{ padding: "10px 14px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>{fmt(est.total)}</td>
              <td style={{ padding: "10px 14px", fontSize: 12, color: T.t3 }}>{fmtDate(est.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SOModal({ products, so, activeShopId, onSave, onClose }) {
  const [customerName, setCustomerName] = useState(so?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(so?.customerPhone || "");
  const [address, setAddress] = useState(so?.address || "");
  const [expectedDate, setExpectedDate] = useState(so?.expectedDate ? new Date(so.expectedDate).toISOString().split("T")[0] : "");
  const [notes, setNotes] = useState(so?.notes || "");
  const [items, setItems] = useState(so?.items || []);

  const handleSave = () => {
    if (items.length === 0) return;
    const soNumber = so?.soNumber || getNextVoucherNumber("SO");
    onSave({
      id: so?.id || "so_" + uid(),
      shopId: activeShopId,
      soNumber,
      customerName,
      customerPhone,
      address,
      expectedDate: expectedDate ? new Date(expectedDate).getTime() : null,
      notes,
      items,
      status: so?.status || "Draft",
      createdAt: so?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="modal-in" style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 700, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>{so ? "Edit Sales Order" : "New Sales Order"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Customer Name *</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name"
              style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Phone</label>
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number"
              style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Delivery Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address"
              style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Expected Delivery Date</label>
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Order notes..." rows={2}
            style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Line Items</div>
        <ItemsEditor items={items} setItems={setItems} products={products} />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="amber" onClick={handleSave} disabled={items.length === 0}>💾 {so ? "Update" : "Create"} Sales Order</Btn>
        </div>
      </div>
    </div>
  );
}

function DNModal({ products, dn, activeShopId, salesOrders, onSave, onCreateFromSO, onClose }) {
  const [mode, setMode] = useState("manual");
  const [customerName, setCustomerName] = useState(dn?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(dn?.customerPhone || "");
  const [address, setAddress] = useState(dn?.address || "");
  const [notes, setNotes] = useState(dn?.notes || "");
  const [items, setItems] = useState(dn?.items || []);

  const handleSave = () => {
    if (items.length === 0) return;
    const dnNumber = dn?.dnNumber || getNextVoucherNumber("DN");
    onSave({
      id: dn?.id || "dn_" + uid(),
      shopId: activeShopId,
      dnNumber,
      soId: dn?.soId || null,
      soNumber: dn?.soNumber || null,
      customerName,
      customerPhone,
      address,
      notes,
      items: items.map(i => ({ ...i, dispatched: i.dispatched || i.qty })),
      status: dn?.status || "Draft",
      createdAt: dn?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="modal-in" style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 700, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>{dn ? "Edit Delivery Note" : "New Delivery Note"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {!dn && salesOrders.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, background: T.surface, padding: 4, borderRadius: 8, marginBottom: 12, alignSelf: "flex-start" }}>
              <button onClick={() => setMode("manual")} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: FONT.ui, background: mode === "manual" ? T.amber : "transparent", color: mode === "manual" ? "#000" : T.t3 }}>Manual Entry</button>
              <button onClick={() => setMode("fromSO")} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: FONT.ui, background: mode === "fromSO" ? T.sky : "transparent", color: mode === "fromSO" ? "#000" : T.t3 }}>From Sales Order</button>
            </div>

            {mode === "fromSO" && (
              <div style={{ background: T.surface, borderRadius: 10, padding: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 8 }}>Select a confirmed Sales Order:</div>
                {salesOrders.map(so => {
                  const total = so.items.reduce((s, i) => s + i.rate * i.qty, 0);
                  return (
                    <button key={so.id} onClick={() => { onCreateFromSO(so); onClose(); }} style={{ width: "100%", padding: "10px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", textAlign: "left", fontFamily: FONT.ui, display: "flex", justifyContent: "space-between", alignItems: "center" }} className="row-hover">
                      <div>
                        <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.amber, fontSize: 13 }}>{so.soNumber}</span>
                        <span style={{ marginLeft: 8, color: T.t2, fontSize: 13 }}>{so.customerName}</span>
                      </div>
                      <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>{fmt(total)} · {so.items.length} items</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(mode === "manual" || dn) && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Customer Name</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name"
                  style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Phone</label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone"
                  style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Delivery address"
                  style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivery notes..." rows={2}
                style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Items to Dispatch</div>
            <ItemsEditor items={items} setItems={setItems} products={products} />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
              <Btn variant="amber" onClick={handleSave} disabled={items.length === 0}>💾 {dn ? "Update" : "Create"} Delivery Note</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SODetail({ so, onClose, onConfirm, onConvert, onCreateDN, onDelete }) {
  const total = so.items.reduce((s, i) => s + i.rate * i.qty, 0);
  const gst = so.items.reduce((s, i) => s + (i.rate * i.qty * (i.gstRate || 18)) / (100 + (i.gstRate || 18)), 0);

  return (
    <div className="backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="modal-in" style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 600, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Sales Order: {so.soNumber}</h3>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Created: {fmtDateTime(so.createdAt)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusBadge status={so.status} />
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: T.surface, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Customer</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{so.customerName || "—"}</div>
            {so.customerPhone && <div style={{ fontSize: 12, color: T.t3 }}>{so.customerPhone}</div>}
          </div>
          <div style={{ background: T.surface, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Expected Delivery</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{so.expectedDate ? fmtDate(so.expectedDate) : "Not set"}</div>
          </div>
        </div>

        {so.address && (
          <div style={{ background: T.surface, borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Delivery Address</div>
            <div style={{ fontSize: 13 }}>{so.address}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, textTransform: "uppercase", marginBottom: 8 }}>Items</div>
          {so.items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: T.surface, borderRadius: 8, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{item.image}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{item.sku}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>{item.qty} × {fmt(item.rate)}</div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.amber }}>{fmt(item.rate * item.qty)}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <div style={{ minWidth: 200, background: T.surface, borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 4 }}><span>GST (incl.)</span><span style={{ fontFamily: FONT.mono }}>{fmt(gst)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}><span>Total</span><span style={{ fontFamily: FONT.mono }}>{fmt(total)}</span></div>
          </div>
        </div>

        {so.notes && <div style={{ background: T.surface, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.t2 }}>{so.notes}</div>}

        {so.invoiceNo && (
          <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.emerald, fontWeight: 700 }}>
            ✓ Invoiced as {so.invoiceNo} on {fmtDateTime(so.invoicedAt)}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {so.status === "Draft" && <Btn variant="ghost" onClick={() => onDelete(so.id)} style={{ color: T.crimson }}>🗑 Delete</Btn>}
          {so.status === "Draft" && <Btn variant="ghost" onClick={() => { onConfirm(so.id); onClose(); }}>✓ Confirm</Btn>}
          {so.status === "Confirmed" && <Btn variant="ghost" onClick={() => { onCreateDN(so); onClose(); }}>🚚 Create Delivery Note</Btn>}
          {so.status !== "Invoiced" && <Btn variant="amber" onClick={() => onConvert(so)}>🧾 Convert to Invoice</Btn>}
        </div>
      </div>
    </div>
  );
}

function DNDetail({ dn, onClose, onDispatch, onConvert, onDelete }) {
  const total = dn.items.reduce((s, i) => s + i.rate * (i.dispatched || i.qty), 0);
  const gst = dn.items.reduce((s, i) => s + (i.rate * (i.dispatched || i.qty) * (i.gstRate || 18)) / (100 + (i.gstRate || 18)), 0);

  return (
    <div className="backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="modal-in" style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 600, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Delivery Note: {dn.dnNumber}</h3>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Created: {fmtDateTime(dn.createdAt)}{dn.soNumber ? ` · SO: ${dn.soNumber}` : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusBadge status={dn.status} />
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: T.surface, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Customer</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{dn.customerName || "—"}</div>
            {dn.customerPhone && <div style={{ fontSize: 12, color: T.t3 }}>{dn.customerPhone}</div>}
          </div>
          <div style={{ background: T.surface, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>SO Reference</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT.mono, color: T.amber }}>{dn.soNumber || "Direct (No SO)"}</div>
          </div>
        </div>

        {dn.address && (
          <div style={{ background: T.surface, borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Delivery Address</div>
            <div style={{ fontSize: 13 }}>{dn.address}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, textTransform: "uppercase", marginBottom: 8 }}>Items Dispatched</div>
          {dn.items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: T.surface, borderRadius: 8, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{item.image}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{item.sku}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 13 }}>{item.dispatched || item.qty} × {fmt(item.rate)}</div>
                <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.sky }}>{fmt(item.rate * (item.dispatched || item.qty))}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <div style={{ minWidth: 200, background: T.surface, borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.t3, marginBottom: 4 }}><span>GST (incl.)</span><span style={{ fontFamily: FONT.mono }}>{fmt(gst)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}><span>Total</span><span style={{ fontFamily: FONT.mono }}>{fmt(total)}</span></div>
          </div>
        </div>

        {dn.notes && <div style={{ background: T.surface, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.t2 }}>{dn.notes}</div>}

        {dn.dispatchedAt && (
          <div style={{ background: "rgba(245,158,11,0.1)", border: `1px solid ${T.amber}33`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.amber, fontWeight: 700 }}>
            📦 Dispatched on {fmtDateTime(dn.dispatchedAt)} — stock has been deducted
          </div>
        )}

        {dn.invoiceNo && (
          <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: T.emerald, fontWeight: 700 }}>
            ✓ Invoiced as {dn.invoiceNo} on {fmtDateTime(dn.invoicedAt)}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {dn.status === "Draft" && <Btn variant="ghost" onClick={() => onDelete(dn.id)} style={{ color: T.crimson }}>🗑 Delete</Btn>}
          {dn.status === "Draft" && <Btn variant="amber" onClick={() => { onDispatch(dn.id); onClose(); }}>📦 Dispatch (Update Stock)</Btn>}
          {dn.status === "Dispatched" && <Btn variant="amber" onClick={() => onConvert(dn)}>🧾 Convert to Invoice</Btn>}
        </div>
      </div>
    </div>
  );
}

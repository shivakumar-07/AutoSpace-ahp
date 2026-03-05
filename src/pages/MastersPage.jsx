import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { uid } from "../utils";
import { Btn, EmptyState } from "../components/ui";

const TABS = [
  { key: "warehouse", label: "Warehouse Master", icon: "🏭" },
  { key: "uom", label: "UOM Master", icon: "📏" },
  { key: "bank", label: "Bank Account Master", icon: "🏦" },
];

const FIELD_STYLE = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
  padding: "10px 12px", color: T.t1, fontSize: 13, fontWeight: 500, fontFamily: FONT.ui,
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
};

const LABEL_STYLE = {
  fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 4,
};

const SELECT_STYLE = { ...FIELD_STYLE, cursor: "pointer" };

const DEFAULT_UOMS = [
  { id: "uom_nos", name: "Numbers", symbol: "Nos", type: "qty", isDefault: true },
  { id: "uom_kg", name: "Kilogram", symbol: "Kg", type: "weight", isDefault: true },
  { id: "uom_litre", name: "Litre", symbol: "Ltr", type: "volume", isDefault: true },
  { id: "uom_box", name: "Box", symbol: "Box", type: "qty", isDefault: true },
  { id: "uom_set", name: "Set", symbol: "Set", type: "qty", isDefault: true },
  { id: "uom_pair", name: "Pair", symbol: "Pair", type: "qty", isDefault: true },
  { id: "uom_metre", name: "Metre", symbol: "m", type: "length", isDefault: true },
];

const UOM_TYPES = ["qty", "weight", "volume", "length"];
const ACCOUNT_TYPES = ["Current", "Savings"];

function loadLS(key, fallback) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
}
function saveLS(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function MastersPage({ toast }) {
  const [tab, setTab] = useState("warehouse");

  const [warehouses, setWarehouses] = useState(() => loadLS("vl_warehouses", []));
  const [uoms, setUoms] = useState(() => {
    const stored = loadLS("vl_uoms", null);
    if (stored) return stored;
    saveLS("vl_uoms", DEFAULT_UOMS);
    return DEFAULT_UOMS;
  });
  const [bankAccounts, setBankAccounts] = useState(() => loadLS("vl_bank_accounts", []));

  const [whForm, setWhForm] = useState(null);
  const [uomForm, setUomForm] = useState(null);
  const [bankForm, setBankForm] = useState(null);
  const [search, setSearch] = useState("");

  const persistWarehouses = useCallback((next) => { setWarehouses(next); saveLS("vl_warehouses", next); }, []);
  const persistUoms = useCallback((next) => { setUoms(next); saveLS("vl_uoms", next); }, []);
  const persistBankAccounts = useCallback((next) => { setBankAccounts(next); saveLS("vl_bank_accounts", next); }, []);

  const newWarehouse = () => setWhForm({ id: null, name: "", address: "", parentWarehouse: "", isPrimary: false, isActive: true });
  const editWarehouse = (w) => setWhForm({ ...w });
  const saveWarehouse = () => {
    if (!whForm.name.trim()) { toast("Warehouse name is required", "warning", "Validation"); return; }
    if (whForm.id) {
      persistWarehouses(warehouses.map(w => w.id === whForm.id ? { ...whForm } : w));
      toast("Warehouse updated", "success", "Updated");
    } else {
      persistWarehouses([...warehouses, { ...whForm, id: "wh_" + uid(), createdAt: Date.now() }]);
      toast("Warehouse created", "success", "Created");
    }
    setWhForm(null);
  };
  const deleteWarehouse = (id) => {
    if (!confirm("Delete this warehouse?")) return;
    persistWarehouses(warehouses.filter(w => w.id !== id));
    toast("Warehouse deleted", "info", "Deleted");
  };

  const newUom = () => setUomForm({ id: null, name: "", symbol: "", type: "qty" });
  const editUom = (u) => setUomForm({ ...u });
  const saveUom = () => {
    if (!uomForm.name.trim() || !uomForm.symbol.trim()) { toast("Name and symbol required", "warning", "Validation"); return; }
    if (uomForm.id) {
      persistUoms(uoms.map(u => u.id === uomForm.id ? { ...uomForm } : u));
      toast("UOM updated", "success", "Updated");
    } else {
      persistUoms([...uoms, { ...uomForm, id: "uom_" + uid(), isDefault: false }]);
      toast("UOM created", "success", "Created");
    }
    setUomForm(null);
  };
  const deleteUom = (id) => {
    const u = uoms.find(x => x.id === id);
    if (u?.isDefault) { toast("Cannot delete default UOM", "warning", "Blocked"); return; }
    if (!confirm("Delete this UOM?")) return;
    persistUoms(uoms.filter(x => x.id !== id));
    toast("UOM deleted", "info", "Deleted");
  };

  const newBank = () => setBankForm({ id: null, bankName: "", accountNumber: "", ifsc: "", branch: "", accountType: "Current", openingBalance: 0 });
  const editBank = (b) => setBankForm({ ...b });
  const saveBank = () => {
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) { toast("Bank name and account number required", "warning", "Validation"); return; }
    if (bankForm.id) {
      persistBankAccounts(bankAccounts.map(b => b.id === bankForm.id ? { ...bankForm } : b));
      toast("Bank account updated", "success", "Updated");
    } else {
      persistBankAccounts([...bankAccounts, { ...bankForm, id: "ba_" + uid(), createdAt: Date.now() }]);
      toast("Bank account created", "success", "Created");
    }
    setBankForm(null);
  };
  const deleteBank = (id) => {
    if (!confirm("Delete this bank account?")) return;
    persistBankAccounts(bankAccounts.filter(b => b.id !== id));
    toast("Bank account deleted", "info", "Deleted");
  };

  const renderWarehouseTab = () => {
    const filtered = warehouses.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || (w.address || "").toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search warehouses..." style={{ ...FIELD_STYLE, width: 280 }} />
          <Btn size="sm" variant="amber" onClick={newWarehouse}>＋ Add Warehouse</Btn>
        </div>

        {whForm && (
          <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.amber, marginBottom: 14 }}>{whForm.id ? "Edit" : "Add"} Warehouse</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={LABEL_STYLE}>Warehouse Name *</label>
                <input value={whForm.name} onChange={e => setWhForm(p => ({ ...p, name: e.target.value }))} style={FIELD_STYLE} placeholder="e.g. Main Godown" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Parent Warehouse</label>
                <select value={whForm.parentWarehouse} onChange={e => setWhForm(p => ({ ...p, parentWarehouse: e.target.value }))} style={SELECT_STYLE}>
                  <option value="">None (Top Level)</option>
                  {warehouses.filter(w => w.id !== whForm.id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL_STYLE}>Address</label>
                <input value={whForm.address} onChange={e => setWhForm(p => ({ ...p, address: e.target.value }))} style={FIELD_STYLE} placeholder="Warehouse location / address" />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.t2, cursor: "pointer" }}>
                  <input type="checkbox" checked={whForm.isPrimary} onChange={e => setWhForm(p => ({ ...p, isPrimary: e.target.checked }))} /> Primary Warehouse
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.t2, cursor: "pointer" }}>
                  <input type="checkbox" checked={whForm.isActive} onChange={e => setWhForm(p => ({ ...p, isActive: e.target.checked }))} /> Active
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn size="sm" variant="ghost" onClick={() => setWhForm(null)}>Cancel</Btn>
              <Btn size="sm" variant="amber" onClick={saveWarehouse}>Save</Btn>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon="🏭" title="No Warehouses" subtitle="Add your first warehouse to manage stock locations" />
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", padding: "10px 16px", background: T.surface, fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ flex: 2 }}>Name</span>
              <span style={{ flex: 2 }}>Address</span>
              <span style={{ flex: 1 }}>Parent</span>
              <span style={{ width: 70, textAlign: "center" }}>Primary</span>
              <span style={{ width: 60, textAlign: "center" }}>Status</span>
              <span style={{ width: 100, textAlign: "right" }}>Actions</span>
            </div>
            {filtered.map((w, i) => {
              const parent = warehouses.find(x => x.id === w.parentWarehouse);
              return (
                <div key={w.id} className="row-hover" style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${T.border}22`, background: i % 2 ? T.card : T.surface }}>
                  <span style={{ flex: 2, fontWeight: 600, fontSize: 13 }}>{w.name}</span>
                  <span style={{ flex: 2, fontSize: 12, color: T.t2 }}>{w.address || "—"}</span>
                  <span style={{ flex: 1, fontSize: 12, color: T.t3 }}>{parent?.name || "—"}</span>
                  <span style={{ width: 70, textAlign: "center" }}>{w.isPrimary ? <span style={{ color: T.amber, fontWeight: 700 }}>★</span> : "—"}</span>
                  <span style={{ width: 60, textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: w.isActive ? `${T.emerald}22` : `${T.crimson}22`, color: w.isActive ? T.emerald : T.crimson }}>{w.isActive ? "Active" : "Inactive"}</span>
                  </span>
                  <span style={{ width: 100, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => editWarehouse(w)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sky, fontSize: 14 }} title="Edit">✏️</button>
                    <button onClick={() => deleteWarehouse(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.crimson, fontSize: 14 }} title="Delete">🗑️</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderUomTab = () => {
    const filtered = uoms.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.symbol.toLowerCase().includes(search.toLowerCase()));
    const typeColors = { qty: T.sky, weight: T.amber, volume: T.violet, length: T.emerald };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search UOMs..." style={{ ...FIELD_STYLE, width: 280 }} />
          <Btn size="sm" variant="amber" onClick={newUom}>＋ Add UOM</Btn>
        </div>

        {uomForm && (
          <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.amber, marginBottom: 14 }}>{uomForm.id ? "Edit" : "Add"} Unit of Measurement</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={LABEL_STYLE}>Name *</label>
                <input value={uomForm.name} onChange={e => setUomForm(p => ({ ...p, name: e.target.value }))} style={FIELD_STYLE} placeholder="e.g. Dozen" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Symbol *</label>
                <input value={uomForm.symbol} onChange={e => setUomForm(p => ({ ...p, symbol: e.target.value }))} style={FIELD_STYLE} placeholder="e.g. Dz" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Type</label>
                <select value={uomForm.type} onChange={e => setUomForm(p => ({ ...p, type: e.target.value }))} style={SELECT_STYLE}>
                  {UOM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn size="sm" variant="ghost" onClick={() => setUomForm(null)}>Cancel</Btn>
              <Btn size="sm" variant="amber" onClick={saveUom}>Save</Btn>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon="📏" title="No UOMs" subtitle="Add units of measurement" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {filtered.map(u => (
              <div key={u.id} className="card-hover" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${typeColors[u.type] || T.t3}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: typeColors[u.type] || T.t3, fontFamily: FONT.mono }}>{u.symbol}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{u.type.charAt(0).toUpperCase() + u.type.slice(1)}</div>
                  </div>
                </div>
                {u.isDefault && <span style={{ position: "absolute", top: 10, right: 10, fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${T.amber}22`, color: T.amber, fontWeight: 700 }}>DEFAULT</span>}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={() => editUom(u)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sky, fontSize: 13 }} title="Edit">✏️</button>
                  {!u.isDefault && <button onClick={() => deleteUom(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.crimson, fontSize: 13 }} title="Delete">🗑️</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBankTab = () => {
    const filtered = bankAccounts.filter(b => !search || b.bankName.toLowerCase().includes(search.toLowerCase()) || b.accountNumber.includes(search));
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bank accounts..." style={{ ...FIELD_STYLE, width: 280 }} />
          <Btn size="sm" variant="amber" onClick={newBank}>＋ Add Bank Account</Btn>
        </div>

        {bankForm && (
          <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.amber, marginBottom: 14 }}>{bankForm.id ? "Edit" : "Add"} Bank Account</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={LABEL_STYLE}>Bank Name *</label>
                <input value={bankForm.bankName} onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))} style={FIELD_STYLE} placeholder="e.g. State Bank of India" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Account Number *</label>
                <input value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} style={{ ...FIELD_STYLE, fontFamily: FONT.mono, letterSpacing: "0.05em" }} placeholder="e.g. 1234567890" />
              </div>
              <div>
                <label style={LABEL_STYLE}>IFSC Code</label>
                <input value={bankForm.ifsc} onChange={e => setBankForm(p => ({ ...p, ifsc: e.target.value.toUpperCase() }))} style={{ ...FIELD_STYLE, fontFamily: FONT.mono, letterSpacing: "0.05em" }} placeholder="e.g. SBIN0001234" maxLength={11} />
                {bankForm.ifsc && bankForm.ifsc.length !== 11 && <div style={{ fontSize: 10, color: T.crimson, marginTop: 3 }}>IFSC must be 11 characters</div>}
              </div>
              <div>
                <label style={LABEL_STYLE}>Branch</label>
                <input value={bankForm.branch} onChange={e => setBankForm(p => ({ ...p, branch: e.target.value }))} style={FIELD_STYLE} placeholder="e.g. Jubilee Hills Branch" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Account Type</label>
                <select value={bankForm.accountType} onChange={e => setBankForm(p => ({ ...p, accountType: e.target.value }))} style={SELECT_STYLE}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Opening Balance (₹)</label>
                <input type="number" value={bankForm.openingBalance} onChange={e => setBankForm(p => ({ ...p, openingBalance: parseFloat(e.target.value) || 0 }))} style={{ ...FIELD_STYLE, fontFamily: FONT.mono }} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn size="sm" variant="ghost" onClick={() => setBankForm(null)}>Cancel</Btn>
              <Btn size="sm" variant="amber" onClick={saveBank}>Save</Btn>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon="🏦" title="No Bank Accounts" subtitle="Add your bank accounts for reconciliation and payments" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {filtered.map(b => (
              <div key={b.id} className="card-hover" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${T.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏦</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{b.bankName}</div>
                      <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{b.accountNumber}</div>
                    </div>
                  </div>
                  <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: b.accountType === "Current" ? `${T.violet}22` : `${T.emerald}22`, color: b.accountType === "Current" ? T.violet : T.emerald }}>{b.accountType}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: T.t3 }}>IFSC: </span><span style={{ fontFamily: FONT.mono, color: T.t2 }}>{b.ifsc || "—"}</span></div>
                  <div><span style={{ color: T.t3 }}>Branch: </span><span style={{ color: T.t2 }}>{b.branch || "—"}</span></div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: T.t3 }}>Opening Balance: </span>
                    <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.emerald }}>₹{(b.openingBalance || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={() => editBank(b)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sky, fontSize: 14 }} title="Edit">✏️</button>
                  <button onClick={() => deleteBank(b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.crimson, fontSize: 14 }} title="Delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-in" style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>📋 Masters</h1>
          <p style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>Manage warehouses, units of measurement & bank accounts</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }} style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
            background: tab === t.key ? T.amberGlow : "transparent",
            color: tab === t.key ? T.amber : T.t2,
            border: `1px solid ${tab === t.key ? T.amber + "44" : T.border}`,
            display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === "warehouse" && renderWarehouseTab()}
      {tab === "uom" && renderUomTab()}
      {tab === "bank" && renderBankTab()}
    </div>
  );
}

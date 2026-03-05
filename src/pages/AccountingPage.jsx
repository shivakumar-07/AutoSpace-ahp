import { useState, useMemo, useCallback } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate, fmtDateTime, uid, generateCSV, downloadCSV, generateWhatsAppReminder } from "../utils";
import { Badge, Btn, StatCard, EmptyState } from "../components/ui";
import {
  CHART_OF_ACCOUNTS,
  generateJournalEntries,
  computeLedger,
  computeTrialBalance,
  computeProfitAndLoss,
  computeBalanceSheet,
  computeCashFlow,
  computeFinancialRatios,
  computeCostSheet,
  computeOutstandingAging,
} from "../accounting";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const TABS = [
  { key: "coa", label: "Chart of Accounts", icon: "📋" },
  { key: "daybook", label: "Day Book", icon: "📖" },
  { key: "ledger", label: "Ledger", icon: "📒" },
  { key: "tb", label: "Trial Balance", icon: "⚖️" },
  { key: "pnl", label: "Profit & Loss", icon: "📈" },
  { key: "bs", label: "Balance Sheet", icon: "🏛️" },
  { key: "cf", label: "Cash Flow", icon: "💧" },
  { key: "cs", label: "Cost Sheet", icon: "🧮" },
  { key: "outstanding", label: "Outstanding", icon: "⏳" },
  { key: "ratios", label: "Ratios", icon: "📊" },
];

const VOUCHER_COLORS = {
  Sales: T.emerald, Purchase: T.sky, Receipt: T.amber, Payment: T.crimson,
  Journal: "#A78BFA", "Credit Note": T.crimson, "Debit Note": T.amber,
};

const mono = { fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" };
const drColor = T.sky;
const crColor = T.emerald;

const toDateStr = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromDateStr = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};

const SectionHeader = ({ title, color = T.amber }) => (
  <div style={{ fontSize: 15, fontWeight: 800, color, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
    {title}
  </div>
);

const TableRow = ({ children, even, header, onClick, style = {} }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", padding: "8px 16px",
    background: header ? T.surface : even ? T.card : T.surface,
    borderBottom: `1px solid ${T.border}22`,
    fontSize: header ? 10 : 13, fontWeight: header ? 700 : 500,
    color: header ? T.t3 : T.t1, textTransform: header ? "uppercase" : "none",
    letterSpacing: header ? "0.06em" : "0",
    cursor: onClick ? "pointer" : "default",
    transition: "background 0.1s",
    ...style,
    ...(onClick ? {} : {}),
  }}>
    {children}
  </div>
);

export function AccountingPage({ movements, products, parties, activeShopId, toast }) {
  const [tab, setTab] = useState("coa");
  const [dateFrom, setDateFrom] = useState(() => toDateStr(Date.now() - 30 * 86400000));
  const [dateTo, setDateTo] = useState(() => toDateStr(Date.now()));
  const [ledgerAccount, setLedgerAccount] = useState("AC001");
  const [daybookFilter, setDaybookFilter] = useState("All");
  const [manualJournalOpen, setManualJournalOpen] = useState(false);
  const [mjRows, setMjRows] = useState([{ accountCode: "", debit: "", credit: "" }, { accountCode: "", debit: "", credit: "" }]);
  const [mjNarration, setMjNarration] = useState("");
  const [mjDate, setMjDate] = useState(toDateStr(Date.now()));
  const [customAccounts, setCustomAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vl_custom_accounts") || "[]"); } catch { return []; }
  });
  const [manualJournals, setManualJournals] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vl_manual_journals") || "[]"); } catch { return []; }
  });
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: "", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" });
  const [expandedGroups, setExpandedGroups] = useState({ ASSETS: true, LIABILITIES: true, INCOME: true, EXPENSES: true, CAPITAL: true });

  const allAccounts = useMemo(() => [...CHART_OF_ACCOUNTS, ...customAccounts], [customAccounts]);

  const journalEntries = useMemo(() => {
    const auto = generateJournalEntries(movements, products, parties, activeShopId);
    return [...auto, ...manualJournals];
  }, [movements, products, parties, activeShopId, manualJournals]);

  const startTs = useMemo(() => fromDateStr(dateFrom), [dateFrom]);
  const endTs = useMemo(() => fromDateStr(dateTo) ? fromDateStr(dateTo) + 86400000 - 1 : null, [dateTo]);

  const pnl = useMemo(() => computeProfitAndLoss(journalEntries, startTs, endTs), [journalEntries, startTs, endTs]);
  const bs = useMemo(() => computeBalanceSheet(journalEntries, endTs || Date.now()), [journalEntries, endTs]);
  const cashBal = useMemo(() => {
    const c = bs.assets.currentAssets.find(a => a.code === "AC001");
    const b = bs.assets.currentAssets.find(a => a.code === "AC002");
    return (c?.amount || 0) + (b?.amount || 0);
  }, [bs]);
  const dailyCash = useMemo(() => {
    const days = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const day = now - i * 86400000;
      const dayBs = computeBalanceSheet(journalEntries, day);
      const cash = (dayBs.assets.currentAssets.find(a => a.code === "AC001")?.amount || 0) + (dayBs.assets.currentAssets.find(a => a.code === "AC002")?.amount || 0);
      days.push({ name: new Date(day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), cash });
    }
    return days;
  }, [journalEntries]);

  const toggleGroup = (g) => setExpandedGroups(prev => ({ ...prev, [g]: !prev[g] }));

  const saveManualJournal = useCallback(() => {
    const totalDr = mjRows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
    const totalCr = mjRows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);
    if (Math.abs(totalDr - totalCr) > 0.01) { toast("Debits must equal Credits", "warning", "Validation Error"); return; }
    if (!mjNarration.trim()) { toast("Narration is required", "warning", "Validation Error"); return; }
    const validRows = mjRows.filter(r => r.accountCode && ((parseFloat(r.debit) || 0) > 0 || (parseFloat(r.credit) || 0) > 0));
    if (validRows.length < 2) { toast("At least 2 account entries required", "warning", "Validation Error"); return; }

    const entry = {
      id: "MJE-" + uid(),
      date: fromDateStr(mjDate) || Date.now(),
      voucherType: "Journal",
      voucherNo: "MJ-" + uid().slice(0, 6).toUpperCase(),
      narration: mjNarration,
      entries: validRows.map(r => {
        const acc = allAccounts.find(a => a.code === r.accountCode);
        return { accountCode: r.accountCode, accountName: acc?.name || r.accountCode, debit: parseFloat(r.debit) || 0, credit: parseFloat(r.credit) || 0 };
      }),
      refId: null, refType: "MANUAL",
    };
    const next = [...manualJournals, entry];
    setManualJournals(next);
    localStorage.setItem("vl_manual_journals", JSON.stringify(next));
    setManualJournalOpen(false);
    setMjRows([{ accountCode: "", debit: "", credit: "" }, { accountCode: "", debit: "", credit: "" }]);
    setMjNarration("");
    toast("Manual journal entry saved", "success", "Journal Created");
  }, [mjRows, mjNarration, mjDate, manualJournals, allAccounts, toast]);

  const saveCustomAccount = useCallback(() => {
    if (!newAcc.name.trim()) { toast("Account name required", "warning"); return; }
    const code = "AC" + String(100 + customAccounts.length).padStart(3, "0");
    const acc = { ...newAcc, code };
    const next = [...customAccounts, acc];
    setCustomAccounts(next);
    localStorage.setItem("vl_custom_accounts", JSON.stringify(next));
    setAddAccountOpen(false);
    setNewAcc({ name: "", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" });
    toast(`Account ${code} created`, "success");
  }, [newAcc, customAccounts, toast]);

  const inputStyle = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", color: T.t1, fontSize: 12, fontFamily: FONT.ui, outline: "none", width: "100%", boxSizing: "border-box" };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  const renderCOA = () => {
    const groups = ["ASSETS", "LIABILITIES", "INCOME", "EXPENSES", "CAPITAL"];
    const groupColors = { ASSETS: T.sky, LIABILITIES: T.crimson, INCOME: T.emerald, EXPENSES: "#FB923C", CAPITAL: "#A78BFA" };

    const tb = computeTrialBalance(journalEntries, endTs || Date.now());
    const balMap = {};
    tb.rows.forEach(r => { balMap[r.accountCode] = r; });

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t2 }}>All accounts grouped by type</div>
          <Btn size="sm" variant="amber" onClick={() => setAddAccountOpen(true)}>＋ Add Account</Btn>
        </div>
        {addAccountOpen && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add Manual Account</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Name</label><input value={newAcc.name} onChange={e => setNewAcc(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Group</label>
                <select value={newAcc.group} onChange={e => setNewAcc(p => ({ ...p, group: e.target.value }))} style={selectStyle}>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Sub-Group</label><input value={newAcc.subGroup} onChange={e => setNewAcc(p => ({ ...p, subGroup: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Normal Balance</label>
                <select value={newAcc.normalBalance} onChange={e => setNewAcc(p => ({ ...p, normalBalance: e.target.value }))} style={selectStyle}>
                  <option value="Dr">Debit (Dr)</option><option value="Cr">Credit (Cr)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn size="sm" variant="ghost" onClick={() => setAddAccountOpen(false)}>Cancel</Btn>
              <Btn size="sm" variant="amber" onClick={saveCustomAccount}>Save Account</Btn>
            </div>
          </div>
        )}
        {groups.map(group => {
          const accs = allAccounts.filter(a => a.group === group);
          const subGroups = [...new Set(accs.map(a => a.subGroup))];
          const groupTotal = accs.reduce((s, a) => {
            const b = balMap[a.code];
            return s + (b ? b.balance : 0);
          }, 0);
          return (
            <div key={group} style={{ marginBottom: 12 }}>
              <div onClick={() => toggleGroup(group)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer",
                background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, borderLeft: `3px solid ${groupColors[group]}`,
                marginBottom: expandedGroups[group] ? 4 : 0,
              }}>
                <span style={{ fontSize: 11, color: T.t3, transition: "transform 0.15s", transform: expandedGroups[group] ? "rotate(90deg)" : "none" }}>▶</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: groupColors[group], flex: 1 }}>{group}</span>
                <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: groupTotal >= 0 ? drColor : crColor }}>{fmt(Math.abs(groupTotal))}</span>
              </div>
              {expandedGroups[group] && subGroups.map(sg => (
                <div key={sg} style={{ marginLeft: 20, marginBottom: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, padding: "6px 16px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sg}</div>
                  {accs.filter(a => a.subGroup === sg).map(acc => {
                    const b = balMap[acc.code];
                    const bal = b ? b.balance : 0;
                    return (
                      <div key={acc.code} onClick={() => { setLedgerAccount(acc.code); setTab("ledger"); }}
                        className="row-hover" style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "7px 16px 7px 28px", cursor: "pointer",
                          borderRadius: 6, transition: "background 0.1s",
                        }}>
                        <span style={{ ...mono, fontSize: 11, color: T.t3, width: 54 }}>{acc.code}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{acc.name}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: acc.normalBalance === "Dr" ? `${drColor}18` : `${crColor}18`, color: acc.normalBalance === "Dr" ? drColor : crColor, fontWeight: 700 }}>{acc.normalBalance}</span>
                        <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: bal >= 0 ? drColor : crColor, minWidth: 90, textAlign: "right" }}>{bal !== 0 ? fmt(Math.abs(bal)) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayBook = () => {
    const filtered = journalEntries
      .filter(je => {
        if (startTs && je.date < startTs) return false;
        if (endTs && je.date > endTs) return false;
        if (daybookFilter !== "All" && je.voucherType !== daybookFilter) return false;
        return true;
      })
      .sort((a, b) => b.date - a.date);

    const totalDr = filtered.reduce((s, je) => s + je.entries.reduce((ss, e) => ss + (e.debit || 0), 0), 0);
    const totalCr = filtered.reduce((s, je) => s + je.entries.reduce((ss, e) => ss + (e.credit || 0), 0), 0);
    const voucherTypes = ["All", "Sales", "Purchase", "Receipt", "Payment", "Journal", "Credit Note", "Debit Note"];

    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {voucherTypes.map(vt => (
            <button key={vt} onClick={() => setDaybookFilter(vt)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
              background: daybookFilter === vt ? (VOUCHER_COLORS[vt] || T.amber) + "22" : "transparent",
              color: daybookFilter === vt ? (VOUCHER_COLORS[vt] || T.amber) : T.t3,
              border: `1px solid ${daybookFilter === vt ? (VOUCHER_COLORS[vt] || T.amber) + "44" : T.border}`,
            }}>{vt}</button>
          ))}
          <div style={{ flex: 1 }} />
          <Btn size="sm" variant="amber" onClick={() => setManualJournalOpen(true)}>＋ Manual Journal</Btn>
        </div>

        {manualJournalOpen && (
          <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Create Manual Journal Entry</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
              <div><label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Date</label><input type="date" value={mjDate} onChange={e => setMjDate(e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Narration</label><input value={mjNarration} onChange={e => setMjNarration(e.target.value)} placeholder="Description..." style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <TableRow header><span style={{ flex: 2 }}>Account</span><span style={{ width: 120, textAlign: "right" }}>Debit</span><span style={{ width: 120, textAlign: "right" }}>Credit</span><span style={{ width: 30 }}></span></TableRow>
              {mjRows.map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "4px 16px", gap: 8 }}>
                  <select value={row.accountCode} onChange={e => { const next = [...mjRows]; next[i].accountCode = e.target.value; setMjRows(next); }} style={{ ...selectStyle, flex: 2 }}>
                    <option value="">Select Account...</option>
                    {allAccounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                  </select>
                  <input type="number" value={row.debit} onChange={e => { const next = [...mjRows]; next[i].debit = e.target.value; setMjRows(next); }} placeholder="0" style={{ ...inputStyle, width: 120, textAlign: "right", ...mono }} />
                  <input type="number" value={row.credit} onChange={e => { const next = [...mjRows]; next[i].credit = e.target.value; setMjRows(next); }} placeholder="0" style={{ ...inputStyle, width: 120, textAlign: "right", ...mono }} />
                  <button onClick={() => { if (mjRows.length > 2) setMjRows(mjRows.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setMjRows([...mjRows, { accountCode: "", debit: "", credit: "" }])} style={{ background: "none", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "4px 12px", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: FONT.ui }}>+ Add Row</button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ ...mono, fontSize: 12, color: T.t3 }}>Dr: <span style={{ color: drColor }}>{fmt(mjRows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0))}</span> Cr: <span style={{ color: crColor }}>{fmt(mjRows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0))}</span></span>
                <Btn size="sm" variant="ghost" onClick={() => setManualJournalOpen(false)}>Cancel</Btn>
                <Btn size="sm" variant="amber" onClick={saveManualJournal}>Save Entry</Btn>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? <EmptyState icon="📖" title="No vouchers" subtitle="No journal entries found for this period" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(je => {
              const vColor = VOUCHER_COLORS[je.voucherType] || T.t3;
              return (
                <div key={je.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, borderLeft: `3px solid ${vColor}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: vColor + "18", color: vColor, fontWeight: 700 }}>{je.voucherType}</span>
                    <span style={{ ...mono, fontSize: 11, color: T.t3 }}>{je.voucherNo}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{fmtDateTime(je.date)}</span>
                    <div style={{ flex: 1 }} />
                    {je.refId && <span style={{ ...mono, fontSize: 10, color: T.t4 }}>Ref: {je.refId}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.t2, marginBottom: 8 }}>{je.narration}</div>
                  <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}22` }}>
                    <TableRow header><span style={{ flex: 2 }}>Account</span><span style={{ width: 110, textAlign: "right" }}>Debit</span><span style={{ width: 110, textAlign: "right" }}>Credit</span></TableRow>
                    {je.entries.map((e, i) => (
                      <TableRow key={i} even={i % 2 === 0}>
                        <span style={{ flex: 2, fontSize: 12 }}>{e.accountName}</span>
                        <span style={{ width: 110, textAlign: "right", ...mono, fontSize: 12, color: e.debit > 0 ? drColor : T.t4 }}>{e.debit > 0 ? fmt(e.debit) : ""}</span>
                        <span style={{ width: 110, textAlign: "right", ...mono, fontSize: 12, color: e.credit > 0 ? crColor : T.t4 }}>{e.credit > 0 ? fmt(e.credit) : ""}</span>
                      </TableRow>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 16, padding: "12px 16px", background: T.card, borderRadius: 10, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.t3 }}>Total Debits: <span style={{ ...mono, color: drColor, fontWeight: 700 }}>{fmt(totalDr)}</span></span>
          <span style={{ fontSize: 12, color: T.t3 }}>Total Credits: <span style={{ ...mono, color: crColor, fontWeight: 700 }}>{fmt(totalCr)}</span></span>
          {Math.abs(totalDr - totalCr) < 0.01 && <span style={{ color: T.emerald, fontSize: 12, fontWeight: 700 }}>✓ Balanced</span>}
        </div>
      </div>
    );
  };

  const renderLedger = () => {
    const ledger = computeLedger(journalEntries, ledgerAccount, startTs, endTs);
    const acc = allAccounts.find(a => a.code === ledgerAccount);
    const totalDr = ledger.entries.reduce((s, e) => s + e.debit, 0);
    const totalCr = ledger.entries.reduce((s, e) => s + e.credit, 0);

    const exportLedgerCSV = () => {
      const headers = ["Date", "Voucher No", "Narration", "Debit", "Credit", "Balance"];
      const rows = ledger.entries.map(e => [fmtDate(e.date), e.voucherNo, e.narration, e.debit || "", e.credit || "", e.runningBalance]);
      downloadCSV(`ledger_${ledgerAccount}_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
    };

    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Account</label>
            <select value={ledgerAccount} onChange={e => setLedgerAccount(e.target.value)} style={selectStyle}>
              {allAccounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <Btn size="sm" variant="ghost" onClick={exportLedgerCSV}>📥 Export CSV</Btn>
        </div>

        {acc && (
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>Account</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{acc.name}</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>Code</div>
              <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: T.t2 }}>{acc.code}</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>Group</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.t2 }}>{acc.group}</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>Normal Balance</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: acc.normalBalance === "Dr" ? drColor : crColor }}>{acc.normalBalance}</div>
            </div>
          </div>
        )}

        <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <TableRow header>
            <span style={{ width: 100 }}>Date</span>
            <span style={{ width: 130 }}>Voucher No</span>
            <span style={{ flex: 1 }}>Narration</span>
            <span style={{ width: 100, textAlign: "right" }}>Debit</span>
            <span style={{ width: 100, textAlign: "right" }}>Credit</span>
            <span style={{ width: 110, textAlign: "right" }}>Balance</span>
          </TableRow>
          <TableRow even style={{ fontWeight: 700, fontStyle: "italic" }}>
            <span style={{ width: 100 }}></span>
            <span style={{ width: 130 }}></span>
            <span style={{ flex: 1, color: T.t3 }}>Opening Balance</span>
            <span style={{ width: 100 }}></span>
            <span style={{ width: 100 }}></span>
            <span style={{ width: 110, textAlign: "right", ...mono, fontWeight: 700, color: ledger.openingBalance >= 0 ? drColor : crColor }}>{fmt(Math.abs(ledger.openingBalance))}{ledger.openingBalance !== 0 ? (ledger.openingBalance > 0 ? " Dr" : " Cr") : ""}</span>
          </TableRow>
          {ledger.entries.map((e, i) => (
            <TableRow key={i} even={i % 2 === 1}>
              <span style={{ width: 100, fontSize: 11, color: T.t3 }}>{fmtDate(e.date)}</span>
              <span style={{ width: 130, ...mono, fontSize: 11, color: T.t3 }}>{e.voucherNo}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{e.narration}</span>
              <span style={{ width: 100, textAlign: "right", ...mono, fontSize: 12, color: e.debit > 0 ? drColor : T.t4 }}>{e.debit > 0 ? fmt(e.debit) : ""}</span>
              <span style={{ width: 100, textAlign: "right", ...mono, fontSize: 12, color: e.credit > 0 ? crColor : T.t4 }}>{e.credit > 0 ? fmt(e.credit) : ""}</span>
              <span style={{ width: 110, textAlign: "right", ...mono, fontSize: 12, fontWeight: 600, color: e.runningBalance >= 0 ? drColor : crColor }}>{fmt(Math.abs(e.runningBalance))}{e.runningBalance > 0 ? " Dr" : e.runningBalance < 0 ? " Cr" : ""}</span>
            </TableRow>
          ))}
          <TableRow style={{ borderTop: `2px solid ${T.border}`, fontWeight: 700 }}>
            <span style={{ width: 100 }}></span>
            <span style={{ width: 130 }}></span>
            <span style={{ flex: 1, color: T.t3, fontWeight: 700 }}>Totals</span>
            <span style={{ width: 100, textAlign: "right", ...mono, color: drColor, fontWeight: 700 }}>{fmt(totalDr)}</span>
            <span style={{ width: 100, textAlign: "right", ...mono, color: crColor, fontWeight: 700 }}>{fmt(totalCr)}</span>
            <span style={{ width: 110, textAlign: "right", ...mono, fontWeight: 700, color: ledger.closingBalance >= 0 ? drColor : crColor }}>{fmt(Math.abs(ledger.closingBalance))}{ledger.closingBalance > 0 ? " Dr" : ledger.closingBalance < 0 ? " Cr" : ""}</span>
          </TableRow>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    const tb = computeTrialBalance(journalEntries, endTs || Date.now());
    const groups = ["ASSETS", "LIABILITIES", "INCOME", "EXPENSES", "CAPITAL"];
    const groupColors = { ASSETS: T.sky, LIABILITIES: T.crimson, INCOME: T.emerald, EXPENSES: "#FB923C", CAPITAL: "#A78BFA" };

    const sorted = [...tb.rows].sort((a, b) => Math.max(b.debitBalance, b.creditBalance) - Math.max(a.debitBalance, a.creditBalance));
    const top3 = sorted.slice(0, 3).map(r => r.accountCode);

    const exportTBCSV = () => {
      const headers = ["Account Code", "Account Name", "Group", "Debit Balance", "Credit Balance"];
      const rows = tb.rows.map(r => [r.accountCode, r.accountName, r.group, r.debitBalance || "", r.creditBalance || ""]);
      downloadCSV(`trial_balance_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
    };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn size="sm" variant="ghost" onClick={exportTBCSV}>📥 Export CSV</Btn>
        </div>
        <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <TableRow header>
            <span style={{ width: 70 }}>Code</span>
            <span style={{ flex: 1 }}>Account Name</span>
            <span style={{ width: 100 }}>Group</span>
            <span style={{ width: 120, textAlign: "right" }}>Debit Balance</span>
            <span style={{ width: 120, textAlign: "right" }}>Credit Balance</span>
          </TableRow>
          {groups.map(group => {
            const gRows = tb.rows.filter(r => r.group === group);
            if (gRows.length === 0) return null;
            const gDr = gRows.reduce((s, r) => s + r.debitBalance, 0);
            const gCr = gRows.reduce((s, r) => s + r.creditBalance, 0);
            return (
              <div key={group}>
                <div style={{ padding: "8px 16px", background: groupColors[group] + "11", borderLeft: `3px solid ${groupColors[group]}`, fontSize: 11, fontWeight: 800, color: groupColors[group], textTransform: "uppercase", letterSpacing: "0.06em" }}>{group}</div>
                {gRows.map((r, i) => (
                  <TableRow key={r.accountCode} even={i % 2 === 0} style={top3.includes(r.accountCode) ? { background: T.amberGlow } : {}}>
                    <span style={{ width: 70, ...mono, fontSize: 11, color: T.t3 }}>{r.accountCode}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: top3.includes(r.accountCode) ? 700 : 500, color: top3.includes(r.accountCode) ? T.amber : T.t1 }}>{r.accountName}</span>
                    <span style={{ width: 100, fontSize: 10, color: T.t3 }}>{r.subGroup}</span>
                    <span style={{ width: 120, textAlign: "right", ...mono, fontSize: 12, color: r.debitBalance > 0 ? drColor : T.t4 }}>{r.debitBalance > 0 ? fmt(r.debitBalance) : ""}</span>
                    <span style={{ width: 120, textAlign: "right", ...mono, fontSize: 12, color: r.creditBalance > 0 ? crColor : T.t4 }}>{r.creditBalance > 0 ? fmt(r.creditBalance) : ""}</span>
                  </TableRow>
                ))}
                <div style={{ display: "flex", padding: "6px 16px", background: T.surface, fontSize: 11, fontWeight: 700, color: T.t3 }}>
                  <span style={{ flex: 1 }}></span>
                  <span style={{ width: 100 }}></span>
                  <span style={{ width: 120, textAlign: "right", ...mono, color: drColor }}>{gDr > 0 ? fmt(gDr) : ""}</span>
                  <span style={{ width: 120, textAlign: "right", ...mono, color: crColor }}>{gCr > 0 ? fmt(gCr) : ""}</span>
                </div>
              </div>
            );
          })}
          <TableRow style={{ borderTop: `2px solid ${T.borderHi}`, background: T.card }}>
            <span style={{ width: 70 }}></span>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 13 }}>Grand Total</span>
            <span style={{ width: 100 }}></span>
            <span style={{ width: 120, textAlign: "right", ...mono, fontSize: 14, fontWeight: 800, color: drColor }}>{fmt(tb.totalDebits)}</span>
            <span style={{ width: 120, textAlign: "right", ...mono, fontSize: 14, fontWeight: 800, color: crColor }}>{fmt(tb.totalCredits)}</span>
          </TableRow>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12, gap: 8 }}>
          {tb.isBalanced ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: T.emerald, display: "flex", alignItems: "center", gap: 6, background: T.emeraldBg, padding: "6px 16px", borderRadius: 8 }}>✓ Trial Balance is Balanced</span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: T.crimson, display: "flex", alignItems: "center", gap: 6, background: T.crimsonBg, padding: "6px 16px", borderRadius: 8 }}>⚠ Difference: {fmt(Math.abs(tb.totalDebits - tb.totalCredits))}</span>
          )}
        </div>
      </div>
    );
  };

  const renderPnL = () => {
    const chartData = [
      { name: "Revenue", value: pnl.revenue.total, fill: T.emerald },
      { name: "COGS", value: pnl.cogs, fill: T.sky },
      { name: "Op. Expenses", value: pnl.operatingExpenses, fill: "#FB923C" },
      { name: "Net Profit", value: pnl.netProfit, fill: pnl.netProfit >= 0 ? T.amber : T.crimson },
    ];

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, borderLeft: `3px solid ${T.emerald}` }}>
            <SectionHeader title="INCOME" color={T.emerald} />
            {pnl.revenue.items.length === 0 ? <div style={{ fontSize: 12, color: T.t3 }}>No income recorded</div> : pnl.revenue.items.map(item => (
              <div key={item.code} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}22` }}>
                <span style={{ fontSize: 12 }}>{item.name}</span>
                <span style={{ ...mono, fontSize: 12, color: T.emerald, fontWeight: 600 }}>{fmt(item.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, fontWeight: 800 }}>
              <span style={{ fontSize: 13 }}>Total Revenue</span>
              <span style={{ ...mono, fontSize: 14, color: T.emerald }}>{fmt(pnl.revenue.total)}</span>
            </div>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, borderLeft: `3px solid ${T.crimson}` }}>
            <SectionHeader title="EXPENSES" color={T.crimson} />
            {pnl.expenses.items.length === 0 ? <div style={{ fontSize: 12, color: T.t3 }}>No expenses recorded</div> : pnl.expenses.items.map(item => (
              <div key={item.code} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}22` }}>
                <span style={{ fontSize: 12 }}>{item.name}</span>
                <span style={{ ...mono, fontSize: 12, color: T.crimson, fontWeight: 600 }}>{fmt(item.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, fontWeight: 800 }}>
              <span style={{ fontSize: 13 }}>Total Expenses</span>
              <span style={{ ...mono, fontSize: 14, color: T.crimson }}>{fmt(pnl.expenses.total)}</span>
            </div>
          </div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <SectionHeader title="PROFIT & LOSS SUMMARY" />
          {[
            { label: "Gross Revenue", value: pnl.revenue.total, color: T.emerald, bold: true },
            { label: "Less: Cost of Goods Sold", value: -pnl.cogs, color: T.crimson },
            { label: "Gross Profit", value: pnl.grossProfit, color: pnl.grossProfit >= 0 ? T.emerald : T.crimson, bold: true, badge: `${pnl.grossMarginPct}%` },
            { label: "Less: Operating Expenses", value: -pnl.operatingExpenses, color: T.crimson },
            { label: "Operating Profit", value: pnl.operatingProfit, color: pnl.operatingProfit >= 0 ? T.emerald : T.crimson, bold: true },
            { label: "Net Profit / Loss", value: pnl.netProfit, color: pnl.netProfit >= 0 ? T.emerald : T.crimson, bold: true, large: true, badge: `${pnl.netMarginPct}%` },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: row.large ? "12px 0" : "6px 0", borderBottom: row.bold ? `1px solid ${T.border}` : "none" }}>
              <span style={{ fontSize: row.large ? 15 : 13, fontWeight: row.bold ? 800 : 500 }}>{row.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {row.badge && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: row.color + "18", color: row.color, fontWeight: 700 }}>{row.badge}</span>}
                <span style={{ ...mono, fontSize: row.large ? 18 : 14, fontWeight: row.bold ? 800 : 600, color: row.color }}>{row.value < 0 ? "(" + fmt(Math.abs(row.value)) + ")" : fmt(row.value)}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <SectionHeader title="REVENUE vs EXPENSES" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" tick={{ fill: T.t3, fontSize: 11 }} />
              <YAxis tick={{ fill: T.t3, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: FONT.mono }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    const pieData = [
      ...bs.assets.currentAssets.filter(a => a.amount > 0).map(a => ({ name: a.name, value: a.amount })),
      ...bs.assets.fixedAssets.filter(a => a.amount > 0).map(a => ({ name: a.name, value: a.amount })),
    ];
    const PIE_COLORS = [T.sky, T.emerald, T.amber, "#A78BFA", "#FB923C", T.crimson, "#2DD4BF", "#818CF8"];

    const BSSection = ({ title, items, total, color }) => (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color, padding: "6px 0", borderBottom: `1px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>
        {items.map(item => (
          <div key={item.code} style={{ display: "flex", justifyContent: "space-between", padding: "5px 12px" }}>
            <span style={{ fontSize: 12, color: item.code === "AC001" || item.code === "AC002" ? T.amber : T.t1 }}>{item.name}</span>
            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: item.amount > 0 ? drColor : item.amount < 0 ? T.crimson : T.t4 }}>{fmt(Math.abs(item.amount))}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderTop: `1px solid ${T.border}`, fontWeight: 700 }}>
          <span style={{ fontSize: 12 }}>Subtotal</span>
          <span style={{ ...mono, fontSize: 13, fontWeight: 700, color }}>{fmt(total)}</span>
        </div>
      </div>
    );

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, borderLeft: `3px solid ${T.crimson}` }}>
            <SectionHeader title="LIABILITIES & CAPITAL" color={T.crimson} />
            <BSSection title="Capital" items={bs.capital.items} total={bs.capital.total} color="#A78BFA" />
            <BSSection title="Current Liabilities" items={bs.liabilities.currentLiabilities} total={bs.liabilities.totalCurrentLiabilities} color={T.crimson} />
            <BSSection title="Long-term Liabilities" items={bs.liabilities.longTermLiabilities} total={bs.liabilities.totalLongTermLiabilities} color="#FB923C" />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: T.surface, borderRadius: 8, marginTop: 8, fontWeight: 800 }}>
              <span style={{ fontSize: 14 }}>Total Liabilities & Capital</span>
              <span style={{ ...mono, fontSize: 15, color: T.crimson }}>{fmt(bs.totalLiabilitiesAndCapital)}</span>
            </div>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, borderLeft: `3px solid ${T.sky}` }}>
            <SectionHeader title="ASSETS" color={T.sky} />
            <BSSection title="Fixed Assets" items={bs.assets.fixedAssets} total={bs.assets.totalFixedAssets} color="#A78BFA" />
            <BSSection title="Current Assets" items={bs.assets.currentAssets} total={bs.assets.totalCurrentAssets} color={T.sky} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: T.surface, borderRadius: 8, marginTop: 8, fontWeight: 800 }}>
              <span style={{ fontSize: 14 }}>Total Assets</span>
              <span style={{ ...mono, fontSize: 15, color: T.sky }}>{fmt(bs.assets.totalAssets)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, gap: 8 }}>
          {bs.isBalanced ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: T.emerald, background: T.emeraldBg, padding: "8px 20px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>✓ Assets = Liabilities + Capital — Balance Sheet is Balanced</span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: T.crimson, background: T.crimsonBg, padding: "8px 20px", borderRadius: 8 }}>⚠ Difference: {fmt(Math.abs(bs.assets.totalAssets - bs.totalLiabilitiesAndCapital))}</span>
          )}
        </div>

        {pieData.length > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <SectionHeader title="ASSET COMPOSITION" color={T.sky} />
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: FONT.mono }} formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderCashFlow = () => {
    const cf = computeCashFlow(journalEntries, startTs, endTs);

    const CFSection = ({ title, items, net, color }) => (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, borderLeft: `3px solid ${color}`, marginBottom: 12 }}>
        <SectionHeader title={title} color={color} />
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}22` }}>
            <span style={{ fontSize: 12 }}>{item.label}</span>
            <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: item.amount >= 0 ? T.emerald : T.crimson }}>{item.amount >= 0 ? fmt(item.amount) : "(" + fmt(Math.abs(item.amount)) + ")"}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, fontWeight: 800 }}>
          <span style={{ fontSize: 13 }}>Net</span>
          <span style={{ ...mono, fontSize: 14, color: net >= 0 ? T.emerald : T.crimson }}>{net >= 0 ? fmt(net) : "(" + fmt(Math.abs(net)) + ")"}</span>
        </div>
      </div>
    );

    return (
      <div>
        <CFSection title="A. Operating Activities" items={cf.operating.items} net={cf.operating.net} color={T.emerald} />
        <CFSection title="B. Investing Activities" items={cf.investing.items} net={cf.investing.net} color={T.sky} />
        <CFSection title="C. Financing Activities" items={cf.financing.items} net={cf.financing.net} color="#A78BFA" />

        <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          {[
            { label: "Net Cash Flow (A + B + C)", value: cf.netCashFlow, color: cf.netCashFlow >= 0 ? T.emerald : T.crimson },
            { label: "Opening Cash Balance", value: cf.openingCash, color: T.t2 },
            { label: "Closing Cash Balance", value: cf.closingCash, color: cf.closingCash >= 0 ? T.amber : T.crimson, bold: true },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
              <span style={{ fontSize: 13, fontWeight: row.bold ? 800 : 600 }}>{row.label}</span>
              <span style={{ ...mono, fontSize: row.bold ? 16 : 13, fontWeight: row.bold ? 800 : 600, color: row.color }}>{row.value >= 0 ? fmt(row.value) : "(" + fmt(Math.abs(row.value)) + ")"}</span>
            </div>
          ))}
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <SectionHeader title="DAILY CASH BALANCE TREND" color={T.amber} />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyCash} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" tick={{ fill: T.t3, fontSize: 9 }} interval={4} />
              <YAxis tick={{ fill: T.t3, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: FONT.mono }} formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="cash" stroke={T.amber} fill={T.amberGlow} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCostSheet = () => {
    const cs = computeCostSheet(movements, products, activeShopId, startTs, endTs);

    const CostRow = ({ label, value, indent = 0, bold, color, formula, highlight }) => (
      <div style={{
        display: "flex", justifyContent: "space-between", padding: "7px 16px", paddingLeft: 16 + indent * 20,
        background: highlight ? highlight + "11" : "transparent",
        borderBottom: `1px solid ${T.border}22`, borderLeft: bold ? `3px solid ${color || T.amber}` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {formula && <span style={{ ...mono, fontSize: 10, color: T.t4, fontWeight: 600 }}>{formula}</span>}
          <span style={{ fontSize: bold ? 13 : 12, fontWeight: bold ? 800 : 500, color: color || T.t1 }}>{label}</span>
        </div>
        <span style={{ ...mono, fontSize: bold ? 14 : 12, fontWeight: bold ? 800 : 600, color: color || T.t1 }}>{fmt(value)}</span>
      </div>
    );

    return (
      <div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <CostRow label="Opening Stock" value={cs.openingStockValue} indent={0} />
          <CostRow label="Add: Purchases" value={cs.purchases} indent={0} formula="+" />
          <CostRow label="Less: Purchase Returns" value={cs.purchaseReturns} indent={0} formula="−" />
          <CostRow label="Cost of Materials Available" value={cs.costOfMaterialsAvailable} bold color={T.t2} formula="=" />
          <CostRow label="Less: Closing Stock" value={cs.closingStockValue} indent={0} formula="−" />
          <CostRow label="Materials Consumed" value={cs.materialsConsumed} bold highlight={T.amber} formula="=" />
          <CostRow label="Add: Direct Expenses (Delivery)" value={cs.directExpenses} indent={0} formula="+" />
          <CostRow label="Prime Cost" value={cs.primeCost} bold color={T.amber} formula="=" />
          <CostRow label="Add: Factory/Workshop Overheads (5%)" value={cs.factoryOverheads} indent={1} formula="+" />
          <CostRow label="Works Cost" value={cs.worksCost} bold formula="=" />
          <CostRow label="Add: Admin Overheads (8%)" value={cs.adminOverheads} indent={1} formula="+" />
          <CostRow label="Cost of Production" value={cs.costOfProduction} bold formula="=" />
          <CostRow label="Add: Selling & Distribution (3%)" value={cs.sellingDistribution} indent={1} formula="+" />
          <CostRow label="Total Cost of Sales" value={cs.totalCost} bold color={T.sky} highlight={T.sky} formula="=" />
          <CostRow label="Add: Profit / Loss" value={cs.profit} indent={0} color={cs.profit >= 0 ? T.emerald : T.crimson} formula="+" />
          <CostRow label="Sales Revenue" value={cs.salesRevenue} bold color={T.emerald} highlight={T.emerald} formula="=" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Units Sold</div>
            <div style={{ ...mono, fontSize: 20, fontWeight: 800, color: T.amber }}>{cs.totalUnitsSold}</div>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Cost per Unit</div>
            <div style={{ ...mono, fontSize: 20, fontWeight: 800, color: T.sky }}>{fmt(cs.costPerUnit)}</div>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Profit per Unit</div>
            <div style={{ ...mono, fontSize: 20, fontWeight: 800, color: cs.profitPerUnit >= 0 ? T.emerald : T.crimson }}>{fmt(cs.profitPerUnit)}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderOutstanding = () => {
    const aging = computeOutstandingAging(movements, parties, activeShopId);
    const agingColors = { "0-30": T.emerald, "31-60": T.amber, "61-90": T.crimson, "90+": T.crimson };

    const barData = [
      { name: "0-30d", Receivable: aging.receivableAging["0-30"], Payable: aging.payableAging["0-30"] },
      { name: "31-60d", Receivable: aging.receivableAging["31-60"], Payable: aging.payableAging["31-60"] },
      { name: "61-90d", Receivable: aging.receivableAging["61-90"], Payable: aging.payableAging["61-90"] },
      { name: "90+d", Receivable: aging.receivableAging["90+"], Payable: aging.payableAging["90+"] },
    ];

    const exportOutstandingCSV = () => {
      const headers = ["Type", "Party Name", "Phone", "Total Due", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days"];
      const rows = [
        ...aging.receivables.map(r => ["Receivable", r.name, r.phone, r.total, r["0-30"], r["31-60"], r["61-90"], r["90+"]]),
        ...aging.payables.map(p => ["Payable", p.name, "", p.total, p["0-30"], p["31-60"], p["61-90"], p["90+"]]),
      ];
      downloadCSV(`outstanding_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
    };

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <StatCard label="Total Receivable" value={fmt(aging.totalReceivable)} color={T.sky} icon="📥" />
          <StatCard label="Total Payable" value={fmt(aging.totalPayable)} color={T.crimson} icon="📤" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <Btn size="sm" variant="ghost" onClick={exportOutstandingCSV}>📥 Export CSV</Btn>
        </div>

        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="RECEIVABLES (Who Owes Us)" color={T.sky} />
          {aging.receivables.length === 0 ? <div style={{ fontSize: 12, color: T.t3, padding: "12px 0" }}>No outstanding receivables</div> : (
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <TableRow header>
                <span style={{ flex: 1 }}>Party Name</span>
                <span style={{ width: 90 }}>Phone</span>
                <span style={{ width: 90, textAlign: "right" }}>Total Due</span>
                <span style={{ width: 70, textAlign: "right" }}>0-30d</span>
                <span style={{ width: 70, textAlign: "right" }}>31-60d</span>
                <span style={{ width: 70, textAlign: "right" }}>61-90d</span>
                <span style={{ width: 70, textAlign: "right" }}>90+d</span>
                <span style={{ width: 80, textAlign: "right" }}>Last Paid</span>
                <span style={{ width: 60 }}></span>
              </TableRow>
              {aging.receivables.map((r, i) => (
                <TableRow key={r.name} even={i % 2 === 0}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ width: 90, fontSize: 11, color: T.t3 }}>{r.phone}</span>
                  <span style={{ width: 90, textAlign: "right", ...mono, fontSize: 12, fontWeight: 700, color: T.sky }}>{fmt(r.total)}</span>
                  {["0-30", "31-60", "61-90", "90+"].map(bucket => (
                    <span key={bucket} style={{ width: 70, textAlign: "right", ...mono, fontSize: 11, color: r[bucket] > 0 ? agingColors[bucket] : T.t4, fontWeight: bucket === "90+" && r[bucket] > 0 ? 800 : 500 }}>{r[bucket] > 0 ? fmt(r[bucket]) : "—"}</span>
                  ))}
                  <span style={{ width: 80, textAlign: "right", fontSize: 10, color: T.t3 }}>{r.lastPaymentDate ? fmtDate(r.lastPaymentDate) : "—"}</span>
                  <span style={{ width: 60, textAlign: "right" }}>
                    {r.phone && <a href={generateWhatsAppReminder(r.name, r.phone, r.total)} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.emerald, textDecoration: "none", fontWeight: 700 }}>📱 Remind</a>}
                  </span>
                </TableRow>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="PAYABLES (What We Owe)" color={T.crimson} />
          {aging.payables.length === 0 ? <div style={{ fontSize: 12, color: T.t3, padding: "12px 0" }}>No outstanding payables</div> : (
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <TableRow header>
                <span style={{ flex: 1 }}>Vendor Name</span>
                <span style={{ width: 100, textAlign: "right" }}>Total Due</span>
                <span style={{ width: 80, textAlign: "right" }}>0-30d</span>
                <span style={{ width: 80, textAlign: "right" }}>31-60d</span>
                <span style={{ width: 80, textAlign: "right" }}>61-90d</span>
                <span style={{ width: 80, textAlign: "right" }}>90+d</span>
              </TableRow>
              {aging.payables.map((p, i) => (
                <TableRow key={p.name} even={i % 2 === 0}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ width: 100, textAlign: "right", ...mono, fontSize: 12, fontWeight: 700, color: T.crimson }}>{fmt(p.total)}</span>
                  {["0-30", "31-60", "61-90", "90+"].map(bucket => (
                    <span key={bucket} style={{ width: 80, textAlign: "right", ...mono, fontSize: 11, color: p[bucket] > 0 ? agingColors[bucket] : T.t4 }}>{p[bucket] > 0 ? fmt(p[bucket]) : "—"}</span>
                  ))}
                </TableRow>
              ))}
            </div>
          )}
        </div>

        {barData.some(d => d.Receivable > 0 || d.Payable > 0) && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <SectionHeader title="AGING DISTRIBUTION" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="name" tick={{ fill: T.t3, fontSize: 11 }} />
                <YAxis tick={{ fill: T.t3, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: FONT.mono }} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Receivable" fill={T.sky} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Payable" fill={T.crimson} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderRatios = () => {
    const ratios = computeFinancialRatios(journalEntries, products, parties, movements, activeShopId);

    const ratioCards = [
      { name: "Current Ratio", value: ratios.currentRatio, unit: "x", benchmark: 2.0, desc: "Current Assets / Current Liabilities" },
      { name: "Quick Ratio", value: ratios.quickRatio, unit: "x", benchmark: 1.0, desc: "(Current Assets - Inventory) / Current Liabilities" },
      { name: "Gross Profit Margin", value: ratios.grossProfitMargin, unit: "%", benchmark: 25, desc: "Gross Profit / Revenue" },
      { name: "Net Profit Margin", value: ratios.netProfitMargin, unit: "%", benchmark: 10, desc: "Net Profit / Revenue" },
      { name: "Inventory Turnover", value: ratios.inventoryTurnover, unit: "x", benchmark: 6.0, desc: "COGS / Average Inventory" },
      { name: "Receivable Days", value: ratios.receivableDays, unit: " days", benchmark: 30, desc: "(Receivables / Revenue) × 365", invertBenchmark: true },
      { name: "Payable Days", value: ratios.payableDays, unit: " days", benchmark: 45, desc: "(Payables / COGS) × 365" },
      { name: "Return on Assets", value: ratios.roa, unit: "%", benchmark: 10, desc: "Net Profit / Total Assets" },
      { name: "Debt to Equity", value: ratios.debtToEquity, unit: "x", benchmark: 1.5, desc: "Total Debt / Total Equity", invertBenchmark: true },
      { name: "Stock Velocity", value: ratios.stockVelocity, unit: "x", benchmark: 4.0, desc: "Revenue / Inventory Value" },
    ];

    const getStatus = (card) => {
      if (card.invertBenchmark) {
        if (card.value <= card.benchmark * 0.8) return { label: "HEALTHY", color: T.emerald };
        if (card.value <= card.benchmark * 1.2) return { label: "CAUTION", color: T.amber };
        return { label: "CRITICAL", color: T.crimson };
      }
      if (card.value >= card.benchmark) return { label: "HEALTHY", color: T.emerald };
      if (card.value >= card.benchmark * 0.6) return { label: "CAUTION", color: T.amber };
      return { label: "CRITICAL", color: T.crimson };
    };

    const healthScore = Math.round(ratioCards.reduce((s, c) => {
      const status = getStatus(c);
      return s + (status.label === "HEALTHY" ? 10 : status.label === "CAUTION" ? 5 : 2);
    }, 0));

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {ratioCards.map(card => {
            const status = getStatus(card);
            const pct = Math.min((card.value / (card.benchmark * 2)) * 100, 100);
            return (
              <div key={card.name} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{card.name}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{card.desc}</div>
                  </div>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: status.color + "18", color: status.color, fontWeight: 800 }}>{status.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                  <span style={{ ...mono, fontSize: 26, fontWeight: 800, color: status.color }}>{card.value}</span>
                  <span style={{ fontSize: 12, color: T.t3 }}>{card.unit}</span>
                </div>
                <div style={{ fontSize: 10, color: T.t3, marginBottom: 6 }}>Industry avg: {card.benchmark}{card.unit}</div>
                <div style={{ height: 4, background: T.surface, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: status.color, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: `linear-gradient(135deg, ${T.card}, ${T.surface})`, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Financial Health Score</div>
          <div style={{ ...mono, fontSize: 48, fontWeight: 900, color: healthScore >= 70 ? T.emerald : healthScore >= 40 ? T.amber : T.crimson }}>{healthScore}<span style={{ fontSize: 20, color: T.t3 }}>/100</span></div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Based on weighted ratio performance</div>
          <div style={{ width: 200, height: 6, background: T.surface, borderRadius: 3, margin: "12px auto 0", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${healthScore}%`, background: healthScore >= 70 ? T.emerald : healthScore >= 40 ? T.amber : T.crimson, borderRadius: 3, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case "coa": return renderCOA();
      case "daybook": return renderDayBook();
      case "ledger": return renderLedger();
      case "tb": return renderTrialBalance();
      case "pnl": return renderPnL();
      case "bs": return renderBalanceSheet();
      case "cf": return renderCashFlow();
      case "cs": return renderCostSheet();
      case "outstanding": return renderOutstanding();
      case "ratios": return renderRatios();
      default: return null;
    }
  };

  const fyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  return (
    <div className="page-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>📒</span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>Accounting & Finance</h1>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>FY {fyStart}-{String(fyStart + 1).slice(2)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div>
            <label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 140, ...mono, fontSize: 11 }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputStyle, width: 140, ...mono, fontSize: 11 }} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: T.emerald, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue</div>
          <div style={{ ...mono, fontSize: 22, fontWeight: 800, color: T.emerald, marginTop: 4 }}>{fmt(pnl.revenue.total)}</div>
        </div>
        <div style={{ background: T.crimsonBg, border: `1px solid ${T.crimson}33`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: T.crimson, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Expenses</div>
          <div style={{ ...mono, fontSize: 22, fontWeight: 800, color: T.crimson, marginTop: 4 }}>{fmt(pnl.expenses.total)}</div>
        </div>
        <div style={{ background: pnl.netProfit >= 0 ? T.amberGlow : T.crimsonBg, border: `1px solid ${pnl.netProfit >= 0 ? T.amber : T.crimson}33`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: pnl.netProfit >= 0 ? T.amber : T.crimson, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Net Profit</div>
          <div style={{ ...mono, fontSize: 22, fontWeight: 800, color: pnl.netProfit >= 0 ? T.amber : T.crimson, marginTop: 4 }}>{pnl.netProfit >= 0 ? fmt(pnl.netProfit) : "(" + fmt(Math.abs(pnl.netProfit)) + ")"}</div>
        </div>
        <div style={{ background: T.skyBg, border: `1px solid ${T.sky}33`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: T.sky, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cash Balance</div>
          <div style={{ ...mono, fontSize: 22, fontWeight: 800, color: T.sky, marginTop: 4 }}>{fmt(cashBal)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
            background: tab === t.key ? T.amberGlow : "transparent",
            color: tab === t.key ? T.amber : T.t3,
            border: `1px solid ${tab === t.key ? T.amber + "44" : T.border}`,
            whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}

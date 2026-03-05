import { useState, useEffect } from "react";
import { T, FONT } from "../theme";
import { Btn } from "../components/ui";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry"
];

const FIELD_STYLE = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
  padding: "10px 12px", color: T.t1, fontSize: 13, fontWeight: 500, fontFamily: FONT.ui,
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
};

const LABEL_STYLE = {
  fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", display: "block", marginBottom: 6,
};

const DEFAULT_COMPANY = {
  companyName: "",
  gstin: "",
  pan: "",
  state: "",
  address: "",
  phone: "",
  email: "",
  fyStart: "04",
  fyEnd: "03",
  logo: "",
};

export function SettingsPage({ toast }) {
  const [form, setForm] = useState(() => {
    try {
      const stored = localStorage.getItem("vl_company");
      return stored ? { ...DEFAULT_COMPANY, ...JSON.parse(stored) } : { ...DEFAULT_COMPANY };
    } catch {
      return { ...DEFAULT_COMPANY };
    }
  });

  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    try {
      localStorage.setItem("vl_company", JSON.stringify(form));
      setSaved(true);
      if (toast) toast("Company settings saved!", "success", "Settings Updated");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      if (toast) toast("Failed to save settings", "error", "Error");
    }
  };

  const handleReset = () => {
    if (confirm("Reset all company settings to defaults?")) {
      setForm({ ...DEFAULT_COMPANY });
      localStorage.removeItem("vl_company");
      if (toast) toast("Settings reset to defaults", "info", "Settings Reset");
    }
  };

  const fyLabel = () => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const startMonth = months[parseInt(form.fyStart, 10) - 1] || "Apr";
    const endMonth = months[parseInt(form.fyEnd, 10) - 1] || "Mar";
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() + 1 >= parseInt(form.fyStart, 10) ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    return `${startMonth} ${startYear} — ${endMonth} ${endYear}`;
  };

  return (
    <div className="page-in" style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: T.t1, letterSpacing: "-0.02em" }}>⚙️ Company Settings</h1>
          <p style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>Configure your company profile for invoices, GST reports & accounting</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" variant="ghost" onClick={handleReset}>Reset</Btn>
          <Btn size="sm" variant="amber" onClick={handleSave}>{saved ? "✓ Saved" : "Save Settings"}</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ gridColumn: "1 / -1", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.amber, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            🏢 Business Information
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={LABEL_STYLE}>Company Name</label>
              <input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="e.g. Sri Auto Parts Pvt. Ltd." style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>GSTIN</label>
              <input value={form.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())} placeholder="e.g. 29ABCDE1234F1Z5" maxLength={15} style={{ ...FIELD_STYLE, fontFamily: FONT.mono, letterSpacing: "0.05em" }} />
              {form.gstin && form.gstin.length !== 15 && (
                <div style={{ fontSize: 10, color: T.crimson, marginTop: 4 }}>GSTIN must be 15 characters</div>
              )}
            </div>
            <div>
              <label style={LABEL_STYLE}>PAN</label>
              <input value={form.pan} onChange={e => set("pan", e.target.value.toUpperCase())} placeholder="e.g. ABCDE1234F" maxLength={10} style={{ ...FIELD_STYLE, fontFamily: FONT.mono, letterSpacing: "0.05em" }} />
              {form.pan && form.pan.length !== 10 && (
                <div style={{ fontSize: 10, color: T.crimson, marginTop: 4 }}>PAN must be 10 characters</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.sky, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            📍 Address & Location
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>State</label>
              <select value={form.state} onChange={e => set("state", e.target.value)} style={{ ...FIELD_STYLE, cursor: "pointer" }}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Address</label>
              <textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full business address" rows={3} style={{ ...FIELD_STYLE, resize: "vertical", minHeight: 60 }} />
            </div>
          </div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.emerald, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            📞 Contact Details
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. +91 98765 43210" style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="e.g. billing@company.com" type="email" style={FIELD_STYLE} />
            </div>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.violet, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            📅 Financial Year Configuration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "end" }}>
            <div>
              <label style={LABEL_STYLE}>FY Start Month</label>
              <select value={form.fyStart} onChange={e => set("fyStart", e.target.value)} style={{ ...FIELD_STYLE, cursor: "pointer" }}>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => {
                  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                  return <option key={m} value={m}>{names[parseInt(m,10)-1]}</option>;
                })}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>FY End Month</label>
              <select value={form.fyEnd} onChange={e => set("fyEnd", e.target.value)} style={{ ...FIELD_STYLE, cursor: "pointer" }}>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => {
                  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                  return <option key={m} value={m}>{names[parseInt(m,10)-1]}</option>;
                })}
              </select>
            </div>
            <div style={{ background: T.surface, borderRadius: 10, padding: "10px 14px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current FY</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.violet, fontFamily: FONT.mono, marginTop: 2 }}>{fyLabel()}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.t3, marginBottom: 12 }}>Preview — Invoice Header</div>
        <div style={{ background: T.surface, borderRadius: 10, padding: 20, border: `1px solid ${T.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>{form.companyName || "Your Company Name"}</div>
          {form.address && <div style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>{form.address}</div>}
          <div style={{ fontSize: 11, color: T.t3, marginTop: 4, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {form.state && <span>📍 {form.state}</span>}
            {form.phone && <span>📞 {form.phone}</span>}
            {form.email && <span>✉ {form.email}</span>}
          </div>
          <div style={{ fontSize: 11, color: T.t4, marginTop: 6, fontFamily: FONT.mono, display: "flex", justifyContent: "center", gap: 20 }}>
            {form.gstin && <span>GSTIN: {form.gstin}</span>}
            {form.pan && <span>PAN: {form.pan}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

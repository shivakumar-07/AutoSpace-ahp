import React, { useState, useMemo, useCallback } from "react";
import { T, FONT } from "../theme";
import { useStore } from "../store";
import { Badge, Btn, Input, Select, StatCard, Divider, EmptyState } from "../components/ui";
import { fmt, daysAgo, uid, fmtDate } from "../utils";

const ROLE_CONFIG = {
    MANAGER: { color: T.violet, label: "Manager" },
    CASHIER: { color: T.amber, label: "Cashier" },
    MECHANIC: { color: T.sky, label: "Mechanic" },
    WAREHOUSE: { color: T.emerald, label: "Warehouse" },
};

const PERMISSIONS = [
    { key: "can_view_reports", label: "View Reports" },
    { key: "can_delete_items", label: "Delete Items" },
    { key: "can_override_price", label: "Override Price" },
    { key: "can_view_margin", label: "View Margin" },
    { key: "can_manage_udhaar", label: "Manage Udhaar" },
    { key: "can_do_billing", label: "Do Billing" },
    { key: "can_view_stock", label: "View Stock" },
    { key: "can_create_jobcards", label: "Create Job Cards" },
    { key: "can_view_parts", label: "View Parts" },
    { key: "can_receive_stock", label: "Receive Stock" },
    { key: "can_adjust_stock", label: "Adjust Stock" },
];

const ROLE_DEFAULTS = {
    MANAGER: ["can_view_reports", "can_delete_items", "can_override_price", "can_view_margin", "can_manage_udhaar", "can_do_billing", "can_view_stock", "can_create_jobcards", "can_view_parts", "can_receive_stock", "can_adjust_stock"],
    CASHIER: ["can_do_billing", "can_view_stock"],
    MECHANIC: ["can_create_jobcards", "can_view_parts", "can_view_stock"],
    WAREHOUSE: ["can_receive_stock", "can_adjust_stock", "can_view_stock"],
};

export default function StaffManagementPage({ movements, activeShopId, toast }) {
    const { staff, saveStaff } = useStore();
    const [activeTab, setActiveTab] = useState("list");
    const [editingStaff, setEditingStaff] = useState(null);
    const [expandedStaffId, setExpandedStaffId] = useState(null);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        role: "CASHIER",
        pin: "",
        isActive: true,
        permissions: [...ROLE_DEFAULTS.CASHIER]
    });

    const shopStaff = useMemo(() => staff?.filter(s => s.shopId === activeShopId) || [], [staff, activeShopId]);

    // Stats
    const totalStaff = shopStaff.length;
    const activeStaffCount = shopStaff.filter(s => s.isActive).length;
    const totalSalesToday = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        return movements
            .filter(m => m.shopId === activeShopId && m.type === "SALE" && m.date >= today)
            .reduce((sum, m) => sum + m.total, 0);
    }, [movements, activeShopId]);

    const handleEdit = (s) => {
        setEditingStaff(s);
        setForm({
            name: s.name,
            phone: s.phone,
            role: s.role,
            pin: s.pin,
            isActive: s.isActive,
            permissions: [...s.permissions]
        });
        setActiveTab("edit");
    };

    const handleRoleChange = (role) => {
        setForm(prev => ({
            ...prev,
            role,
            permissions: [...ROLE_DEFAULTS[role]]
        }));
    };

    const togglePermission = (perm) => {
        setForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const handleSave = () => {
        if (!form.name || form.phone.length !== 10 || form.pin.length !== 4) {
            toast("Please fill all required fields correctly (10-digit phone, 4-digit PIN)", "warning");
            return;
        }

        let nextStaff;
        if (editingStaff) {
            nextStaff = staff.map(s => s.id === editingStaff.id ? { ...s, ...form } : s);
            toast("Staff member updated", "success");
        } else {
            const newMember = {
                ...form,
                id: "st_" + uid(),
                shopId: activeShopId,
                joinedAt: Date.now(),
                salesCount: 0,
                totalSalesAmount: 0
            };
            nextStaff = [...staff, newMember];
            toast("Staff member added", "success");
        }
        saveStaff(nextStaff);
        setActiveTab("list");
        resetForm();
    };

    const resetForm = () => {
        setEditingStaff(null);
        setForm({
            name: "",
            phone: "",
            role: "CASHIER",
            pin: "",
            isActive: true,
            permissions: [...ROLE_DEFAULTS.CASHIER]
        });
    };

    const toggleStatus = (id) => {
        const next = staff.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
        saveStaff(next);
        toast("Status updated", "info");
    };

    return (
        <div className="page-in" style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: T.t1, marginBottom: 4 }}>Staff Management</h1>
                    <p style={{ color: T.t3 }}>Manage team members, roles and permissions</p>
                </div>
                {activeTab === "list" && (
                    <Btn onClick={() => { resetForm(); setActiveTab("edit"); }} icon="＋" intent="primary">Add New Staff</Btn>
                )}
            </div>

            <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
                <div style={{ flex: 1 }}><StatCard label="Total Staff" value={totalStaff} icon="👥" color={T.sky} /></div>
                <div style={{ flex: 1 }}><StatCard label="Active Now" value={activeStaffCount} icon="🟢" color={T.emerald} /></div>
                <div style={{ flex: 1 }}><StatCard label="Today's Staff Sales" value={fmt(totalSalesToday)} icon="💰" color={T.amber} /></div>
            </div>

            <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
                {["list", "edit", "roles"].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        style={{
                            padding: "12px 20px", background: "none", border: "none", cursor: "pointer",
                            color: activeTab === t ? T.amber : T.t3,
                            borderBottom: `2px solid ${activeTab === t ? T.amber : "transparent"}`,
                            fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em",
                            transition: "all 0.2s"
                        }}>
                        {t === "list" ? "Staff List" : t === "edit" ? (editingStaff ? "Edit Staff" : "Add Staff") : "Role Permissions"}
                    </button>
                ))}
            </div>

            {activeTab === "list" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
                    {shopStaff.length === 0 ? (
                        <div style={{ gridColumn: "1/-1" }}><EmptyState icon="👤" title="No staff members found" /></div>
                    ) : (
                        shopStaff.map(s => (
                            <div key={s.id} style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                                <div style={{ padding: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{s.name}</div>
                                            <Badge color={ROLE_CONFIG[s.role].color}>{ROLE_CONFIG[s.role].label}</Badge>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 12, color: T.t3 }}>{s.isActive ? "Active" : "Inactive"}</span>
                                                <div onClick={() => toggleStatus(s.id)}
                                                    style={{
                                                        width: 36, height: 20, borderRadius: 10, background: s.isActive ? T.emerald : T.border,
                                                        position: "relative", cursor: "pointer", transition: "0.2s"
                                                    }}>
                                                    <div style={{
                                                        width: 14, height: 14, borderRadius: "50%", background: "#fff",
                                                        position: "absolute", top: 3, left: s.isActive ? 19 : 3, transition: "0.2s"
                                                    }} />
                                                </div>
                                            </div>
                                            <Btn onClick={() => handleEdit(s)} size="sm" variant="subtle">Edit</Btn>
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Phone</div>
                                            <div style={{ fontSize: 14, color: T.t2, fontFamily: FONT.mono }}>{s.phone}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Joined</div>
                                            <div style={{ fontSize: 14, color: T.t2 }}>{daysAgo(s.joinedAt)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Total Sales</div>
                                            <div style={{ fontSize: 14, color: T.t1, fontWeight: 600, fontFamily: FONT.mono }}>{fmt(s.totalSalesAmount)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Sales Count</div>
                                            <div style={{ fontSize: 14, color: T.t1, fontWeight: 600, fontFamily: FONT.mono }}>{s.salesCount}</div>
                                        </div>
                                    </div>

                                    <Btn onClick={() => setExpandedStaffId(expandedStaffId === s.id ? null : s.id)} 
                                        variant="subtle" size="sm" block style={{ justifyContent: "center" }}>
                                        {expandedStaffId === s.id ? "Hide Activity" : "View Activity"}
                                    </Btn>
                                </div>

                                {expandedStaffId === s.id && (
                                    <div style={{ borderTop: `1px solid ${T.border}`, padding: 16, background: T.bg + "55" }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, marginBottom: 12, textTransform: "uppercase" }}>Last 10 Sales</div>
                                        {movements.filter(m => m.staffId === s.id && m.type === "SALE").slice(0, 10).length > 0 ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {movements.filter(m => m.staffId === s.id && m.type === "SALE").slice(0, 10).map(m => (
                                                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                                                        <div>
                                                            <span style={{ fontFamily: FONT.mono, color: T.amber, marginRight: 8 }}>{m.invoiceNo}</span>
                                                            <span style={{ color: T.t2 }}>{fmtDate(m.date)}</span>
                                                        </div>
                                                        <div style={{ fontWeight: 600, fontFamily: FONT.mono, color: T.t1 }}>{fmt(m.total)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: "center", padding: "12px 0", color: T.t4, fontSize: 13 }}>No recent sales activity</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "edit" && (
                <div style={{ maxWidth: 800, background: T.surface, borderRadius: 20, border: `1px solid ${T.border}`, padding: 32 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 8 }}>Full Name *</label>
                            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 8 }}>Phone Number (10 digits) *</label>
                            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" type="tel" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 8 }}>Role *</label>
                            <Select value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                                {Object.keys(ROLE_CONFIG).map(r => (
                                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 8 }}>4-Digit PIN *</label>
                            <Input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" type="password" />
                        </div>
                    </div>

                    <Divider label="Permissions" />
                    <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>Customize access for this team member</p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                        {PERMISSIONS.map(p => (
                            <label key={p.key} style={{ 
                                display: "flex", alignItems: "center", gap: 10, cursor: "pointer", 
                                padding: "10px 14px", background: T.bg + "88", borderRadius: 10,
                                border: `1px solid ${form.permissions.includes(p.key) ? T.amber + "44" : "transparent"}`,
                                transition: "0.2s"
                            }}>
                                <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePermission(p.key)}
                                    style={{ width: 16, height: 16, accentColor: T.amber }} />
                                <span style={{ fontSize: 14, color: form.permissions.includes(p.key) ? T.t1 : T.t3 }}>{p.label}</span>
                            </label>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <Btn onClick={() => { resetForm(); setActiveTab("list"); }} variant="subtle">Cancel</Btn>
                        <Btn onClick={handleSave} intent="primary">{editingStaff ? "Update Staff" : "Save Staff Member"}</Btn>
                    </div>
                </div>
            )}

            {activeTab === "roles" && (
                <div style={{ background: T.surface, borderRadius: 20, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: T.bg + "88" }}>
                                <th style={{ padding: "16px 24px", color: T.t3, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Permission</th>
                                {Object.keys(ROLE_CONFIG).map(r => (
                                    <th key={r} style={{ padding: "16px 24px", color: ROLE_CONFIG[r].color, fontWeight: 700, fontSize: 12, textTransform: "uppercase", textAlign: "center" }}>{ROLE_CONFIG[r].label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PERMISSIONS.map(p => (
                                <tr key={p.key} style={{ borderBottom: `1px solid ${T.border}` }}>
                                    <td style={{ padding: "16px 24px", color: T.t2, fontSize: 14, fontWeight: 500 }}>{p.label}</td>
                                    {Object.keys(ROLE_CONFIG).map(r => (
                                        <td key={r} style={{ padding: "16px 24px", textAlign: "center" }}>
                                            {ROLE_DEFAULTS[r].includes(p.key) ? (
                                                <span style={{ color: T.emerald, fontSize: 18 }}>✓</span>
                                            ) : (
                                                <span style={{ color: T.t4 }}>—</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ padding: 24, background: T.bg + "44" }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 20, background: T.skyBg, borderRadius: 12, border: `1px solid ${T.sky}33` }}>
                            <div style={{ fontSize: 24 }}>ℹ️</div>
                            <div>
                                <div style={{ fontWeight: 700, color: T.sky, marginBottom: 4 }}>How Staff Login Works</div>
                                <div style={{ fontSize: 14, color: T.t2, lineHeight: 1.5 }}>
                                    Each staff member has a unique 4-digit PIN. On the POS Billing page, the "Switch Staff" button allows team members to authenticate. 
                                    Sales are automatically linked to the logged-in staff for performance tracking. Individual permissions can be further customized in the "Edit Staff" tab.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

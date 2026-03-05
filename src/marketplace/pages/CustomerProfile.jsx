import { useMemo, useState } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, fmtDateTime, uid } from "../../utils";
import { Badge, Btn, Input, Select, StatCard, EmptyState, Divider } from "../../components/ui";
import { MANUFACTURERS, getModelsForMfg, getYearsForModel } from "../../vehicleData";

const S = {
    NEW: { label: "Order Placed", color: T.sky, icon: "📝" },
    ACCEPTED: { label: "Confirmed by Seller", color: "#2DD4BF", icon: "✓" },
    PACKED: { label: "Packed & Ready", color: T.amber, icon: "📦" },
    DISPATCHED: { label: "Out for Delivery", color: T.violet, icon: "🚚" },
    DELIVERED: { label: "Delivered", color: T.emerald, icon: "🎉" },
    CANCELLED: { label: "Cancelled", color: T.crimson, icon: "✕" },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

export function CustomerProfile() {
    const { orders, shops, garage, saveGarage, reminders, saveReminders, products, saveVehicle, selectedVehicle, saveCart } = useStore();
    const [activeTab, setActiveTab] = useState("orders"); // "orders" | "garage"

    // Detect marketplace orders: they have an address field OR payment mentions Escrow/COD/Prepaid
    // (shop-owner-entered offline sales never have an address field)
    const myOrders = useMemo(() =>
        (orders || [])
            .filter(o => o.address || o.payment?.includes("Escrow") || o.payment?.includes("COD") || o.payment?.includes("Prepaid"))
            .sort((a, b) => b.time - a.time),
        [orders]
    );

    const garageStats = useMemo(() => {
        const totalVehicles = garage?.length || 0;
        const totalSpent = myOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const activeReminders = reminders?.length || 0;
        return { totalVehicles, totalSpent, activeReminders };
    }, [garage, myOrders, reminders]);

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧔</div>
                <div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: T.t1 }}>My Profile</div>
                    <div style={{ fontSize: 14, color: T.t3, marginTop: 4 }}>+91 9876543210 • Hyderabad</div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 24, marginBottom: 32, borderBottom: `1px solid ${T.border}` }}>
                {["orders", "garage"].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        style={{
                            padding: "12px 0",
                            background: "none",
                            border: "none",
                            borderBottom: `2px solid ${activeTab === t ? T.amber : "transparent"}`,
                            color: activeTab === t ? T.t1 : T.t3,
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: "pointer",
                            textTransform: "capitalize"
                        }}
                    >
                        {t === "orders" ? "Order History" : "My Garage"}
                    </button>
                ))}
            </div>

            {activeTab === "orders" ? (
                <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, marginBottom: 16 }}>Order History & Tracking</div>
                    {myOrders.length === 0 ? (
                        <EmptyState
                            icon="📦"
                            title="No orders yet"
                            subtitle="When you check out from the marketplace, your orders will appear here."
                        />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {myOrders.map(o => {
                                const shop = shops?.find(s => s.id === o.shopId);
                                const m = S[o.status] || S.NEW;

                                const curIdx = FLOW.indexOf(o.status);
                                const isCancelled = o.status === "CANCELLED";

                                return (
                                    <div key={o.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ fontSize: 14, color: T.amber, fontWeight: 800, fontFamily: FONT.mono }}>{o.id}</span>
                                                    <span style={{ fontSize: 12, color: T.t3 }}>•</span>
                                                    <span style={{ fontSize: 12, color: T.t3 }}>{fmtDateTime(o.time)}</span>
                                                </div>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginTop: 8 }}>{shop?.name || "Auto Parts Shop"}</div>
                                                <div style={{ fontSize: 13, color: T.t2, marginTop: 4 }}>{o.items}</div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(o.total)}</div>
                                                <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{o.payment}</div>
                                            </div>
                                        </div>

                                        {/* Order Tracking Progress Bar */}
                                        <div style={{ background: T.bg, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${m.color}22`, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                                                    {m.icon}
                                                </div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{m.label}</div>
                                                {isCancelled && <div style={{ marginLeft: "auto", fontSize: 12, color: T.crimson }}>Refund processing...</div>}
                                            </div>

                                            {!isCancelled && (
                                                <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                                                    <div style={{ position: "absolute", top: 8, left: 16, right: 16, height: 2, background: T.border, zIndex: 0 }} />
                                                    {FLOW.map((step, i) => {
                                                        const active = i <= curIdx;
                                                        const stepState = S[step];
                                                        return (
                                                            <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 1 }}>
                                                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: active ? stepState.color : T.surface, border: `2px solid ${active ? stepState.color : T.border}`, transition: "all 0.3s" }} />
                                                                <div style={{ fontSize: 10, color: active ? T.t1 : T.t3, fontWeight: active ? 700 : 500 }}>{stepState.label}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        <StatCard label="Total Vehicles" value={garageStats.totalVehicles} icon="🚗" color={T.sky} />
                        <StatCard label="Total Spent" value={fmt(garageStats.totalSpent)} icon="💰" color={T.emerald} />
                        <StatCard label="Active Reminders" value={garageStats.activeReminders} icon="⏰" color={T.amber} />
                    </div>

                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, marginBottom: 20 }}>Add New Vehicle</div>
                        <AddVehicleForm onAdd={(v) => {
                            const newGarage = [...(garage || []), v];
                            saveGarage(newGarage);
                            if (newGarage.length === 1) {
                                saveVehicle(v);
                            }
                        }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>My Saved Vehicles</div>
                        {(!garage || garage.length === 0) ? (
                            <EmptyState
                                icon="🚗"
                                title="No vehicles in your garage"
                                subtitle="Add your first vehicle to get exact part recommendations."
                            />
                        ) : (
                            garage.map(v => (
                                <VehicleCard
                                    key={v.id}
                                    vehicle={v}
                                    isPrimary={selectedVehicle?.id === v.id}
                                    onSetPrimary={() => saveVehicle(v)}
                                    onRemove={() => saveGarage(garage.filter(x => x.id !== v.id))}
                                    orders={myOrders}
                                    products={products}
                                    reminders={reminders.filter(r => r.vehicleId === v.id)}
                                    onAddReminder={(rem) => saveReminders([...reminders, { ...rem, id: uid(), vehicleId: v.id }])}
                                    onAddToCart={(p) => saveCart([...(useStore().cart || []), { productId: p.id, qty: 1, shopId: p.shopId }])}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function AddVehicleForm({ onAdd }) {
    const [mfg, setMfg] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [variant, setVariant] = useState("");
    const [fuel, setFuel] = useState("");
    const [transmission, setTransmission] = useState("");

    const models = useMemo(() => mfg ? getModelsForMfg(mfg) : [], [mfg]);
    const years = useMemo(() => model ? getYearsForModel(model) : [], [model]);

    const handleSubmit = () => {
        if (!mfg || !model || !year) return;
        const brandName = MANUFACTURERS.find(m => m.id === mfg)?.name || mfg;
        const modelName = models.find(m => m.id === model)?.name || model;

        onAdd({
            id: uid(),
            brand: brandName,
            model: modelName,
            year,
            variant: variant || `${modelName} ${year}`,
            fuel,
            transmission
        });
        setMfg(""); setModel(""); setYear(""); setVariant(""); setFuel(""); setTransmission("");
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <Select
                label="Make"
                value={mfg}
                onChange={setMfg}
                options={MANUFACTURERS.map(m => ({ value: m.id, label: m.name }))}
            />
            <Select
                label="Model"
                value={model}
                disabled={!mfg}
                onChange={setModel}
                options={models.map(m => ({ value: m.id, label: m.name }))}
            />
            <Select
                label="Year"
                value={year}
                disabled={!model}
                onChange={setYear}
                options={years.map(y => ({ value: y, label: y }))}
            />
            <Input label="Variant" placeholder="e.g. VXI / ZXI+" value={variant} onChange={setVariant} />
            <Select
                label="Fuel Type"
                value={fuel}
                onChange={setFuel}
                options={[
                    { value: "Petrol", label: "Petrol" },
                    { value: "Diesel", label: "Diesel" },
                    { value: "CNG", label: "CNG" },
                    { value: "Electric", label: "Electric" }
                ]}
            />
            <Select
                label="Transmission"
                value={transmission}
                onChange={setTransmission}
                options={[
                    { value: "Manual", label: "Manual" },
                    { value: "Automatic", label: "Automatic" }
                ]}
            />
            <div style={{ gridColumn: "span 3", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Btn label="Add to Garage" icon="➕" onClick={handleSubmit} disabled={!mfg || !model || !year} />
            </div>
        </div>
    );
}

function VehicleCard({ vehicle, isPrimary, onSetPrimary, onRemove, orders, products, reminders, onAddReminder, onAddToCart }) {
    const [showHistory, setShowHistory] = useState(false);
    const [showReminderForm, setShowReminderForm] = useState(false);

    const vehicleOrders = useMemo(() => {
        // In a real app we'd link orders to vehicles. Here we just show some for the demo.
        return orders.slice(0, 2);
    }, [orders]);

    const totalSpent = vehicleOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const recommendations = useMemo(() => {
        return (products || []).slice(0, 3);
    }, [products]);

    return (
        <div style={{ background: T.card, border: `1px solid ${isPrimary ? T.amber : T.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🚗</div>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>{vehicle.year} {vehicle.brand} {vehicle.model}</div>
                            {isPrimary && <Badge label="Primary" color={T.amber} />}
                        </div>
                        <div style={{ fontSize: 14, color: T.t3, marginTop: 4 }}>{vehicle.variant} • {vehicle.fuel} • {vehicle.transmission}</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={onSetPrimary}
                        style={{ background: "none", border: "none", color: isPrimary ? T.amber : T.t4, fontSize: 20, cursor: "pointer" }}
                        title="Set as Primary"
                    >
                        ★
                    </button>
                    <button
                        onClick={onRemove}
                        style={{ background: "none", border: "none", color: T.crimson, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                    >
                        Remove
                    </button>
                </div>
            </div>

            <div style={{ px: 24, pb: 24, padding: "0 24px 24px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {reminders.map(r => (
                    <Badge key={r.id} label={`${r.type}: Due soon`} color={T.sky} />
                ))}
                <button
                    onClick={() => setShowReminderForm(!showReminderForm)}
                    style={{ background: `${T.amber}11`, border: `1px dashed ${T.amber}44`, color: T.amber, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                    + Set Reminder
                </button>
            </div>

            {showReminderForm && (
                <div style={{ padding: 24, background: T.bg, borderTop: `1px solid ${T.border}` }}>
                    <ReminderForm onAdd={(r) => { onAddReminder(r); setShowReminderForm(false); }} />
                </div>
            )}

            <div style={{ padding: "16px 24px", background: T.bg, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, color: T.t2 }}>Total Spent: <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: T.t1 }}>{fmt(totalSpent)}</span></div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{ background: "none", border: "none", color: T.sky, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                    {showHistory ? "Hide History ↑" : "View Service History ↓"}
                </button>
            </div>

            {showHistory && (
                <div style={{ padding: 24, background: T.bg, borderTop: `1px solid ${T.border}` }}>
                    {vehicleOrders.length === 0 ? (
                        <div style={{ textAlign: "center", color: T.t3, fontSize: 14 }}>No service records found.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {vehicleOrders.map(o => (
                                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: T.card, borderRadius: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{fmtDateTime(o.time)}</div>
                                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{o.items}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{fmt(o.total)}</div>
                                        <Badge label={o.status} color={T.sky} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ padding: 24, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, marginBottom: 16 }}>Parts you might need soon</div>
                <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }} className="custom-scroll">
                    {recommendations.map(p => (
                        <div key={p.id} style={{ width: 200, flexShrink: 0, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12 }}>
                            <div style={{ height: 100, background: T.card, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 8 }}>
                                {typeof p.image === 'string' && p.image.length < 4 ? p.image : "📦"}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: T.amber, fontFamily: FONT.mono, marginTop: 4 }}>{fmt(p.sellPrice)}</div>
                            <button
                                onClick={() => onAddToCart(p)}
                                style={{ width: "100%", marginTop: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.t1, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                                Add to Cart
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ReminderForm({ onAdd }) {
    const [type, setType] = useState("Oil Change");
    const [interval, setInterval] = useState("6");
    const [date, setDate] = useState("");

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Select
                label="Service Type"
                value={type}
                onChange={setType}
                options={[
                    { value: "Oil Change", label: "Oil Change" },
                    { value: "Brake Check", label: "Brake Check" },
                    { value: "Full Service", label: "Full Service" },
                    { value: "AC Service", label: "AC Service" },
                    { value: "Tyre Rotation", label: "Tyre Rotation" }
                ]}
            />
            <Input label="Interval (Months)" type="number" value={interval} onChange={setInterval} />
            <Input label="Last Service Date" type="date" value={date} onChange={setDate} />
            <div style={{ gridColumn: "span 3", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Btn label="Save Reminder" size="sm" onClick={() => onAdd({ type, interval, date })} />
            </div>
        </div>
    );
}


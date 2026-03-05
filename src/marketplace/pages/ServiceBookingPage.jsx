import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { Badge, Btn, Input, Select, StatCard, EmptyState } from "../../components/ui";
import { fmt, uid, fmtDate } from "../../utils";

const SPECIALTIES = [
  "Oil Change", "Brake Service", "AC Service", "Battery Replacement", 
  "Tyre Service", "Engine Diagnostics", "Full Service", "Denting & Painting", "Wheel Alignment"
];

const SPECIALTY_ICONS = {
  "Oil Change": "🛢️",
  "Brake Service": "🛑",
  "AC Service": "❄️",
  "Battery Replacement": "🔋",
  "Tyre Service": "🛞",
  "Engine Diagnostics": "💻",
  "Full Service": "🛠️",
  "Denting & Painting": "🎨",
  "Wheel Alignment": "⚖️"
};

const DEFAULT_CENTERS = [
  { 
    id: "sc1", 
    name: "Ravi Auto Works", 
    city: "Hyderabad", 
    rating: 4.7, 
    specialties: ["Oil Change", "Brake Service", "AC Service"], 
    distance: 1.2, 
    price_range: "₹500 - ₹5,000",
    openTime: "09:00",
    closeTime: "19:00",
    days: [1, 2, 3, 4, 5, 6]
  },
  { 
    id: "sc2", 
    name: "SpeedFix Garage", 
    city: "Hyderabad", 
    rating: 4.4, 
    specialties: ["Engine Repair", "Denting & Painting", "Full Service"], 
    distance: 2.8, 
    price_range: "₹800 - ₹15,000",
    openTime: "09:00",
    closeTime: "19:00",
    days: [1, 2, 3, 4, 5, 6]
  },
  { 
    id: "sc3", 
    name: "QuickLube Express", 
    city: "Hyderabad", 
    rating: 4.2, 
    specialties: ["Oil Change", "Tyre Rotation", "Battery Replacement"], 
    distance: 0.8, 
    price_range: "₹300 - ₹2,000",
    openTime: "09:00",
    closeTime: "19:00",
    days: [1, 2, 3, 4, 5, 6]
  },
  { 
    id: "sc4", 
    name: "AutoCare Pro", 
    city: "Hyderabad", 
    rating: 4.9, 
    specialties: ["Full Service", "AC Service", "Engine Diagnostics"], 
    distance: 4.1, 
    price_range: "₹1,200 - ₹20,000",
    openTime: "09:00",
    closeTime: "19:00",
    days: [1, 2, 3, 4, 5, 6]
  }
];

const SERVICE_PRICES = {
  "Oil Change": 800,
  "Brake Service": 1200,
  "AC Service": 1500,
  "Battery Replacement": 500,
  "Tyre Service": 600,
  "Engine Diagnostics": 1000,
  "Full Service": 3500,
  "Denting & Painting": 5000,
  "Wheel Alignment": 800,
  "Tyre Rotation": 400,
  "Engine Repair": 8000
};

function BookingPanel({ center, onConfirm, selectedVehicle }) {
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState(selectedVehicle || { brand: "", model: "", year: "", reg: "", odometer: "" });
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [pickupDrop, setPickupDrop] = useState(false);

  const totalEstimate = useMemo(() => {
    const base = selectedServices.reduce((acc, s) => acc + (SERVICE_PRICES[s] || 1000), 0);
    return base + (pickupDrop ? 200 : 0);
  }, [selectedServices, pickupDrop]);

  const slots = ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"];
  const fullSlots = ["11:00 AM"]; // Simulate some full slots

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div style={{ background: T.surface, padding: 20, borderRadius: 12, marginTop: 16, border: `1px solid ${T.borderHi}`, animation: "fadeUp 0.3s ease-out" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ height: 4, flex: 1, background: s <= step ? T.amber : T.border, borderRadius: 2 }} />
        ))}
      </div>

      {step === 1 && (
        <div className="fade-in">
          <h4 style={{ color: T.t1, marginBottom: 16 }}>Step 1: Vehicle Details</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Make/Brand" value={vehicle.brand} onChange={e => setVehicle({ ...vehicle, brand: e.target.value })} placeholder="e.g. Maruti Suzuki" />
            <Input label="Model" value={vehicle.model} onChange={e => setVehicle({ ...vehicle, model: e.target.value })} placeholder="e.g. Swift" />
            <Input label="Year" value={vehicle.year} onChange={e => setVehicle({ ...vehicle, year: e.target.value })} placeholder="2022" />
            <Input label="Reg Number" value={vehicle.reg} onChange={e => setVehicle({ ...vehicle, reg: e.target.value })} placeholder="TS 09 AB 1234" />
            <Input label="Odometer (km)" value={vehicle.odometer} onChange={e => setVehicle({ ...vehicle, odometer: e.target.value })} placeholder="45000" />
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={nextStep} disabled={!vehicle.brand || !vehicle.model}>Next Step</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <h4 style={{ color: T.t1, marginBottom: 16 }}>Step 2: Service Selection</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {center.specialties.map(s => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: T.card, borderRadius: 8, cursor: "pointer", border: `1px solid ${selectedServices.includes(s) ? T.amber : T.border}` }}>
                <input type="checkbox" checked={selectedServices.includes(s)} onChange={e => {
                  if (e.target.checked) setSelectedServices([...selectedServices, s]);
                  else setSelectedServices(selectedServices.filter(x => x !== s));
                }} />
                <span style={{ fontSize: 14, flex: 1 }}>{s}</span>
                <span style={{ fontSize: 13, color: T.amber, fontFamily: FONT.mono }}>{fmt(SERVICE_PRICES[s] || 1000)}</span>
              </label>
            ))}
          </div>
          <textarea 
            placeholder="Additional requests or issues..." 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, color: T.t1, minHeight: 80, fontFamily: FONT.ui }}
          />
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Btn variant="ghost" onClick={prevStep}>Back</Btn>
            <Btn onClick={nextStep} disabled={selectedServices.length === 0}>Next Step</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in">
          <h4 style={{ color: T.t1, marginBottom: 16 }}>Step 3: Slot Selection</h4>
          <div style={{ marginBottom: 20 }}>
            <Input type="date" label="Preferred Date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {slots.map(s => {
              const isFull = fullSlots.includes(s);
              return (
                <button 
                  key={s} 
                  disabled={isFull}
                  onClick={() => setSlot(s)}
                  style={{ 
                    padding: "10px 16px", borderRadius: 8, border: `1px solid ${slot === s ? T.amber : T.border}`,
                    background: slot === s ? `${T.amber}22` : T.card, color: isFull ? T.t4 : (slot === s ? T.amber : T.t1),
                    cursor: isFull ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700
                  }}
                >
                  {s} {isFull && "(Full)"}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Btn variant="ghost" onClick={prevStep}>Back</Btn>
            <Btn onClick={nextStep} disabled={!date || !slot}>Next Step</Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fade-in">
          <h4 style={{ color: T.t1, marginBottom: 16 }}>Step 4: Confirmation</h4>
          <div style={{ background: T.bg, padding: 16, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: T.t3, fontSize: 13 }}>Center</span>
              <span style={{ fontWeight: 700 }}>{center.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: T.t3, fontSize: 13 }}>Vehicle</span>
              <span style={{ fontWeight: 700 }}>{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: T.t3, fontSize: 13 }}>Slot</span>
              <span style={{ fontWeight: 700 }}>{fmtDate(new Date(date).getTime())} at {slot}</span>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Services</div>
              {selectedServices.map(s => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 14 }}>
                  <span>{s}</span>
                  <span style={{ fontFamily: FONT.mono }}>{fmt(SERVICE_PRICES[s] || 1000)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.card, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={pickupDrop} onChange={e => setPickupDrop(e.target.checked)} />
                <span style={{ fontSize: 13 }}>Request Pickup & Drop</span>
              </label>
              <span style={{ color: T.amber, fontSize: 12, fontWeight: 700 }}>+ ₹200</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.borderHi}`, paddingTop: 12 }}>
              <span style={{ fontWeight: 800 }}>Total Estimate</span>
              <span style={{ fontWeight: 900, color: T.emerald, fontSize: 18, fontFamily: FONT.mono }}>{fmt(totalEstimate)}</span>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Btn variant="ghost" onClick={prevStep}>Back</Btn>
            <Btn onClick={() => onConfirm({ centerId: center.id, centerName: center.name, vehicle, services: selectedServices, slot: { date, time: slot }, totalEstimate, pickupDrop })} variant="primary" size="lg" className="glow-amber">Confirm Booking</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceBookingPage({ onBack }) {
  const { selectedVehicle, toast } = useStore();
  const [centers, setCenters] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [bookingCenterId, setBookingCenterId] = useState(null);

  useEffect(() => {
    const storedCenters = localStorage.getItem("vl_service_centers");
    if (storedCenters) setCenters(JSON.parse(storedCenters));
    else {
      localStorage.setItem("vl_service_centers", JSON.stringify(DEFAULT_CENTERS));
      setCenters(DEFAULT_CENTERS);
    }

    const storedBookings = localStorage.getItem("vl_service_bookings");
    if (storedBookings) setBookings(JSON.parse(storedBookings));
  }, []);

  const filteredCenters = useMemo(() => {
    let res = [...centers];
    if (activeCategory) res = res.filter(c => c.specialties.includes(activeCategory));
    if (search) res = res.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.specialties.some(s => s.toLowerCase().includes(search.toLowerCase())));
    if (distanceFilter === "1") res = res.filter(c => c.distance <= 1);
    else if (distanceFilter === "3") res = res.filter(c => c.distance <= 3);
    else if (distanceFilter === "5") res = res.filter(c => c.distance <= 5);

    res.sort((a, b) => {
      if (sortBy === "distance") return a.distance - b.distance;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price") return parseInt(a.price_range.replace(/\D/g, "")) - parseInt(b.price_range.replace(/\D/g, ""));
      return 0;
    });

    return res;
  }, [centers, activeCategory, search, distanceFilter, sortBy]);

  const handleBookingConfirm = (data) => {
    const newBooking = {
      ...data,
      id: "BK" + uid(),
      status: 'CONFIRMED',
      bookedAt: Date.now()
    };
    const next = [newBooking, ...bookings];
    setBookings(next);
    localStorage.setItem("vl_service_bookings", JSON.stringify(next));
    setBookingCenterId(null);
    toast("Service booking confirmed successfully!", "success", "Booking Confirmed");
  };

  const updateBookingStatus = (id, status) => {
    const next = bookings.map(b => b.id === id ? { ...b, status } : b);
    setBookings(next);
    localStorage.setItem("vl_service_bookings", JSON.stringify(next));
    toast(`Booking status updated to ${status.toLowerCase()}`, "info", "Status Updated");
  };

  const isCenterOpen = (center) => {
    const now = new Date();
    const day = now.getDay();
    const time = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    return center.days.includes(day) && time >= center.openTime && time <= center.closeTime;
  };

  return (
    <div className="page-in" style={{ paddingBottom: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sky, fontWeight: 700, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>← Back to Home</button>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: T.t1, margin: 0 }}>Service Centers</h1>
          <p style={{ color: T.t3, marginTop: 4 }}>Professional vehicle care at your doorstep</p>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <Input 
              placeholder="Search by center name or service..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              prefix="🔍"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["all", "1", "3", "5"].map(d => (
              <button 
                key={d}
                onClick={() => setDistanceFilter(d)}
                style={{ 
                  padding: "10px 16px", borderRadius: 10, border: `1px solid ${distanceFilter === d ? T.sky : T.border}`,
                  background: distanceFilter === d ? `${T.sky}22` : T.card, color: distanceFilter === d ? T.sky : T.t2,
                  cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "0.2s"
                }}
              >
                {d === "all" ? "All Distance" : `< ${d}km`}
              </button>
            ))}
          </div>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0 16px", color: T.t1, fontWeight: 700, cursor: "pointer" }}
          >
            <option value="distance">Sort: Nearest</option>
            <option value="rating">Sort: Top Rated</option>
            <option value="price">Sort: Value for Money</option>
          </select>
        </div>

        {/* CATEGORIES ROW */}
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {SPECIALTIES.map(cat => (
            <div 
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              style={{ 
                minWidth: 120, padding: "16px 12px", borderRadius: 14, cursor: "pointer", 
                background: activeCategory === cat ? `${T.amber}15` : T.card,
                border: `1px solid ${activeCategory === cat ? T.amber : T.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "0.2s"
              }}
              className="mp-card-hover"
            >
              <span style={{ fontSize: 24 }}>{SPECIALTY_ICONS[cat]}</span>
              <span style={{ fontSize: 11, fontWeight: 800, textAlign: "center", color: activeCategory === cat ? T.amber : T.t1 }}>{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER LIST */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 60 }}>
        {filteredCenters.map(center => (
          <div key={center.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 24, padding: 24, flexWrap: "wrap" }}>
              <div style={{ width: 240, height: 160, background: `${T.surface}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                🏢
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, color: T.t1, margin: "0 0 4px 0" }}>{center.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ color: T.amber, fontWeight: 800 }}>★ {center.rating}</span>
                      <span style={{ color: T.t4 }}>•</span>
                      <span style={{ color: T.t3, fontSize: 14 }}>{center.city}</span>
                      <span style={{ color: T.t4 }}>•</span>
                      <span style={{ color: T.sky, fontWeight: 700, fontSize: 14 }}>{center.distance} km away</span>
                    </div>
                  </div>
                  <Badge variant={isCenterOpen(center) ? "success" : "neutral"}>{isCenterOpen(center) ? "OPEN NOW" : "CLOSED"}</Badge>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {center.specialties.map(s => (
                    <Badge key={s} variant="neutral" style={{ background: `${T.surface}`, color: T.t2 }}>{s}</Badge>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: T.t3, fontSize: 14 }}>
                    Est. Range: <span style={{ color: T.t1, fontWeight: 700, fontFamily: FONT.mono }}>{center.price_range}</span>
                  </div>
                  <Btn onClick={() => setBookingCenterId(bookingCenterId === center.id ? null : center.id)}>
                    {bookingCenterId === center.id ? "Cancel Booking" : "Book Service Now"}
                  </Btn>
                </div>
              </div>
            </div>
            {bookingCenterId === center.id && (
              <div style={{ padding: "0 24px 24px 24px" }}>
                <BookingPanel 
                  center={center} 
                  selectedVehicle={selectedVehicle}
                  onConfirm={handleBookingConfirm} 
                />
              </div>
            )}
          </div>
        ))}
        {filteredCenters.length === 0 && <EmptyState title="No centers found" desc="Try adjusting your filters or search query." />}
      </div>

      {/* MY BOOKINGS */}
      {bookings.length > 0 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: T.t1, marginBottom: 24 }}>My Bookings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
            {bookings.map(b => (
              <div key={b.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.t3, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>{b.id}</div>
                    <h4 style={{ fontSize: 18, fontWeight: 800 }}>{b.centerName}</h4>
                  </div>
                  <Badge variant={
                    b.status === 'CONFIRMED' ? 'sky' : 
                    b.status === 'IN_PROGRESS' ? 'amber' : 
                    b.status === 'COMPLETED' ? 'success' : 'crimson'
                  }>
                    {b.status}
                  </Badge>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {b.services.map(s => (
                    <span key={s} style={{ fontSize: 12, background: T.card, padding: "4px 8px", borderRadius: 4, color: T.t2 }}>{s}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: T.t3, marginBottom: 16 }}>
                  <span>📅 {fmtDate(new Date(b.slot.date).getTime())} at {b.slot.time}</span>
                  <span style={{ color: T.emerald, fontWeight: 700, fontFamily: FONT.mono }}>{fmt(b.totalEstimate)}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {b.status === 'CONFIRMED' && <Btn variant="ghost" size="sm" onClick={() => updateBookingStatus(b.id, 'CANCELLED')}>Cancel</Btn>}
                  {b.status === 'CONFIRMED' && <Btn size="sm" onClick={() => updateBookingStatus(b.id, 'COMPLETED')}>Mark as Completed</Btn>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

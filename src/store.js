import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { SEED_PRODUCTS, SEED_SHOPS, genSeededMovements, SEED_ORDERS, SEED_PURCHASES, SEED_PARTIES, SEED_VEHICLES, SEED_JOB_CARDS, uid, normalizeOrderStatus } from "./utils";

export const StoreContext = createContext(null);

export function useStoreProvider() {
    const [shops, setShops] = useState(null);
    const [products, setP] = useState(null);
    const [movements, setM] = useState(null);
    const [orders, setOrders] = useState(null);
    const [purchases, setPurchases] = useState(null);
    const [auditLog, setAuditLog] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [parties, setParties] = useState(null);
    const [vehicles, setVehicles] = useState(null);
    const [jobCards, setJobCards] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [returns, setReturns] = useState([]);
    const [garage, setGarage] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [notifications, setNotifications] = useState(null);
    const [rfqs, setRfqs] = useState(null);
    const [vendors, setVendors] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState(null);
    const [staff, setStaff] = useState(null);
    const [notifPrefs, setNotifPrefs] = useState({
        ORDER_NEW: true,
        LOW_STOCK: true,
        PAYMENT_DUE: true,
        RFQ_BID_RECEIVED: true
    });

    // Global User States
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [appMode, setAppMode] = useState("marketplace");
    const [activeShopId, setActiveShopId] = useState("s1");
    const [marketplacePage, setMarketplacePage] = useState("home");
    const [wishlist, setWishlist] = useState([]);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);

    const [loaded, setL] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const storedShops = localStorage.getItem("vl_shops");
                const storedProducts = localStorage.getItem("vl_products");
                const storedMovements = localStorage.getItem("vl_movements");
                const storedOrders = localStorage.getItem("vl_orders");
                const storedPurchases = localStorage.getItem("vl_purchases");
                const storedVehicle = localStorage.getItem("vl_vehicle");
                const storedCart = localStorage.getItem("vl_cart");
                const storedAppMode = localStorage.getItem("vl_appMode");
                const storedAuditLog = localStorage.getItem("vl_auditLog");
                const storedReceipts = localStorage.getItem("vl_receipts");
                const storedParties = localStorage.getItem("vl_parties");
                const storedVehicles = localStorage.getItem("vl_vehicles");
                const storedJobCards = localStorage.getItem("vl_jobCards");
                const storedReviews = localStorage.getItem("vl_reviews");
                const storedReturns = localStorage.getItem("vl_returns");
                const storedRfqs = localStorage.getItem("vl_rfqs");
                const storedVendors = localStorage.getItem("vl_vendors");
                const storedPurchaseOrders = localStorage.getItem("vl_purchase_orders");
                const storedGarage = localStorage.getItem("vl_garage");
                const storedReminders = localStorage.getItem("vl_reminders");
                const storedNotifications = localStorage.getItem("vl_notifications");
                const storedNotifPrefs = localStorage.getItem("vl_notif_prefs");
                const storedWishlist = localStorage.getItem("vl_wishlist");
                const storedStaff = localStorage.getItem("vl_staff");

                setShops(storedShops ? JSON.parse(storedShops) : SEED_SHOPS);
                setP(storedProducts ? JSON.parse(storedProducts) : SEED_PRODUCTS);
                setM(storedMovements ? JSON.parse(storedMovements) : genSeededMovements());
                setOrders(storedOrders ? JSON.parse(storedOrders) : SEED_ORDERS);
                setPurchases(storedPurchases ? JSON.parse(storedPurchases) : SEED_PURCHASES);
                setAuditLog(storedAuditLog ? JSON.parse(storedAuditLog) : []);
                setReceipts(storedReceipts ? JSON.parse(storedReceipts) : []);
                setParties(storedParties ? JSON.parse(storedParties) : SEED_PARTIES);
                setVehicles(storedVehicles ? JSON.parse(storedVehicles) : SEED_VEHICLES);
                setJobCards(storedJobCards ? JSON.parse(storedJobCards) : SEED_JOB_CARDS);
                setReviews(storedReviews ? JSON.parse(storedReviews) : []);
                setReturns(storedReturns ? JSON.parse(storedReturns) : []);
                setRfqs(storedRfqs ? JSON.parse(storedRfqs) : []);
                setVendors(storedVendors ? JSON.parse(storedVendors) : []);
                setPurchaseOrders(storedPurchaseOrders ? JSON.parse(storedPurchaseOrders) : []);
                setGarage(storedGarage ? JSON.parse(storedGarage) : []);
                setReminders(storedReminders ? JSON.parse(storedReminders) : []);

                if (storedStaff) {
                    setStaff(JSON.parse(storedStaff));
                } else {
                    const seedStaff = [
                        { id: "st1", shopId: "s1", name: "Suresh Kumar", phone: "9876543210", role: "CASHIER", permissions: ["can_do_billing", "can_view_stock"], isActive: true, pin: "1234", joinedAt: Date.now() - 90 * 86400000, lastLoginAt: Date.now() - 3600000, salesCount: 45, totalSalesAmount: 125000 },
                        { id: "st2", shopId: "s1", name: "Priya Sharma", role: "MANAGER", phone: "9876543211", permissions: ["can_view_reports", "can_delete_items", "can_override_price", "can_view_margin", "can_manage_udhaar", "can_do_billing", "can_view_stock", "can_create_jobcards", "can_view_parts", "can_receive_stock", "can_adjust_stock"], isActive: true, pin: "5678", joinedAt: Date.now() - 180 * 86400000, lastLoginAt: Date.now() - 7200000, salesCount: 12, totalSalesAmount: 48000 },
                        { id: "st3", shopId: "s1", name: "Ramesh Babu", role: "MECHANIC", phone: "9876543212", permissions: ["can_create_jobcards", "can_view_parts", "can_view_stock"], isActive: true, pin: "9012", joinedAt: Date.now() - 30 * 86400000, lastLoginAt: Date.now() - 10800000, salesCount: 0, totalSalesAmount: 0 }
                    ];
                    setStaff(seedStaff);
                    localStorage.setItem("vl_staff", JSON.stringify(seedStaff));
                }

                if (storedNotifications) {
                    setNotifications(JSON.parse(storedNotifications));
                } else {
                    const seedNotifs = [
                        { id: "n1", type: "ORDER_NEW", title: "New Order #ORD-X1", body: "Customer Rajesh placed an order for 2 items.", icon: "📦", timestamp: Date.now() - 3600000, read: false },
                        { id: "n2", type: "LOW_STOCK", title: "Low Stock Alert", body: "Brake Pads are below minimum stock level.", icon: "📉", timestamp: Date.now() - 7200000, read: false },
                        { id: "n3", type: "PAYMENT_DUE", title: "Payment Overdue", body: "Sri Durga Motors has a pending balance of ₹12,400.", icon: "💰", timestamp: Date.now() - 86400000, read: true },
                        { id: "n4", type: "RFQ_BID_RECEIVED", title: "New Bid Received", body: "Vendor 'Global Spares' bid on your RFQ #RFQ-001.", icon: "🤝", timestamp: Date.now() - 10800000, read: false },
                        { id: "n5", type: "SYSTEM", title: "System Update", body: "AutoMobile Space v2.4 is now live.", icon: "⚙️", timestamp: Date.now() - 172800000, read: true },
                    ];
                    setNotifications(seedNotifs);
                    localStorage.setItem("vl_notifications", JSON.stringify(seedNotifs));
                }
                if (storedNotifPrefs) setNotifPrefs(JSON.parse(storedNotifPrefs));

                if (storedVehicle) setSelectedVehicle(JSON.parse(storedVehicle));
                if (storedCart) setCart(JSON.parse(storedCart));
                if (storedWishlist) setWishlist(JSON.parse(storedWishlist));
                if (storedAppMode) setAppMode(storedAppMode);
            } catch {
                setShops(SEED_SHOPS);
                setP(SEED_PRODUCTS);
                setM(genSeededMovements());
                setOrders(SEED_ORDERS);
                setPurchases(SEED_PURCHASES);
                setAuditLog([]);
                setReceipts([]);
                setParties(SEED_PARTIES);
                setVehicles(SEED_VEHICLES);
                setJobCards(SEED_JOB_CARDS);
                setReviews([]);
            }
            setL(true);
        })();
    }, []);

    // Persistence helpers
    const saveShops = useCallback(d => { setShops(d); try { localStorage.setItem("vl_shops", JSON.stringify(d)); } catch { } }, []);
    const saveProducts = useCallback(d => { setP(d); try { localStorage.setItem("vl_products", JSON.stringify(d)); } catch { } }, []);
    const saveMovements = useCallback(d => { setM(d); try { localStorage.setItem("vl_movements", JSON.stringify(d)); } catch { } }, []);
    const saveOrders = useCallback(d => { setOrders(d); try { localStorage.setItem("vl_orders", JSON.stringify(d)); } catch { } }, []);
    const savePurchases = useCallback(d => { setPurchases(d); try { localStorage.setItem("vl_purchases", JSON.stringify(d)); } catch { } }, []);
    const saveAuditLog = useCallback(d => { setAuditLog(d); try { localStorage.setItem("vl_auditLog", JSON.stringify(d)); } catch { } }, []);
    const saveReceipts = useCallback(d => { setReceipts(d); try { localStorage.setItem("vl_receipts", JSON.stringify(d)); } catch { } }, []);
    const saveParties = useCallback(d => { setParties(d); try { localStorage.setItem("vl_parties", JSON.stringify(d)); } catch { } }, []);
    const saveVehicles = useCallback(d => { setVehicles(d); try { localStorage.setItem("vl_vehicles", JSON.stringify(d)); } catch { } }, []);
    const saveJobCards = useCallback(d => { setJobCards(d); try { localStorage.setItem("vl_jobCards", JSON.stringify(d)); } catch { } }, []);
    const saveRfqs = useCallback(d => { setRfqs(d); try { localStorage.setItem("vl_rfqs", JSON.stringify(d)); } catch { } }, []);
    const saveVendors = useCallback(d => { setVendors(d); try { localStorage.setItem("vl_vendors", JSON.stringify(d)); } catch { } }, []);
    const savePurchaseOrders = useCallback(d => { setPurchaseOrders(d); try { localStorage.setItem("vl_purchase_orders", JSON.stringify(d)); } catch { } }, []);
    const saveStaff = useCallback(d => { setStaff(d); try { localStorage.setItem("vl_staff", JSON.stringify(d)); } catch { } }, []);
    const saveReviews = useCallback(d => { setReviews(d); try { localStorage.setItem("vl_reviews", JSON.stringify(d)); } catch { } }, []);
    const saveReturns = useCallback(d => { setReturns(d); try { localStorage.setItem("vl_returns", JSON.stringify(d)); } catch { } }, []);
    const saveGarage = useCallback(d => { setGarage(d); try { localStorage.setItem("vl_garage", JSON.stringify(d)); } catch { } }, []);
    const saveReminders = useCallback(d => { setReminders(d); try { localStorage.setItem("vl_reminders", JSON.stringify(d)); } catch { } }, []);
    const saveNotifications = useCallback(d => { setNotifications(d); try { localStorage.setItem("vl_notifications", JSON.stringify(d)); } catch { } }, []);
    const saveNotifPrefs = useCallback(d => { setNotifPrefs(d); try { localStorage.setItem("vl_notif_prefs", JSON.stringify(d)); } catch { } }, []);
    const saveWishlist = useCallback(d => { setWishlist(d); try { localStorage.setItem("vl_wishlist", JSON.stringify(d)); } catch { } }, []);

    const saveCart = useCallback(d => { setCart(d); try { localStorage.setItem("vl_cart", JSON.stringify(d)); } catch { } }, []);
    const saveVehicle = useCallback(d => { setSelectedVehicle(d); try { localStorage.setItem("vl_vehicle", JSON.stringify(d)); } catch { } }, []);
    const saveAppMode = useCallback(d => { setAppMode(d); try { localStorage.setItem("vl_appMode", d); } catch { } }, []);

    const toggleCart = useCallback(() => { setIsCartOpen(prev => !prev); }, []);
    const toggleWishlist = useCallback(() => { setIsWishlistOpen(prev => !prev); }, []);

    // Audit Log helper — call this whenever a significant action happens
    const logAudit = useCallback((action, entityType, entityId, details) => {
        const entry = {
            id: "aud_" + uid(),
            timestamp: Date.now(),
            action,
            entityType,
            entityId,
            details: typeof details === "string" ? details : JSON.stringify(details),
        };
        setAuditLog(prev => {
            const next = [entry, ...prev].slice(0, 500); // keep last 500 entries
            try { localStorage.setItem("vl_auditLog", JSON.stringify(next)); } catch { }
            return next;
        });
    }, []);

    const resetAll = useCallback(async () => {
        setShops(SEED_SHOPS); setP(SEED_PRODUCTS); setM(genSeededMovements()); setOrders(SEED_ORDERS); setPurchases(SEED_PURCHASES);
        setCart([]); setSelectedVehicle(null); setAuditLog([]); setReceipts([]); setReviews([]); setGarage([]); setReminders([]);
        setParties(SEED_PARTIES); setVehicles(SEED_VEHICLES); setJobCards(SEED_JOB_CARDS);
        try {
            localStorage.setItem("vl_shops", JSON.stringify(SEED_SHOPS));
            localStorage.setItem("vl_products", JSON.stringify(SEED_PRODUCTS));
            localStorage.setItem("vl_movements", JSON.stringify(genSeededMovements()));
            localStorage.setItem("vl_orders", JSON.stringify(SEED_ORDERS));
            localStorage.setItem("vl_purchases", JSON.stringify(SEED_PURCHASES));
            localStorage.removeItem("vl_cart");
            localStorage.removeItem("vl_vehicle");
            localStorage.removeItem("vl_auditLog");
            localStorage.removeItem("vl_receipts");
            localStorage.setItem("vl_parties", JSON.stringify(SEED_PARTIES));
            localStorage.setItem("vl_vehicles", JSON.stringify(SEED_VEHICLES));
            localStorage.setItem("vl_jobCards", JSON.stringify(SEED_JOB_CARDS));
            localStorage.removeItem("vl_reviews");
            localStorage.removeItem("vl_garage");
            localStorage.removeItem("vl_reminders");
        } catch { }
    }, []);

    return {
        shops, products, movements, orders, purchases, auditLog, receipts, parties, vehicles, jobCards, reviews, returns, garage, reminders,
        rfqs, vendors, purchaseOrders, staff, wishlist, notifications, notifPrefs,
        saveShops, saveProducts, saveMovements, saveOrders, savePurchases, saveAuditLog, saveReceipts, saveParties, saveVehicles, saveJobCards, saveReviews, saveReturns, saveGarage, saveReminders,
        saveRfqs, saveVendors, savePurchaseOrders, saveStaff, saveWishlist, saveNotifications, saveNotifPrefs,
        cart, saveCart, isCartOpen, setIsCartOpen, toggleCart,
        wishlist, saveWishlist, isWishlistOpen, setIsWishlistOpen, toggleWishlist,
        selectedVehicle, saveVehicle,
        appMode, saveAppMode,
        activeShopId, setActiveShopId,
        marketplacePage, setMarketplacePage,
        logAudit, resetAll, loaded
    };
}

export function useStore() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error("useStore must be used within a StoreProvider");
    return ctx;
}

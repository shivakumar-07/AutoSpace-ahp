import { useState, useCallback, useEffect, useMemo } from "react";
import { T, FONT, GLOBAL_CSS } from "./theme";
import { fmt, uid, normalizeOrderStatus } from "./utils";
import { getNextVoucherNumber } from "./voucherNumbering";
import { useStore } from "./store";
import { Toast, useToast, Btn, NotificationBell } from "./components/ui";

// Modals
import { ProductModal } from "./components/ProductModal";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { POSBillingPage } from "./pages/POSBillingPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ReportsPage } from "./pages/ReportsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PartiesPage } from "./pages/PartiesPage";
import { WorkshopPage } from "./pages/WorkshopPage";
import VendorRFQPage from "./pages/VendorRFQPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffManagementPage from "./pages/StaffManagementPage";
import { AccountingPage } from "./pages/AccountingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PurchaseEntryPage } from "./pages/PurchaseEntryPage";
import { SalesDocumentsPage } from "./pages/SalesDocumentsPage";
import { MastersPage } from "./pages/MastersPage";

// Marketplace
import { MarketplaceHome } from "./marketplace/pages/MarketplaceHome";
import { ProductDetailsPage } from "./marketplace/pages/ProductDetailsPage";
import { CheckoutPage } from "./marketplace/pages/CheckoutPage";
import { OrderTrackingPage } from "./marketplace/pages/OrderTrackingPage";
import { CartDrawer } from "./marketplace/components/CartDrawer";
import { WishlistDrawer } from "./marketplace/components/WishlistDrawer";
import ServiceBookingPage from "./marketplace/pages/ServiceBookingPage";
import { CustomerProfile } from "./marketplace/pages/CustomerProfile";
import { PricingPage } from "./pages/PricingPage";

const NAV_ITEMS = [
  { key: "dashboard", icon: "◈", label: "Dashboard", shortcut: "D" },
  { key: "inventory", icon: "⬡", label: "Inventory", shortcut: "I" },
  { key: "pos", icon: "🧾", label: "POS Billing", shortcut: "P" },
  { key: "parties", icon: "👥", label: "Parties", shortcut: "A" },
  { key: "history", icon: "⊞", label: "History", shortcut: "H" },
  { key: "reports", icon: "📊", label: "Reports", shortcut: "R" },
  { key: "staff", icon: "👤", label: "Staff", shortcut: "T" },
  { key: "orders", icon: "◎", label: "Orders", shortcut: "O" },
  { key: "rfq", icon: "🤝", label: "RFQ / Procurement", shortcut: "Q" },
  { key: "purchase", icon: "📥", label: "Purchase", shortcut: "U" },
  { key: "salesdocs", icon: "📄", label: "Sales Docs", shortcut: "L" },
  { key: "masters", icon: "📋", label: "Masters", shortcut: "M" },
  { key: "accounting", icon: "📒", label: "Accounting", shortcut: "C" },
  { key: "settings", icon: "⚙️", label: "Settings", shortcut: "S" },
];

export default function App() {
  const {
    products, movements, orders, shops, parties, vehicles, jobCards,
    saveProducts, saveMovements, saveOrders, saveShops, saveParties, saveVehicles, saveJobCards,
    auditLog, receipts, saveReceipts,
    notifications, saveNotifications, notifPrefs, saveNotifPrefs,
    garage, saveGarage, reminders, saveReminders,
    rfqs, saveRfqs, vendors, saveVendors, purchaseOrders, savePurchaseOrders, grns, saveGrns,
    reviews, saveReviews, staff, saveStaff,
    loaded, activeShopId, marketplacePage, setMarketplacePage,
    logAudit, resetAll
  } = useStore();

  // --- AUTO-GENERATE NOTIFICATIONS ---
  useEffect(() => {
    if (!loaded || !notifications) return;

    let newNotifs = [...notifications];
    let changed = false;

    // 1. Low Stock
    if (notifPrefs.LOW_STOCK) {
      products.filter(p => p.shopId === activeShopId && p.stock < p.minStock).forEach(p => {
        const exists = notifications.find(n => n.type === 'LOW_STOCK' && n.entityId === p.id && !n.read);
        if (!exists) {
          newNotifs.unshift({
            id: 'notif_' + uid(),
            type: 'LOW_STOCK',
            title: 'Low Stock Alert',
            body: `${p.name} is running low (${p.stock} remaining)`,
            icon: '📉',
            timestamp: Date.now(),
            read: false,
            entityId: p.id
          });
          changed = true;
        }
      });
    }

    // 2. New Orders (Simulation: check orders since last 5 mins)
    if (notifPrefs.ORDER_NEW && orders) {
      orders.filter(o => o.shopId === activeShopId && o.createdAt > Date.now() - 300000).forEach(o => {
          const exists = notifications.find(n => n.type === 'ORDER_NEW' && n.entityId === o.id);
          if (!exists) {
              newNotifs.unshift({
                  id: 'notif_' + uid(),
                  type: 'ORDER_NEW',
                  title: 'New Online Order',
                  body: `Order ${o.id} received from ${o.customerName || 'Customer'}`,
                  icon: '📦',
                  timestamp: Date.now(),
                  read: false,
                  entityId: o.id
              });
              changed = true;
          }
      });
    }

    // 3. Payment Due (Parties with balance > credit limit)
    if (notifPrefs.PAYMENT_DUE && parties) {
        parties.filter(p => p.shopId === activeShopId && p.type === 'customer').forEach(p => {
            // Simple check for demo: if they have any movement with pending status
            const hasPending = movements.some(m => m.customerName === p.name && m.paymentStatus === 'pending');
            if (hasPending) {
                const exists = notifications.find(n => n.type === 'PAYMENT_DUE' && n.entityId === p.id && (Date.now() - n.timestamp < 86400000));
                if (!exists) {
                    newNotifs.unshift({
                        id: 'notif_' + uid(),
                        type: 'PAYMENT_DUE',
                        title: 'Payment Reminder',
                        body: `${p.name} has pending dues to settle.`,
                        icon: '💰',
                        timestamp: Date.now(),
                        read: false,
                        entityId: p.id
                    });
                    changed = true;
                }
            }
        });
    }

    const riData = localStorage.getItem("vl_recurring_invoices");
    if (riData) {
      try {
        const recurringInvoices = JSON.parse(riData);
        const RECURRENCE_DAYS = { monthly: 30, quarterly: 90, half_yearly: 182, yearly: 365 };
        const now = Date.now();
        let riUpdated = false;
        const updatedRIs = recurringInvoices.map(ri => {
          if (!ri.isActive || ri.shopId !== activeShopId) return ri;
          if (ri.endDate && now > ri.endDate) return ri;
          const intervalMs = (RECURRENCE_DAYS[ri.recurrence] || 30) * 86400000;
          const nextDue = ri.lastGeneratedDate
            ? ri.lastGeneratedDate + intervalMs
            : ri.startDate || ri.createdAt;
          if (now >= nextDue) {
            const exists = newNotifs.find(n => n.type === 'RECURRING_DUE' && n.entityId === ri.id && !n.read);
            if (!exists) {
              const total = (ri.items || []).reduce((s, i) => s + i.rate * i.qty, 0);
              newNotifs.unshift({
                id: 'notif_' + uid(),
                type: 'RECURRING_DUE',
                title: 'Recurring Invoice Due',
                body: `Recurring invoice for ${ri.customerName} (${fmt(total)}) is due for generation`,
                icon: '🔄',
                timestamp: now,
                read: false,
                entityId: ri.id
              });
              changed = true;
            }
          }
          return ri;
        });
        if (riUpdated) {
          localStorage.setItem("vl_recurring_invoices", JSON.stringify(updatedRIs));
        }
      } catch {}
    }

    if (changed) {
      saveNotifications(newNotifs.slice(0, 50));
    }
  }, [products, orders, parties, activeShopId, loaded]);
  useEffect(() => {
    if (!loaded || !notifications) return;
    const interval = setInterval(() => {
      // 4. RFQ Bids (Simulate random bid arrival if an RFQ exists)
      const storedRfqs = localStorage.getItem("vl_rfqs");
      if (storedRfqs && notifPrefs.RFQ_BID_RECEIVED) {
          const rfqs = JSON.parse(storedRfqs);
          const publishedRfq = rfqs.find(r => r.status === 'PUBLISHED' || r.status === 'BIDDING');
          if (publishedRfq && Math.random() > 0.8) {
              const exists = notifications.find(n => n.type === 'RFQ_BID_RECEIVED' && n.entityId === publishedRfq.id && (Date.now() - n.timestamp < 3600000));
              if (!exists) {
                  const newNotifs = [{
                      id: 'notif_' + uid(),
                      type: 'RFQ_BID_RECEIVED',
                      title: 'New Bid Received',
                      body: `You received a new bid on RFQ ${publishedRfq.id}`,
                      icon: '🤝',
                      timestamp: Date.now(),
                      read: false,
                      entityId: publishedRfq.id
                  }, ...notifications];
                  saveNotifications(newNotifs.slice(0, 50));
              }
          }
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [notifications, loaded, notifPrefs]);

  const [page, setPage] = useState("dashboard");
  const [pModal, setPModal] = useState({ open: false, product: null });
  const { items: toasts, add: toast, remove: removeToast } = useToast();

  const handleMarkNotifRead = useCallback((id) => {
    const next = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(next);
  }, [notifications, saveNotifications]);

  const handleClearNotifs = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  const handleMarkAllNotifsRead = useCallback(() => {
    const next = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(next);
  }, [notifications, saveNotifications]);

  const [showNotifPrefs, setShowNotifPrefs] = useState(false);

  const [activeStaffId, setActiveStaffId] = useState(() => {
    try { return localStorage.getItem("vl_active_staff_id") || null; } catch { return null; }
  });
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffPin, setStaffPin] = useState("");
  const [staffLoginError, setStaffLoginError] = useState("");

  const activeStaffMember = useMemo(() => {
    if (!activeStaffId || !staff) return null;
    return staff.find(s => s.id === activeStaffId) || null;
  }, [activeStaffId, staff]);

  const staffHasPermission = useCallback((perm) => {
    if (!activeStaffMember) return true;
    return activeStaffMember.permissions?.includes(perm) ?? false;
  }, [activeStaffMember]);

  const recordStaffSession = useCallback((staffMember, action, prevStaffId) => {
    try {
      const sessions = JSON.parse(localStorage.getItem("vl_staff_sessions") || "[]");
      const now = Date.now();
      let duration = "—";
      if (action === "LOGOUT" && prevStaffId) {
        const lastLogin = [...sessions].reverse().find(s => s.staffId === prevStaffId && s.action === "LOGIN");
        if (lastLogin) {
          const mins = Math.round((now - lastLogin.timestamp) / 60000);
          duration = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
        }
      }
      const entry = {
        staffId: staffMember.id,
        staffName: staffMember.name,
        role: staffMember.role,
        shopId: activeShopId,
        action,
        timestamp: now,
        duration: action === "LOGOUT" ? duration : "—"
      };
      const updated = [entry, ...sessions].slice(0, 500);
      localStorage.setItem("vl_staff_sessions", JSON.stringify(updated));
    } catch {}
  }, [activeShopId]);

  const handleStaffLogin = useCallback(() => {
    if (!staff || staffPin.length !== 4) {
      setStaffLoginError("Enter a 4-digit PIN");
      return;
    }
    const found = staff.find(s => s.pin === staffPin && s.shopId === activeShopId && s.isActive);
    if (!found) {
      setStaffLoginError("Invalid PIN or inactive staff");
      return;
    }
    if (activeStaffMember) {
      recordStaffSession(activeStaffMember, "LOGOUT", activeStaffMember.id);
    }
    setActiveStaffId(found.id);
    localStorage.setItem("vl_active_staff_id", found.id);
    recordStaffSession(found, "LOGIN");
    const updatedStaff = staff.map(s => s.id === found.id ? { ...s, lastLoginAt: Date.now() } : s);
    saveStaff(updatedStaff);
    setStaffPin("");
    setStaffLoginError("");
    setShowStaffLogin(false);
    toast(`Logged in as ${found.name} (${found.role})`, "success", "Staff Login");
  }, [staff, staffPin, activeShopId, activeStaffMember, recordStaffSession, saveStaff, toast]);

  const handleStaffLogout = useCallback(() => {
    if (activeStaffMember) {
      recordStaffSession(activeStaffMember, "LOGOUT", activeStaffMember.id);
    }
    setActiveStaffId(null);
    localStorage.removeItem("vl_active_staff_id");
    toast("Staff logged out", "info", "Logged Out");
  }, [activeStaffMember, recordStaffSession, toast]);

  const filteredNavItems = useMemo(() => {
    if (!activeStaffMember) return NAV_ITEMS;
    const role = activeStaffMember.role;
    const perms = activeStaffMember.permissions || [];
    if (role === "CASHIER") {
      return NAV_ITEMS.filter(n => ["pos", "inventory", "staff"].includes(n.key));
    }
    if (role === "MANAGER") {
      return NAV_ITEMS.filter(n => n.key !== "accounting");
    }
    if (role === "MECHANIC") {
      return NAV_ITEMS.filter(n => ["dashboard", "inventory", "staff"].includes(n.key));
    }
    if (role === "WAREHOUSE") {
      return NAV_ITEMS.filter(n => ["inventory", "purchase", "staff"].includes(n.key));
    }
    return NAV_ITEMS;
  }, [activeStaffMember]);

  // APP MODE TOGGLE STATE
  const [appMode, setAppMode] = useState("marketplace");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [mpPdpId, setMpPdpId] = useState(null);
  const [shopEdit, setShopEdit] = useState(null);

  const saveProduct = useCallback((p) => {
    const exists = products.find(x => x.id === p.id);
    saveProducts(exists ? products.map(x => x.id === p.id ? p : x) : [...products, p]);
    logAudit(exists ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", "product", p.id, `${p.name} (${p.sku})`);
  }, [products, saveProducts, logAudit]);

  // ========== SINGLE-ITEM SALE HANDLER (legacy, for InventoryPage sale modal) ==========
  const handleSale = useCallback((data) => {
    const isQuote = data.type === "Quotation";
    if (!isQuote) {
      const updated = products.map(p => p.id === data.productId ? { ...p, stock: Math.max(0, p.stock - data.qty) } : p);
      saveProducts(updated);
    }
    const sel = products.find(p => p.id === data.productId);
    const isCredit = data.paymentMode === "Udhaar" || (data.payments && data.payments.Credit > 0);
    const paymentStr = data.payments ? Object.entries(data.payments).filter(([_, amt]) => amt > 0).map(([k, amt]) => `${k}:${amt}`).join(", ") : data.payment;

    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "",
      type: isQuote ? "ESTIMATE" : "SALE", qty: data.qty, unitPrice: data.sellPrice, sellingPrice: data.sellPrice,
      total: data.total, gstAmount: data.gstAmount, profit: isQuote ? 0 : data.profit,
      discount: data.discount, customerName: data.customerName, customerPhone: data.customerPhone,
      vehicleReg: data.vehicleReg, mechanic: data.mechanic, supplier: null, invoiceNo: data.invoiceNo,
      payment: paymentStr, paymentMode: data.paymentMode || null, creditDays: 0, paymentStatus: isCredit && !isQuote ? "pending" : "paid",
      note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation generated" : "Walk-in sale"),
      date: data.date,
      staffId: activeStaffId || null,
      staffName: activeStaffMember?.name || null,
      ...(data.priceOverride && { priceOverride: data.priceOverride }),
    }]);

    logAudit(isQuote ? "QUOTATION_CREATED" : "SALE_RECORDED", "movement", data.invoiceNo, `${data.qty}×${sel?.name?.slice(0, 20)} · ${fmt(data.total)}`);
    if (data.priceOverride) {
      logAudit("PRICE_OVERRIDE", "movement", data.invoiceNo, `${sel?.name?.slice(0, 20)}: ${fmt(data.priceOverride.originalPrice)} → ${fmt(data.priceOverride.overriddenPrice)} (${data.priceOverride.reason || "no reason"})`);
    }
    toast(isQuote ? `Quotation Generated: ${data.invoiceNo}` : `Sale recorded: ${data.qty}×${sel?.name?.slice(0, 20) || "product"} · ${fmt(data.total)}`, isQuote ? "info" : "success", isQuote ? "Estimate Saved" : "Sale Complete");
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== MULTI-ITEM SALE HANDLER (new, for POS Billing) ==========
  const handleMultiItemSale = useCallback((data) => {
    const isQuote = data.type === "Quotation";
    const newMovements = [];
    let updatedProducts = [...products];
    let hasOverrides = false;

    // Process each line item
    data.items.forEach(item => {
      if (!isQuote) {
        updatedProducts = updatedProducts.map(p => p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p);
      }
      const isCredit = data.paymentMode === "Udhaar" || (data.payments && data.payments.Credit > 0);
      const paymentStr = data.payments ? Object.entries(data.payments).filter(([_, amt]) => amt > 0).map(([k, amt]) => `${k}:${amt}`).join(", ") : "";

      newMovements.push({
        id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
        type: isQuote ? "ESTIMATE" : "SALE", qty: item.qty, unitPrice: item.sellPrice, sellingPrice: item.sellPrice,
        total: item.total, gstAmount: item.gstAmount, profit: isQuote ? 0 : item.profit,
        discount: item.discount, customerName: data.customerName, customerPhone: data.customerPhone,
        vehicleReg: data.vehicleReg, mechanic: data.mechanic, supplier: null,
        invoiceNo: data.invoiceNo,
        payment: paymentStr, paymentMode: data.paymentMode || null, creditDays: 0,
        paymentStatus: isCredit && !isQuote ? "pending" : "paid",
        note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation" : "POS Sale"),
        date: data.date,
        multiItemInvoice: true,
        staffId: data.staffId || activeStaffId || null,
        staffName: data.staffName || activeStaffMember?.name || null,
        ...(item.priceOverride && { priceOverride: item.priceOverride }),
      });

      if (item.priceOverride) {
        hasOverrides = true;
        logAudit("PRICE_OVERRIDE", "movement", data.invoiceNo, `${item.name?.slice(0, 20)}: ${fmt(item.priceOverride.originalPrice)} → ${fmt(item.priceOverride.overriddenPrice)} (${item.priceOverride.reason || "no reason"})`);
      }
    });

    saveProducts(updatedProducts);
    saveMovements([...movements, ...newMovements]);

    logAudit(isQuote ? "MULTI_QUOTATION_CREATED" : "MULTI_SALE_RECORDED", "movement", data.invoiceNo, `${data.items.length} items · ${fmt(data.total)}${hasOverrides ? " · price override(s)" : ""}`);
    toast(
      isQuote ? `Quotation: ${data.items.length} items · ${fmt(data.total)}`
        : `Sale recorded: ${data.items.length} items · ${fmt(data.total)}`,
      isQuote ? "info" : "success",
      isQuote ? "Estimate Saved" : `Invoice ${data.invoiceNo}`
    );
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== PURCHASE HANDLER ==========
  const handlePurchase = useCallback((data) => {
    const updated = products.map(p => p.id === data.productId ? {
      ...p, stock: p.stock + data.qty, buyPrice: data.buyPrice,
      sellPrice: data.newSellPrice || p.sellPrice, supplier: data.supplier || p.supplier,
    } : p);
    saveProducts(updated);
    const sel = products.find(p => p.id === data.productId);
    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "", type: "PURCHASE",
      qty: data.qty, unitPrice: data.buyPrice, sellingPrice: data.newSellPrice || sel?.sellPrice,
      total: data.total, gstAmount: data.gstAmount, profit: null,
      supplier: data.supplier, supplierName: data.supplier, invoiceNo: data.invoiceNo,
      payment: data.payment, paymentMode: data.payment, creditDays: data.creditDays,
      paymentStatus: data.payment === "Credit" ? "pending" : "paid",
      note: [data.supplier && `Supplier: ${data.supplier}`, data.payment === "Credit" && `Credit ${data.creditDays}d`, data.notes].filter(Boolean).join(" · ") || "Stock purchase",
      date: data.date,
    }]);
    logAudit("PURCHASE_RECORDED", "movement", data.invoiceNo, `+${data.qty} ${sel?.name?.slice(0, 20)} · ${fmt(data.total)}`);
    toast(`Stock added: +${data.qty} units · ${fmt(data.total)}`, "info", "Purchase Recorded");
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== MULTI-ITEM PURCHASE HANDLER ==========
  const handleMultiItemPurchase = useCallback((data) => {
    const newMovements = [];
    let updatedProducts = [...products];

    data.items.forEach(item => {
      updatedProducts = updatedProducts.map(p => p.id === item.productId ? {
        ...p,
        stock: p.stock + item.qty,
        buyPrice: item.buyPrice,
        sellPrice: item.newSellPrice || p.sellPrice,
        supplier: data.vendorName || p.supplier,
      } : p);

      const isCredit = data.paymentMode === "Credit";

      newMovements.push({
        id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
        type: "PURCHASE", qty: item.qty, unitPrice: item.buyPrice, sellingPrice: item.newSellPrice || 0,
        total: item.total, gstAmount: item.gstAmount, profit: null,
        supplier: data.vendorName, supplierName: data.vendorName,
        invoiceNo: data.voucherNo,
        payment: data.paymentMode, paymentMode: data.paymentMode,
        creditDays: data.creditDays || 0,
        paymentStatus: isCredit ? "pending" : "paid",
        note: [data.vendorName && `Supplier: ${data.vendorName}`, data.vendorInvoiceNo && `Vendor Inv: ${data.vendorInvoiceNo}`, isCredit && `Credit ${data.creditDays}d`, data.notes].filter(Boolean).join(" · ") || "Multi-item purchase",
        date: data.date,
        multiItemInvoice: true,
        purchaseMeta: { vendorInvoiceNo: data.vendorInvoiceNo, vendorInvoiceDate: data.vendorInvoiceDate, poReference: data.poReference, warehouse: data.warehouse, hsn: item.hsn },
      });
    });

    saveProducts(updatedProducts);
    saveMovements([...movements, ...newMovements]);

    logAudit("MULTI_PURCHASE_RECORDED", "movement", data.voucherNo, `${data.items.length} items · ${fmt(data.total)} from ${data.vendorName}`);
    toast(`Purchase recorded: ${data.items.length} items · ${fmt(data.total)}`, "info", `Voucher ${data.voucherNo}`);
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== ADJUSTMENT HANDLER ==========
  const handleAdjustment = useCallback((data) => {
    const sel = products.find(p => p.id === data.productId);
    const stockChange = data.stockDirection * data.qty;
    if (stockChange !== 0) {
      const updated = products.map(p => p.id === data.productId ? { ...p, stock: Math.max(0, p.stock + stockChange) } : p);
      saveProducts(updated);
    }
    const movementType = data.adjustType;
    const lossAmount = (data.adjustType === "DAMAGE" || data.adjustType === "THEFT") ? (sel?.buyPrice || 0) * data.qty : 0;

    const isCNDN = data.adjustType === "CREDIT_NOTE" || data.adjustType === "DEBIT_NOTE";
    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "",
      type: movementType, qty: data.qty, unitPrice: isCNDN ? (data.refundAmount / (data.qty || 1)) : (sel?.buyPrice || 0), sellingPrice: sel?.sellPrice || 0,
      total: data.refundAmount || lossAmount || 0, gstAmount: data.gstAmount || 0,
      profit: data.adjustType === "RETURN_IN" ? -(data.refundAmount || 0) : data.adjustType === "CREDIT_NOTE" ? -(data.totalAmount || 0) : data.adjustType === "DAMAGE" || data.adjustType === "THEFT" ? -lossAmount : 0,
      customerName: data.adjustType === "RETURN_IN" ? "Customer Return" : data.customerName || null,
      supplier: data.supplierName || null, supplierName: data.supplierName || null,
      invoiceNo: data.voucherNo || data.originalInvoice || null,
      originalInvoice: data.originalInvoice || null,
      payment: data.refundMethod || data.adjustType, paymentStatus: "completed",
      note: [data.reason && `Reason: ${data.reason}`, data.reasonDetail, data.adjustType === "AUDIT" && `Audit: ${data.previousStock} → ${data.previousStock + stockChange}`, data.notes].filter(Boolean).join(" · ") || `Stock ${data.adjustType.toLowerCase()}`,
      date: data.date,
      adjustmentMeta: { type: data.adjustType, previousStock: data.previousStock, newStock: (data.previousStock || 0) + stockChange, reason: data.reason, refundMethod: data.refundMethod },
    }]);

    const labels = { RETURN_IN: "Customer return processed", RETURN_OUT: "Returned to vendor", CREDIT_NOTE: "Credit note issued", DEBIT_NOTE: "Debit note issued", DAMAGE: "Damage recorded", THEFT: "Shrinkage recorded", AUDIT: "Audit correction applied", OPENING: "Opening stock set" };
    logAudit("ADJUSTMENT_" + data.adjustType, "movement", data.productId, `${labels[data.adjustType] || data.adjustType}: ${stockChange > 0 ? "+" : ""}${stockChange} units`);
    toast(`${labels[data.adjustType] || data.adjustType}: ${stockChange !== 0 ? (stockChange > 0 ? "+" : "") + stockChange + " units of " : ""}${sel?.name?.slice(0, 20) || "product"}${data.refundAmount ? " · " + fmt(data.refundAmount) : ""}`, data.adjustType === "RETURN_IN" || data.adjustType === "OPENING" ? "info" : data.adjustType === "CREDIT_NOTE" || data.adjustType === "DEBIT_NOTE" ? "success" : "warning", labels[data.adjustType] || data.adjustType);
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  // ========== PAYMENT RECEIPT HANDLER (settle udhaar) ==========
  const handlePaymentReceipt = useCallback((data) => {
    const voucherNo = getNextVoucherNumber("RECEIPT");
    const receiptMovement = {
      id: "m" + uid(), shopId: activeShopId, productId: null, productName: "",
      type: "RECEIPT", qty: 0, unitPrice: 0, sellingPrice: 0,
      total: data.amount, gstAmount: 0, profit: 0,
      customerName: data.partyName, customerPhone: data.partyPhone,
      invoiceNo: voucherNo,
      payment: data.paymentMode, paymentMode: data.paymentMode, paymentStatus: "paid",
      note: `Payment received: ${fmt(data.amount)} from ${data.partyName} via ${data.paymentMode}. ${data.notes || ""}`.trim(),
      date: Date.now(),
      allocations: data.allocations || [],
    };

    let updatedMovements;
    if (data.allocations && data.allocations.length > 0) {
      const allocMap = {};
      data.allocations.forEach(a => { allocMap[a.movementId] = a.amount; });
      updatedMovements = movements.map(m => {
        if (allocMap[m.id] !== undefined) {
          const allocAmt = allocMap[m.id];
          const newPaid = (m.paidAmount || 0) + allocAmt;
          const total = m.total || 0;
          const newStatus = newPaid >= total - 0.01 ? "paid" : "partial";
          return { ...m, paidAmount: newPaid, paymentStatus: newStatus };
        }
        return m;
      });
    } else {
      updatedMovements = movements.map(m => {
        if ((m.customerName === data.partyName || m.supplierName === data.partyName || m.supplier === data.partyName) && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) {
          return { ...m, paymentStatus: "paid", paidAmount: m.total };
        }
        return m;
      });
    }

    saveMovements([...updatedMovements, receiptMovement]);
    logAudit("RECEIPT_RECORDED", "receipt", data.partyName, `${fmt(data.amount)} via ${data.paymentMode}${data.allocations?.length ? ` against ${data.allocations.length} bill(s)` : ""}`);
    toast(`Payment received: ${fmt(data.amount)} from ${data.partyName}`, "success", "Receipt Recorded");
  }, [movements, saveMovements, activeShopId, logAudit, toast]);

  if (!loaded || !products || !movements) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 42, animation: "pulse 1.5s infinite", marginBottom: 16 }}>⚙️</div>
        <div style={{ color: T.t3, fontSize: 14 }}>Loading AutoMobile Space…</div>
      </div>
    </div>
  );

  // ========== MARKETPLACE ROUTING ==========
  if (appMode === "marketplace") {
    const mpPage = marketplacePage;
    const setMpPage = setMarketplacePage;
    const renderMpPage = () => {
      if (mpPage === "pdp" && mpPdpId) return <ProductDetailsPage productId={mpPdpId} onBack={() => setMpPage("home")} />;
      if (mpPage === "checkout") return <CheckoutPage onBack={() => setMpPage("home")} onOrderPlaced={() => setMpPage("tracking")} />;
      if (mpPage === "tracking") return <OrderTrackingPage onBack={() => setMpPage("home")} onNavigate={setMpPage} saveOrders={saveOrders} orders={orders} movements={movements} saveMovements={saveMovements} products={products} activeShopId={activeShopId} />;
      if (mpPage === "service") return <ServiceBookingPage onBack={() => setMpPage("home")} />;
      if (mpPage === "pricing") return <PricingPage onBack={() => setMpPage("home")} />;
      if (mpPage === "profile") return <CustomerProfile onBack={() => setMpPage("home")} onNavigate={setMpPage} />;
      return <MarketplaceHome />;
    };

    return (
      <>
        <div style={{ paddingLeft: 68 }}>
          {renderMpPage()}
        </div>
        <CartDrawer />
        <WishlistDrawer />

        {/* LEFT SIDE PANEL */}
        {(() => {
          const MP_ACTIONS = [
            { icon: "📦", label: "Orders", page: "tracking", color: T.sky },
            { icon: "👤", label: "Profile", page: "profile", color: T.violet },
            { icon: "🔧", label: "Service", page: "service", color: T.emerald },
            { icon: "💎", label: "Pricing", page: "pricing", color: T.amber },
          ];
          return (
            <div style={{
              position: "fixed", left: 0, top: 0, bottom: 0, width: 68, zIndex: 400,
              background: `${T.surface}ee`, backdropFilter: "blur(12px)", borderRight: `1px solid ${T.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 4,
            }}>
              <div style={{ fontSize: 8, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Menu</div>
              {MP_ACTIONS.map(a => (
                <button key={a.label} onClick={() => setMpPage(a.page)} title={a.label}
                  style={{
                    width: 58, height: 50, borderRadius: 10, border: `1px solid ${mpPage === a.page ? a.color + "44" : T.border}`, cursor: "pointer",
                    background: mpPage === a.page ? `${a.color}22` : "transparent",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                    transition: "all 0.15s", padding: "4px 0",
                  }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: mpPage === a.page ? a.color : T.t3, fontFamily: FONT.ui, letterSpacing: "0.02em" }}>{a.label}</span>
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => setAppMode("shopOwner")} title="Switch to Shop Owner"
                style={{ width: 58, height: 50, borderRadius: 10, border: "none", cursor: "pointer", background: "#4F46E5", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, marginBottom: 12, boxShadow: "0 4px 16px rgba(79,70,229,0.4)", padding: "4px 0" }}>
                <span style={{ fontSize: 16 }}>🔄</span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.02em" }}>Shop</span>
              </button>
            </div>
          );
        })()}
      </>
    );
  }

  // ========== SHOP OWNER ERP ==========
  const todaySales = movements.filter(m => m.shopId === activeShopId && m.type === "SALE" && m.date >= Date.now() - 86400000);
  const todayRev = todaySales.reduce((s, m) => s + m.total, 0);
  const stockSt = p => { if (p.stock <= 0) return "out"; if (p.stock < p.minStock) return "low"; return "ok"; };
  const lowCount = products.filter(p => p.shopId === activeShopId && stockSt(p) !== "ok").length;
  const pendingOrders = (orders || []).filter(o => o.shopId === activeShopId && (normalizeOrderStatus(o.status) === "PLACED")).length;

  const renderPage = () => {
    if (page === "dashboard") return <DashboardPage products={products} movements={movements} orders={orders} activeShopId={activeShopId} onNavigate={setPage} jobCards={jobCards} parties={parties} vehicles={vehicles} />;
    if (page === "inventory") return <InventoryPage products={products} movements={movements} activeShopId={activeShopId} onAdd={() => setPModal({ open: true, product: null })} onEdit={p => setPModal({ open: true, product: p })} onSale={handleSale} onPurchase={handlePurchase} onAdjust={handleAdjustment} toast={toast} />;
    if (page === "pos") return <POSBillingPage products={products} parties={parties} movements={movements} activeShopId={activeShopId} onMultiSale={handleMultiItemSale} toast={toast} activeStaffMember={activeStaffMember} onSwitchStaff={() => setShowStaffLogin(true)} onStaffLogout={handleStaffLogout} staffHasPermission={staffHasPermission} />;
    if (page === "history") return <HistoryPage movements={movements} activeShopId={activeShopId} />;
    if (page === "reports") return <ReportsPage movements={movements} products={products} activeShopId={activeShopId} receipts={receipts} saveReceipts={saveReceipts} onPaymentReceipt={handlePaymentReceipt} toast={toast} parties={parties} />;
    if (page === "staff") return <StaffManagementPage movements={movements} activeShopId={activeShopId} toast={toast} activeStaffMember={activeStaffMember} />;
    if (page === "orders") return <OrdersPage products={products} activeShopId={activeShopId} onSale={handleSale} toast={toast} orders={orders} saveOrders={saveOrders} movements={movements} saveMovements={saveMovements} />;
    if (page === "rfq") return <VendorRFQPage products={products} movements={movements} saveMovements={saveMovements} saveProducts={saveProducts} activeShopId={activeShopId} toast={toast} />;
    if (page === "purchase") return <PurchaseEntryPage products={products} movements={movements} activeShopId={activeShopId} parties={parties} purchaseOrders={purchaseOrders} grns={grns} saveGrns={saveGrns} savePurchaseOrders={savePurchaseOrders} saveProducts={saveProducts} saveMovements={saveMovements} onMultiPurchase={handleMultiItemPurchase} logAudit={logAudit} toast={toast} />;
    if (page === "salesdocs") return <SalesDocumentsPage products={products} movements={movements} activeShopId={activeShopId} onMultiSale={handleMultiItemSale} saveProducts={saveProducts} saveMovements={saveMovements} toast={toast} parties={parties} />;
    if (page === "masters") return <MastersPage toast={toast} />;
    if (page === "accounting") return <AccountingPage movements={movements} products={products} parties={parties} activeShopId={activeShopId} toast={toast} />;
    if (page === "settings") return <SettingsPage toast={toast} />;
    if (page === "parties") return <PartiesPage parties={parties} movements={movements} vehicles={vehicles} activeShopId={activeShopId} onSaveParty={(p) => { const exists = (parties || []).find(x => x.id === p.id); saveParties(exists ? parties.map(x => x.id === p.id ? p : x) : [...(parties || []), p]); logAudit(exists ? "PARTY_UPDATED" : "PARTY_CREATED", "party", p.id, p.name); }} onSaveVehicle={(v) => { const exists = (vehicles || []).find(x => x.id === v.id); saveVehicles(exists ? vehicles.map(x => x.id === v.id ? v : x) : [...(vehicles || []), v]); }} onPaymentReceipt={handlePaymentReceipt} toast={toast} />;
    if (page === "workshop") return <WorkshopPage jobCards={jobCards} vehicles={vehicles} parties={parties} products={products} activeShopId={activeShopId} onSaveJobCard={(jc) => { const exists = (jobCards || []).find(x => x.id === jc.id); saveJobCards(exists ? jobCards.map(x => x.id === jc.id ? jc : x) : [...(jobCards || []), jc]); logAudit(exists ? "JOB_CARD_UPDATED" : "JOB_CARD_CREATED", "job_card", jc.id, `${jc.jobNumber} — ${jc.status}`); }} toast={toast} />;
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, color: T.t1 }}>
      <style>{GLOBAL_CSS}</style>
      {isAdminMode && <AdminDashboard shops={shops} products={products} orders={orders} onBack={() => setIsAdminMode(false)} />}

      {/* TOPBAR */}
      <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 20px", position: "sticky", top: 0, zIndex: 500, gap: 10 }}>
        {/* Brand — click to edit */}
        {(() => {
          const shop = (shops || []).find(s => s.id === activeShopId) || { name: "My Shop", city: "Location" };
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 12, position: "relative" }}>
              <div
                onClick={() => {
                  const newClicks = logoClicks + 1;
                  setLogoClicks(newClicks);
                  if (newClicks >= 5) {
                    setIsAdminMode(true);
                    setLogoClicks(0);
                  }
                  // Reset clicks after 2 seconds of inactivity
                  setTimeout(() => setLogoClicks(0), 2000);
                }}
                style={{ width: 36, height: 36, background: `linear-gradient(135deg,${T.amber},${T.amberDim})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#000", boxShadow: `0 2px 12px ${T.amber}55`, letterSpacing: "-0.05em", cursor: "pointer" }}>{shop.name?.charAt(0) || "S"}</div>
              <div onClick={() => setShopEdit({ name: shop.name, city: shop.city })} style={{ cursor: "pointer" }} title="Click to edit shop name & location">
                <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 4 }}>{shop.name} <span style={{ fontSize: 10, color: T.t4 }}>✏️</span></div>
                <div style={{ fontSize: 10, color: T.amber, fontWeight: 600, letterSpacing: "0.04em" }}>INVENTORY · {shop.city?.toUpperCase() || "LOCATION"}</div>
              </div>

              {/* Edit Popover */}
              {shopEdit && (
                <div style={{ position: "absolute", top: 48, left: 0, zIndex: 9999, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", width: 280 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, marginBottom: 12 }}>Edit Shop Details</div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Shop Name</label>
                    <input value={shopEdit.name} onChange={e => setShopEdit(prev => ({ ...prev, name: e.target.value }))} style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", color: T.t1, fontSize: 13, fontWeight: 600, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Location / City</label>
                    <input value={shopEdit.city} onChange={e => setShopEdit(prev => ({ ...prev, city: e.target.value }))} style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", color: T.t1, fontSize: 13, fontWeight: 600, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShopEdit(null)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", color: T.t3, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}>Cancel</button>
                    <button onClick={() => { const updated = shops.map(s => s.id === activeShopId ? { ...s, name: shopEdit.name, city: shopEdit.city } : s); saveShops(updated); setShopEdit(null); toast("Shop details updated!", "emerald"); }} style={{ background: T.amber, border: "none", borderRadius: 8, padding: "6px 14px", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* NAV */}
        <div style={{ display: "flex", gap: 2 }}>
          {filteredNavItems.map(n => (
            <button key={n.key} className={`nav-item${page === n.key ? " nav-active" : ""}`} onClick={() => setPage(n.key)}
              style={{ background: page === n.key ? T.amberGlow : "transparent", color: page === n.key ? T.amber : T.t2, border: `1px solid ${page === n.key ? T.amber + "44" : "transparent"}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 7, position: "relative" }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              {n.key === "orders" && pendingOrders > 0 && <span style={{ background: T.crimson, color: "#fff", fontSize: 10, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{pendingOrders}</span>}
              {n.key === "inventory" && lowCount > 0 && <span style={{ background: T.amber, color: "#000", fontSize: 9, borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{lowCount}</span>}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {activeStaffMember ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: T.emerald, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              🟢 {activeStaffMember.name} <span style={{ color: T.t3, fontWeight: 500 }}>({activeStaffMember.role})</span>
            </div>
            <button onClick={() => setShowStaffLogin(true)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: T.t3, cursor: "pointer", fontWeight: 600, fontFamily: FONT.ui }}>Switch</button>
            <button onClick={handleStaffLogout} style={{ background: T.surface, border: `1px solid ${T.crimson}33`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: T.crimson, cursor: "pointer", fontWeight: 600, fontFamily: FONT.ui }}>Logout</button>
          </div>
        ) : (
          <button onClick={() => setShowStaffLogin(true)} style={{ background: T.surface, border: `1px solid ${T.amber}44`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: T.amber, cursor: "pointer", fontWeight: 700, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6 }}>
            👤 Staff Login
          </button>
        )}

        {/* NOTIFICATION BELL */}
        <NotificationBell
          notifications={notifications || []}
          onMarkRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllNotifsRead}
          onClear={handleClearNotifs}
          onOpenSettings={() => setShowNotifPrefs(true)}
        />

        {/* Quick stats */}
        {todayRev > 0 && (!activeStaffMember || activeStaffMember.role !== "CASHIER") && (
          <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}33`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: T.emerald, fontWeight: 700, fontFamily: FONT.mono, display: "flex", alignItems: "center", gap: 6 }}>
            📈 Today: {fmt(todayRev)}
          </div>
        )}
        {lowCount > 0 && (
          <button onClick={() => setPage("inventory")} style={{ background: T.crimsonBg, border: `1px solid ${T.crimson}33`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: T.crimson, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5 }}>
            ⚠ {lowCount} alert{lowCount > 1 ? "s" : ""}
          </button>
        )}

        <Btn size="sm" variant="ghost" onClick={() => setPage("pos")} style={{ borderColor: T.border }}>🧾 POS</Btn>
        {(!activeStaffMember || activeStaffMember.role !== "CASHIER") && <Btn size="sm" variant="amber" onClick={() => setPModal({ open: true, product: null })}>＋ Product</Btn>}

        {/* Reset button */}
        <button onClick={() => { if (confirm("Reset all data to defaults?")) resetAll(); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: T.t3, cursor: "pointer", fontWeight: 600, fontFamily: FONT.ui }}>🔄</button>

        {/* Avatar */}
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${T.amber},${T.amberDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#000", fontWeight: 900, marginLeft: 4 }}>{activeStaffMember ? activeStaffMember.name.charAt(0) : "R"}</div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding: "24px 28px 24px 92px", maxWidth: 1440, margin: "0 auto" }}>
        {renderPage()}
      </div>

      {/* MODALS */}
      <ProductModal open={pModal.open} product={pModal.product} activeShopId={activeShopId} onClose={() => setPModal({ open: false, product: null })} onSave={saveProduct} toast={toast} />

      {showStaffLogin && (
        <div className="backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="modal-in" style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 360, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>👤 Staff Login</h3>
              <button onClick={() => { setShowStaffLogin(false); setStaffPin(""); setStaffLoginError(""); }} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 8 }}>Enter 4-Digit PIN</label>
              <input
                type="password" value={staffPin} autoFocus maxLength={4}
                onChange={e => { setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setStaffLoginError(""); }}
                onKeyDown={e => { if (e.key === "Enter") handleStaffLogin(); }}
                placeholder="••••"
                style={{ width: "100%", padding: "14px 16px", background: T.surface, border: `1px solid ${staffLoginError ? T.crimson : T.border}`, borderRadius: 10, color: T.t1, fontSize: 24, fontFamily: FONT.mono, textAlign: "center", letterSpacing: "0.3em", outline: "none", boxSizing: "border-box" }}
              />
              {staffLoginError && <div style={{ color: T.crimson, fontSize: 12, fontWeight: 600, marginTop: 8 }}>{staffLoginError}</div>}
            </div>
            <Btn block variant="amber" onClick={handleStaffLogin}>Login</Btn>
            {activeStaffMember && (
              <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: T.t3 }}>
                Currently: <strong style={{ color: T.emerald }}>{activeStaffMember.name}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICATION PREFERENCES MODAL */}
      {showNotifPrefs && (
        <div className="backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="modal-in" style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 16, width: 400, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>🔔 Notification Settings</h3>
              <button onClick={() => setShowNotifPrefs(false)} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { key: "ORDER_NEW", label: "New Orders", icon: "📦" },
                { key: "LOW_STOCK", label: "Low Stock Alerts", icon: "📉" },
                { key: "PAYMENT_DUE", label: "Payment Reminders", icon: "💰" },
                { key: "RFQ_BID_RECEIVED", label: "RFQ Bids", icon: "🤝" }
              ].map(pref => (
                <div key={pref.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: T.surface, borderRadius: 12, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{pref.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>{pref.label}</span>
                  </div>
                  <button
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
                      background: notifPrefs[pref.key] ? T.amber : T.t4, transition: "background 0.2s"
                    }}
                    onClick={() => {
                        const next = { ...notifPrefs, [pref.key]: !notifPrefs[pref.key] };
                        saveNotifPrefs(next);
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 2, left: notifPrefs[pref.key] ? 22 : 2,
                      width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s"
                    }} />
                  </button>
                </div>
              ))}
            </div>
            <Btn block variant="amber" style={{ marginTop: 24 }} onClick={() => setShowNotifPrefs(false)}>Done</Btn>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <Toast items={toasts} onRemove={removeToast} />

      {/* QUICK ACTIONS SIDE PANEL */}
      {(() => {
        const ACTIONS = [
          { icon: "🧾", label: "New Sale", page: "pos", color: T.amber },
          { icon: "📥", label: "Purchase", page: "inventory", color: T.sky },
          { icon: "👤", label: "Parties", page: "parties", color: T.emerald },
          { icon: "📊", label: "Reports", page: "reports", color: T.amber },
          { icon: "📋", label: "History", page: "history", color: T.t2 },
          { icon: "＋", label: "Product", action: () => setPModal({ open: true, product: null }), color: T.amber },
        ];
        return (
          <div style={{
            position: "fixed", left: 0, top: 56, bottom: 0, width: 68, zIndex: 400,
            background: `${T.surface}ee`, backdropFilter: "blur(12px)", borderRight: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4,
          }}>
            <div style={{ fontSize: 8, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Quick</div>
            {ACTIONS.map(a => (
              <button key={a.label} onClick={a.action || (() => setPage(a.page))} title={a.label}
                style={{
                  width: 58, height: 50, borderRadius: 10, border: `1px solid ${page === a.page ? a.color + "44" : T.border}`, cursor: "pointer",
                  background: page === a.page ? `${a.color}22` : "transparent",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  transition: "all 0.15s", padding: "4px 0",
                }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: page === a.page ? a.color : T.t3, fontFamily: FONT.ui, letterSpacing: "0.02em" }}>{a.label}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setAppMode("marketplace")} title="Switch to Marketplace"
              style={{ width: 58, height: 50, borderRadius: 10, border: "none", cursor: "pointer", background: "#4F46E5", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, marginBottom: 12, boxShadow: "0 4px 16px rgba(79,70,229,0.4)", padding: "4px 0" }}>
              <span style={{ fontSize: 16 }}>🔄</span>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.02em" }}>Market</span>
            </button>
          </div>
        );
      })()}


    </div>
  );
}

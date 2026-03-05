export const CHART_OF_ACCOUNTS = [
  { code: "AC001", name: "Cash in Hand", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "AC002", name: "Bank Account", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "AC003", name: "Accounts Receivable", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "AC004", name: "Inventory", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "AC005", name: "GST Input Credit", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "AC006", name: "Shop Equipment", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "AC007", name: "Furniture & Fixtures", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Dr" },

  { code: "AC010", name: "Accounts Payable", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "AC011", name: "GST Output Tax", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "AC012", name: "Customer Advances", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "AC013", name: "Refunds Payable", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "AC014", name: "Loans", group: "LIABILITIES", subGroup: "Long Term", type: "LIABILITY", normalBalance: "Cr" },

  { code: "AC020", name: "Sales Revenue", group: "INCOME", subGroup: "Income", type: "INCOME", normalBalance: "Cr" },
  { code: "AC021", name: "Service Income", group: "INCOME", subGroup: "Income", type: "INCOME", normalBalance: "Cr" },
  { code: "AC022", name: "Discount Received", group: "INCOME", subGroup: "Income", type: "INCOME", normalBalance: "Cr" },
  { code: "AC023", name: "Other Income", group: "INCOME", subGroup: "Income", type: "INCOME", normalBalance: "Cr" },

  { code: "AC030", name: "Cost of Goods Sold", group: "EXPENSES", subGroup: "Direct Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC031", name: "Purchase Returns", group: "EXPENSES", subGroup: "Direct Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC032", name: "Salaries & Wages", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC033", name: "Rent", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC034", name: "Utilities", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC035", name: "Marketing", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC036", name: "Delivery Charges", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC037", name: "Customer Returns / Refunds", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC038", name: "Depreciation", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC039", name: "Bank Charges", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "AC040", name: "Miscellaneous Expenses", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },

  { code: "AC050", name: "Owner's Capital", group: "CAPITAL", subGroup: "Capital", type: "CAPITAL", normalBalance: "Cr" },
  { code: "AC051", name: "Retained Earnings", group: "CAPITAL", subGroup: "Capital", type: "CAPITAL", normalBalance: "Cr" },
  { code: "AC052", name: "Drawings", group: "CAPITAL", subGroup: "Capital", type: "CAPITAL", normalBalance: "Dr" },
];

function getAccountName(code) {
  const acc = CHART_OF_ACCOUNTS.find(a => a.code === code);
  return acc ? acc.name : code;
}

function resolvePaymentAccount(paymentMode) {
  if (!paymentMode) return "AC001";
  const mode = paymentMode.toLowerCase();
  if (mode === "credit" || mode === "udhaar") return "AC003";
  if (mode === "upi" || mode === "card" || mode === "netbanking" || mode === "bank transfer" || mode === "bank" || mode === "online") return "AC002";
  if (mode.includes("cash") && (mode.includes("upi") || mode.includes("+"))) return "AC001";
  return "AC001";
}

function resolvePaymentAccountForPurchase(paymentMode) {
  if (!paymentMode) return "AC010";
  const mode = paymentMode.toLowerCase();
  if (mode === "credit" || mode === "udhaar") return "AC010";
  if (mode === "upi" || mode === "card" || mode === "netbanking" || mode === "bank transfer" || mode === "bank" || mode === "online") return "AC002";
  if (mode.includes("cash")) return "AC001";
  return "AC010";
}

export function generateJournalEntries(movements, products, parties, activeShopId) {
  if (!movements || !products) return [];

  const shopMovements = activeShopId
    ? movements.filter(m => m.shopId === activeShopId)
    : movements;

  const productMap = {};
  (products || []).forEach(p => { productMap[p.id] = p; });

  const entries = [];

  shopMovements.forEach(m => {
    const product = productMap[m.productId];
    const buyPrice = product ? product.buyPrice : 0;
    const gst = m.gstAmount || 0;
    const total = m.total || 0;
    const baseAmount = total - gst;

    switch (m.type) {
      case "SALE": {
        const payAccCode = resolvePaymentAccount(m.paymentMode || m.payment);
        const payAccName = getAccountName(payAccCode);
        const cogsAmount = (buyPrice || 0) * (m.qty || 0);

        const journalRows = [
          { accountCode: payAccCode, accountName: payAccName, debit: total, credit: 0 },
          { accountCode: "AC020", accountName: "Sales Revenue", debit: 0, credit: baseAmount > 0 ? baseAmount : total },
        ];
        if (gst > 0) {
          journalRows[1].credit = baseAmount;
          journalRows.push({ accountCode: "AC011", accountName: "GST Output Tax", debit: 0, credit: gst });
        }
        if (cogsAmount > 0) {
          journalRows.push({ accountCode: "AC030", accountName: "Cost of Goods Sold", debit: cogsAmount, credit: 0 });
          journalRows.push({ accountCode: "AC004", accountName: "Inventory", debit: 0, credit: cogsAmount });
        }

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Sales",
          voucherNo: m.invoiceNo || "SALE-" + m.id,
          narration: `Sale of ${m.productName || "product"} to ${m.customerName || "customer"}`,
          entries: journalRows,
          refId: m.id,
          refType: "SALE",
        });
        break;
      }

      case "PURCHASE": {
        const payAccCode = resolvePaymentAccountForPurchase(m.paymentMode || m.payment);
        const payAccName = getAccountName(payAccCode);

        const journalRows = [
          { accountCode: "AC004", accountName: "Inventory", debit: baseAmount > 0 ? baseAmount : total, credit: 0 },
        ];
        if (gst > 0) {
          journalRows[0].debit = baseAmount;
          journalRows.push({ accountCode: "AC005", accountName: "GST Input Credit", debit: gst, credit: 0 });
        }
        journalRows.push({ accountCode: payAccCode, accountName: payAccName, debit: 0, credit: total });

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Purchase",
          voucherNo: m.invoiceNo || "PUR-" + m.id,
          narration: `Purchase of ${m.productName || "product"} from ${m.supplierName || m.supplier || "supplier"}`,
          entries: journalRows,
          refId: m.id,
          refType: "PURCHASE",
        });
        break;
      }

      case "RETURN_IN": {
        const cogsAmount = (buyPrice || 0) * (m.qty || 0);
        const mode = (m.paymentMode || m.payment || "").toLowerCase();
        const isCredit = mode === "credit" || mode === "udhaar";
        let crAccCode;
        if (isCredit || !mode) {
          crAccCode = "AC003";
        } else if (mode === "cash") {
          crAccCode = "AC001";
        } else if (["upi", "card", "netbanking", "bank transfer", "bank", "online"].includes(mode)) {
          crAccCode = "AC002";
        } else {
          crAccCode = "AC013";
        }
        const crAccName = getAccountName(crAccCode);

        const journalRows = [
          { accountCode: "AC037", accountName: "Customer Returns / Refunds", debit: baseAmount > 0 ? baseAmount : total, credit: 0 },
        ];
        if (gst > 0) {
          journalRows[0].debit = baseAmount;
          journalRows.push({ accountCode: "AC011", accountName: "GST Output Tax", debit: gst, credit: 0 });
        }
        journalRows.push({ accountCode: crAccCode, accountName: crAccName, debit: 0, credit: total });
        if (cogsAmount > 0) {
          journalRows.push({ accountCode: "AC004", accountName: "Inventory", debit: cogsAmount, credit: 0 });
          journalRows.push({ accountCode: "AC030", accountName: "Cost of Goods Sold", debit: 0, credit: cogsAmount });
        }

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Credit Note",
          voucherNo: m.invoiceNo || "CN-" + m.id,
          narration: `Customer return: ${m.productName || "product"} from ${m.customerName || "customer"}`,
          entries: journalRows,
          refId: m.id,
          refType: "RETURN_IN",
        });
        break;
      }

      case "RETURN_OUT": {
        const journalRows = [
          { accountCode: "AC010", accountName: "Accounts Payable", debit: total, credit: 0 },
          { accountCode: "AC004", accountName: "Inventory", debit: 0, credit: baseAmount > 0 ? baseAmount : total },
        ];
        if (gst > 0) {
          journalRows[1].credit = baseAmount;
          journalRows.push({ accountCode: "AC005", accountName: "GST Input Credit", debit: 0, credit: gst });
        }

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Debit Note",
          voucherNo: m.invoiceNo || "DN-" + m.id,
          narration: `Return to vendor: ${m.productName || "product"} to ${m.supplierName || m.supplier || "vendor"}`,
          entries: journalRows,
          refId: m.id,
          refType: "RETURN_OUT",
        });
        break;
      }

      case "RECEIPT": {
        const payAccCode = resolvePaymentAccount(m.paymentMode || m.payment);
        const payAccName = getAccountName(payAccCode === "AC003" ? "AC001" : payAccCode);
        const actualPayAcc = payAccCode === "AC003" ? "AC001" : payAccCode;

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Receipt",
          voucherNo: m.invoiceNo || "REC-" + m.id,
          narration: `Payment received from ${m.customerName || m.supplierName || "party"}: ${m.note || ""}`.trim(),
          entries: [
            { accountCode: actualPayAcc, accountName: payAccName, debit: total, credit: 0 },
            { accountCode: "AC003", accountName: "Accounts Receivable", debit: 0, credit: total },
          ],
          refId: m.id,
          refType: "RECEIPT",
        });
        break;
      }

      case "PAYMENT": {
        const payAccCode = resolvePaymentAccount(m.paymentMode || m.payment);
        const actualPayAcc = payAccCode === "AC003" ? "AC001" : payAccCode;
        const payAccName = getAccountName(actualPayAcc);

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Payment",
          voucherNo: m.invoiceNo || "PAY-" + m.id,
          narration: `Payment made to ${m.supplierName || m.supplier || m.customerName || "party"}: ${m.note || ""}`.trim(),
          entries: [
            { accountCode: "AC010", accountName: "Accounts Payable", debit: total, credit: 0 },
            { accountCode: actualPayAcc, accountName: payAccName, debit: 0, credit: total },
          ],
          refId: m.id,
          refType: "PAYMENT",
        });
        break;
      }

      case "DAMAGE":
      case "THEFT":
      case "ADJUST":
      case "AUDIT": {
        const lossAmount = (m.unitPrice || buyPrice || 0) * (m.qty || 0);
        if (lossAmount <= 0) break;

        if (m.type === "DAMAGE" || m.type === "THEFT") {
          entries.push({
            id: "JE-" + m.id,
            date: m.date,
            voucherType: "Journal",
            voucherNo: "ADJ-" + m.id,
            narration: `${m.type === "DAMAGE" ? "Damaged" : "Theft/shrinkage"}: ${m.productName || "product"} — ${m.note || ""}`.trim(),
            entries: [
              { accountCode: "AC040", accountName: "Miscellaneous Expenses", debit: lossAmount, credit: 0 },
              { accountCode: "AC004", accountName: "Inventory", debit: 0, credit: lossAmount },
            ],
            refId: m.id,
            refType: m.type,
          });
        } else {
          const isPositive = m.adjustmentMeta
            ? (m.adjustmentMeta.newStock || 0) > (m.adjustmentMeta.previousStock || 0)
            : true;
          if (isPositive) {
            entries.push({
              id: "JE-" + m.id,
              date: m.date,
              voucherType: "Journal",
              voucherNo: "ADJ-" + m.id,
              narration: `Stock adjustment (increase): ${m.productName || "product"} — ${m.note || ""}`.trim(),
              entries: [
                { accountCode: "AC004", accountName: "Inventory", debit: lossAmount, credit: 0 },
                { accountCode: "AC023", accountName: "Other Income", debit: 0, credit: lossAmount },
              ],
              refId: m.id,
              refType: m.type,
            });
          } else {
            entries.push({
              id: "JE-" + m.id,
              date: m.date,
              voucherType: "Journal",
              voucherNo: "ADJ-" + m.id,
              narration: `Stock adjustment (decrease): ${m.productName || "product"} — ${m.note || ""}`.trim(),
              entries: [
                { accountCode: "AC040", accountName: "Miscellaneous Expenses", debit: lossAmount, credit: 0 },
                { accountCode: "AC004", accountName: "Inventory", debit: 0, credit: lossAmount },
              ],
              refId: m.id,
              refType: m.type,
            });
          }
        }
        break;
      }

      default:
        break;
    }
  });

  return entries;
}

export function computeLedger(journalEntries, accountCode, startDate, endDate) {
  const account = CHART_OF_ACCOUNTS.find(a => a.code === accountCode);
  const isDebitNormal = account ? account.normalBalance === "Dr" : true;

  const allRows = [];
  (journalEntries || []).forEach(je => {
    je.entries.forEach(e => {
      if (e.accountCode === accountCode) {
        allRows.push({
          date: je.date,
          voucherNo: je.voucherNo,
          narration: je.narration,
          debit: e.debit || 0,
          credit: e.credit || 0,
        });
      }
    });
  });

  allRows.sort((a, b) => a.date - b.date);

  let openingBalance = 0;
  const periodEntries = [];

  allRows.forEach(row => {
    if (startDate && row.date < startDate) {
      openingBalance += (row.debit - row.credit) * (isDebitNormal ? 1 : -1);
    } else if (!endDate || row.date <= endDate) {
      periodEntries.push(row);
    }
  });

  let runningBalance = openingBalance;
  const ledgerEntries = periodEntries.map(row => {
    runningBalance += (row.debit - row.credit) * (isDebitNormal ? 1 : -1);
    return { ...row, runningBalance };
  });

  return {
    openingBalance,
    entries: ledgerEntries,
    closingBalance: runningBalance,
  };
}

export function computeTrialBalance(journalEntries, asOfDate) {
  const balances = {};

  CHART_OF_ACCOUNTS.forEach(acc => {
    balances[acc.code] = { accountCode: acc.code, accountName: acc.name, group: acc.group, subGroup: acc.subGroup, type: acc.type, normalBalance: acc.normalBalance, debitTotal: 0, creditTotal: 0 };
  });

  (journalEntries || []).forEach(je => {
    if (asOfDate && je.date > asOfDate) return;
    je.entries.forEach(e => {
      if (!balances[e.accountCode]) {
        balances[e.accountCode] = { accountCode: e.accountCode, accountName: e.accountName, group: "OTHER", subGroup: "Other", type: "ASSET", normalBalance: "Dr", debitTotal: 0, creditTotal: 0 };
      }
      balances[e.accountCode].debitTotal += (e.debit || 0);
      balances[e.accountCode].creditTotal += (e.credit || 0);
    });
  });

  const rows = Object.values(balances).map(b => {
    const net = b.debitTotal - b.creditTotal;
    return {
      ...b,
      balance: net,
      debitBalance: net > 0 ? net : 0,
      creditBalance: net < 0 ? Math.abs(net) : 0,
    };
  }).filter(b => b.debitTotal !== 0 || b.creditTotal !== 0);

  const totalDebits = rows.reduce((s, r) => s + r.debitBalance, 0);
  const totalCredits = rows.reduce((s, r) => s + r.creditBalance, 0);

  return { rows, totalDebits, totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 };
}

export function computeProfitAndLoss(journalEntries, startDate, endDate) {
  const incomeAccounts = {};
  const expenseAccounts = {};

  CHART_OF_ACCOUNTS.filter(a => a.type === "INCOME").forEach(a => {
    incomeAccounts[a.code] = { code: a.code, name: a.name, amount: 0 };
  });
  CHART_OF_ACCOUNTS.filter(a => a.type === "EXPENSE").forEach(a => {
    expenseAccounts[a.code] = { code: a.code, name: a.name, amount: 0 };
  });

  (journalEntries || []).forEach(je => {
    if (startDate && je.date < startDate) return;
    if (endDate && je.date > endDate) return;
    je.entries.forEach(e => {
      if (incomeAccounts[e.accountCode]) {
        incomeAccounts[e.accountCode].amount += (e.credit || 0) - (e.debit || 0);
      }
      if (expenseAccounts[e.accountCode]) {
        expenseAccounts[e.accountCode].amount += (e.debit || 0) - (e.credit || 0);
      }
    });
  });

  const revenueItems = Object.values(incomeAccounts).filter(i => i.amount !== 0);
  const expenseItems = Object.values(expenseAccounts).filter(i => i.amount !== 0);

  const totalRevenue = revenueItems.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenseItems.reduce((s, i) => s + i.amount, 0);

  const cogs = expenseAccounts["AC030"] ? expenseAccounts["AC030"].amount : 0;
  const grossProfit = totalRevenue - cogs;

  const operatingExpenses = totalExpenses - cogs;
  const operatingProfit = grossProfit - operatingExpenses;
  const netProfit = totalRevenue - totalExpenses;

  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
  const netMarginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

  return {
    revenue: { items: revenueItems, total: totalRevenue },
    expenses: { items: expenseItems, total: totalExpenses },
    cogs,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    netProfit,
    grossMarginPct: Math.round(grossMarginPct * 10) / 10,
    netMarginPct: Math.round(netMarginPct * 10) / 10,
  };
}

export function computeBalanceSheet(journalEntries, asOfDate) {
  const balances = {};
  CHART_OF_ACCOUNTS.forEach(acc => {
    balances[acc.code] = 0;
  });

  (journalEntries || []).forEach(je => {
    if (asOfDate && je.date > asOfDate) return;
    je.entries.forEach(e => {
      if (balances[e.accountCode] === undefined) balances[e.accountCode] = 0;
      balances[e.accountCode] += (e.debit || 0) - (e.credit || 0);
    });
  });

  const getAccBal = (code) => {
    const acc = CHART_OF_ACCOUNTS.find(a => a.code === code);
    const raw = balances[code] || 0;
    if (!acc) return Math.abs(raw);
    return acc.normalBalance === "Dr" ? raw : -raw;
  };

  const currentAssets = [
    { code: "AC001", name: "Cash in Hand", amount: getAccBal("AC001") },
    { code: "AC002", name: "Bank Account", amount: getAccBal("AC002") },
    { code: "AC003", name: "Accounts Receivable", amount: getAccBal("AC003") },
    { code: "AC004", name: "Inventory", amount: getAccBal("AC004") },
    { code: "AC005", name: "GST Input Credit", amount: getAccBal("AC005") },
  ];
  const fixedAssets = [
    { code: "AC006", name: "Shop Equipment", amount: getAccBal("AC006") },
    { code: "AC007", name: "Furniture & Fixtures", amount: getAccBal("AC007") },
  ];

  const currentLiabilities = [
    { code: "AC010", name: "Accounts Payable", amount: getAccBal("AC010") },
    { code: "AC011", name: "GST Output Tax", amount: getAccBal("AC011") },
    { code: "AC012", name: "Customer Advances", amount: getAccBal("AC012") },
    { code: "AC013", name: "Refunds Payable", amount: getAccBal("AC013") },
  ];
  const longTermLiabilities = [
    { code: "AC014", name: "Loans", amount: getAccBal("AC014") },
  ];

  const capitalItems = [
    { code: "AC050", name: "Owner's Capital", amount: getAccBal("AC050") },
    { code: "AC051", name: "Retained Earnings", amount: getAccBal("AC051") },
    { code: "AC052", name: "Drawings", amount: -(balances["AC052"] || 0) },
  ];

  const pnl = computeProfitAndLoss(journalEntries, null, asOfDate);
  capitalItems.push({ code: "NET_PROFIT", name: "Current Period Profit/Loss", amount: pnl.netProfit });

  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.amount, 0);
  const totalFixedAssets = fixedAssets.reduce((s, a) => s + a.amount, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = currentLiabilities.reduce((s, a) => s + a.amount, 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const totalCapital = capitalItems.reduce((s, a) => s + a.amount, 0);
  const totalLiabilitiesAndCapital = totalLiabilities + totalCapital;

  return {
    assets: { currentAssets, fixedAssets, totalCurrentAssets, totalFixedAssets, totalAssets },
    liabilities: { currentLiabilities, longTermLiabilities, totalCurrentLiabilities, totalLongTermLiabilities, totalLiabilities },
    capital: { items: capitalItems, total: totalCapital },
    totalLiabilitiesAndCapital,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndCapital) < 1,
  };
}

export function computeCashFlow(journalEntries, startDate, endDate) {
  const cashCodes = ["AC001", "AC002"];

  let openingCash = 0;
  const operating = [];
  const investing = [];
  const financing = [];

  const buckets = {
    cashFromSales: 0,
    cashFromReceipts: 0,
    cashPaidToSuppliers: 0,
    cashPaidToVendors: 0,
    gstPaid: 0,
    gstReceived: 0,
    equipmentPurchases: 0,
    capitalIntroduced: 0,
    drawings: 0,
    loansTaken: 0,
    loansRepaid: 0,
  };

  (journalEntries || []).forEach(je => {
    const hasCash = je.entries.some(e => cashCodes.includes(e.accountCode));
    if (!hasCash) return;

    if (startDate && je.date < startDate) {
      je.entries.forEach(e => {
        if (cashCodes.includes(e.accountCode)) {
          openingCash += (e.debit || 0) - (e.credit || 0);
        }
      });
      return;
    }
    if (endDate && je.date > endDate) return;

    let cashEffect = 0;
    je.entries.forEach(e => {
      if (cashCodes.includes(e.accountCode)) {
        cashEffect += (e.debit || 0) - (e.credit || 0);
      }
    });

    if (je.refType === "SALE") {
      buckets.cashFromSales += cashEffect;
    } else if (je.refType === "RECEIPT") {
      buckets.cashFromReceipts += cashEffect;
    } else if (je.refType === "PURCHASE") {
      buckets.cashPaidToSuppliers += cashEffect;
    } else if (je.refType === "PAYMENT") {
      buckets.cashPaidToVendors += cashEffect;
    } else {
      buckets.cashFromSales += cashEffect;
    }
  });

  operating.push({ label: "Cash from Sales", amount: buckets.cashFromSales });
  operating.push({ label: "Cash from Receipts", amount: buckets.cashFromReceipts });
  operating.push({ label: "Cash Paid to Suppliers", amount: buckets.cashPaidToSuppliers });
  operating.push({ label: "Cash Paid to Vendors", amount: buckets.cashPaidToVendors });

  const operatingNet = operating.reduce((s, i) => s + i.amount, 0);

  investing.push({ label: "Equipment Purchases", amount: buckets.equipmentPurchases });
  const investingNet = investing.reduce((s, i) => s + i.amount, 0);

  financing.push({ label: "Capital Introduced", amount: buckets.capitalIntroduced });
  financing.push({ label: "Drawings", amount: buckets.drawings });
  const financingNet = financing.reduce((s, i) => s + i.amount, 0);

  const netCashFlow = operatingNet + investingNet + financingNet;
  const closingCash = openingCash + netCashFlow;

  return {
    operating: { items: operating, net: operatingNet },
    investing: { items: investing, net: investingNet },
    financing: { items: financing, net: financingNet },
    netCashFlow,
    openingCash,
    closingCash,
  };
}

export function computeFinancialRatios(journalEntries, products, parties, movements, activeShopId) {
  const bs = computeBalanceSheet(journalEntries, Date.now());
  const pnl = computeProfitAndLoss(journalEntries, null, null);

  const currentAssets = bs.assets.totalCurrentAssets;
  const currentLiabilities = bs.liabilities.totalCurrentLiabilities;
  const inventory = bs.assets.currentAssets.find(a => a.code === "AC004")?.amount || 0;
  const receivables = bs.assets.currentAssets.find(a => a.code === "AC003")?.amount || 0;
  const payables = bs.liabilities.currentLiabilities.find(a => a.code === "AC010")?.amount || 0;
  const totalAssets = bs.assets.totalAssets;
  const totalDebt = bs.liabilities.totalLiabilities;
  const totalEquity = bs.capital.total;
  const revenue = pnl.revenue.total;
  const cogs = pnl.cogs;
  const netProfit = pnl.netProfit;

  const safe = (num, den) => den !== 0 ? num / den : 0;

  const currentRatio = safe(currentAssets, currentLiabilities);
  const quickRatio = safe(currentAssets - inventory, currentLiabilities);
  const grossProfitMargin = safe(pnl.grossProfit, revenue) * 100;
  const netProfitMargin = safe(netProfit, revenue) * 100;
  const inventoryTurnover = safe(cogs, inventory || 1);
  const receivableDays = safe(receivables, revenue) * 365;
  const payableDays = safe(payables, cogs || 1) * 365;
  const roa = safe(netProfit, totalAssets) * 100;
  const debtToEquity = safe(totalDebt, totalEquity || 1);
  const stockVelocity = safe(revenue, inventory || 1);

  return {
    currentRatio: Math.round(currentRatio * 100) / 100,
    quickRatio: Math.round(quickRatio * 100) / 100,
    grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
    netProfitMargin: Math.round(netProfitMargin * 10) / 10,
    inventoryTurnover: Math.round(inventoryTurnover * 100) / 100,
    receivableDays: Math.round(receivableDays),
    payableDays: Math.round(payableDays),
    roa: Math.round(roa * 10) / 10,
    debtToEquity: Math.round(debtToEquity * 100) / 100,
    stockVelocity: Math.round(stockVelocity * 100) / 100,
  };
}

export function computeCostSheet(movements, products, activeShopId, startDate, endDate) {
  const shopMovements = activeShopId
    ? (movements || []).filter(m => m.shopId === activeShopId)
    : (movements || []);

  const shopProducts = activeShopId
    ? (products || []).filter(p => p.shopId === activeShopId)
    : (products || []);

  const periodMovements = shopMovements.filter(m => {
    if (startDate && m.date < startDate) return false;
    if (endDate && m.date > endDate) return false;
    return true;
  });

  const beforePeriod = shopMovements.filter(m => startDate && m.date < startDate);

  let openingStockValue = 0;
  if (startDate) {
    const purchasesBefore = beforePeriod.filter(m => m.type === "PURCHASE");
    const salesBefore = beforePeriod.filter(m => m.type === "SALE");
    const purchaseVal = purchasesBefore.reduce((s, m) => s + ((m.unitPrice || 0) * (m.qty || 0)), 0);
    const soldCostVal = salesBefore.reduce((s, m) => {
      const prod = shopProducts.find(p => p.id === m.productId);
      return s + ((prod ? prod.buyPrice : m.unitPrice || 0) * (m.qty || 0));
    }, 0);
    openingStockValue = purchaseVal - soldCostVal;
    if (openingStockValue < 0) openingStockValue = 0;
  } else {
    openingStockValue = shopProducts.reduce((s, p) => s + (p.buyPrice * p.stock), 0) * 0.3;
  }

  const purchases = periodMovements
    .filter(m => m.type === "PURCHASE")
    .reduce((s, m) => s + ((m.unitPrice || 0) * (m.qty || 0)), 0);

  const purchaseReturns = periodMovements
    .filter(m => m.type === "RETURN_OUT")
    .reduce((s, m) => s + ((m.unitPrice || 0) * (m.qty || 0)), 0);

  const costOfMaterialsAvailable = openingStockValue + purchases - purchaseReturns;

  const closingStockValue = shopProducts.reduce((s, p) => s + (p.buyPrice * p.stock), 0);

  const materialsConsumed = costOfMaterialsAvailable - closingStockValue;

  const deliveryCharges = periodMovements
    .filter(m => m.type === "SALE" && m.deliveryFee)
    .reduce((s, m) => s + (m.deliveryFee || 0), 0);

  const directExpenses = deliveryCharges;
  const primeCost = materialsConsumed + directExpenses;
  const factoryOverheads = Math.round(primeCost * 0.05);
  const worksCost = primeCost + factoryOverheads;
  const adminOverheads = Math.round(worksCost * 0.08);
  const costOfProduction = worksCost + adminOverheads;
  const sellingDistribution = Math.round(costOfProduction * 0.03);
  const totalCost = costOfProduction + sellingDistribution;

  const salesRevenue = periodMovements
    .filter(m => m.type === "SALE")
    .reduce((s, m) => s + (m.total || 0), 0);

  const totalUnitsSold = periodMovements
    .filter(m => m.type === "SALE")
    .reduce((s, m) => s + (m.qty || 0), 0);

  const profit = salesRevenue - totalCost;
  const costPerUnit = totalUnitsSold > 0 ? totalCost / totalUnitsSold : 0;
  const profitPerUnit = totalUnitsSold > 0 ? profit / totalUnitsSold : 0;

  return {
    openingStockValue: Math.round(openingStockValue),
    purchases: Math.round(purchases),
    purchaseReturns: Math.round(purchaseReturns),
    costOfMaterialsAvailable: Math.round(costOfMaterialsAvailable),
    closingStockValue: Math.round(closingStockValue),
    materialsConsumed: Math.round(materialsConsumed),
    directExpenses: Math.round(directExpenses),
    primeCost: Math.round(primeCost),
    factoryOverheads,
    worksCost: Math.round(worksCost),
    adminOverheads,
    costOfProduction: Math.round(costOfProduction),
    sellingDistribution,
    totalCost: Math.round(totalCost),
    salesRevenue: Math.round(salesRevenue),
    profit: Math.round(profit),
    totalUnitsSold,
    costPerUnit: Math.round(costPerUnit),
    profitPerUnit: Math.round(profitPerUnit),
  };
}

export function computeOutstandingAging(movements, parties, activeShopId) {
  const shopMovements = activeShopId
    ? (movements || []).filter(m => m.shopId === activeShopId)
    : (movements || []);

  const now = Date.now();
  const DAY = 86400000;

  const getBucket = (date) => {
    const days = Math.floor((now - date) / DAY);
    if (days <= 30) return "0-30";
    if (days <= 60) return "31-60";
    if (days <= 90) return "61-90";
    return "90+";
  };

  const receivables = {};
  const payables = {};

  shopMovements.forEach(m => {
    if (m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) {
      const key = m.customerName || m.customerPhone || "Unknown";
      if (!receivables[key]) {
        receivables[key] = { name: key, phone: m.customerPhone || "", total: 0, "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, lastPaymentDate: null, entries: [] };
      }
      const amt = m.total || 0;
      const bucket = getBucket(m.date);
      receivables[key].total += amt;
      receivables[key][bucket] += amt;
      receivables[key].entries.push(m);
    }

    if (m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentStatus === "partial")) {
      const key = m.supplierName || m.supplier || "Unknown";
      if (!payables[key]) {
        payables[key] = { name: key, phone: "", total: 0, "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, entries: [] };
      }
      const amt = m.total || 0;
      const bucket = getBucket(m.date);
      payables[key].total += amt;
      payables[key][bucket] += amt;
      payables[key].entries.push(m);
    }
  });

  shopMovements.forEach(m => {
    if (m.type === "RECEIPT") {
      const key = m.customerName || m.supplierName || "Unknown";
      if (receivables[key]) {
        receivables[key].total -= (m.total || 0);
        if (receivables[key].lastPaymentDate === null || m.date > receivables[key].lastPaymentDate) {
          receivables[key].lastPaymentDate = m.date;
        }
      }
    }
    if (m.type === "PAYMENT") {
      const key = m.supplierName || m.supplier || m.customerName || "Unknown";
      if (payables[key]) {
        payables[key].total -= (m.total || 0);
      }
    }
  });

  const receivablesList = Object.values(receivables).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  const payablesList = Object.values(payables).filter(p => p.total > 0).sort((a, b) => b.total - a.total);

  const totalReceivable = receivablesList.reduce((s, r) => s + r.total, 0);
  const totalPayable = payablesList.reduce((s, p) => s + p.total, 0);

  const receivableAging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  receivablesList.forEach(r => {
    receivableAging["0-30"] += r["0-30"];
    receivableAging["31-60"] += r["31-60"];
    receivableAging["61-90"] += r["61-90"];
    receivableAging["90+"] += r["90+"];
  });

  const payableAging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  payablesList.forEach(p => {
    payableAging["0-30"] += p["0-30"];
    payableAging["31-60"] += p["31-60"];
    payableAging["61-90"] += p["61-90"];
    payableAging["90+"] += p["90+"];
  });

  return {
    receivables: receivablesList,
    payables: payablesList,
    totalReceivable,
    totalPayable,
    receivableAging,
    payableAging,
  };
}

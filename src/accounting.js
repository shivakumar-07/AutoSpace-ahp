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

      case "CREDIT_NOTE": {
        const cnTotal = total;
        const cnBase = cnTotal - gst;
        const cogsAmount = (buyPrice || 0) * (m.qty || 0);

        const journalRows = [
          { accountCode: "AC020", accountName: "Sales Revenue", debit: cnBase > 0 ? cnBase : cnTotal, credit: 0 },
        ];
        if (gst > 0) {
          journalRows.push({ accountCode: "AC011", accountName: "GST Output Tax", debit: gst, credit: 0 });
        }
        journalRows.push({ accountCode: "AC003", accountName: "Accounts Receivable", debit: 0, credit: cnTotal });
        if (cogsAmount > 0) {
          journalRows.push({ accountCode: "AC004", accountName: "Inventory", debit: cogsAmount, credit: 0 });
          journalRows.push({ accountCode: "AC030", accountName: "Cost of Goods Sold", debit: 0, credit: cogsAmount });
        }

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Credit Note",
          voucherNo: m.invoiceNo || "CN-" + m.id,
          narration: `Credit Note: ${m.productName || "product"} — ${m.customerName || "customer"}${m.originalInvoice ? " (Ref: " + m.originalInvoice + ")" : ""}`,
          entries: journalRows,
          refId: m.id,
          refType: "CREDIT_NOTE",
        });
        break;
      }

      case "DEBIT_NOTE": {
        const dnTotal = total;
        const dnBase = dnTotal - gst;

        const journalRows = [
          { accountCode: "AC010", accountName: "Accounts Payable", debit: dnTotal, credit: 0 },
        ];
        journalRows.push({ accountCode: "AC004", accountName: "Inventory", debit: 0, credit: dnBase > 0 ? dnBase : dnTotal });
        if (gst > 0) {
          journalRows.push({ accountCode: "AC005", accountName: "GST Input Credit", debit: 0, credit: gst });
        }

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Debit Note",
          voucherNo: m.invoiceNo || "DN-" + m.id,
          narration: `Debit Note: ${m.productName || "product"} — ${m.supplierName || m.supplier || "vendor"}${m.originalInvoice ? " (Ref: " + m.originalInvoice + ")" : ""}`,
          entries: journalRows,
          refId: m.id,
          refType: "DEBIT_NOTE",
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

      case "CONTRA": {
        const fromAccCode = m.fromAccount || "AC001";
        const toAccCode = m.toAccount || "AC002";
        const fromAccName = getAccountName(fromAccCode);
        const toAccName = getAccountName(toAccCode);

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Contra",
          voucherNo: m.invoiceNo || "CON-" + m.id,
          narration: m.note || `Fund transfer from ${fromAccName} to ${toAccName}`,
          entries: [
            { accountCode: toAccCode, accountName: toAccName, debit: total, credit: 0 },
            { accountCode: fromAccCode, accountName: fromAccName, debit: 0, credit: total },
          ],
          refId: m.id,
          refType: "CONTRA",
        });
        break;
      }

      case "REVERSAL": {
        // Reversal creates an opposite entry to the original
        const revTotal = Math.abs(total);
        const revGst = Math.abs(gst);
        const revBase = revTotal - revGst;

        // Determine original type and reverse accordingly
        const origType = m.originalType || "";
        let revRows = [];

        if (origType === "SALE" || m.originalMovementId?.startsWith?.("SALE")) {
          revRows = [
            { accountCode: "AC020", accountName: "Sales Revenue", debit: revBase > 0 ? revBase : revTotal, credit: 0 },
          ];
          if (revGst > 0) revRows.push({ accountCode: "AC011", accountName: "GST Output Tax", debit: revGst, credit: 0 });
          const payAccCode = resolvePaymentAccount(m.paymentMode || m.payment);
          revRows.push({ accountCode: payAccCode, accountName: getAccountName(payAccCode), debit: 0, credit: revTotal });
        } else if (origType === "PURCHASE") {
          const payAccCode = resolvePaymentAccountForPurchase(m.paymentMode || m.payment);
          revRows = [
            { accountCode: payAccCode, accountName: getAccountName(payAccCode), debit: revTotal, credit: 0 },
            { accountCode: "AC004", accountName: "Inventory", debit: 0, credit: revBase > 0 ? revBase : revTotal },
          ];
          if (revGst > 0) revRows.push({ accountCode: "AC005", accountName: "GST Input Credit", debit: 0, credit: revGst });
        } else {
          // Generic reversal — reverse the debit/credit
          revRows = [
            { accountCode: "AC040", accountName: "Miscellaneous Expenses", debit: revTotal, credit: 0 },
            { accountCode: "AC001", accountName: "Cash in Hand", debit: 0, credit: revTotal },
          ];
        }

        entries.push({
          id: "JE-" + m.id,
          date: m.date,
          voucherType: "Reversal",
          voucherNo: m.invoiceNo || "REV-" + m.id,
          narration: m.note || `Reversal of ${m.originalInvoiceNo || m.originalMovementId || "document"}`,
          entries: revRows,
          refId: m.id,
          refType: "REVERSAL",
        });
        break;
      }

      case "JOURNAL": {
        // Manual journal entry — entries are pre-defined in the movement
        const journalRows = (m.journalEntries || []).map(je => ({
          accountCode: je.accountCode,
          accountName: je.accountName || getAccountName(je.accountCode),
          debit: je.debit || 0,
          credit: je.credit || 0,
        }));

        if (journalRows.length > 0) {
          entries.push({
            id: "JE-" + m.id,
            date: m.date,
            voucherType: "Journal",
            voucherNo: m.invoiceNo || "JNL-" + m.id,
            narration: m.note || "Manual Journal Entry",
            entries: journalRows,
            refId: m.id,
            refType: "JOURNAL",
            costCentre: m.costCentre || null,
          });
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

export function computeCostCentrePnL(journalEntries, costCentres, startDate, endDate) {
  const ccMap = {};
  (costCentres || []).forEach(cc => {
    ccMap[cc.id] = { id: cc.id, name: cc.name, revenue: {}, expenses: {}, totalRevenue: 0, totalExpenses: 0, netProfit: 0 };
  });
  ccMap["__unallocated__"] = { id: "__unallocated__", name: "Unallocated", revenue: {}, expenses: {}, totalRevenue: 0, totalExpenses: 0, netProfit: 0 };

  const incomeSet = new Set(CHART_OF_ACCOUNTS.filter(a => a.type === "INCOME").map(a => a.code));
  const expenseSet = new Set(CHART_OF_ACCOUNTS.filter(a => a.type === "EXPENSE").map(a => a.code));

  (journalEntries || []).forEach(je => {
    if (startDate && je.date < startDate) return;
    if (endDate && je.date > endDate) return;
    const ccId = je.costCentre || "__unallocated__";
    if (!ccMap[ccId]) ccMap[ccId] = { id: ccId, name: ccId, revenue: {}, expenses: {}, totalRevenue: 0, totalExpenses: 0, netProfit: 0 };
    je.entries.forEach(e => {
      if (incomeSet.has(e.accountCode)) {
        const amt = (e.credit || 0) - (e.debit || 0);
        if (!ccMap[ccId].revenue[e.accountCode]) ccMap[ccId].revenue[e.accountCode] = { code: e.accountCode, name: e.accountName, amount: 0 };
        ccMap[ccId].revenue[e.accountCode].amount += amt;
        ccMap[ccId].totalRevenue += amt;
      }
      if (expenseSet.has(e.accountCode)) {
        const amt = (e.debit || 0) - (e.credit || 0);
        if (!ccMap[ccId].expenses[e.accountCode]) ccMap[ccId].expenses[e.accountCode] = { code: e.accountCode, name: e.accountName, amount: 0 };
        ccMap[ccId].expenses[e.accountCode].amount += amt;
        ccMap[ccId].totalExpenses += amt;
      }
    });
  });

  const results = Object.values(ccMap).map(cc => ({
    ...cc,
    revenue: Object.values(cc.revenue).filter(r => r.amount !== 0),
    expenses: Object.values(cc.expenses).filter(e => e.amount !== 0),
    netProfit: cc.totalRevenue - cc.totalExpenses,
  })).filter(cc => cc.totalRevenue !== 0 || cc.totalExpenses !== 0);

  return results;
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

// ════════════════════════════════════════════════════════════════════════
// EXPANDED GST-READY CHART OF ACCOUNTS (numeric 1000–5400 series)
// Maps old AC0xx codes to new numeric codes for reference. Both work.
// ════════════════════════════════════════════════════════════════════════
export const EXPANDED_COA = [
  // 1000 – ASSETS
  { code: "1000", name: "Cash in Hand", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC001" },
  { code: "1010", name: "Petty Cash", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1100", name: "Bank Account – Primary", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC002" },
  { code: "1110", name: "Bank Account – Secondary", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1200", name: "Accounts Receivable", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC003" },
  { code: "1210", name: "Advances to Suppliers", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1300", name: "Inventory – Stock in Trade", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC004" },
  { code: "1310", name: "Inventory – Raw Materials", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1320", name: "Inventory – Consumables", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1400", name: "CGST Input Credit", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC005" },
  { code: "1410", name: "SGST Input Credit", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1420", name: "IGST Input Credit", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1430", name: "TDS Receivable", group: "ASSETS", subGroup: "Current Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1500", name: "Shop Equipment", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC006" },
  { code: "1510", name: "Furniture & Fixtures", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Dr", legacyCode: "AC007" },
  { code: "1520", name: "Vehicles", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1530", name: "Computer & IT Equipment", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Dr" },
  { code: "1600", name: "Accumulated Depreciation", group: "ASSETS", subGroup: "Fixed Assets", type: "ASSET", normalBalance: "Cr" },

  // 2000 – LIABILITIES
  { code: "2000", name: "Accounts Payable", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr", legacyCode: "AC010" },
  { code: "2010", name: "Advances from Customers", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr", legacyCode: "AC012" },
  { code: "2100", name: "CGST Output Tax", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr", legacyCode: "AC011" },
  { code: "2110", name: "SGST Output Tax", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "2120", name: "IGST Output Tax", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "2130", name: "TDS Payable", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },
  { code: "2200", name: "Refunds Payable", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr", legacyCode: "AC013" },
  { code: "2300", name: "Term Loans", group: "LIABILITIES", subGroup: "Long Term", type: "LIABILITY", normalBalance: "Cr", legacyCode: "AC014" },
  { code: "2310", name: "Vehicle Loans", group: "LIABILITIES", subGroup: "Long Term", type: "LIABILITY", normalBalance: "Cr" },
  { code: "2400", name: "Statutory Dues", group: "LIABILITIES", subGroup: "Current Liabilities", type: "LIABILITY", normalBalance: "Cr" },

  // 3000 – CAPITAL / EQUITY
  { code: "3000", name: "Owner's Capital", group: "CAPITAL", subGroup: "Capital", type: "CAPITAL", normalBalance: "Cr", legacyCode: "AC050" },
  { code: "3010", name: "Retained Earnings", group: "CAPITAL", subGroup: "Capital", type: "CAPITAL", normalBalance: "Cr", legacyCode: "AC051" },
  { code: "3020", name: "Drawings", group: "CAPITAL", subGroup: "Capital", type: "CAPITAL", normalBalance: "Dr", legacyCode: "AC052" },

  // 4000 – INCOME
  { code: "4000", name: "Sales Revenue", group: "INCOME", subGroup: "Income", type: "INCOME", normalBalance: "Cr", legacyCode: "AC020" },
  { code: "4010", name: "Service Income", group: "INCOME", subGroup: "Income", type: "INCOME", normalBalance: "Cr", legacyCode: "AC021" },
  { code: "4020", name: "Discount Received", group: "INCOME", subGroup: "Other Income", type: "INCOME", normalBalance: "Cr", legacyCode: "AC022" },
  { code: "4030", name: "Other Income", group: "INCOME", subGroup: "Other Income", type: "INCOME", normalBalance: "Cr", legacyCode: "AC023" },
  { code: "4040", name: "Interest Income", group: "INCOME", subGroup: "Other Income", type: "INCOME", normalBalance: "Cr" },
  { code: "4050", name: "Scrap / Salvage Income", group: "INCOME", subGroup: "Other Income", type: "INCOME", normalBalance: "Cr" },

  // 5000 – EXPENSES
  { code: "5000", name: "Cost of Goods Sold", group: "EXPENSES", subGroup: "Direct Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC030" },
  { code: "5010", name: "Purchase Returns", group: "EXPENSES", subGroup: "Direct Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC031" },
  { code: "5020", name: "Freight Inward", group: "EXPENSES", subGroup: "Direct Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "5100", name: "Salaries & Wages", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC032" },
  { code: "5110", name: "Rent", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC033" },
  { code: "5120", name: "Electricity & Utilities", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC034" },
  { code: "5130", name: "Marketing & Advertising", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC035" },
  { code: "5140", name: "Delivery Charges", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC036" },
  { code: "5150", name: "Customer Returns / Refunds", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC037" },
  { code: "5160", name: "Depreciation", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC038" },
  { code: "5170", name: "Bank Charges", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC039" },
  { code: "5180", name: "Insurance", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "5190", name: "Repairs & Maintenance", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "5200", name: "Telephone & Internet", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "5210", name: "Printing & Stationery", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "5300", name: "Discount Given", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr" },
  { code: "5400", name: "Miscellaneous Expenses", group: "EXPENSES", subGroup: "Operating Expenses", type: "EXPENSE", normalBalance: "Dr", legacyCode: "AC040" },
];

// ════════════════════════════════════════════════════════════════════════
// PERIOD LOCKING — prevent editing transactions in closed months
// ════════════════════════════════════════════════════════════════════════
const PERIOD_LOCKS_KEY = "vl_period_locks";

export function loadPeriodLocks() {
  try {
    const raw = localStorage.getItem(PERIOD_LOCKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePeriodLocks(locks) {
  try {
    localStorage.setItem(PERIOD_LOCKS_KEY, JSON.stringify(locks));
  } catch { }
}

/**
 * Check if a given date falls within a locked period.
 * @param {number} timestamp — epoch ms
 * @param {string} shopId — shop identifier
 * @returns {{ locked: boolean, lockedUntil?: string }}
 */
export function isDateLocked(timestamp, shopId) {
  const locks = loadPeriodLocks();
  const d = new Date(timestamp);
  const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  for (const lock of locks) {
    if (lock.shopId && lock.shopId !== shopId) continue;
    if (lock.yearMonth === yearMonth && lock.locked) {
      return { locked: true, lockedUntil: lock.yearMonth };
    }
  }
  return { locked: false };
}

/**
 * Toggle a period lock for a given month.
 */
export function togglePeriodLock(yearMonth, shopId, lock = true, lockedBy = "owner") {
  const locks = loadPeriodLocks();
  const idx = locks.findIndex(l => l.yearMonth === yearMonth && l.shopId === shopId);
  if (idx >= 0) {
    locks[idx].locked = lock;
    locks[idx].lockedAt = Date.now();
    locks[idx].lockedBy = lockedBy;
  } else {
    locks.push({ yearMonth, shopId, locked: lock, lockedAt: Date.now(), lockedBy });
  }
  savePeriodLocks(locks);
  return locks;
}

// ════════════════════════════════════════════════════════════════════════
// DOCUMENT REVERSAL — SAP-style immutable audit trail
// Creates equal-opposite journal entry linked to original
// ════════════════════════════════════════════════════════════════════════
/**
 * Create a reversal movement from an existing movement.
 * The original document is NOT modified — a new "REVERSAL" movement is returned.
 * @param {object} originalMovement — the movement to reverse
 * @param {string} reason — reason for reversal
 * @param {function} uidFn — uid generator function
 * @returns {object} — new reversal movement
 */
export function createReversalMovement(originalMovement, reason, uidFn) {
  const uid = uidFn || (() => Math.random().toString(36).slice(2, 10));
  const revId = "rev_" + uid();
  return {
    ...originalMovement,
    id: revId,
    type: "REVERSAL",
    originalMovementId: originalMovement.id,
    originalInvoiceNo: originalMovement.invoiceNo,
    invoiceNo: `REV-${originalMovement.invoiceNo || originalMovement.id}`,
    qty: -(originalMovement.qty || 0),
    total: -(originalMovement.total || 0),
    gstAmount: -(originalMovement.gstAmount || 0),
    profit: -(originalMovement.profit || 0),
    note: `Reversal of ${originalMovement.invoiceNo || originalMovement.id}: ${reason}`,
    date: Date.now(),
    reversalReason: reason,
    paymentStatus: "reversed",
  };
}

// ════════════════════════════════════════════════════════════════════════
// FIFO COGS CALCULATION — tracks cost layer for each purchase batch
// ════════════════════════════════════════════════════════════════════════
/**
 * Calculate COGS using FIFO for a specific product.
 * @param {Array} movements — all movements sorted by date
 * @param {string} productId — product to calculate for
 * @returns {{ totalCOGS: number, layers: Array, currentStock: number, avgCost: number }}
 */
export function computeFIFOCOGS(movements, productId) {
  const sorted = (movements || [])
    .filter(m => m.productId === productId)
    .sort((a, b) => a.date - b.date);

  const layers = []; // Each layer: { qty, costPerUnit, date, invoiceNo }
  let totalCOGS = 0;

  sorted.forEach(m => {
    if (m.type === "PURCHASE" || m.type === "OPENING_STOCK") {
      layers.push({
        qty: m.qty || 0,
        costPerUnit: m.unitPrice || 0,
        date: m.date,
        invoiceNo: m.invoiceNo || "",
      });
    } else if (m.type === "SALE" || m.type === "RETURN_OUT") {
      let remaining = m.qty || 0;
      while (remaining > 0 && layers.length > 0) {
        const oldest = layers[0];
        if (oldest.qty <= remaining) {
          totalCOGS += oldest.qty * oldest.costPerUnit;
          remaining -= oldest.qty;
          layers.shift();
        } else {
          totalCOGS += remaining * oldest.costPerUnit;
          oldest.qty -= remaining;
          remaining = 0;
        }
      }
    } else if (m.type === "RETURN_IN") {
      // Customer return — add back to inventory at last FIFO cost
      const lastCost = layers.length > 0 ? layers[layers.length - 1].costPerUnit : (m.unitPrice || 0);
      layers.push({
        qty: m.qty || 0,
        costPerUnit: lastCost,
        date: m.date,
        invoiceNo: m.invoiceNo || "RETURN",
      });
    }
  });

  const currentStock = layers.reduce((s, l) => s + l.qty, 0);
  const currentValue = layers.reduce((s, l) => s + (l.qty * l.costPerUnit), 0);
  const avgCost = currentStock > 0 ? currentValue / currentStock : 0;

  return { totalCOGS, layers, currentStock, currentValue, avgCost: Math.round(avgCost * 100) / 100 };
}

// ════════════════════════════════════════════════════════════════════════
// GST LEDGER — collected vs paid, net liability
// ════════════════════════════════════════════════════════════════════════
export function computeGSTLedger(journalEntries, startDate, endDate) {
  let cgstOutput = 0, sgstOutput = 0, igstOutput = 0;
  let cgstInput = 0, sgstInput = 0, igstInput = 0;

  // Use both legacy (AC005/AC011) and new codes
  const outputCodes = new Set(["AC011", "2100", "2110", "2120"]);
  const inputCodes = new Set(["AC005", "1400", "1410", "1420"]);

  (journalEntries || []).forEach(je => {
    if (startDate && je.date < startDate) return;
    if (endDate && je.date > endDate) return;

    je.entries.forEach(e => {
      if (outputCodes.has(e.accountCode)) {
        const amt = (e.credit || 0) - (e.debit || 0);
        if (e.accountCode === "2100" || e.accountCode === "AC011") cgstOutput += amt / 2; // Split IGST assumption
        if (e.accountCode === "2110") sgstOutput += amt;
        if (e.accountCode === "2120") igstOutput += amt;
        // Legacy single account — split equally
        if (e.accountCode === "AC011") { cgstOutput += amt / 2; sgstOutput += amt / 2; cgstOutput -= amt / 2; }
      }
      if (inputCodes.has(e.accountCode)) {
        const amt = (e.debit || 0) - (e.credit || 0);
        if (e.accountCode === "1400" || e.accountCode === "AC005") cgstInput += amt / 2;
        if (e.accountCode === "1410") sgstInput += amt;
        if (e.accountCode === "1420") igstInput += amt;
        if (e.accountCode === "AC005") { cgstInput += amt / 2; sgstInput += amt / 2; cgstInput -= amt / 2; }
      }
    });
  });

  // For legacy accounts that don't split CGST/SGST, aggregate
  const totalOutput = cgstOutput + sgstOutput + igstOutput;
  const totalInput = cgstInput + sgstInput + igstInput;
  const netLiability = totalOutput - totalInput;

  return {
    cgstOutput: Math.round(cgstOutput),
    sgstOutput: Math.round(sgstOutput),
    igstOutput: Math.round(igstOutput),
    totalOutput: Math.round(totalOutput),
    cgstInput: Math.round(cgstInput),
    sgstInput: Math.round(sgstInput),
    igstInput: Math.round(igstInput),
    totalInput: Math.round(totalInput),
    netLiability: Math.round(netLiability),
    itcUtilised: Math.min(Math.round(totalInput), Math.round(totalOutput)),
    cashPayable: Math.max(0, Math.round(netLiability)),
  };
}

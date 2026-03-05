const STORAGE_KEY = "vl_voucher_sequences";

const VOUCHER_PREFIXES = {
  SALE: "INV",
  ESTIMATE: "EST",
  PURCHASE: "PUR",
  RECEIPT: "RCP",
  PAYMENT: "PAY",
  JOURNAL: "JNL",
  CREDIT_NOTE: "CN",
  DEBIT_NOTE: "DN",
  CONTRA: "CON",
  SO: "SO",
  DN: "DN",
};

function getCurrentFinancialYear(date) {
  const d = date ? new Date(date) : new Date();
  const month = d.getMonth();
  const year = d.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(2)}${String(endYear).slice(2)}`;
}

function loadSequences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSequences(sequences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
  } catch {}
}

export function getNextVoucherNumber(voucherType, date) {
  const prefix = VOUCHER_PREFIXES[voucherType] || voucherType;
  const fy = getCurrentFinancialYear(date);
  const key = `${prefix}_${fy}`;

  const sequences = loadSequences();
  const nextSeq = (sequences[key] || 0) + 1;
  sequences[key] = nextSeq;
  saveSequences(sequences);

  return `${prefix}/${fy}/${String(nextSeq).padStart(3, "0")}`;
}

export function peekNextVoucherNumber(voucherType, date) {
  const prefix = VOUCHER_PREFIXES[voucherType] || voucherType;
  const fy = getCurrentFinancialYear(date);
  const key = `${prefix}_${fy}`;

  const sequences = loadSequences();
  const nextSeq = (sequences[key] || 0) + 1;

  return `${prefix}/${fy}/${String(nextSeq).padStart(3, "0")}`;
}

export function resetVoucherSequences() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export { VOUCHER_PREFIXES, getCurrentFinancialYear };

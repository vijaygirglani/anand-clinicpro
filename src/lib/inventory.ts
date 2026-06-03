// ClinicPro — Inventory Library
// SINGLE SOURCE OF TRUTH: Purchase Bills drive everything
// Stock is ALWAYS calculated live from purchase bills minus patient prescriptions
// No separate medicine master — batch is the unit of truth

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PurchaseBillItem {
  medicineName: string;
  batchNo: string;
  expiryDate: string;       // "MM/YY"
  packSize: number;         // tablets per pack
  mrpPerPack: number;       // MRP of one pack
  mrpPerTablet: number;     // mrpPerPack / packSize — always calculated
  qtyPacksPaid: number;     // packs paid for
  qtyPacksFree: number;     // packs received free
  totalPacksReceived: number; // paid + free
  totalTabletsReceived: number; // totalPacksReceived * packSize
  ratePerPack: number;      // purchase rate per pack
  discountPct: number;
  gstPct: number;
  taxableAmount: number;
  gstAmount: number;
  totalPaid: number;        // actual money paid for this item
  landingCostPerPack: number;  // totalPaid / totalPacksReceived
  landingCostPerTablet: number; // landingCostPerPack / packSize
  discontinued: boolean;    // admin can discontinue
  reorderLevel?: number;    // alert when stock drops below this (default 10)
  alertDismissed?: boolean; // admin dismissed low stock alert
}

export interface PurchaseBill {
  id: string;
  supplierName: string;
  billNo: string;
  billDate: string;         // YYYY-MM-DD
  items: PurchaseBillItem[];
  grandTotal: number;       // total of all item totalPaid
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  amountPending: number;    // grandTotal - amountPaid
  paymentDate?: string;
  notes?: string;
  createdAt: string;
}

export interface BatchStock {
  billId: string;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  packSize: number;
  mrpPerPack: number;
  mrpPerTablet: number;
  landingCostPerTablet: number;
  totalTabletsReceived: number;
  tabletsUsed: number;      // from patient prescriptions
  tabletsAvailable: number; // totalTabletsReceived - tabletsUsed
  discontinued: boolean;
  daysToExpiry: number;
  expiryStatus: "expired" | "critical" | "soon" | "watch" | "good";
  stockStatus: "out" | "low" | "ok";
  reorderLevel: number;
  alertDismissed: boolean;
}

export interface PatientMedicineItem {
  medicineName: string;
  batchNo: string;          // which batch was used
  billId: string;           // which purchase bill
  qtyTablets: number;
  mrpPerTablet: number;
  landingCostPerTablet: number;
  salePrice: number;        // mrpPerTablet * qtyTablets
  cost: number;             // landingCostPerTablet * qtyTablets
  profit: number;           // salePrice - cost
}

export interface PatientBill {
  id: string;
  patientId: number;
  patientName: string;
  doctorId: 1 | 2;
  billDate: string;
  items: PatientMedicineItem[];
  totalSale: number;
  totalCost: number;
  totalProfit: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  billId: string;
  medicineName: string;
  batchNo: string;
  adjustQtyTablets: number; // positive = add, negative = remove
  reason: string;
  date: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════

const PURCHASE_BILLS_KEY    = "cp_purchase_bills";
const PATIENT_BILLS_KEY     = "cp_patient_bills";
const EXPENSES_KEY          = "cp_expenses";
const EXPENSE_CATS_KEY      = "cp_expense_categories";
const BILL_PAYMENTS_KEY     = "cp_bill_payments";
const STOCK_ADJUSTMENTS_KEY = "cp_stock_adjustments";

// ═══════════════════════════════════════════════════════════════
// ID GENERATOR
// ═══════════════════════════════════════════════════════════════

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ═══════════════════════════════════════════════════════════════
// LANDING COST CALCULATOR
// ═══════════════════════════════════════════════════════════════

export function calcLandingCost(params: {
  qtyPacksPaid: number;
  qtyPacksFree: number;
  ratePerPack: number;
  discountPct: number;
  gstPct: number;
  mrpPerPack: number;
  packSize: number;
}): Omit<PurchaseBillItem, "medicineName"|"batchNo"|"expiryDate"|"discontinued"> {
  const { qtyPacksPaid, qtyPacksFree, ratePerPack, discountPct, gstPct, mrpPerPack, packSize } = params;
  const ps = packSize || 1;
  const totalPacksReceived = qtyPacksPaid + qtyPacksFree;
  const totalTabletsReceived = totalPacksReceived * ps;
  const grossAmt = qtyPacksPaid * ratePerPack;
  const discAmt = grossAmt * (discountPct / 100);
  const taxableAmount = grossAmt - discAmt;
  const gstAmount = taxableAmount * (gstPct / 100);
  const totalPaid = taxableAmount + gstAmount;
  const landingCostPerPack = totalPacksReceived > 0 ? totalPaid / totalPacksReceived : 0;
  const landingCostPerTablet = ps > 0 ? landingCostPerPack / ps : landingCostPerPack;
  const mrpPerTablet = ps > 0 ? mrpPerPack / ps : mrpPerPack;
  return {
    packSize: ps, mrpPerPack, mrpPerTablet,
    qtyPacksPaid, qtyPacksFree, totalPacksReceived, totalTabletsReceived,
    ratePerPack, discountPct, gstPct,
    taxableAmount, gstAmount, totalPaid,
    landingCostPerPack, landingCostPerTablet,
  };
}

// ═══════════════════════════════════════════════════════════════
// PURCHASE BILLS
// ═══════════════════════════════════════════════════════════════

export function getPurchaseBills(): PurchaseBill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PURCHASE_BILLS_KEY) || "[]");
    // Normalize each bill - handle both old and new format
    return raw.map((bill: any) => ({
      ...bill,
      id: String(bill.id), // ensure string id
      paymentStatus: bill.paymentStatus || "unpaid",
      amountPaid: bill.amountPaid || 0,
      amountPending: bill.amountPending ?? bill.grandTotal ?? 0,
      items: (bill.items || []).map((item: any) => {
        // Normalize item fields from old format
        const packSize = Number(item.packSize) || 1;
        const mrpPerPack = Number(item.mrpPerPack || item.mrp || 0);
        // ALWAYS recalculate per-tablet values from pack size - never trust stored
        const mrpPerTablet = packSize > 1 ? mrpPerPack / packSize : mrpPerPack;
        const totalPacksReceived = Number(item.totalPacksReceived || item.totalQtyReceived || 0);
        const totalTabletsReceived = totalPacksReceived * packSize;
        const landingCostPerPack = Number(item.landingCostPerPack || item.landingCostPerUnit || 0);
        // ALWAYS recalculate per-tablet landing cost from pack size
        const landingCostPerTablet = packSize > 1 ? landingCostPerPack / packSize : landingCostPerPack;
        return {
          ...item,
          packSize, mrpPerPack, mrpPerTablet,
          totalPacksReceived, totalTabletsReceived,
          landingCostPerPack, landingCostPerTablet,
          qtyPacksPaid: item.qtyPacksPaid || item.qtyPaid || 0,
          qtyPacksFree: item.qtyPacksFree || item.qtyFree || 0,
          ratePerPack: item.ratePerPack || item.ratePerUnit || 0,
          discontinued: item.discontinued || false,
        };
      }),
    }));
  } catch { return []; }
}

export function savePurchaseBill(bill: PurchaseBill): void {
  const bills = getPurchaseBills();
  const idx = bills.findIndex(b => b.id === bill.id);
  if (idx >= 0) bills[idx] = bill;
  else bills.push(bill);
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
}

export function deletePurchaseBill(id: string): void {
  const bills = getPurchaseBills().filter(b => b.id !== id);
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
}

export function addPaymentToBill(billId: string, amount: number, date: string, note = ""): void {
  const bills = getPurchaseBills();
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  bill.amountPaid = Math.min(bill.grandTotal, bill.amountPaid + amount);
  bill.amountPending = bill.grandTotal - bill.amountPaid;
  bill.paymentStatus = bill.amountPaid >= bill.grandTotal ? "paid"
    : bill.amountPaid > 0 ? "partial" : "unpaid";
  bill.paymentDate = date;
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
  // Also save payment record
  const payments = getBillPayments();
  payments.push({ id: newId(), billId, amount, date, note, createdAt: new Date().toISOString() });
  localStorage.setItem(BILL_PAYMENTS_KEY, JSON.stringify(payments));
}

export function getBillPayments(): BillPayment[] {
  try { return JSON.parse(localStorage.getItem(BILL_PAYMENTS_KEY) || "[]"); }
  catch { return []; }
}

// ═══════════════════════════════════════════════════════════════
// LIVE STOCK CALCULATION — No stored stock numbers
// ═══════════════════════════════════════════════════════════════

export function getStockAdjustments(): StockAdjustment[] {
  try { return JSON.parse(localStorage.getItem(STOCK_ADJUSTMENTS_KEY) || "[]"); }
  catch { return []; }
}

export function addStockAdjustment(adj: Omit<StockAdjustment, "id"|"createdAt">): void {
  const adjs = getStockAdjustments();
  adjs.push({ ...adj, id: newId(), createdAt: new Date().toISOString() });
  localStorage.setItem(STOCK_ADJUSTMENTS_KEY, JSON.stringify(adjs));
}

// Calculate tablets used for a specific batch from patient bills
function getTabletsUsedForBatch(billId: string, batchNo: string, medicineName: string): number {
  const patientBills = getPatientBills();
  const adjustments = getStockAdjustments();
  
  let used = patientBills.reduce((sum, pb) => {
    return sum + pb.items
      .filter(i => i.billId === billId && i.batchNo === batchNo && 
                   i.medicineName.toLowerCase() === medicineName.toLowerCase())
      .reduce((s, i) => s + i.qtyTablets, 0);
  }, 0);

  // Apply stock adjustments
  const adjTotal = adjustments
    .filter(a => a.billId === billId && a.batchNo === batchNo &&
                 a.medicineName.toLowerCase() === medicineName.toLowerCase())
    .reduce((s, a) => s - a.adjustQtyTablets, 0); // negative adjustment = used

  return used + adjTotal;
}

function calcDaysToExpiry(expiryDate: string): number {
  if (!expiryDate) return 9999;
  const parts = expiryDate.split("/");
  if (parts.length !== 2) return 9999;
  const month = parseInt(parts[0]) - 1;
  const year = parseInt(parts[1]) < 100 ? 2000 + parseInt(parts[1]) : parseInt(parts[1]);
  const expiry = new Date(year, month + 1, 0); // last day of month
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(days: number): BatchStock["expiryStatus"] {
  if (days < 0)    return "expired";
  if (days <= 30)  return "critical";
  if (days <= 60)  return "soon";
  if (days <= 180) return "watch";
  return "good";
}

// Get ALL batch stocks (live calculation)
export function getAllBatchStocks(): BatchStock[] {
  const bills = getPurchaseBills();
  const result: BatchStock[] = [];
  const REORDER_LEVEL = 10; // default reorder level in tablets

  for (const bill of bills) {
    for (const item of bill.items) {
      // Skip old-format items that don't have new fields
      if (!item.mrpPerPack && !item.mrpPerTablet) continue;
      // Migrate old format on the fly
      if (!item.mrpPerPack && (item as any).mrp) {
        item.mrpPerPack = (item as any).mrp;
        item.packSize = item.packSize || 1;
        item.mrpPerTablet = item.mrpPerPack / item.packSize;
        item.landingCostPerPack = (item as any).landingCostPerUnit || 0;
        item.landingCostPerTablet = item.landingCostPerPack / item.packSize;
        item.totalPacksReceived = item.totalPacksReceived || (item as any).totalQtyReceived || 0;
        item.totalTabletsReceived = item.totalPacksReceived * item.packSize;
        item.qtyPacksPaid = item.qtyPacksPaid || (item as any).qtyPaid || 0;
        item.qtyPacksFree = item.qtyPacksFree || (item as any).qtyFree || 0;
        item.ratePerPack = item.ratePerPack || (item as any).ratePerUnit || 0;
      }
      const tabletsUsed = getTabletsUsedForBatch(bill.id, item.batchNo, item.medicineName);
      const tabletsAvailable = Math.max(0, item.totalTabletsReceived - tabletsUsed);
      const daysToExpiry = calcDaysToExpiry(item.expiryDate);

      result.push({
        billId: bill.id,
        medicineName: item.medicineName,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        packSize: item.packSize,
        mrpPerPack: item.mrpPerPack,
        mrpPerTablet: item.mrpPerTablet,
        landingCostPerTablet: item.landingCostPerTablet,
        totalTabletsReceived: item.totalTabletsReceived,
        tabletsUsed,
        tabletsAvailable,
        discontinued: item.discontinued || false,
        daysToExpiry,
        expiryStatus: getExpiryStatus(daysToExpiry),
        stockStatus: item.alertDismissed ? "ok" : 
                     tabletsAvailable <= 0 ? "out" : 
                     tabletsAvailable <= (item.reorderLevel ?? REORDER_LEVEL) ? "low" : "ok",
        reorderLevel: item.reorderLevel ?? REORDER_LEVEL,
        alertDismissed: item.alertDismissed || false,
      });
    }
  }

  // Sort: expired first, then by days to expiry
  return result.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

// Get available batches for a medicine (for patient form dropdown)
export function getAvailableBatchesForMedicine(medicineName: string): BatchStock[] {
  return getAllBatchStocks()
    .filter(b => b.medicineName.toLowerCase() === medicineName.toLowerCase()
              && !b.discontinued
              && b.tabletsAvailable > 0
              && b.daysToExpiry >= 0)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry); // FIFO — oldest expiry first
}

// Get all unique medicine names from purchase bills
export function getAllMedicineNames(): string[] {
  const names = new Set<string>();
  getPurchaseBills().forEach(b => b.items.forEach(i => names.add(i.medicineName)));
  return Array.from(names).sort();
}

// Search medicine names for autocomplete
export function searchMedicineNames(query: string): { 
  name: string; 
  batches: BatchStock[];
  bestBatch: BatchStock | null;
}[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const allBatches = getAllBatchStocks().filter(b => !b.discontinued && b.tabletsAvailable > 0);
  
  // Group by medicine name
  const grouped = new Map<string, BatchStock[]>();
  for (const batch of allBatches) {
    if (batch.medicineName.toLowerCase().includes(q)) {
      const key = batch.medicineName.toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(batch);
    }
  }

  return Array.from(grouped.entries()).map(([, batches]) => ({
    name: batches[0].medicineName,
    batches: batches.sort((a, b) => a.daysToExpiry - b.daysToExpiry),
    bestBatch: batches[0] || null,
  }));
}

// Discontinue a batch (admin only)
export function discontinueBatch(billId: string, batchNo: string, medicineName: string): void {
  const bills = getPurchaseBills();
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  const item = bill.items.find(i => i.batchNo === batchNo && 
    i.medicineName.toLowerCase() === medicineName.toLowerCase());
  if (item) { item.discontinued = true; }
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
}

// Re-activate a discontinued batch
export function reactivateBatch(billId: string, batchNo: string, medicineName: string): void {
  const bills = getPurchaseBills();
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  const item = bill.items.find(i => i.batchNo === batchNo &&
    i.medicineName.toLowerCase() === medicineName.toLowerCase());
  if (item) {
    item.discontinued = false;
    item.alertDismissed = false;
  }
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
}

// Stock valuation
export function getStockValuation(): { atCost: number; atMrp: number; profit: number } {
  const batches = getAllBatchStocks().filter(b => !b.discontinued);
  const atCost = batches.reduce((s, b) => s + b.tabletsAvailable * b.landingCostPerTablet, 0);
  const atMrp  = batches.reduce((s, b) => s + b.tabletsAvailable * b.mrpPerTablet, 0);
  return { atCost: Math.round(atCost), atMrp: Math.round(atMrp), profit: Math.round(atMrp - atCost) };
}

// Supplier summary
export interface SupplierSummary {
  supplierName: string;
  totalBills: number;
  totalAmount: number;
  amountPaid: number;
  amountPending: number;
  lastBillDate: string;
  oldestUnpaidDate: string;  // oldest unpaid bill date
  overdueDays: number;       // days since oldest unpaid bill
}

export function getSupplierSummary(): SupplierSummary[] {
  const bills = getPurchaseBills();
  const map = new Map<string, SupplierSummary>();
  for (const bill of bills) {
    const key = bill.supplierName.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { supplierName: bill.supplierName, totalBills: 0, totalAmount: 0, amountPaid: 0, amountPending: 0, lastBillDate: "", oldestUnpaidDate: "", overdueDays: 0 });
    }
    const s = map.get(key)!;
    s.totalBills++;
    s.totalAmount += bill.grandTotal;
    s.amountPaid += bill.amountPaid;
    s.amountPending += bill.amountPending;
    if (!s.lastBillDate || bill.billDate > s.lastBillDate) s.lastBillDate = bill.billDate;
  }
  // Calculate overdue days for each supplier
  const today = new Date();
  today.setHours(0,0,0,0);
  return Array.from(map.values()).map(s => {
    // Find oldest unpaid bill for this supplier
    const unpaidBills = bills.filter(b => 
      b.supplierName.toLowerCase() === s.supplierName.toLowerCase() && 
      b.paymentStatus !== "paid" && b.amountPending > 0
    );
    const oldestUnpaid = unpaidBills.sort((a,b) => a.billDate.localeCompare(b.billDate))[0];
    const oldestDate = oldestUnpaid?.billDate || "";
    const overdueDays = oldestDate 
      ? Math.floor((today.getTime() - new Date(oldestDate).getTime()) / (1000*60*60*24))
      : 0;
    return { ...s, oldestUnpaidDate: oldestDate, overdueDays };
  }).sort((a, b) => b.totalAmount - a.totalAmount);
}

// ═══════════════════════════════════════════════════════════════
// PATIENT BILLS
// ═══════════════════════════════════════════════════════════════

export function getPatientBills(): PatientBill[] {
  try { return JSON.parse(localStorage.getItem(PATIENT_BILLS_KEY) || "[]"); }
  catch { return []; }
}

export function savePatientBill(bill: PatientBill): void {
  const bills = getPatientBills();
  const idx = bills.findIndex(b => b.id === bill.id);
  if (idx >= 0) bills[idx] = bill;
  else bills.push(bill);
  localStorage.setItem(PATIENT_BILLS_KEY, JSON.stringify(bills));
}

export function deletePatientBill(patientId: number): void {
  const bills = getPatientBills().filter(b => b.patientId !== patientId);
  localStorage.setItem(PATIENT_BILLS_KEY, JSON.stringify(bills));
}

export function getPatientBillByPatientId(patientId: number): PatientBill | null {
  return getPatientBills().find(b => b.patientId === patientId) || null;
}

export function getPatientBillsByDate(date: string): PatientBill[] {
  return getPatientBills().filter(b => b.billDate === date);
}

export function getPatientBillsByDateRange(from: string, to: string): PatientBill[] {
  return getPatientBills().filter(b => b.billDate >= from && b.billDate <= to);
}

// ═══════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "rent",        name: "Rent",        createdAt: new Date().toISOString() },
  { id: "electricity", name: "Electricity", createdAt: new Date().toISOString() },
  { id: "staff",       name: "Staff Salary",createdAt: new Date().toISOString() },
  { id: "misc",        name: "Miscellaneous",createdAt: new Date().toISOString() },
];

export function getExpenseCategories(): ExpenseCategory[] {
  try {
    const stored = localStorage.getItem(EXPENSE_CATS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

export function saveExpenseCategory(cat: ExpenseCategory): void {
  const cats = getExpenseCategories();
  const idx = cats.findIndex(c => c.id === cat.id);
  if (idx >= 0) cats[idx] = cat;
  else cats.push(cat);
  localStorage.setItem(EXPENSE_CATS_KEY, JSON.stringify(cats));
}

export function deleteExpenseCategory(id: string): void {
  const cats = getExpenseCategories().filter(c => c.id !== id);
  localStorage.setItem(EXPENSE_CATS_KEY, JSON.stringify(cats));
}

export function getExpenses(): Expense[] {
  try { return JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]"); }
  catch { return []; }
}

export function saveExpense(expense: Expense): void {
  const expenses = getExpenses();
  const idx = expenses.findIndex(e => e.id === expense.id);
  if (idx >= 0) expenses[idx] = expense;
  else expenses.push(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses().filter(e => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function getExpensesByDateRange(from: string, to: string): Expense[] {
  return getExpenses().filter(e => e.date >= from && e.date <= to);
}

export function getExpenseSummaryByCategory(from: string, to: string): { category: string; total: number }[] {
  const expenses = getExpensesByDateRange(from, to);
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.categoryName, (map.get(e.categoryName) || 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

// ═══════════════════════════════════════════════════════════════
// PROFIT REPORT
// ═══════════════════════════════════════════════════════════════

export interface DoctorProfitStats {
  doctorId: 1 | 2;
  doctorName: string;
  patients: number;
  consultationFees: number;
  looseMedicineSales: number;
  medicineSales: number;
  medicineCost: number;
  medicineProfit: number;
  total: number;
}

export interface DailyProfitReport {
  date: string;
  doctor1: DoctorProfitStats;
  doctor2: DoctorProfitStats;
  totalPatients: number;
  totalConsultation: number;
  totalMedicineSales: number;
  totalMedicineProfit: number;
  totalExpenses: number;
  netProfit: number;
  lowStockAlerts: { medicineName: string; batchNo: string; tabletsAvailable: number }[];
}

export function getDailyProfitReport(
  date: string,
  patients: { id: number; fees: number; doctorId?: 1 | 2 }[],
  settings: { doctor1Name: string; doctor2Name: string }
): DailyProfitReport {
  const patientBills = getPatientBillsByDate(date);
  const expenses = getExpensesByDateRange(date, date);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const calcDoctor = (doctorId: 1 | 2, name: string): DoctorProfitStats => {
    const docPatients = patients.filter(p => (p.doctorId || 1) === doctorId);
    const consultationFees = docPatients.reduce((s, p) => s + (p.fees || 0), 0);
    const docBills = patientBills.filter(b => b.doctorId === doctorId);
    const medicineSales = docBills.reduce((s, b) => s + b.totalSale, 0);
    const medicineCost  = docBills.reduce((s, b) => s + b.totalCost, 0);
    const medicineProfit= docBills.reduce((s, b) => s + b.totalProfit, 0);
    // Loose medicine — from loose_sales stored in patient records
    const looseMedicineSales = 0; // handled separately
    return {
      doctorId, doctorName: name,
      patients: docPatients.length,
      consultationFees, looseMedicineSales,
      medicineSales, medicineCost, medicineProfit,
      total: consultationFees + medicineProfit,
    };
  };

  const doctor1 = calcDoctor(1, settings.doctor1Name);
  const doctor2 = calcDoctor(2, settings.doctor2Name);

  const lowStockAlerts = getAllBatchStocks()
    .filter(b => !b.discontinued && b.stockStatus !== "ok" && b.tabletsAvailable > 0)
    .map(b => ({ medicineName: b.medicineName, batchNo: b.batchNo, tabletsAvailable: b.tabletsAvailable }));

  return {
    date,
    doctor1, doctor2,
    totalPatients: patients.length,
    totalConsultation: doctor1.consultationFees + doctor2.consultationFees,
    totalMedicineSales: doctor1.medicineSales + doctor2.medicineSales,
    totalMedicineProfit: doctor1.medicineProfit + doctor2.medicineProfit,
    totalExpenses,
    netProfit: doctor1.total + doctor2.total - totalExpenses,
    lowStockAlerts,
  };
}

// ═══════════════════════════════════════════════════════════════
// BACKUP / RESTORE
// ═══════════════════════════════════════════════════════════════

export function exportInventoryBackup(): string {
  return JSON.stringify({
    version: 3,
    exportedAt: new Date().toISOString(),
    purchaseBills: getPurchaseBills(),
    patientBills: getPatientBills(),
    expenses: getExpenses(),
    expenseCategories: getExpenseCategories(),
    billPayments: getBillPayments(),
    stockAdjustments: getStockAdjustments(),
  }, null, 2);
}

export function importInventoryBackup(json: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(json);
    if (data.purchaseBills) localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(data.purchaseBills));
    if (data.patientBills)  localStorage.setItem(PATIENT_BILLS_KEY, JSON.stringify(data.patientBills));
    if (data.expenses)      localStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
    if (data.expenseCategories) localStorage.setItem(EXPENSE_CATS_KEY, JSON.stringify(data.expenseCategories));
    if (data.billPayments)  localStorage.setItem(BILL_PAYMENTS_KEY, JSON.stringify(data.billPayments));
    if (data.stockAdjustments) localStorage.setItem(STOCK_ADJUSTMENTS_KEY, JSON.stringify(data.stockAdjustments));
    return { success: true, message: "Inventory data restored successfully" };
  } catch { return { success: false, message: "Failed to restore inventory data" }; }
}

// Set reorder level for a batch
export function setBatchReorderLevel(billId: string, batchNo: string, medicineName: string, level: number): void {
  const bills = getPurchaseBills();
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  const item = bill.items.find(i => i.batchNo === batchNo && i.medicineName.toLowerCase() === medicineName.toLowerCase());
  if (item) {
    item.reorderLevel = level;
    item.alertDismissed = false; // Reset dismiss so bell reappears if still low stock
  }
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
}

// Dismiss low stock alert for a batch
export function dismissStockAlert(billId: string, batchNo: string, medicineName: string): void {
  const bills = getPurchaseBills();
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  const item = bill.items.find(i => i.batchNo === batchNo && i.medicineName.toLowerCase() === medicineName.toLowerCase());
  if (item) item.alertDismissed = true;
  localStorage.setItem(PURCHASE_BILLS_KEY, JSON.stringify(bills));
}

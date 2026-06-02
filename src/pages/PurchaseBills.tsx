import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getPurchaseBills, addPurchaseBill, deletePurchaseBill, getMedicines,
  calcLandingCost, type PurchaseBill, type PurchaseBillItem, type MedicineItem,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronUp, Calculator, Save } from "lucide-react";
import { format } from "date-fns";

interface BillItemDraft {
  medicineId: number;
  medicineName: string;
  mrp: number;
  batchNo: string;
  expiryDate: string;
  qtyPaid: number;
  qtyFree: number;
  ratePerUnit: number;
  discountPct: number;
  gstPct: number;
}

const emptyItem = (): BillItemDraft => ({
  medicineId: 0, medicineName: "", mrp: 0, batchNo: "", expiryDate: "",
  qtyPaid: 1, qtyFree: 0, ratePerUnit: 0, discountPct: 0, gstPct: 5,
});

export default function PurchaseBills() {
  const { toast } = useToast();
  const [bills, setBills] = useState<PurchaseBill[]>(() => getPurchaseBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const [showForm, setShowForm] = useState(false);
  const [expandedBill, setExpandedBill] = useState<number | null>(null);
  const medicines = getMedicines();

  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<BillItemDraft[]>([emptyItem()]);

  const refresh = () => setBills(getPurchaseBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  const updateItem = (idx: number, field: keyof BillItemDraft, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-fill MRP if medicine selected
      if (field === "medicineId") {
        const med = medicines.find(m => m.id === Number(value));
        if (med) { next[idx].medicineName = med.name; next[idx].mrp = med.mrp; }
      }
      return next;
    });
  };

  const calcItem = (item: BillItemDraft) => {
    return calcLandingCost({
      qtyPaid: item.qtyPaid, qtyFree: item.qtyFree,
      ratePerUnit: item.ratePerUnit, discountPct: item.discountPct,
      gstPct: item.gstPct, mrp: item.mrp,
    });
  };

  const handleSave = () => {
    if (!supplierName.trim()) return toast({ title: "Supplier name required", variant: "destructive" });
    if (!billNo.trim()) return toast({ title: "Bill number required", variant: "destructive" });
    const validItems = items.filter(i => i.medicineId && i.ratePerUnit > 0);
    if (validItems.length === 0) return toast({ title: "Add at least one medicine item", variant: "destructive" });

    const billItems: PurchaseBillItem[] = validItems.map(item => {
      const calc = calcItem(item);
      return { ...item, ...calc };
    });
    const grandTotal = billItems.reduce((s, i) => s + i.totalPaid, 0);

    addPurchaseBill({ supplierName, billNo, billDate, items: billItems, grandTotal });
    toast({ title: "Purchase bill saved", description: `₹${grandTotal.toFixed(2)} — ${billItems.length} item(s)` });
    setShowForm(false);
    setSupplierName(""); setBillNo(""); setBillDate(format(new Date(), "yyyy-MM-dd"));
    setItems([emptyItem()]);
    refresh();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Purchase Bills</h1>
              <p className="text-sm text-slate-500">{bills.length} bills recorded</p>
            </div>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Bill
          </button>
        </div>

        {/* New Bill Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="font-semibold text-slate-900">New Purchase Bill</h2>

            {/* Bill Header */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Supplier Name *</label>
                <input value={supplierName} onChange={e => setSupplierName(e.target.value)}
                  placeholder="e.g. Jeenam Pharma"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Bill No *</label>
                <input value={billNo} onChange={e => setBillNo(e.target.value)}
                  placeholder="e.g. J215"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Bill Date</label>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">Items</h3>
                <button onClick={() => setItems(p => [...p, emptyItem()])}
                  className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {items.map((item, idx) => {
                const calc = item.ratePerUnit > 0 ? calcItem(item) : null;
                return (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-slate-500">Medicine *</label>
                        <select value={item.medicineId}
                          onChange={e => updateItem(idx, "medicineId", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                          <option value={0}>Select medicine...</option>
                          {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">MRP (₹)</label>
                        <input type="number" step="0.01" value={item.mrp}
                          onChange={e => updateItem(idx, "mrp", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Batch No</label>
                        <input value={item.batchNo} onChange={e => updateItem(idx, "batchNo", e.target.value)}
                          placeholder="A5071"
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Expiry (MM/YY)</label>
                        <input value={item.expiryDate} onChange={e => updateItem(idx, "expiryDate", e.target.value)}
                          placeholder="05/27"
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Qty Paid *</label>
                        <input type="number" value={item.qtyPaid} min={0}
                          onChange={e => updateItem(idx, "qtyPaid", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Qty Free</label>
                        <input type="number" value={item.qtyFree} min={0}
                          onChange={e => updateItem(idx, "qtyFree", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Rate/Unit (₹) *</label>
                        <input type="number" step="0.01" value={item.ratePerUnit}
                          onChange={e => updateItem(idx, "ratePerUnit", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Discount %</label>
                        <input type="number" step="0.1" value={item.discountPct} min={0} max={100}
                          onChange={e => updateItem(idx, "discountPct", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">GST %</label>
                        <input type="number" step="0.1" value={item.gstPct} min={0}
                          onChange={e => updateItem(idx, "gstPct", Number(e.target.value))}
                          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>

                    {/* Auto-calculated landing cost */}
                    {calc && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                        <div><span className="text-slate-500">Total Qty</span><p className="font-bold text-slate-800">{calc.totalQtyReceived}</p></div>
                        <div><span className="text-slate-500">Taxable Amt</span><p className="font-bold text-slate-800">₹{calc.taxableAmount.toFixed(2)}</p></div>
                        <div><span className="text-slate-500">GST</span><p className="font-bold text-slate-800">₹{calc.gstAmount.toFixed(2)}</p></div>
                        <div><span className="text-slate-500">Total Paid</span><p className="font-bold text-slate-800">₹{calc.totalPaid.toFixed(2)}</p></div>
                        <div className="bg-white rounded-lg p-2 border border-blue-200">
                          <span className="text-blue-600 font-semibold flex items-center gap-1"><Calculator className="w-3 h-3" />Landing Cost</span>
                          <p className="font-bold text-blue-700 text-base">₹{calc.landingCostPerUnit.toFixed(2)}/unit</p>
                          <p className="text-green-600">Profit: ₹{calc.profitPerUnit.toFixed(2)} ({calc.profitPct.toFixed(1)}%)</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand total */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-600">
                Grand Total: <span className="font-bold text-slate-900 text-base">
                  ₹{items.reduce((s, item) => {
                    if (!item.ratePerUnit) return s;
                    return s + calcItem(item).totalPaid;
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-600 px-5 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSave}
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" /> Save Bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bills List */}
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl text-center py-16 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No purchase bills yet</p>
              <p className="text-sm">Add a purchase bill to start tracking inventory</p>
            </div>
          ) : bills.map(bill => (
            <div key={bill.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{bill.supplierName}</p>
                    <p className="text-xs text-slate-500">Bill #{bill.billNo} · {format(new Date(bill.billDate), "dd MMM yyyy")} · {bill.items.length} item(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-slate-900">₹{bill.grandTotal.toFixed(2)}</p>
                  <button onClick={e => { e.stopPropagation(); if (confirm("Delete this bill? Stock will be reversed.")) { deletePurchaseBill(bill.id); refresh(); } }}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  {expandedBill === bill.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {expandedBill === bill.id && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-slate-500 font-medium">Medicine</th>
                        <th className="text-center px-3 py-2 text-slate-500 font-medium">Batch</th>
                        <th className="text-center px-3 py-2 text-slate-500 font-medium">Expiry</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-medium">MRP</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-medium">Landing Cost</th>
                        <th className="text-right px-3 py-2 text-slate-500 font-medium">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bill.items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-800">{item.medicineName}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.batchNo || "—"}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.expiryDate || "—"}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{item.totalQtyReceived} <span className="text-slate-400">({item.qtyPaid}+{item.qtyFree})</span></td>
                          <td className="px-3 py-2 text-right text-slate-700">₹{item.mrp.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-blue-600 font-semibold">₹{item.landingCostPerUnit.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">₹{item.totalPaid.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

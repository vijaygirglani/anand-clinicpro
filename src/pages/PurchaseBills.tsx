import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getPurchaseBills, addPurchaseBill, deletePurchaseBill,
  calcLandingCost, getMedicines, addMedicine, updateMedicine,
  type PurchaseBill, type PurchaseBillItem,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import { format } from "date-fns";

interface RowDraft {
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

const emptyRow = (): RowDraft => ({
  medicineName: "", mrp: 0, batchNo: "", expiryDate: "",
  qtyPaid: 1, qtyFree: 0, ratePerUnit: 0, discountPct: 0, gstPct: 5,
});

export default function PurchaseBills() {
  const { toast } = useToast();
  const [bills, setBills] = useState<PurchaseBill[]>(() =>
    getPurchaseBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Form
  const [supplier, setSupplier] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<RowDraft[]>([emptyRow()]);

  const refresh = () => setBills(getPurchaseBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  const updateRow = (i: number, field: keyof RowDraft, val: string | number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const calc = (r: RowDraft) => r.ratePerUnit > 0 ? calcLandingCost({
    qtyPaid: r.qtyPaid, qtyFree: r.qtyFree, ratePerUnit: r.ratePerUnit,
    discountPct: r.discountPct, gstPct: r.gstPct, mrp: r.mrp,
  }) : null;

  const grandTotal = rows.reduce((s, r) => {
    const c = calc(r); return s + (c?.totalPaid || 0);
  }, 0);

  const handleSave = () => {
    if (!supplier.trim()) return toast({ title: "Supplier name required", variant: "destructive" });
    if (!billNo.trim()) return toast({ title: "Bill number required", variant: "destructive" });
    const valid = rows.filter(r => r.medicineName.trim() && r.ratePerUnit > 0);
    if (!valid.length) return toast({ title: "Add at least one medicine", variant: "destructive" });

    const items: PurchaseBillItem[] = valid.map(r => {
      const c = calcLandingCost({ qtyPaid: r.qtyPaid, qtyFree: r.qtyFree, ratePerUnit: r.ratePerUnit, discountPct: r.discountPct, gstPct: r.gstPct, mrp: r.mrp });
      // Auto-create or update medicine in master
      const medicines = getMedicines();
      const existing = medicines.find(m => m.name.toLowerCase() === r.medicineName.trim().toLowerCase());
      if (!existing) {
        addMedicine({ name: r.medicineName.trim(), mrp: r.mrp, reorderLevel: 5, currentStock: 0, landingCost: c.landingCostPerUnit });
      } else {
        updateMedicine(existing.id, { mrp: r.mrp });
      }
      return {
        medicineId: existing?.id || 0,
        medicineName: r.medicineName.trim(),
        mrp: r.mrp, batchNo: r.batchNo, expiryDate: r.expiryDate,
        qtyPaid: r.qtyPaid, qtyFree: r.qtyFree, ratePerUnit: r.ratePerUnit,
        discountPct: r.discountPct, gstPct: r.gstPct,
        ...c,
      };
    });

    addPurchaseBill({ supplierName: supplier, billNo, billDate, items, grandTotal });
    toast({ title: "Purchase bill saved", description: `₹${grandTotal.toFixed(2)} — ${items.length} items` });
    setShowForm(false);
    setSupplier(""); setBillNo(""); setBillDate(format(new Date(), "yyyy-MM-dd")); setRows([emptyRow()]);
    refresh();
  };

  const inputCls = "w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 bg-white";

  return (
    <Layout>
      <div className="space-y-5">
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
          <button onClick={() => { setShowForm(s => !s); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New Bill"}
          </button>
        </div>

        {/* New Bill Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Bill Header */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Supplier *</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. Jeenam Pharma"
                  className="mt-1 w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Bill No *</label>
                <input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="e.g. J215"
                  className="mt-1 w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Date</label>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500 font-semibold w-8">#</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-semibold min-w-[160px]">Medicine Name</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-semibold w-20">Batch</th>
                    <th className="px-2 py-2 text-left text-slate-500 font-semibold w-20">Expiry</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-20">MRP</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-16">Qty Paid</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-16">Free</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-20">Rate</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-16">Disc%</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-14">GST%</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-24">Landing ₹</th>
                    <th className="px-2 py-2 text-right text-slate-500 font-semibold w-24">Total ₹</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r, i) => {
                    const c = calc(r);
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <input value={r.medicineName} onChange={e => updateRow(i, "medicineName", e.target.value)}
                            placeholder="Medicine name" list="med-names" className={inputCls} />
                          <datalist id="med-names">
                            {getMedicines().map(m => <option key={m.id} value={m.name} />)}
                          </datalist>
                        </td>
                        <td className="px-2 py-1.5"><input value={r.batchNo} onChange={e => updateRow(i, "batchNo", e.target.value)} placeholder="Batch" className={inputCls} /></td>
                        <td className="px-2 py-1.5"><input value={r.expiryDate} onChange={e => updateRow(i, "expiryDate", e.target.value)} placeholder="MM/YY" className={inputCls} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.mrp || ""} onChange={e => updateRow(i, "mrp", Number(e.target.value))} className={inputCls + " text-right"} /></td>
                        <td className="px-2 py-1.5"><input type="number" value={r.qtyPaid} min={0} onChange={e => updateRow(i, "qtyPaid", Number(e.target.value))} className={inputCls + " text-right"} /></td>
                        <td className="px-2 py-1.5"><input type="number" value={r.qtyFree} min={0} onChange={e => updateRow(i, "qtyFree", Number(e.target.value))} className={inputCls + " text-right"} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.01" value={r.ratePerUnit || ""} onChange={e => updateRow(i, "ratePerUnit", Number(e.target.value))} className={inputCls + " text-right"} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.1" value={r.discountPct} onChange={e => updateRow(i, "discountPct", Number(e.target.value))} className={inputCls + " text-right"} /></td>
                        <td className="px-2 py-1.5"><input type="number" step="0.1" value={r.gstPct} onChange={e => updateRow(i, "gstPct", Number(e.target.value))} className={inputCls + " text-right"} /></td>
                        <td className="px-2 py-1.5 text-right">
                          {c ? <span className="font-semibold text-blue-600">₹{c.landingCostPerUnit.toFixed(2)}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {c ? <span className="font-semibold text-slate-800">₹{c.totalPaid.toFixed(2)}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {rows.length > 1 && (
                            <button onClick={() => setRows(p => p.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button onClick={() => setRows(p => [...p, emptyRow()])}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  Grand Total: <span className="font-bold text-slate-900 text-base ml-1">₹{grandTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleSave}
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
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
            </div>
          ) : bills.map(bill => (
            <div key={bill.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(expanded === bill.id ? null : bill.id)}>
                <div>
                  <p className="font-semibold text-slate-900">{bill.supplierName} <span className="text-slate-400 font-normal text-sm">#{bill.billNo}</span></p>
                  <p className="text-xs text-slate-500">{format(new Date(bill.billDate), "dd MMM yyyy")} · {bill.items.length} items</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-slate-900">₹{bill.grandTotal.toFixed(2)}</p>
                  <button onClick={e => { e.stopPropagation(); if (confirm("Delete bill? Stock will be reversed.")) { deletePurchaseBill(bill.id); refresh(); } }}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  {expanded === bill.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {expanded === bill.id && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-500 font-semibold">#</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-semibold">Medicine</th>
                        <th className="px-3 py-2 text-center text-slate-500 font-semibold">Batch</th>
                        <th className="px-3 py-2 text-center text-slate-500 font-semibold">Expiry</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-semibold">MRP</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-semibold">Landing ₹</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-semibold">Total ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bill.items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{item.medicineName}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.batchNo || "—"}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.expiryDate || "—"}</td>
                          <td className="px-3 py-2 text-right text-slate-700">₹{item.mrp.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{item.totalQtyReceived} <span className="text-slate-400">({item.qtyPaid}+{item.qtyFree})</span></td>
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

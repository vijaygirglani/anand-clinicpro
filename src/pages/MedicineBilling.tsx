import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getMedicines, getDoctors, addMedicineBill, getMedicineBills,
  type MedicineItem, type MedicineSaleItem, type MedicineBill,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Plus, Trash2, Save, Search, IndianRupee } from "lucide-react";
import { format } from "date-fns";

interface SaleItemDraft {
  medicineId: number;
  qty: number;
}

export default function MedicineBilling() {
  const { toast } = useToast();
  const medicines = getMedicines();
  const doctors = getDoctors();
  const [bills, setBills] = useState<MedicineBill[]>(() =>
    getMedicineBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30)
  );
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [patientName, setPatientName] = useState("");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || 1);
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<SaleItemDraft[]>([{ medicineId: 0, qty: 1 }]);
  const [search, setSearch] = useState("");

  const refresh = () => setBills(getMedicineBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30));

  const getMed = (id: number): MedicineItem | undefined => medicines.find(m => m.id === id);

  const calcBillItems = (): MedicineSaleItem[] => {
    return items
      .filter(i => i.medicineId && i.qty > 0)
      .map(i => {
        const med = getMed(i.medicineId)!;
        const salePrice = med.mrp * i.qty;
        const cost = med.landingCost * i.qty;
        return {
          medicineId: med.id,
          medicineName: med.name,
          qty: i.qty,
          mrp: med.mrp,
          landingCost: med.landingCost,
          salePrice,
          profit: salePrice - cost,
        };
      });
  };

  const billSummary = () => {
    const saleItems = calcBillItems();
    return {
      totalSale: saleItems.reduce((s, i) => s + i.salePrice, 0),
      totalCost: saleItems.reduce((s, i) => s + i.landingCost * i.qty, 0),
      totalProfit: saleItems.reduce((s, i) => s + i.profit, 0),
    };
  };

  const handleSave = () => {
    if (!patientName.trim()) return toast({ title: "Patient name required", variant: "destructive" });
    const saleItems = calcBillItems();
    if (saleItems.length === 0) return toast({ title: "Add at least one medicine", variant: "destructive" });

    // Check stock
    for (const item of saleItems) {
      const med = getMed(item.medicineId);
      if (!med || med.currentStock < item.qty) {
        return toast({ title: `Insufficient stock: ${item.medicineName}`, description: `Available: ${med?.currentStock || 0} units`, variant: "destructive" });
      }
    }

    const { totalSale, totalCost, totalProfit } = billSummary();
    addMedicineBill({ patientName, doctorId, billDate, items: saleItems, totalSale, totalCost, totalProfit });
    toast({ title: "Medicine bill saved", description: `₹${totalSale.toFixed(2)} · Profit ₹${totalProfit.toFixed(2)}` });
    setPatientName(""); setItems([{ medicineId: 0, qty: 1 }]);
    setShowForm(false);
    refresh();
  };

  const filtered = bills.filter(b =>
    b.patientName.toLowerCase().includes(search.toLowerCase())
  );

  const { totalSale, totalProfit } = billSummary();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Medicine Billing</h1>
              <p className="text-sm text-slate-500">Sell medicines & track profit</p>
            </div>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Bill
          </button>
        </div>

        {/* New Bill Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-slate-900">New Medicine Bill</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Patient Name *</label>
                <input value={patientName} onChange={e => setPatientName(e.target.value)}
                  placeholder="Patient name"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Doctor</label>
                <select value={doctorId} onChange={e => setDoctorId(Number(e.target.value))}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">Medicines</h3>
                <button onClick={() => setItems(p => [...p, { medicineId: 0, qty: 1 }])}
                  className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {items.map((item, idx) => {
                const med = getMed(item.medicineId);
                const lineTotal = med ? med.mrp * item.qty : 0;
                const lineProfit = med ? (med.mrp - med.landingCost) * item.qty : 0;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <select value={item.medicineId}
                      onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, medicineId: Number(e.target.value) } : x))}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                      <option value={0}>Select medicine...</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — ₹{m.mrp} (Stock: {m.currentStock})
                        </option>
                      ))}
                    </select>
                    <input type="number" value={item.qty} min={1}
                      onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))}
                      className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    {med && (
                      <div className="text-xs text-right min-w-[120px]">
                        <p className="font-semibold text-slate-800">₹{lineTotal.toFixed(2)}</p>
                        <p className="text-green-600">Profit: ₹{lineProfit.toFixed(2)}</p>
                      </div>
                    )}
                    {items.length > 1 && (
                      <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary + Save */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex gap-6 text-sm">
                <div><span className="text-slate-500">Total Sale:</span> <span className="font-bold text-slate-900">₹{totalSale.toFixed(2)}</span></div>
                <div><span className="text-slate-500">Profit:</span> <span className="font-bold text-green-600">₹{totalProfit.toFixed(2)}</span></div>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bills by patient name..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
        </div>

        {/* Bills List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No bills yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Patient</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Doctor</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Items</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Sale</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Cost</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(bill => {
                    const doctor = doctors.find(d => d.id === bill.doctorId);
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{bill.patientName}</td>
                        <td className="px-4 py-3 text-slate-600">{doctor?.name || `Dr. ${bill.doctorId}`}</td>
                        <td className="px-4 py-3 text-slate-500">{format(new Date(bill.billDate), "dd MMM yyyy")}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{bill.items.length}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{bill.totalSale.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">₹{bill.totalCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">₹{bill.totalProfit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

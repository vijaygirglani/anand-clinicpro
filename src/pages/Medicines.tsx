import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/Layout";
import {
  getMedicines, addMedicine, updateMedicine, deleteMedicine,
  getStockStatus, type MedicineItem,
} from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Pill, Plus, Pencil, Trash2, Search, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  mrp: z.coerce.number().min(0.01, "MRP required"),
  reorderLevel: z.coerce.number().min(0),
  currentStock: z.coerce.number().min(0),
  landingCost: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

export default function Medicines() {
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<MedicineItem[]>(() => getMedicines());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reorderLevel: 10, currentStock: 0, landingCost: 0 },
  });

  const refresh = () => setMedicines(getMedicines());

  const onSubmit = (data: FormData) => {
    if (editId !== null) {
      updateMedicine(editId, data);
      toast({ title: "Medicine updated" });
    } else {
      addMedicine(data);
      toast({ title: "Medicine added" });
    }
    reset();
    setShowForm(false);
    setEditId(null);
    refresh();
  };

  const handleEdit = (m: MedicineItem) => {
    setEditId(m.id);
    setValue("name", m.name);
    setValue("mrp", m.mrp);
    setValue("reorderLevel", m.reorderLevel);
    setValue("currentStock", m.currentStock);
    setValue("landingCost", m.landingCost);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this medicine?")) return;
    deleteMedicine(id);
    refresh();
    toast({ title: "Medicine deleted" });
  };

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (m: MedicineItem) => {
    const s = getStockStatus(m);
    if (s === "out") return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Out of Stock</span>;
    if (s === "low") return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Low Stock</span>;
    return <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />In Stock</span>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Medicine Master</h1>
              <p className="text-sm text-slate-500">{medicines.length} medicines registered</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); reset(); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Medicine
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">{editId ? "Edit Medicine" : "Add New Medicine"}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="col-span-2 md:col-span-3">
                <label className="text-sm font-medium text-slate-700">Medicine Name *</label>
                <input {...register("name")} placeholder="e.g. Flumet IV 100ml"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">MRP (₹) *</label>
                <input {...register("mrp")} type="number" step="0.01" placeholder="97.00"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Landing Cost (₹)</label>
                <input {...register("landingCost")} type="number" step="0.01" placeholder="20.52"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Current Stock (units)</label>
                <input {...register("currentStock")} type="number" placeholder="0"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Reorder Level</label>
                <input {...register("reorderLevel")} type="number" placeholder="10"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="col-span-2 md:col-span-3 flex gap-3">
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  {editId ? "Update" : "Add Medicine"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset(); }}
                  className="border border-slate-300 text-slate-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No medicines found</p>
              <p className="text-sm">Add medicines to start tracking inventory</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Medicine</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">MRP</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Landing Cost</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Profit/Unit</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Stock</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(m => {
                    const profit = m.mrp - m.landingCost;
                    const profitPct = m.mrp > 0 ? (profit / m.mrp * 100).toFixed(1) : "0";
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{m.mrp.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{m.landingCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">₹{profit.toFixed(2)} <span className="text-xs text-slate-400">({profitPct}%)</span></td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{m.currentStock}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(m)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEdit(m)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
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

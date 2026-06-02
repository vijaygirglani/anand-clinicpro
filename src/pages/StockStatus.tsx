import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getMedicines, getExpiryList, getStockValuation, getStockStatus, type MedicineItem,
} from "@/lib/store";
import { Package, AlertTriangle, XCircle, CheckCircle2, Clock } from "lucide-react";

export default function StockStatus() {
  const [tab, setTab] = useState<"stock" | "expiry">("stock");
  const medicines = getMedicines();
  const expiryList = getExpiryList();
  const valuation = getStockValuation();

  const out = medicines.filter(m => m.currentStock <= 0);
  const low = medicines.filter(m => m.currentStock > 0 && m.currentStock <= m.reorderLevel);
  const ok = medicines.filter(m => m.currentStock > m.reorderLevel);

  const statusBadge = (m: MedicineItem) => {
    const s = getStockStatus(m);
    if (s === "out") return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Out of Stock</span>;
    if (s === "low") return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Low Stock</span>;
    return <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />In Stock</span>;
  };

  const expiryBadge = (status: string, days: number) => {
    if (status === "expired") return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />EXPIRED</span>;
    if (status === "expiring-soon") return <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />{days}d left</span>;
    if (status === "expiring") return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />{days}d left</span>;
    return <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />{days}d left</span>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stock & Expiry</h1>
            <p className="text-sm text-slate-500">Monitor inventory levels and expiry dates</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Items</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{medicines.length}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-500 font-medium uppercase tracking-wider flex items-center gap-1"><XCircle className="w-3 h-3" />Out of Stock</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{out.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low Stock</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{low.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Value (Cost)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{valuation.atCost.toLocaleString("en-IN")}</p>
            <p className="text-xs text-green-600 mt-0.5">MRP: ₹{valuation.atMrp.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab("stock")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "stock" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Stock Status
          </button>
          <button onClick={() => setTab("expiry")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "expiry" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Expiry List {expiryList.filter(e => e.status !== "good").length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5">{expiryList.filter(e => e.status !== "good").length}</span>
            )}
          </button>
        </div>

        {/* Stock Table */}
        {tab === "stock" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {medicines.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No medicines in inventory</p>
                <p className="text-sm">Add medicines in Medicine Master first</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Medicine</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Current Stock</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Reorder Level</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">MRP</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Landing Cost</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Stock Value</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Show out first, then low, then ok */}
                    {[...out, ...low, ...ok].map(m => (
                      <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${m.currentStock <= 0 ? "bg-red-50/30" : m.currentStock <= m.reorderLevel ? "bg-amber-50/30" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                        <td className={`px-4 py-3 text-right font-bold ${m.currentStock <= 0 ? "text-red-600" : m.currentStock <= m.reorderLevel ? "text-amber-600" : "text-slate-800"}`}>
                          {m.currentStock}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{m.reorderLevel}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{m.mrp.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{m.landingCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{(m.currentStock * m.landingCost).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(m)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Expiry Table */}
        {tab === "expiry" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {expiryList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No expiry data</p>
                <p className="text-sm">Expiry dates are taken from Purchase Bills</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Medicine</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Batch</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Expiry</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expiryList.map((item, i) => (
                      <tr key={i} className={`hover:bg-slate-50 transition-colors ${item.status === "expired" ? "bg-red-50/30" : item.status === "expiring-soon" ? "bg-orange-50/30" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.medicineName}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.batchNo}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.expiryDate}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{item.qty}</td>
                        <td className="px-4 py-3 text-center">{expiryBadge(item.status, item.daysToExpiry)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
